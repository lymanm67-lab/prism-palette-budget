import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useCurrency } from '@/hooks/use-currency';
import { useSubscriptions } from '@/hooks/use-subscriptions';
import { useRecurringTransactions } from '@/hooks/use-recurring';
import { addMonths, endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend,
} from 'recharts';
import { CheckCircle2, AlertTriangle, Target, TrendingDown, HeartPulse, ShoppingCart } from 'lucide-react';
import PageOverview from '@/components/PageOverview';

/* Groceries are reimbursed by spouse and medical is paid from the HSA — neither is
   out-of-pocket spending from net pay, so both are excluded from the plan. */
const EXCLUDED_MATCHERS = [
  { key: 'groceries', test: (s: string) => /grocer|supermarket|kroger|aldi|meijer|costco|sam'?s club/.test(s) },
  { key: 'medical', test: (s: string) => /medical|health care|healthcare|doctor|dental|dentist|pharmac|hospital|clinic|vision|optom/.test(s) },
];

const monthlyOfSub = (s: any) => {
  const a = Number(s.average_amount || 0);
  if (s.frequency === 'weekly') return a * 4.33;
  if (s.frequency === 'biweekly') return a * 2.17;
  if (s.frequency === 'quarterly') return a / 3;
  if (s.frequency === 'yearly') return a / 12;
  return a;
};

const monthlyOfBill = (b: any) => {
  const a = Math.abs(Number(b.amount || 0));
  if (b.frequency === 'weekly') return a * 4.33;
  if (b.frequency === 'biweekly') return a * 2.17;
  if (b.frequency === 'quarterly') return a / 3;
  if (b.frequency === 'yearly' || b.frequency === 'annual') return a / 12;
  return a;
};

function useSpendingHistory(months = 12) {
  const { household } = useHousehold();
  const from = format(startOfMonth(subMonths(new Date(), months - 1)), 'yyyy-MM-dd');
  const to = format(endOfMonth(new Date()), 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['fifty-plan-history', household?.id, from, to],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('date, amount, merchant, categories(name)')
        .eq('household_id', household!.id)
        .gte('date', from)
        .lte('date', to)
        .lt('amount', 0)
        .is('deleted_at', null)
        .eq('is_transfer', false)
        .limit(5000);
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

const FiftyPercentPlan = () => {
  const { formatCurrency } = useCurrency();
  const { data: subscriptions } = useSubscriptions();
  const { data: recurring } = useRecurringTransactions();
  const { data: history } = useSpendingHistory(12);

  const [netPay, setNetPay] = useState<string>(() => localStorage.getItem('prism-net-pay-monthly') || '4250.02');
  const net = Number(netPay) || 0;
  const target = net * 0.5;

  /* ---------- monthly actual out-of-pocket spending ---------- */
  const monthRows = useMemo(() => {
    const keys: string[] = [];
    for (let i = 11; i >= 0; i--) keys.push(format(subMonths(new Date(), i), 'yyyy-MM'));
    const buckets: Record<string, { spend: number; groceries: number; medical: number }> = {};
    keys.forEach(k => { buckets[k] = { spend: 0, groceries: 0, medical: 0 }; });

    (history || []).forEach(t => {
      const k = String(t.date).slice(0, 7);
      if (!buckets[k]) return;
      const amt = Math.abs(Number(t.amount || 0));
      const hay = `${t.merchant || ''} ${t.categories?.name || ''}`.toLowerCase();
      const excluded = EXCLUDED_MATCHERS.find(m => m.test(hay));
      if (excluded?.key === 'groceries') buckets[k].groceries += amt;
      else if (excluded?.key === 'medical') buckets[k].medical += amt;
      else buckets[k].spend += amt;
    });

    return keys.map(k => ({
      key: k,
      label: format(new Date(`${k}-01T00:00:00`), 'MMM yy'),
      ...buckets[k],
      target,
    }));
  }, [history, target]);

  const closedMonths = monthRows.slice(0, 11).filter(m => m.spend > 0);
  const avgSpend = closedMonths.length
    ? closedMonths.reduce((s, m) => s + m.spend, 0) / closedMonths.length
    : 0;
  const last3 = closedMonths.slice(-3);
  const recentAvg = last3.length ? last3.reduce((s, m) => s + m.spend, 0) / last3.length : avgSpend;
  const thisMonth = monthRows[monthRows.length - 1];
  const excludedThisMonth = (thisMonth?.groceries || 0) + (thisMonth?.medical || 0);

  /* ---------- fixed commitments and when they end ---------- */
  const commitments = useMemo(() => {
    const subs = (subscriptions || [])
      .filter((s: any) => !s.is_cancelled)
      .map((s: any) => ({
        id: `s-${s.id}`,
        name: s.merchant || 'Subscription',
        monthly: monthlyOfSub(s),
        endDate: s.end_date ? new Date(`${String(s.end_date).slice(0, 10)}T00:00:00`) : null,
      }));
    const bills = (recurring || [])
      .filter((b: any) => b.is_active !== false && Number(b.amount || 0) < 0)
      .map((b: any) => ({
        id: `r-${b.id}`,
        name: b.merchant || b.categories?.name || 'Recurring bill',
        monthly: monthlyOfBill(b),
        endDate: b.end_date ? new Date(`${String(b.end_date).slice(0, 10)}T00:00:00`) : null,
      }));
    return [...subs, ...bills].filter(c => c.monthly > 0);
  }, [subscriptions, recurring]);

  const fixedNow = commitments.reduce((s, c) => s + c.monthly, 0);
  const variableNow = Math.max(0, recentAvg - fixedNow);

  /* ---------- 12-month forward plan ---------- */
  const plan = useMemo(() => {
    const rows: {
      key: string; label: string; fixed: number; variable: number; total: number;
      target: number; ends: string[];
    }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = startOfMonth(addMonths(new Date(), i));
      const active = commitments.filter(c => !c.endDate || c.endDate >= d);
      const ended = commitments.filter(c => c.endDate && c.endDate < d && c.endDate >= startOfMonth(addMonths(new Date(), i - 1)));
      const fixed = active.reduce((s, c) => s + c.monthly, 0);
      rows.push({
        key: format(d, 'yyyy-MM'),
        label: format(d, 'MMM yy'),
        fixed,
        variable: variableNow,
        total: fixed + variableNow,
        target,
        ends: ended.map(c => c.name),
      });
    }
    return rows;
  }, [commitments, variableNow, target]);

  const firstHit = plan.find(p => p.total <= target);
  const endMonth = plan[plan.length - 1];
  const gapAtEnd = (endMonth?.total || 0) - target;
  const usedPct = net > 0 ? Math.round(((fixedNow + variableNow) / net) * 100) : 0;

  const dropOffs = useMemo(() => {
    return commitments
      .filter(c => c.endDate && c.endDate <= addMonths(new Date(), 12))
      .sort((a, b) => (a.endDate!.getTime() - b.endDate!.getTime()))
      .map(c => ({ ...c, when: format(c.endDate!, 'MMM yyyy') }));
  }, [commitments]);

  const chartData = plan.map(p => ({
    label: p.label,
    Fixed: Math.round(p.fixed),
    Variable: Math.round(p.variable),
    Target: Math.round(p.target),
  }));

  const historyChart = monthRows.map(m => ({
    label: m.label,
    Spent: Math.round(m.spend),
    Target: Math.round(m.target),
  }));

  return (
    <div className="space-y-6">
      <PageOverview
        title="Live on 50% of net pay"
        description="A rolling 12-month plan that tracks what you actually spend against half your take-home pay."
        icon={Target}
        iconColor="text-prism-amber"
        ttsScript="This page tracks your goal of living on half your take-home pay. It compares your real spending, month by month, against your fifty percent target, and shows which bills fall off over the next year. Groceries are left out because your wife reimburses them, and medical is left out because it comes from the HSA."
        features={[
          'Target set at half your monthly net pay',
          'Rolling 12-month projection as bills and loans end',
          'Your actual spending each month versus the target',
          'Groceries excluded (reimbursed) and medical excluded (paid from HSA)',
        ]}
      />

      <div className="flex flex-wrap items-end gap-4">
        <div className="w-48">
          <Label htmlFor="netpay" className="text-xs text-muted-foreground">Monthly net pay</Label>
          <Input
            id="netpay"
            value={netPay}
            onChange={e => {
              setNetPay(e.target.value);
              localStorage.setItem('prism-net-pay-monthly', e.target.value);
            }}
          />
        </div>
        <Badge variant="outline" className="gap-1"><Target className="h-3 w-3" /> Target {formatCurrency(target)} / month</Badge>
        <Badge variant="outline" className="gap-1"><ShoppingCart className="h-3 w-3" /> Groceries excluded (reimbursed)</Badge>
        <Badge variant="outline" className="gap-1"><HeartPulse className="h-3 w-3" /> Medical excluded (HSA)</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Fixed bills & subscriptions', value: fixedNow },
          { label: 'Everyday spending (3-mo avg)', value: variableNow },
          { label: 'Running total', value: fixedNow + variableNow },
          { label: 'Target (50%)', value: target },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="glass-card">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-semibold">{formatCurrency(s.value)}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Where you stand today</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={Math.min(100, usedPct)} className="h-3" />
          <p className="text-sm text-muted-foreground">
            You are living on <span className="font-semibold text-foreground">{usedPct}%</span> of your {formatCurrency(net)} net pay.
            {' '}Half your pay is {formatCurrency(target)}, so you need to free up{' '}
            <span className="font-semibold text-foreground">{formatCurrency(Math.max(0, fixedNow + variableNow - target))}</span> a month.
          </p>
          {excludedThisMonth > 0 && (
            <p className="text-xs text-muted-foreground">
              Left out of this month on purpose: {formatCurrency(thisMonth?.groceries || 0)} groceries (reimbursed) and{' '}
              {formatCurrency(thisMonth?.medical || 0)} medical (paid from HSA).
            </p>
          )}
          <div className="space-y-3 rounded-lg border p-3 text-sm">
            <div className="flex items-start gap-2">
              {firstHit ? (
                <>
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-prism-lime" />
                  <span>
                    On this plan you reach 50% in <span className="font-semibold">{firstHit.label}</span>, with{' '}
                    {formatCurrency(target - firstHit.total)} of room to spare.
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-prism-amber" />
                  <span>
                    Bills dropping off alone don't get you there within a year — after 12 months you'd still be{' '}
                    <span className="font-semibold">{formatCurrency(Math.max(0, gapAtEnd))}</span> a month over the target, so
                    everyday spending needs to come down by about that much.
                  </span>
                </>
              )}
            </div>

            <div className="grid gap-3 border-t pt-3 md:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Cash left over today</p>
                <p className="text-xl font-semibold">{formatCurrency(Math.max(0, net - fixedNow))}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(net)} net pay − {formatCurrency(fixedNow)} fixed bills = cash you have left right now for everyday spending.
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Room inside 50% target after July 2027</p>
                <p className="text-xl font-semibold">
                  {formatCurrency(Math.max(0, target - (plan.find(p => p.label === 'Jul 27')?.fixed ?? fixedNow)))}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(target)} target ceiling − {formatCurrency(plan.find(p => p.label === 'Jul 27')?.fixed ?? fixedNow)} fixed bills = how much you can spend on everyday items and still be living on half your pay.
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Why the two numbers differ:</span> today's number is actual leftover cash after fixed bills. The future number is a budget limit — how much everyday spending fits inside the 50% target once fixed bills drop. Both go up as bills end; the future one is smaller because it counts the target ceiling, not total pay.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base">The next 12 months</CardTitle></CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RTooltip formatter={(v: any) => formatCurrency(Number(v))} />
                <Legend />
                <Bar dataKey="Fixed" stackId="a" fill="hsl(var(--prism-violet))" />
                <Bar dataKey="Variable" stackId="a" fill="hsl(var(--prism-teal))" />
                <Line type="monotone" dataKey="Target" stroke="hsl(var(--prism-amber))" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2">Month</th>
                  <th className="py-2 text-right">Fixed</th>
                  <th className="py-2 text-right">Everyday</th>
                  <th className="py-2 text-right">Total</th>
                  <th className="py-2 text-right">vs target</th>
                  <th className="py-2">What ends</th>
                </tr>
              </thead>
              <tbody>
                {plan.map(p => {
                  const diff = p.total - p.target;
                  return (
                    <tr key={p.key} className="border-b/50 border-b">
                      <td className="py-2">{p.label}</td>
                      <td className="py-2 text-right">{formatCurrency(p.fixed)}</td>
                      <td className="py-2 text-right">{formatCurrency(p.variable)}</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(p.total)}</td>
                      <td className={`py-2 text-right ${diff <= 0 ? 'text-prism-lime' : 'text-prism-rose'}`}>
                        {diff <= 0 ? `-${formatCurrency(Math.abs(diff))}` : `+${formatCurrency(diff)}`}
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">{p.ends.join(', ') || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader><CardTitle className="text-base">What you actually spent, month by month</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={historyChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RTooltip formatter={(v: any) => formatCurrency(Number(v))} />
                  <Legend />
                  <Bar dataKey="Spent" fill="hsl(var(--prism-teal))" />
                  <Line type="monotone" dataKey="Target" stroke="hsl(var(--prism-amber))" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Average of completed months: {formatCurrency(avgSpend)} — that's{' '}
              {net > 0 ? Math.round((avgSpend / net) * 100) : 0}% of net pay. Groceries and medical are left out.
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingDown className="h-4 w-4" /> Payments falling off</CardTitle></CardHeader>
          <CardContent>
            {dropOffs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing has an end date yet. Add end dates to loans and settlements and they'll show up here.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {dropOffs.map(d => (
                  <li key={d.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <span>{d.name}</span>
                    <span className="text-right">
                      <span className="font-medium">{formatCurrency(d.monthly)}</span>
                      <span className="ml-2 text-xs text-muted-foreground">ends {d.when}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FiftyPercentPlan;
