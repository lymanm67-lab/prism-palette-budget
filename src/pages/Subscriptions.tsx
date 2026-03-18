import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { format, parseISO } from 'date-fns';
import {
  Loader2, RefreshCw, Sparkles, CreditCard, Calendar, TrendingDown,
  AlertTriangle, CheckCircle2, XCircle, Bell, Trash2, DollarSign, Plus, Pencil,
  MoreVertical, Shield, Building2, User,
} from 'lucide-react';
import { toast } from 'sonner';
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
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

const Subscriptions = () => {
  const { data: subscriptions, isLoading } = useSubscriptions();
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

  const NON_SUB_KEYWORDS = ['rent', 'mortgage', 'insurance', 'utilit', 'electric', 'gas', 'water', 'sewer', 'trash', 'debt', 'loan', 'transfer', 'payment'];

  const isNonSubscription = (sub: any) => {
    const merchant = (sub.merchant || '').toLowerCase();
    const catName = (sub.categories?.name || '').toLowerCase();
    return NON_SUB_KEYWORDS.some(kw => merchant.includes(kw) || catName.includes(kw)) || (sub.is_transfer === true);
  };

  const activeSubs = useMemo(() => (subscriptions || []).filter(s => !s.is_cancelled), [subscriptions]);
  const cancelledSubs = useMemo(() => (subscriptions || []).filter(s => s.is_cancelled), [subscriptions]);
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

  const handleDetect = async () => {
    try {
      const result = await detectSubs.mutateAsync();
      toast.success(`Detected ${result.detected} subscriptions`);
    } catch {
      toast.error('Failed to detect subscriptions');
    }
  };

  const handleGetInsights = async () => {
    setInsightsLoading(true);
    try {
      const result = await getInsights.mutateAsync();
      setInsightsData(result);
    } catch {
      toast.error('Failed to generate insights');
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleUpdate = async (id: string, updates: any) => {
    try {
      await updateSub.mutateAsync({ id, ...updates });
      // If marking as canceled, trigger reallocation
      if (updates.cancellation_status === 'canceled' || updates.is_cancelled === true) {
        const sub = (subscriptions || []).find(s => s.id === id);
        if (sub && updates.cancellation_status === 'canceled') {
          setReallocationSub(sub);
          setSelectedSubId(null);
        }
      }
    } catch {
      toast.error('Failed to update subscription');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await updateSub.mutateAsync({ id, is_cancelled: true, cancellation_status: 'canceled', cancellation_confirmed_at: new Date().toISOString() });
      const sub = (subscriptions || []).find(s => s.id === id);
      if (sub) setReallocationSub(sub);
      toast.success('Subscription marked as cancelled');
    } catch {
      toast.error('Failed to update subscription');
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await updateSub.mutateAsync({ id, is_cancelled: false, cancellation_status: 'not_started', cancellation_confirmed_at: null });
      toast.success('Subscription reactivated');
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleSetReminder = async () => {
    if (!reminderDialog || !reminderDate) return;
    try {
      await updateSub.mutateAsync({ id: reminderDialog, cancel_reminder_date: reminderDate });
      toast.success('Reminder set');
      setReminderDialog(null);
      setReminderDate('');
    } catch {
      toast.error('Failed to set reminder');
    }
  };

  const handleAddSubscription = async () => {
    if (!newSub.merchant || !newSub.average_amount || !household) return;
    try {
      const { error } = await supabase.from('subscriptions' as any).insert({
        household_id: household.id,
        merchant: newSub.merchant,
        average_amount: parseFloat(newSub.average_amount),
        frequency: newSub.frequency,
        category_id: newSub.category_id || null,
        is_active: true,
        is_cancelled: false,
      });
      if (error) throw error;
      toast.success('Subscription added');
      setAddOpen(false);
      setNewSub({ merchant: '', average_amount: '', frequency: 'monthly', category_id: '' });
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
    } catch {
      toast.error('Failed to add subscription');
    }
  };

  const openEdit = (sub: any) => {
    setEditSub({
      id: sub.id,
      merchant: sub.merchant || '',
      average_amount: String(sub.average_amount || ''),
      frequency: sub.frequency || 'monthly',
      notes: sub.notes || '',
      category_id: sub.category_id || '',
    });
  };

  const handleEditSubscription = async () => {
    if (!editSub) return;
    try {
      await updateSub.mutateAsync({
        id: editSub.id,
        merchant: editSub.merchant,
        average_amount: parseFloat(editSub.average_amount),
        frequency: editSub.frequency,
        notes: editSub.notes || null,
        category_id: editSub.category_id || null,
      });
      toast.success('Subscription updated');
      setEditSub(null);
    } catch {
      toast.error('Failed to update subscription');
    }
  };

  const handleSetUsageOverride = async (id: string, override: string) => {
    await handleUpdate(id, { user_usage_override: override });
    toast.success('Usage status updated');
  };

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
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            <span className="prism-gradient-text">Subscriptions</span>
          </h1>
          <p className="text-muted-foreground mt-1">Track, review, and cancel unused subscriptions with ease.</p>
        </div>
        <PageOverview
          title="Subscription Cleanup"
          description="AI-powered subscription detection with assisted cancellation workflows. Find unused subscriptions, get cancellation help, and reclaim your money."
          icon={CreditCard}
          iconColor="text-prism-violet"
          ttsScript="Welcome to Subscription Cleanup. This page detects recurring payments from your transactions using AI. You can classify subscriptions, get cancellation assistance with pre-written emails and scripts, and track your savings."
          features={['Auto-detect subscriptions from transactions', 'Assisted cancellation with email templates & scripts', 'Cancellation tracking & reminders', 'Savings impact dashboard with reallocation']}
        />
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add Subscription</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button variant="outline" onClick={handleDetect} disabled={detectSubs.isPending}>
            {detectSubs.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Detect
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const result = await scoreDifficulty.mutateAsync();
                toast.success(`Scored cancellation difficulty for ${result.scored} subscriptions`);
              } catch {
                toast.error('Failed to score cancellation difficulty');
              }
            }}
            disabled={scoreDifficulty.isPending || !activeSubs.length}
          >
            {scoreDifficulty.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
            Score Difficulty
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const result = await checkCanceled.mutateAsync();
                if (result.alerts > 0) {
                  toast.warning(`Found ${result.alerts} canceled subscription(s) still being charged!`);
                } else {
                  toast.success(`Checked ${result.checked} canceled subscriptions — no unexpected charges found`);
                }
              } catch {
                toast.error('Failed to check canceled charges');
              }
            }}
            disabled={checkCanceled.isPending || !cancelledSubs.length}
          >
            {checkCanceled.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
            Check Charges
          </Button>
          <Button onClick={handleGetInsights} disabled={insightsLoading || !activeSubs.length}>
            {insightsLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            AI Insights
          </Button>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <motion.div variants={item}>
          <Card className="prism-card-shine border-border/50">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-prism-violet to-prism-indigo flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active Subscriptions</p>
                <p className="font-display text-2xl font-bold">{activeSubs.length}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={item}>
          <Card className="prism-card-shine border-border/50">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-prism-orange to-prism-rose flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Monthly Cost</p>
                <p className="font-display text-2xl font-bold">{formatCurrency(totalMonthly)}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={item}>
          <Card className="prism-card-shine border-border/50">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-prism-teal to-prism-lime flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Yearly Cost</p>
                <p className="font-display text-2xl font-bold">{formatCurrency(totalYearly)}</p>
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
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-prism-violet" />
                AI Subscription Insights
                {insightsData.total_potential_savings > 0 && (
                  <Badge className="bg-prism-teal/10 text-prism-teal border-prism-teal/30 ml-2">
                    Save up to {formatCurrency(insightsData.total_potential_savings)}/mo
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(insightsData.insights || []).map((insight: any, i: number) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  {insight.severity === 'savings' ? (
                    <TrendingDown className="h-4 w-4 mt-0.5 text-prism-teal shrink-0" />
                  ) : insight.severity === 'warning' ? (
                    <AlertTriangle className="h-4 w-4 mt-0.5 text-prism-orange shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-prism-sky shrink-0" />
                  )}
                  <span>{insight.message}</span>
                </div>
              ))}
              {(insightsData.recommendations || []).length > 0 && (
                <div className="pt-3 border-t border-border/50 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recommendations</p>
                  {insightsData.recommendations.map((rec: any, i: number) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-border/30 p-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={rec.action === 'cancel' ? 'destructive' : rec.action === 'keep' ? 'default' : 'secondary'} className="text-xs">
                          {rec.action}
                        </Badge>
                        <span className="font-medium text-sm">{rec.merchant}</span>
                      </div>
                      <span className="text-xs text-muted-foreground max-w-[200px] truncate">{rec.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Active Subscriptions + Action Panel */}
      <div className="grid gap-6 lg:grid-cols-5">
        <motion.div variants={item} className={selectedSub ? 'lg:col-span-3' : 'lg:col-span-5'}>
          <Card className="prism-card-shine border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                Active Subscriptions
                <Badge variant="outline" className="text-xs">{activeSubs.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeSubs.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground text-sm">No subscriptions detected yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Click "Detect" to scan your transactions for recurring payments.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeSubs.map(sub => (
                    <div
                      key={sub.id}
                      className={`flex items-center justify-between rounded-xl border p-4 cursor-pointer transition-all
                        ${selectedSubId === sub.id ? 'border-prism-violet/50 bg-prism-violet/5 ring-1 ring-prism-violet/20' : 'border-border/30 interactive-row hover-border-glow'}`}
                      onClick={() => setSelectedSubId(selectedSubId === sub.id ? null : sub.id)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="h-10 w-10 rounded-lg flex items-center justify-center text-xs font-bold bg-prism-violet/10 text-prism-violet shrink-0">
                          {(sub.merchant || '?').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{sub.merchant}</p>
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            <Badge variant="outline" className="text-[10px] h-5">
                              {FREQ_LABELS[sub.frequency] || sub.frequency}
                            </Badge>
                            <UsageStatusBadge status={sub.usage_status || 'active'} />
                            <UserOverrideBadge override={sub.user_usage_override} />
                            <CancellationStatusBadge status={sub.cancellation_status || 'not_started'} />
                            {sub.next_expected_date && (
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {format(parseISO(sub.next_expected_date), 'MMM d')}
                              </span>
                            )}
                            {sub.cancel_reminder_date && (
                              <span className="flex items-center gap-1 text-[10px] text-prism-orange">
                                <Bell className="h-3 w-3" />
                                {format(parseISO(sub.cancel_reminder_date), 'MMM d')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-lg font-semibold text-prism-rose whitespace-nowrap">
                          {formatCurrency(sub.average_amount)}
                        </span>
                        {isNonSubscription(sub) && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={(e) => { e.stopPropagation(); deleteSub.mutate(sub.id); }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Not a subscription — delete</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
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
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSetUsageOverride(sub.id, 'unsure'); }}>
                              Unsure
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); handleCancel(sub.id); }}>
                              <XCircle className="h-3.5 w-3.5 mr-2" /> Mark Cancelled
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); deleteSub.mutate(sub.id); }}>
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Panel */}
        <AnimatePresence>
          {selectedSub && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="lg:col-span-2"
            >
              <SubscriptionActionPanel
                subscription={selectedSub}
                onClose={() => setSelectedSubId(null)}
                onUpdate={handleUpdate}
                formatCurrency={formatCurrency}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Cancelled */}
      {cancelledSubs.length > 0 && (
        <motion.div variants={item}>
          <Card className="prism-card-shine border-border/50 opacity-75">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-lg text-muted-foreground">Cancelled Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {cancelledSubs.map(sub => (
                  <div key={sub.id} className="flex items-center justify-between rounded-xl border border-border/30 p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold bg-muted text-muted-foreground">
                        {(sub.merchant || '?').substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm line-through text-muted-foreground">{sub.merchant}</span>
                      {sub.savings_reallocated_to && (
                        <Badge variant="outline" className="text-[10px] h-5 bg-prism-teal/10 text-prism-teal border-prism-teal/30">
                          → {sub.savings_reallocated_to.replace(/_/g, ' ')}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{formatCurrency(sub.average_amount)}</span>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleReactivate(sub.id)}>
                        Reactivate
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteSub.mutate(sub.id)}>
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
        open={!!reallocationSub}
        onClose={() => setReallocationSub(null)}
        merchant={reallocationSub?.merchant || ''}
        amount={reallocationSub?.average_amount || 0}
        formatCurrency={formatCurrency}
        onAllocate={handleAllocateSavings}
      />

      {/* Reminder Dialog */}
      <Dialog open={!!reminderDialog} onOpenChange={(o) => !o && setReminderDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Cancellation Reminder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Reminder Date</Label>
              <Input type="date" value={reminderDate} onChange={e => setReminderDate(e.target.value)} />
            </div>
            <Button onClick={handleSetReminder} disabled={!reminderDate} className="w-full">
              Set Reminder
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Subscription Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subscription</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Merchant / Service Name</Label>
              <Input
                placeholder="e.g. Netflix, Spotify"
                value={newSub.merchant}
                onChange={e => setNewSub(prev => ({ ...prev, merchant: e.target.value }))}
              />
            </div>
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="9.99"
                value={newSub.average_amount}
                onChange={e => setNewSub(prev => ({ ...prev, average_amount: e.target.value }))}
              />
            </div>
            <div>
              <Label>Frequency</Label>
              <Select value={newSub.frequency} onValueChange={v => setNewSub(prev => ({ ...prev, frequency: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <CategoryCombobox
                value={newSub.category_id}
                onValueChange={v => setNewSub(prev => ({ ...prev, category_id: v }))}
                placeholder="Select category (optional)"
              />
            </div>
            <Button onClick={handleAddSubscription} disabled={!newSub.merchant || !newSub.average_amount} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Subscription
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Subscription Dialog */}
      <Dialog open={!!editSub} onOpenChange={(o) => !o && setEditSub(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
          </DialogHeader>
          {editSub && (
            <div className="space-y-4 pt-2">
              <div>
                <Label>Merchant / Service Name</Label>
                <Input
                  value={editSub.merchant}
                  onChange={e => setEditSub((prev: any) => ({ ...prev, merchant: e.target.value }))}
                />
              </div>
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editSub.average_amount}
                  onChange={e => setEditSub((prev: any) => ({ ...prev, average_amount: e.target.value }))}
                />
              </div>
              <div>
                <Label>Frequency</Label>
                <Select value={editSub.frequency} onValueChange={v => setEditSub((prev: any) => ({ ...prev, frequency: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <CategoryCombobox
                  value={editSub.category_id}
                  onValueChange={v => setEditSub((prev: any) => ({ ...prev, category_id: v }))}
                  placeholder="Select category (optional)"
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Input
                  placeholder="Optional notes"
                  value={editSub.notes}
                  onChange={e => setEditSub((prev: any) => ({ ...prev, notes: e.target.value }))}
                />
              </div>
              <Button onClick={handleEditSubscription} disabled={!editSub.merchant || !editSub.average_amount} className="w-full">
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
