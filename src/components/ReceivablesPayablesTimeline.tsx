import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMedicaidClaims } from '@/hooks/use-medicaid-claims';
import { useRecurringTransactions } from '@/hooks/use-recurring';
import { useCurrency } from '@/hooks/use-currency';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend, Cell,
} from 'recharts';
import { format, addDays, addMonths, differenceInDays, parseISO } from 'date-fns';
import {
  ArrowUpCircle, ArrowDownCircle, CalendarClock, TrendingUp, AlertTriangle,
} from 'lucide-react';

interface TimelineEvent {
  date: string;
  label: string;
  amount: number;
  type: 'receivable' | 'payable';
  status?: string;
  probability?: number;
}

const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '12px',
  boxShadow: '0 8px 32px -8px rgba(0,0,0,0.15)',
};

export default function ReceivablesPayablesTimeline() {
  const { claims } = useMedicaidClaims();
  const { data: recurring } = useRecurringTransactions();
  const { formatCurrency } = useCurrency();

  const { weeklyData, events, totals } = useMemo(() => {
    const today = new Date();
    const horizon = addDays(today, 90);
    const allEvents: TimelineEvent[] = [];

    // --- Receivables from open Medicaid claims ---
    const openClaims = (claims || []).filter(c =>
      ['submitted', 'pending', 'approved', 'appealed'].includes(c.status)
    );

    const paidClaims = (claims || []).filter(c => c.status === 'paid' && c.payment_date && c.submission_date);
    const avgCycleDays = paidClaims.length >= 2
      ? Math.round(paidClaims.reduce((s, c) => s + differenceInDays(parseISO(c.payment_date!), parseISO(c.submission_date!)), 0) / paidClaims.length)
      : 45;

    const statusMultiplier: Record<string, number> = {
      submitted: 1, pending: 0.65, approved: 0.25, appealed: 0.85,
    };

    for (const claim of openClaims) {
      const baseDate = claim.submission_date ? parseISO(claim.submission_date) : parseISO(claim.service_date);
      const mult = statusMultiplier[claim.status] || 1;
      const expectedDays = Math.round(avgCycleDays * mult);
      const expectedDate = addDays(baseDate, expectedDays);
      const daysSoFar = differenceInDays(today, baseDate);
      const probability = claim.status === 'approved' ? 95
        : claim.status === 'pending' ? 80
        : claim.status === 'appealed' ? 55
        : 70;

      if (expectedDate <= horizon) {
        allEvents.push({
          date: format(expectedDate, 'yyyy-MM-dd'),
          label: `${claim.client_name} — ${claim.claim_number || 'Claim'}`,
          amount: claim.payment_amount || claim.amount,
          type: 'receivable',
          status: claim.status,
          probability,
        });
      }
    }

    // --- Payables from recurring transactions ---
    for (const r of (recurring || [])) {
      if (!r.is_active || r.amount > 0) continue; // only expenses
      let nextDue = parseISO(r.next_due_date);
      const iterations = r.frequency === 'weekly' ? 13 : r.frequency === 'biweekly' ? 7 : 3;

      for (let i = 0; i < iterations; i++) {
        if (nextDue > horizon) break;
        if (nextDue >= today) {
          allEvents.push({
            date: format(nextDue, 'yyyy-MM-dd'),
            label: r.merchant || 'Recurring Payment',
            amount: Math.abs(r.amount),
            type: 'payable',
          });
        }
        if (r.frequency === 'weekly') nextDue = addDays(nextDue, 7);
        else if (r.frequency === 'biweekly') nextDue = addDays(nextDue, 14);
        else if (r.frequency === 'quarterly') nextDue = addMonths(nextDue, 3);
        else nextDue = addMonths(nextDue, 1);
      }
    }

    // --- Aggregate into weekly buckets ---
    const weeks: Record<string, { receivables: number; payables: number; net: number; weekLabel: string; events: TimelineEvent[] }> = {};
    for (let d = 0; d < 90; d += 7) {
      const weekStart = addDays(today, d);
      const key = format(weekStart, 'yyyy-MM-dd');
      weeks[key] = {
        receivables: 0, payables: 0, net: 0,
        weekLabel: format(weekStart, 'MMM d'),
        events: [],
      };
    }

    const weekKeys = Object.keys(weeks).sort();
    for (const ev of allEvents) {
      const evDate = parseISO(ev.date);
      let bucket = weekKeys[0];
      for (const wk of weekKeys) {
        if (parseISO(wk) <= evDate) bucket = wk;
        else break;
      }
      if (weeks[bucket]) {
        if (ev.type === 'receivable') weeks[bucket].receivables += ev.amount;
        else weeks[bucket].payables += ev.amount;
        weeks[bucket].events.push(ev);
      }
    }

    let runningNet = 0;
    const weeklyArr = weekKeys.map(k => {
      const w = weeks[k];
      w.net = w.receivables - w.payables;
      runningNet += w.net;
      return { ...w, cumulativeNet: runningNet };
    });

    const totalReceivables = allEvents.filter(e => e.type === 'receivable').reduce((s, e) => s + e.amount, 0);
    const totalPayables = allEvents.filter(e => e.type === 'payable').reduce((s, e) => s + e.amount, 0);

    return {
      weeklyData: weeklyArr,
      events: allEvents.sort((a, b) => a.date.localeCompare(b.date)),
      totals: { receivables: totalReceivables, payables: totalPayables, net: totalReceivables - totalPayables },
    };
  }, [claims, recurring]);

  const upcomingEvents = events.slice(0, 8);
  const hasData = events.length > 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0]?.payload;
    return (
      <div style={tooltipStyle} className="p-3 text-sm space-y-1">
        <p className="font-semibold text-foreground">Week of {label}</p>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">Receivables:</span>
          <span className="font-medium text-foreground">{formatCurrency(data?.receivables || 0)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
          <span className="text-muted-foreground">Payables:</span>
          <span className="font-medium text-foreground">{formatCurrency(data?.payables || 0)}</span>
        </div>
        <div className="border-t border-border pt-1 mt-1">
          <span className="text-muted-foreground">Cumulative Net:</span>{' '}
          <span className={`font-semibold ${(data?.cumulativeNet || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatCurrency(data?.cumulativeNet || 0)}
          </span>
        </div>
        {data?.events?.length > 0 && (
          <div className="text-xs text-muted-foreground mt-1">
            {data.events.length} event{data.events.length > 1 ? 's' : ''} this week
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <ArrowDownCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Expected Receivables</p>
              <p className="font-display text-lg font-bold text-emerald-600">{formatCurrency(totals.receivables)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-rose-500/20 bg-gradient-to-br from-rose-500/5 to-transparent">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <ArrowUpCircle className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Projected Payables</p>
              <p className="font-display text-lg font-bold text-rose-600">{formatCurrency(totals.payables)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={`border-${totals.net >= 0 ? 'emerald' : 'rose'}-500/20 bg-gradient-to-br from-${totals.net >= 0 ? 'emerald' : 'rose'}-500/5 to-transparent`}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className={`h-10 w-10 rounded-xl ${totals.net >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'} flex items-center justify-center`}>
              <TrendingUp className={`h-5 w-5 ${totals.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">90-Day Net Position</p>
              <p className={`font-display text-lg font-bold ${totals.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(totals.net)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Receivables & Payables Timeline
            <Badge variant="outline" className="ml-auto text-[10px]">90-day horizon</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasData ? (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={weeklyData}>
                <defs>
                  <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                  </linearGradient>
                  <linearGradient id="payGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(350, 78%, 52%)" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="hsl(350, 78%, 52%)" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="weekLabel" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={v => `$${(v / 1000).toFixed(v >= 1000 ? 0 : 1)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                <Bar dataKey="receivables" name="Receivables" fill="url(#recGrad)" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="payables" name="Payables" fill="url(#payGrad)" radius={[4, 4, 0, 0]} barSize={20} />
                <Line
                  type="monotone"
                  dataKey="cumulativeNet"
                  name="Cumulative Net"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarClock className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No receivables or payables data yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Add Medicaid claims or recurring transactions to see projections.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Upcoming Cash Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {upcomingEvents.map((ev, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                  ev.type === 'receivable' ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                }`}>
                  {ev.type === 'receivable'
                    ? <ArrowDownCircle className="h-4 w-4 text-emerald-600" />
                    : <ArrowUpCircle className="h-4 w-4 text-rose-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ev.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(ev.date), 'MMM d, yyyy')}
                    {ev.probability != null && (
                      <span className="ml-2">
                        • {ev.probability}% confidence
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-semibold tabular-nums ${
                    ev.type === 'receivable' ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {ev.type === 'receivable' ? '+' : '-'}{formatCurrency(ev.amount)}
                  </p>
                  {ev.status && (
                    <Badge variant="outline" className="text-[10px] mt-0.5">{ev.status}</Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Risk Alert */}
      {totals.net < 0 && (
        <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-transparent">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Cash Flow Gap Detected</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Projected payables exceed expected receivables by {formatCurrency(Math.abs(totals.net))} over the next 90 days.
                Consider accelerating claim follow-ups or adjusting payment schedules.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
