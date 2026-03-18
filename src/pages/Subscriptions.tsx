import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  useSubscriptions, useDetectSubscriptions, useUpdateSubscription,
  useDeleteSubscription, useSubscriptionInsights, useScoreCancellationDifficulty,
} from '@/hooks/use-subscriptions';
import { useHousehold } from '@/contexts/HouseholdContext';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/use-currency';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import {
  Loader2, RefreshCw, Sparkles, CreditCard, Calendar, TrendingDown,
  AlertTriangle, CheckCircle2, XCircle, Bell, Trash2, DollarSign, Plus, Pencil,
  MoreVertical, Shield, Building2, User, PieChart, Zap, Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer } from 'recharts';
import PageOverview from '@/components/PageOverview';
import CategoryCombobox from '@/components/CategoryCombobox';
import { UsageStatusBadge, UserOverrideBadge, CancellationStatusBadge } from '@/components/subscriptions/SubscriptionStatusBadge';
import { SubscriptionActionPanel } from '@/components/subscriptions/SubscriptionActionPanel';
import { CleanupSavingsDashboard } from '@/components/subscriptions/CleanupSavingsDashboard';
import { SavingsReallocationDialog } from '@/components/subscriptions/SavingsReallocationDialog';
import { StillChargedAlerts } from '@/components/subscriptions/StillChargedAlerts';
import { useCheckCanceledCharges } from '@/hooks/use-subscription-alerts';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const FREQ_LABELS: Record<string, string> = {
  weekly: 'Wk', biweekly: '2Wk', monthly: 'Mo', quarterly: 'Qtr', yearly: 'Yr',
};
const FREQ_LABELS_FULL: Record<string, string> = {
  weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly',
};

function useMonthlyExpenses() {
  const { household } = useHousehold();
  const now = new Date();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['monthly-expenses', household?.id, monthStart],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('amount')
        .eq('household_id', household!.id)
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .lt('amount', 0)
        .is('deleted_at', null)
        .eq('is_transfer', false);
      if (error) throw error;
      return Math.abs((data || []).reduce((s, t) => s + t.amount, 0));
    },
  });
}

const DONUT_COLORS = ['hsl(var(--prism-violet))', 'hsl(var(--prism-teal) / 0.2)'];

const Subscriptions = () => {
  const { data: subscriptions, isLoading } = useSubscriptions();
  const { data: totalExpenses = 0 } = useMonthlyExpenses();
  const detectSubs = useDetectSubscriptions();
  const updateSub = useUpdateSubscription();
  const deleteSub = useDeleteSubscription();
  const getInsights = useSubscriptionInsights();
  const scoreDifficulty = useScoreCancellationDifficulty();
  const checkCanceled = useCheckCanceledCharges();
  const { formatCurrency } = useCurrency();
  const { household } = useHousehold();
  const qc = useQueryClient();

  const [insightsData, setInsightsData] = useState<any>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [reminderDialog, setReminderDialog] = useState<string | null>(null);
  const [reminderDate, setReminderDate] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [newSub, setNewSub] = useState({ merchant: '', average_amount: '', frequency: 'monthly', category_id: '' });
  const [editSub, setEditSub] = useState<any>(null);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [reallocationSub, setReallocationSub] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'personal' | 'business'>('personal');

  const NON_SUB_KEYWORDS = ['rent', 'mortgage', 'insurance', 'utilit', 'electric', 'gas', 'water', 'sewer', 'trash', 'debt', 'loan', 'transfer', 'payment'];

  const isNonSubscription = (sub: any) => {
    const merchant = (sub.merchant || '').toLowerCase();
    const catName = (sub.categories?.name || '').toLowerCase();
    return NON_SUB_KEYWORDS.some(kw => merchant.includes(kw) || catName.includes(kw)) || (sub.is_transfer === true);
  };

  const isBusiness = (sub: any) => {
    const group = sub.categories?.category_groups;
    return group?.budget_type === 'business' || !!group?.business_profile_id;
  };

  const filteredSubs = useMemo(() => {
    return (subscriptions || []).filter(s => viewMode === 'business' ? isBusiness(s) : !isBusiness(s));
  }, [subscriptions, viewMode]);

  const activeSubs = useMemo(() => filteredSubs.filter(s => !s.is_cancelled), [filteredSubs]);
  const cancelledSubs = useMemo(() => filteredSubs.filter(s => s.is_cancelled), [filteredSubs]);
  const selectedSub = useMemo(() => activeSubs.find(s => s.id === selectedSubId), [activeSubs, selectedSubId]);

  const totalMonthly = useMemo(() => {
    return activeSubs.filter(s => !isNonSubscription(s)).reduce((sum, s) => {
      if (s.frequency === 'monthly') return sum + s.average_amount;
      if (s.frequency === 'weekly') return sum + s.average_amount * 4.33;
      if (s.frequency === 'biweekly') return sum + s.average_amount * 2.17;
      if (s.frequency === 'quarterly') return sum + s.average_amount / 3;
      if (s.frequency === 'yearly') return sum + s.average_amount / 12;
      return sum;
    }, 0);
  }, [activeSubs]);

  const totalYearly = totalMonthly * 12;
  const subPercent = totalExpenses > 0 ? Math.round((totalMonthly / totalExpenses) * 100) : 0;
  const donutData = [
    { name: 'Subscriptions', value: totalMonthly },
    { name: 'Other', value: Math.max(0, totalExpenses - totalMonthly) },
  ];

  const handleDetect = async () => {
    try { const r = await detectSubs.mutateAsync(); toast.success(`Detected ${r.detected} subscriptions`); }
    catch { toast.error('Failed to detect subscriptions'); }
  };
  const handleGetInsights = async () => {
    setInsightsLoading(true);
    try { const r = await getInsights.mutateAsync(); setInsightsData(r); }
    catch { toast.error('Failed to generate insights'); }
    finally { setInsightsLoading(false); }
  };
  const handleUpdate = async (id: string, updates: any) => {
    try {
      await updateSub.mutateAsync({ id, ...updates });
      if (updates.cancellation_status === 'canceled' || updates.is_cancelled === true) {
        const sub = (subscriptions || []).find(s => s.id === id);
        if (sub && updates.cancellation_status === 'canceled') { setReallocationSub(sub); setSelectedSubId(null); }
      }
    } catch { toast.error('Failed to update subscription'); }
  };
  const handleCancel = async (id: string) => {
    try {
      await updateSub.mutateAsync({ id, is_cancelled: true, cancellation_status: 'canceled', cancellation_confirmed_at: new Date().toISOString() });
      const sub = (subscriptions || []).find(s => s.id === id);
      if (sub) setReallocationSub(sub);
      toast.success('Subscription marked as cancelled');
    } catch { toast.error('Failed to update subscription'); }
  };
  const handleReactivate = async (id: string) => {
    try { await updateSub.mutateAsync({ id, is_cancelled: false, cancellation_status: 'not_started', cancellation_confirmed_at: null }); toast.success('Subscription reactivated'); }
    catch { toast.error('Failed to update'); }
  };
  const handleSetReminder = async () => {
    if (!reminderDialog || !reminderDate) return;
    try { await updateSub.mutateAsync({ id: reminderDialog, cancel_reminder_date: reminderDate }); toast.success('Reminder set'); setReminderDialog(null); setReminderDate(''); }
    catch { toast.error('Failed to set reminder'); }
  };
  const handleAddSubscription = async () => {
    if (!newSub.merchant || !newSub.average_amount || !household) return;
    try {
      const { error } = await supabase.from('subscriptions' as any).insert({
        household_id: household.id, merchant: newSub.merchant, average_amount: parseFloat(newSub.average_amount),
        frequency: newSub.frequency, category_id: newSub.category_id || null, is_active: true, is_cancelled: false,
      });
      if (error) throw error;
      toast.success('Subscription added'); setAddOpen(false);
      setNewSub({ merchant: '', average_amount: '', frequency: 'monthly', category_id: '' });
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
    } catch { toast.error('Failed to add subscription'); }
  };
  const openEdit = (sub: any) => {
    setEditSub({ id: sub.id, merchant: sub.merchant || '', average_amount: String(sub.average_amount || ''), frequency: sub.frequency || 'monthly', notes: sub.notes || '', category_id: sub.category_id || '' });
  };
  const handleEditSubscription = async () => {
    if (!editSub) return;
    try {
      await updateSub.mutateAsync({ id: editSub.id, merchant: editSub.merchant, average_amount: parseFloat(editSub.average_amount), frequency: editSub.frequency, notes: editSub.notes || null, category_id: editSub.category_id || null });
      toast.success('Subscription updated'); setEditSub(null);
    } catch { toast.error('Failed to update subscription'); }
  };
  const handleSetUsageOverride = async (id: string, override: string) => { await handleUpdate(id, { user_usage_override: override }); toast.success('Usage status updated'); };
  const handleAllocateSavings = async (destination: string) => {
    if (!reallocationSub) return;
    await handleUpdate(reallocationSub.id, { savings_reallocated_to: destination });
    toast.success(`Savings allocated to ${destination.replace(/_/g, ' ')}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      {/* Header */}
      <motion.div variants={item} className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-prism-violet to-prism-indigo flex items-center justify-center shrink-0">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
                <span className="prism-gradient-text">Subscriptions</span>
              </h1>
            </div>
          </div>

          {/* Mode toggle + actions — compact row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Personal / Business toggle */}
            <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
              <button
                onClick={() => setViewMode('personal')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all',
                  viewMode === 'personal' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <User className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Personal</span>
              </button>
              <button
                onClick={() => setViewMode('business')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all',
                  viewMode === 'business' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Building2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Business</span>
              </button>
            </div>

            {/* Icon action buttons with tooltips */}
            <TooltipProvider delayDuration={0}>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setAddOpen(true)}>
                      <Plus className="h-4 w-4 text-prism-teal" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add Subscription</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleDetect} disabled={detectSubs.isPending}>
                      {detectSubs.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 text-prism-sky" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Detect Subscriptions</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline" size="icon" className="h-8 w-8"
                      disabled={scoreDifficulty.isPending || !activeSubs.length}
                      onClick={async () => {
                        try { const r = await scoreDifficulty.mutateAsync(); toast.success(`Scored ${r.scored} subscriptions`); }
                        catch { toast.error('Failed to score difficulty'); }
                      }}
                    >
                      {scoreDifficulty.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4 text-prism-amber" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Score Difficulty</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0} className="inline-flex">
                      <Button
                        variant="outline" size="icon" className="h-8 w-8"
                        disabled={checkCanceled.isPending || !cancelledSubs.length}
                        onClick={async () => {
                          try {
                            const r = await checkCanceled.mutateAsync();
                            r.alerts > 0 ? toast.warning(`${r.alerts} still charged!`) : toast.success('No zombie charges');
                          } catch { toast.error('Check failed'); }
                        }}
                      >
                        {checkCanceled.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4 text-prism-orange" />}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Check Canceled Charges</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline" size="icon" className="h-8 w-8"
                      onClick={handleGetInsights}
                      disabled={insightsLoading || !activeSubs.length}
                    >
                      {insightsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-prism-violet" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>AI Insights</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards — 4 cols on desktop, 2x2 on mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Active count */}
        <motion.div variants={item}>
          <Card className="prism-card-shine border-border/50 h-full">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-prism-violet to-prism-indigo flex items-center justify-center shrink-0">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">Active</p>
                <p className="font-display text-xl font-bold">{activeSubs.length}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Monthly sub cost */}
        <motion.div variants={item}>
          <Card className="prism-card-shine border-border/50 h-full">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-prism-orange to-prism-rose flex items-center justify-center shrink-0">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">Monthly</p>
                <p className="font-display text-xl font-bold">{formatCurrency(totalMonthly)}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Yearly cost */}
        <motion.div variants={item}>
          <Card className="prism-card-shine border-border/50 h-full">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-prism-teal to-prism-lime flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">Yearly</p>
                <p className="font-display text-xl font-bold">{formatCurrency(totalYearly)}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Donut: % of expenses */}
        <motion.div variants={item}>
          <Card className="prism-card-shine border-border/50 h-full">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="relative h-14 w-14 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={donutData}
                      cx="50%" cy="50%"
                      innerRadius={18} outerRadius={26}
                      dataKey="value"
                      stroke="none"
                      startAngle={90} endAngle={-270}
                    >
                      {donutData.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i]} />
                      ))}
                    </Pie>
                  </RechartsPie>
                </ResponsiveContainer>
                <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold">
                  {subPercent}%
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">Of Expenses</p>
                <p className="text-xs text-muted-foreground truncate">
                  {formatCurrency(totalMonthly)} of {formatCurrency(totalExpenses)}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Still-Charged Alerts */}
      <StillChargedAlerts />

      {/* Cleanup Savings Dashboard */}
      <CleanupSavingsDashboard subscriptions={subscriptions || []} formatCurrency={formatCurrency} />

      {/* AI Insights Panel */}
      {insightsData && (
        <motion.div variants={item}>
          <Card className="border-prism-violet/30 bg-gradient-to-r from-prism-violet/5 to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-prism-violet" />
                AI Insights
                {insightsData.total_potential_savings > 0 && (
                  <Badge className="bg-prism-teal/10 text-prism-teal border-prism-teal/30 ml-auto text-[10px]">
                    Save {formatCurrency(insightsData.total_potential_savings)}/mo
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(insightsData.insights || []).map((insight: any, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  {insight.severity === 'savings' ? <TrendingDown className="h-4 w-4 mt-0.5 text-prism-teal shrink-0" />
                    : insight.severity === 'warning' ? <AlertTriangle className="h-4 w-4 mt-0.5 text-prism-orange shrink-0" />
                    : <CheckCircle2 className="h-4 w-4 mt-0.5 text-prism-sky shrink-0" />}
                  <span className="text-sm leading-snug">{insight.message}</span>
                </div>
              ))}
              {(insightsData.recommendations || []).length > 0 && (
                <div className="pt-2 border-t border-border/50 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recommendations</p>
                  {insightsData.recommendations.map((rec: any, i: number) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-border/30 p-2.5">
                      <div className="flex items-center gap-2">
                        <Badge variant={rec.action === 'cancel' ? 'destructive' : rec.action === 'keep' ? 'default' : 'secondary'} className="text-[10px]">
                          {rec.action}
                        </Badge>
                        <span className="font-medium text-xs">{rec.merchant}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground max-w-[150px] truncate">{rec.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Active Subscriptions + Action Panel */}
      <div className="grid gap-4 lg:grid-cols-5">
        <motion.div variants={item} className={selectedSub ? 'lg:col-span-3' : 'lg:col-span-5'}>
          <Card className="prism-card-shine border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base flex items-center gap-2">
                Active
                <Badge variant="outline" className="text-[10px]">{activeSubs.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeSubs.length === 0 ? (
                <div className="text-center py-10">
                  <CreditCard className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
                  <p className="text-muted-foreground text-sm">No subscriptions found</p>
                  <p className="text-xs text-muted-foreground mt-1">Tap <Search className="inline h-3 w-3" /> to scan transactions</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {activeSubs.map(sub => {
                    const initials = (sub.merchant || '?').substring(0, 2).toUpperCase();
                    const catColor = sub.categories?.color || '#7c5cf5';
                    const isSelected = selectedSubId === sub.id;
                    const nonSub = isNonSubscription(sub);

                    return (
                      <div
                        key={sub.id}
                        className={cn(
                          'flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all',
                          isSelected
                            ? 'border-prism-violet/50 bg-prism-violet/5 ring-1 ring-prism-violet/20'
                            : 'border-border/30 hover:border-border/60 hover:bg-muted/20'
                        )}
                        onClick={() => setSelectedSubId(isSelected ? null : sub.id)}
                      >
                        {/* Colored avatar */}
                        <div
                          className="h-9 w-9 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                          style={{ background: `linear-gradient(135deg, ${catColor}, ${catColor}88)` }}
                        >
                          {initials}
                        </div>

                        {/* Info — stacked on mobile */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{sub.merchant}</p>
                            {nonSub && (
                              <Badge variant="outline" className="text-[9px] h-4 border-prism-orange/30 text-prism-orange shrink-0">
                                Not a sub
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-muted-foreground">{FREQ_LABELS_FULL[sub.frequency] || sub.frequency}</span>
                            <UsageStatusBadge status={sub.usage_status || 'active'} />
                            {sub.cancellation_status && sub.cancellation_status !== 'not_started' && (
                              <CancellationStatusBadge status={sub.cancellation_status} />
                            )}
                          </div>
                        </div>

                        {/* Amount + actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-display text-sm font-bold text-prism-rose">
                            {formatCurrency(sub.average_amount)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">/{FREQ_LABELS[sub.frequency] || 'mo'}</span>

                          {nonSub && (
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => { e.stopPropagation(); deleteSub.mutate(sub.id); }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(sub); }}>
                                <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedSubId(sub.id); }}>
                                <Shield className="h-3.5 w-3.5 mr-2" /> Take Action
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setReminderDialog(sub.id); setReminderDate(''); }}>
                                <Bell className="h-3.5 w-3.5 mr-2" /> Set Reminder
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSetUsageOverride(sub.id, 'still_using'); }}>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Still Using
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSetUsageOverride(sub.id, 'no_longer_using'); }}>
                                <AlertTriangle className="h-3.5 w-3.5 mr-2" /> Not Using
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); handleCancel(sub.id); }}>
                                <XCircle className="h-3.5 w-3.5 mr-2" /> Cancel
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); deleteSub.mutate(sub.id); }}>
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Panel */}
        <AnimatePresence>
          {selectedSub && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="lg:col-span-2">
              <SubscriptionActionPanel subscription={selectedSub} onClose={() => setSelectedSubId(null)} onUpdate={handleUpdate} formatCurrency={formatCurrency} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Cancelled */}
      {cancelledSubs.length > 0 && (
        <motion.div variants={item}>
          <Card className="border-border/50 opacity-80">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base text-muted-foreground flex items-center gap-2">
                Cancelled
                <Badge variant="outline" className="text-[10px]">{cancelledSubs.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {cancelledSubs.map(sub => (
                  <div key={sub.id} className="flex items-center justify-between rounded-xl border border-border/30 p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-bold bg-muted text-muted-foreground shrink-0">
                        {(sub.merchant || '?').substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm line-through text-muted-foreground truncate">{sub.merchant}</span>
                      {sub.savings_reallocated_to && (
                        <Badge variant="outline" className="text-[9px] h-4 bg-prism-teal/10 text-prism-teal border-prism-teal/30 shrink-0">
                          → {sub.savings_reallocated_to.replace(/_/g, ' ')}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-muted-foreground">{formatCurrency(sub.average_amount)}</span>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => handleReactivate(sub.id)}>
                        Reactivate
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/60 hover:text-destructive" onClick={() => deleteSub.mutate(sub.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Savings Reallocation Dialog */}
      <SavingsReallocationDialog
        open={!!reallocationSub} onClose={() => setReallocationSub(null)}
        merchant={reallocationSub?.merchant || ''} amount={reallocationSub?.average_amount || 0}
        formatCurrency={formatCurrency} onAllocate={handleAllocateSavings}
      />

      {/* Reminder Dialog */}
      <Dialog open={!!reminderDialog} onOpenChange={(o) => !o && setReminderDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Set Cancellation Reminder</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div><Label>Reminder Date</Label><Input type="date" value={reminderDate} onChange={e => setReminderDate(e.target.value)} /></div>
            <Button onClick={handleSetReminder} disabled={!reminderDate} className="w-full">Set Reminder</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Subscription Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Subscription</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div><Label>Service Name</Label><Input placeholder="e.g. Netflix" value={newSub.merchant} onChange={e => setNewSub(prev => ({ ...prev, merchant: e.target.value }))} /></div>
            <div><Label>Amount</Label><Input type="number" step="0.01" placeholder="9.99" value={newSub.average_amount} onChange={e => setNewSub(prev => ({ ...prev, average_amount: e.target.value }))} /></div>
            <div>
              <Label>Frequency</Label>
              <Select value={newSub.frequency} onValueChange={v => setNewSub(prev => ({ ...prev, frequency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem><SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Category</Label><CategoryCombobox value={newSub.category_id} onValueChange={v => setNewSub(prev => ({ ...prev, category_id: v }))} placeholder="Select category (optional)" /></div>
            <Button onClick={handleAddSubscription} disabled={!newSub.merchant || !newSub.average_amount} className="w-full prism-gradient text-white">
              <Plus className="h-4 w-4 mr-2" /> Add Subscription
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Subscription Dialog */}
      <Dialog open={!!editSub} onOpenChange={(o) => !o && setEditSub(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Subscription</DialogTitle></DialogHeader>
          {editSub && (
            <div className="space-y-4 pt-2">
              <div><Label>Service Name</Label><Input value={editSub.merchant} onChange={e => setEditSub((p: any) => ({ ...p, merchant: e.target.value }))} /></div>
              <div><Label>Amount</Label><Input type="number" step="0.01" value={editSub.average_amount} onChange={e => setEditSub((p: any) => ({ ...p, average_amount: e.target.value }))} /></div>
              <div>
                <Label>Frequency</Label>
                <Select value={editSub.frequency} onValueChange={v => setEditSub((p: any) => ({ ...p, frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem><SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Category</Label><CategoryCombobox value={editSub.category_id} onValueChange={v => setEditSub((p: any) => ({ ...p, category_id: v }))} placeholder="Select category" /></div>
              <div><Label>Notes</Label><Input placeholder="Optional notes" value={editSub.notes} onChange={e => setEditSub((p: any) => ({ ...p, notes: e.target.value }))} /></div>
              <Button onClick={handleEditSubscription} disabled={!editSub.merchant || !editSub.average_amount} className="w-full prism-gradient text-white">
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default Subscriptions;
