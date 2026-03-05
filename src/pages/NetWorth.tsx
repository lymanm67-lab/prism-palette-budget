import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAccounts, useAllTransactions } from '@/hooks/use-finance-data';
import { useGoals, useCreateGoal, useUpdateGoal } from '@/hooks/use-goals';
import { useCurrency } from '@/hooks/use-currency';
import { Loader2, TrendingUp, TrendingDown, Wallet, Landmark, CreditCard, BarChart3, Target, Pencil, Check, X } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, ReferenceLine,
} from 'recharts';
import PageOverview from '@/components/PageOverview';
import { toast } from 'sonner';

const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' };

const ASSET_TYPES = new Set(['checking', 'savings', 'investment', 'other']);
const LIABILITY_TYPES = new Set(['credit', 'loan']);

const NetWorth = () => {
  const { formatCurrency, formatCompact } = useCurrency();
  const { data: accounts, isLoading: accLoading } = useAccounts();
  const { data: allTransactions, isLoading: txnLoading } = useAllTransactions();
  const { data: goals, isLoading: goalsLoading } = useGoals();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();

  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [goalDateInput, setGoalDateInput] = useState('');

  // Current totals
  const { totalAssets, totalLiabilities, netWorth, assetAccounts, liabilityAccounts } = useMemo(() => {
    if (!accounts) return { totalAssets: 0, totalLiabilities: 0, netWorth: 0, assetAccounts: [] as typeof accounts, liabilityAccounts: [] as typeof accounts };
    let assets = 0, liabilities = 0;
    const assetAcc: typeof accounts = [];
    const liabAcc: typeof accounts = [];
    for (const a of accounts) {
      if (LIABILITY_TYPES.has(a.account_type)) {
        liabilities += Math.abs(a.balance);
        liabAcc.push(a);
      } else {
        assets += a.balance;
        assetAcc.push(a);
      }
    }
    return { totalAssets: assets, totalLiabilities: liabilities, netWorth: assets - liabilities, assetAccounts: assetAcc, liabilityAccounts: liabAcc };
  }, [accounts]);

  // Net worth over time (assets vs liabilities split)
  const trendData = useMemo(() => {
    if (!allTransactions || !accounts) return [];

    // Group accounts by asset/liability
    const accountTypeMap = new Map<string, 'asset' | 'liability'>();
    for (const a of accounts) {
      accountTypeMap.set(a.id, LIABILITY_TYPES.has(a.account_type) ? 'liability' : 'asset');
    }

    // Current balances
    let currentAssets = 0, currentLiabilities = 0;
    for (const a of accounts) {
      if (LIABILITY_TYPES.has(a.account_type)) currentLiabilities += Math.abs(a.balance);
      else currentAssets += a.balance;
    }

    // Monthly deltas per type
    const monthlyAssetDeltas = new Map<string, number>();
    const monthlyLiabDeltas = new Map<string, number>();
    for (const t of allTransactions) {
      const m = t.date.substring(0, 7);
      const type = accountTypeMap.get(t.account_id);
      if (type === 'liability') {
        monthlyLiabDeltas.set(m, (monthlyLiabDeltas.get(m) || 0) + t.amount);
      } else {
        monthlyAssetDeltas.set(m, (monthlyAssetDeltas.get(m) || 0) + t.amount);
      }
    }

    const allMonths = new Set([...monthlyAssetDeltas.keys(), ...monthlyLiabDeltas.keys()]);
    const months = Array.from(allMonths).sort();
    if (months.length === 0) {
      const label = new Date().toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      return [{ month: label, assets: currentAssets, liabilities: currentLiabilities, netWorth: currentAssets - currentLiabilities }];
    }

    // Walk backwards to find starting values
    let runAssets = currentAssets;
    let runLiab = currentLiabilities;
    for (const m of months) {
      runAssets -= monthlyAssetDeltas.get(m) || 0;
      runLiab += monthlyLiabDeltas.get(m) || 0; // liab transactions are negative when paying down
    }

    const points: { month: string; assets: number; liabilities: number; netWorth: number }[] = [];
    for (const m of months) {
      runAssets += monthlyAssetDeltas.get(m) || 0;
      runLiab -= monthlyLiabDeltas.get(m) || 0;
      const label = new Date(m + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      points.push({ month: label, assets: runAssets, liabilities: runLiab, netWorth: runAssets - runLiab });
    }
    return points;
  }, [allTransactions, accounts]);

  // MoM change
  const momChange = useMemo(() => {
    if (trendData.length < 2) return null;
    const curr = trendData[trendData.length - 1].netWorth;
    const prev = trendData[trendData.length - 2].netWorth;
    const diff = curr - prev;
    const pct = prev !== 0 ? (diff / Math.abs(prev)) * 100 : 0;
    return { diff, pct };
  }, [trendData]);

  // Composition pie data
  const compositionData = useMemo(() => {
    if (!accounts) return [];
    return accounts
      .filter(a => Math.abs(a.balance) > 0)
      .map(a => ({
        name: a.name,
        value: Math.abs(a.balance),
        type: LIABILITY_TYPES.has(a.account_type) ? 'liability' : 'asset',
      }))
      .sort((a, b) => b.value - a.value);
  }, [accounts]);

  // Net worth goal
  const netWorthGoal = useMemo(() => {
    if (!goals) return null;
    return goals.find((g: any) => g.goal_type === 'net_worth' && !g.is_completed) || null;
  }, [goals]);

  const goalProgress = useMemo(() => {
    if (!netWorthGoal) return 0;
    const target = netWorthGoal.target_amount || 1;
    return Math.min(Math.max((netWorth / target) * 100, 0), 100);
  }, [netWorthGoal, netWorth]);

  // Pre-fill edit form when goal exists
  useEffect(() => {
    if (netWorthGoal && !editingGoal) {
      setGoalInput(String(netWorthGoal.target_amount));
      setGoalDateInput(netWorthGoal.target_date || '');
    }
  }, [netWorthGoal, editingGoal]);

  const handleSaveGoal = async () => {
    const amount = parseFloat(goalInput);
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid target amount'); return; }
    try {
      if (netWorthGoal) {
        await updateGoal.mutateAsync({ id: netWorthGoal.id, target_amount: amount, current_amount: netWorth, target_date: goalDateInput || null });
      } else {
        await createGoal.mutateAsync({ name: 'Net Worth Goal', target_amount: amount, current_amount: netWorth, goal_type: 'net_worth', target_date: goalDateInput || null });
      }
      setEditingGoal(false);
      toast.success('Net worth goal saved!');
    } catch { toast.error('Failed to save goal'); }
  };

  const isLoading = accLoading || txnLoading || goalsLoading;
  if (isLoading) return <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold prism-gradient-text">Net Worth</h1>
        <p className="text-muted-foreground">Track your total assets vs liabilities over time.</p>
        <PageOverview
          title="Net Worth Tracker"
          description="Visualize your financial position with assets vs liabilities charted over time."
          icon={BarChart3}
          iconColor="text-prism-indigo"
          ttsScript="The Net Worth page tracks your total financial position. View assets versus liabilities over time in an area chart. See a breakdown of each account's contribution. Monitor month-over-month changes to stay on track."
          features={[
            'Assets vs liabilities area chart',
            'Account-by-account breakdown',
            'Month-over-month net worth change',
            'Current balance composition',
          ]}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
              <Wallet className="h-3.5 w-3.5" /> Net Worth
            </div>
            <p className={cn("font-display text-2xl font-bold", netWorth >= 0 ? 'text-accent' : 'text-prism-rose')}>
              {formatCurrency(netWorth)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
              <Landmark className="h-3.5 w-3.5" /> Total Assets
            </div>
            <p className="font-display text-2xl font-bold text-accent">{formatCurrency(totalAssets)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
              <CreditCard className="h-3.5 w-3.5" /> Total Liabilities
            </div>
            <p className="font-display text-2xl font-bold text-prism-rose">{formatCurrency(totalLiabilities)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
              {momChange && momChange.diff >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              Month Change
            </div>
            {momChange ? (
              <p className={cn("font-display text-2xl font-bold", momChange.diff >= 0 ? 'text-accent' : 'text-prism-rose')}>
                {momChange.diff >= 0 ? '+' : ''}{formatCurrency(momChange.diff)}
                <span className="text-sm font-normal text-muted-foreground ml-2">({momChange.pct >= 0 ? '+' : ''}{momChange.pct.toFixed(1)}%)</span>
              </p>
            ) : (
              <p className="text-muted-foreground text-sm mt-1">Not enough data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Net Worth Goal */}
      <Card className="border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="font-display flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" /> Net Worth Goal
          </CardTitle>
          {!editingGoal && (
            <Button variant="ghost" size="sm" onClick={() => setEditingGoal(true)} className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> {netWorthGoal ? 'Edit' : 'Set Goal'}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingGoal ? (
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nw-goal" className="text-xs">Target Net Worth</Label>
                <Input id="nw-goal" type="number" min="0" step="1000" value={goalInput} onChange={e => setGoalInput(e.target.value)} placeholder="e.g. 100000" className="w-48" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nw-date" className="text-xs">Target Date (optional)</Label>
                <Input id="nw-date" type="date" value={goalDateInput} onChange={e => setGoalDateInput(e.target.value)} className="w-44" />
              </div>
              <Button size="sm" onClick={handleSaveGoal} disabled={createGoal.isPending || updateGoal.isPending} className="gap-1.5">
                <Check className="h-3.5 w-3.5" /> Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingGoal(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : netWorthGoal ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Current: <span className="font-semibold text-foreground">{formatCurrency(netWorth)}</span></span>
                <span className="text-muted-foreground">Target: <span className="font-semibold text-foreground">{formatCurrency(netWorthGoal.target_amount)}</span></span>
              </div>
              <div className="h-4 overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${goalProgress}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className={cn("h-full rounded-full", goalProgress >= 100 ? 'bg-accent' : 'bg-primary')}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{goalProgress.toFixed(1)}% complete</span>
                <span>
                  {netWorthGoal.target_amount - netWorth > 0
                    ? `${formatCurrency(netWorthGoal.target_amount - netWorth)} to go`
                    : '🎉 Goal reached!'}
                </span>
                {netWorthGoal.target_date && (
                  <span>By {new Date(netWorthGoal.target_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                )}
              </div>
            </div>
          ) : (
            <p className="py-2 text-sm text-muted-foreground">Set a net worth goal to track your progress toward financial independence.</p>
          )}
        </CardContent>
      </Card>

      {/* Assets vs Liabilities Area Chart */}
      <Card>
        <CardHeader><CardTitle className="font-display">Assets vs Liabilities Over Time</CardTitle></CardHeader>
        <CardContent>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="assetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="liabGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(340, 82%, 52%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(340, 82%, 52%)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => formatCompact(v)} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
                <Legend />
                <Area type="monotone" dataKey="assets" stroke="hsl(160, 84%, 39%)" fill="url(#assetGrad)" strokeWidth={2.5} name="Assets" />
                <Area type="monotone" dataKey="liabilities" stroke="hsl(340, 82%, 52%)" fill="url(#liabGrad)" strokeWidth={2.5} name="Liabilities" />
                <Area type="monotone" dataKey="netWorth" stroke="hsl(262, 83%, 58%)" fill="none" strokeWidth={3} strokeDasharray="6 3" name="Net Worth" />
                {netWorthGoal && (
                  <ReferenceLine y={netWorthGoal.target_amount} stroke="hsl(var(--primary))" strokeDasharray="8 4" strokeWidth={2} label={{ value: `Goal: ${formatCompact(netWorthGoal.target_amount)}`, position: 'insideTopRight', fill: 'hsl(var(--primary))', fontSize: 12 }} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-10 text-center text-muted-foreground">No data yet. Add accounts and transactions to see your net worth trend.</p>
          )}
        </CardContent>
      </Card>

      {/* Account Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Assets */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Landmark className="h-4 w-4 text-accent" /> Asset Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assetAccounts && assetAccounts.length > 0 ? (
              <div className="space-y-3">
                {assetAccounts.sort((a, b) => b.balance - a.balance).map(acc => {
                  const pct = totalAssets > 0 ? (acc.balance / totalAssets) * 100 : 0;
                  return (
                    <div key={acc.id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] capitalize">{acc.account_type}</Badge>
                          <span className="font-medium">{acc.name}</span>
                        </div>
                        <span className="font-display font-semibold text-accent">{formatCurrency(acc.balance)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-accent/70 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">No asset accounts yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Liabilities */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-prism-rose" /> Liability Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {liabilityAccounts && liabilityAccounts.length > 0 ? (
              <div className="space-y-3">
                {liabilityAccounts.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)).map(acc => {
                  const pct = totalLiabilities > 0 ? (Math.abs(acc.balance) / totalLiabilities) * 100 : 0;
                  return (
                    <div key={acc.id}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] capitalize">{acc.account_type}</Badge>
                          <span className="font-medium">{acc.name}</span>
                        </div>
                        <span className="font-display font-semibold text-prism-rose">{formatCurrency(Math.abs(acc.balance))}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-prism-rose/70 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">No liability accounts — great job!</p>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default NetWorth;
