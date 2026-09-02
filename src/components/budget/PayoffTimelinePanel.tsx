import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarClock, Flag, Route, TrendingUp } from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useCurrency } from '@/hooks/use-currency';
import { useHouseholdDebts } from '@/hooks/use-household-debts';
import { buildPayoffTimeline, type TimelineDebt } from '@/lib/budgeting/payoffTimeline';
import { cn } from '@/lib/utils';

const HORIZONS = [24, 60, 120] as const;

/**
 * Full payoff timeline: when each debt clears, and what every month's payments
 * do to cash flow — money out, interest, principal, and cash freed so far.
 */
export default function PayoffTimelinePanel() {
  const { formatCurrency } = useCurrency();
  const { data: debts, isLoading } = useHouseholdDebts();
  const [horizon, setHorizon] = useState<number>(60);

  const timeline = useMemo(() => {
    const inputs: TimelineDebt[] = (debts || [])
      .filter((d: any) => Number(d.balance || 0) > 0)
      .map((d: any) => ({
        id: d.id,
        name: d.name,
        balance: Number(d.balance || 0),
        apr: Number(d.interest_rate || 0),
        payment:
          Number(d.minimum_payment || 0) +
          Number(d.extra_payment || 0) +
          Number(d.settlement_separate_payment || 0),
        forgiveness: !!d.forgiveness_eligible,
        inSettlement: !!d.in_settlement_plan,
      }));
    return buildPayoffTimeline(inputs);
  }, [debts]);

  const rows = timeline.months.slice(0, horizon);
  const chart = rows.map((m) => ({
    label: m.monthLabel,
    balance: m.endingBalance,
    freed: m.freedCash,
    payment: m.payment,
  }));

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">Building payoff timeline…</CardContent>
      </Card>
    );
  }

  if (!timeline.months.length) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          No debts with a balance and a payment to project yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-display flex items-center gap-2 text-base">
          <Route className="h-4 w-4 text-primary" /> Full Payoff Timeline
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Every debt projected from today's balance, rate and funded payment — with the monthly cash each payoff
          hands back to you.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Headline stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total balance', value: formatCurrency(timeline.totalBalance) },
            { label: 'Monthly debt payments', value: formatCurrency(timeline.totalMonthlyPayment) },
            { label: 'Interest over the plan', value: formatCurrency(timeline.totalInterest), tone: 'text-rose-500' },
            { label: 'Debt-free', value: timeline.debtFreeLabel, tone: 'text-emerald-500' },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className={cn('mt-1 text-base font-bold tabular-nums', s.tone)}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Milestones */}
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Flag className="h-3.5 w-3.5" /> Payoff milestones
          </p>
          {timeline.milestones.map((m, i) => (
            <div
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 p-2.5 text-xs"
            >
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                  {i + 1}
                </Badge>
                <span className="font-medium">{m.name}</span>
                {m.forgiveness && <Badge variant="secondary" className="text-[10px]">PSLF</Badge>}
                <span className="text-muted-foreground">{formatCurrency(m.payment)}/mo</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 tabular-nums">
                  <CalendarClock className="h-3 w-3" />
                  {m.payoffLabel}
                  {m.monthsFromNow ? (
                    <span className="text-muted-foreground"> · {m.monthsFromNow} mo</span>
                  ) : null}
                </span>
                <span className="flex items-center gap-1 tabular-nums text-emerald-500">
                  <TrendingUp className="h-3 w-3" />+{formatCurrency(m.cumulativeFreed)}/mo freed
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Cash-flow chart */}
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(chart.length / 8))} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
              <Tooltip
                formatter={(v: any, n: any) => [formatCurrency(Number(v)), n === 'balance' ? 'Balance' : 'Cash freed']}
                contentStyle={{ fontSize: 11 }}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.15}
              />
              <Area
                type="monotone"
                dataKey="freed"
                stroke="hsl(var(--chart-2, var(--primary)))"
                fill="hsl(var(--chart-2, var(--primary)))"
                fillOpacity={0.1}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Month-by-month cash flow */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Month-by-month cash flow
            </p>
            <div className="flex gap-1 print:hidden">
              {HORIZONS.map((h) => (
                <Button
                  key={h}
                  size="sm"
                  variant={horizon === h ? 'default' : 'outline'}
                  className="h-7 px-2 text-[11px]"
                  onClick={() => setHorizon(h)}
                >
                  {h} mo
                </Button>
              ))}
            </div>
          </div>
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-background text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th className="py-1 text-left font-medium">Month</th>
                  <th className="py-1 text-right font-medium">Cash out</th>
                  <th className="py-1 text-right font-medium">Interest</th>
                  <th className="py-1 text-right font-medium">Principal</th>
                  <th className="py-1 text-right font-medium">Balance left</th>
                  <th className="py-1 text-right font-medium">Freed/mo</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr
                    key={m.month}
                    className={cn(
                      'border-b border-border/30',
                      m.clearedThisMonth.length && 'bg-emerald-500/10 font-medium',
                    )}
                  >
                    <td className="py-1">
                      {m.monthLabel}
                      {m.clearedThisMonth.length > 0 && (
                        <span className="ml-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                          ✓ {m.clearedThisMonth.map((c) => c.name).join(', ')} paid off
                        </span>
                      )}
                    </td>
                    <td className="py-1 text-right tabular-nums">{formatCurrency(m.payment)}</td>
                    <td className="py-1 text-right tabular-nums text-rose-500">{formatCurrency(m.interest)}</td>
                    <td className="py-1 text-right tabular-nums text-emerald-500">{formatCurrency(m.principal)}</td>
                    <td className="py-1 text-right tabular-nums">{formatCurrency(m.endingBalance)}</td>
                    <td className="py-1 text-right tabular-nums text-emerald-500">
                      {m.freedCash > 0 ? `+${formatCurrency(m.freedCash)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {timeline.months.length > horizon && (
            <p className="text-[11px] text-muted-foreground">
              Showing {horizon} of {timeline.months.length} projected months.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
