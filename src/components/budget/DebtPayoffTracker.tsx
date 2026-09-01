import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CalendarClock, ChevronDown, ChevronRight, TrendingDown } from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';
import { useHouseholdDebts } from '@/hooks/use-household-debts';
import {
  amortizationSchedule, clearedShare, projectPayoff,
} from '@/lib/budgeting/debtAmortization';
import { cn } from '@/lib/utils';

const fmtDate = (d: Date | null) =>
  d ? d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—';

export default function DebtPayoffTracker() {
  const { formatCurrency } = useCurrency();
  const { data: debts, isLoading } = useHouseholdDebts();
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const rows = useMemo(() => {
    const start = new Date();
    return (debts || [])
      .filter((d: any) => Number(d.balance || 0) > 0 && !d.forgiveness_eligible)
      .map((d: any) => {
        const balance = Number(d.balance || 0);
        const apr = Number(d.interest_rate || 0);
        const payment =
          Number(d.minimum_payment || 0) +
          Number(d.extra_payment || 0) +
          Number(d.settlement_separate_payment || 0);
        const schedule = amortizationSchedule(balance, apr, payment, start);
        const payoff = projectPayoff(balance, apr, payment, start);
        return {
          id: d.id as string,
          name: d.name as string,
          balance,
          apr,
          payment,
          schedule,
          payoff,
          cleared12: clearedShare(schedule, balance, 12),
          inSettlement: !!d.in_settlement_plan,
        };
      })
      .sort((a, b) => a.balance - b.balance);
  }, [debts]);

  const totals = useMemo(
    () => ({
      balance: rows.reduce((s, r) => s + r.balance, 0),
      payment: rows.reduce((s, r) => s + r.payment, 0),
      principal: rows.reduce((s, r) => s + (r.schedule[0]?.principal || 0), 0),
      interest: rows.reduce((s, r) => s + (r.schedule[0]?.interest || 0), 0),
    }),
    [rows],
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">Loading debt tracker…</CardContent>
      </Card>
    );
  }

  if (!rows.length) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          No active debts with a balance to track.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingDown className="h-4 w-4 text-emerald-500" /> Debt Payoff Tracker
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          How much of each payment actually reduces the balance, plus the projected payoff month.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total balance', value: formatCurrency(totals.balance) },
            { label: 'Monthly payments', value: formatCurrency(totals.payment) },
            { label: 'Goes to principal', value: formatCurrency(totals.principal), tone: 'text-emerald-500' },
            { label: 'Goes to interest', value: formatCurrency(totals.interest), tone: 'text-rose-500' },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className={cn('mt-1 text-lg font-bold tabular-nums', s.tone)}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {rows.map((r) => {
            const first = r.schedule[0];
            const isOpen = !!open[r.id];
            return (
              <div key={r.id} className="rounded-lg border border-border/60 p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{r.name}</span>
                    {r.inSettlement && <Badge variant="outline">Settlement</Badge>}
                    <Badge variant="secondary">{r.apr.toFixed(2)}% APR</Badge>
                  </div>
                  <div className="text-right">
                    <p className="font-bold tabular-nums">{formatCurrency(r.balance)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(r.payment)}/mo
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <div>
                    <p className="text-muted-foreground">Principal this month</p>
                    <p className="font-semibold tabular-nums text-emerald-500">
                      {formatCurrency(first?.principal || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Interest this month</p>
                    <p className="font-semibold tabular-nums text-rose-500">
                      {formatCurrency(first?.interest || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Payoff</p>
                    <p className="font-semibold tabular-nums flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      {r.payoff.neverPaysOff ? 'Never at this payment' : fmtDate(r.payoff.payoffDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Months left</p>
                    <p className="font-semibold tabular-nums">
                      {Number.isFinite(r.payoff.months) ? r.payoff.months : '—'}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Balance cleared over the next 12 months</span>
                    <span>{r.cleared12}%</span>
                  </div>
                  <Progress value={r.cleared12} />
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs print:hidden"
                  onClick={() => setOpen((o) => ({ ...o, [r.id]: !o[r.id] }))}
                >
                  {isOpen ? <ChevronDown className="mr-1 h-3 w-3" /> : <ChevronRight className="mr-1 h-3 w-3" />}
                  {isOpen ? 'Hide' : 'Show'} payment-by-payment schedule
                </Button>

                {isOpen && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="text-muted-foreground">
                        <tr className="border-b border-border/60">
                          <th className="py-1 text-left font-medium">Month</th>
                          <th className="py-1 text-right font-medium">Payment</th>
                          <th className="py-1 text-right font-medium">Interest</th>
                          <th className="py-1 text-right font-medium">Principal</th>
                          <th className="py-1 text-right font-medium">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.schedule.slice(0, 24).map((s) => (
                          <tr key={s.month} className="border-b border-border/30">
                            <td className="py-1">{s.monthLabel}</td>
                            <td className="py-1 text-right tabular-nums">{formatCurrency(s.payment)}</td>
                            <td className="py-1 text-right tabular-nums text-rose-500">{formatCurrency(s.interest)}</td>
                            <td className="py-1 text-right tabular-nums text-emerald-500">{formatCurrency(s.principal)}</td>
                            <td className="py-1 text-right tabular-nums font-medium">{formatCurrency(s.endingBalance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {r.schedule.length > 24 && (
                      <p className="pt-1 text-[11px] text-muted-foreground">
                        Showing the first 24 of {r.schedule.length} payments.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
