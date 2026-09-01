import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useCurrency } from '@/hooks/use-currency';
import {
  debtCardMetrics, snowballPlan, pslfStatus, type DebtInput,
} from '@/lib/budgeting/debtAmortization';
import { TrendingDown, CalendarClock, Landmark, Snowflake, ShieldCheck } from 'lucide-react';

interface Props {
  /** Raw debt_items rows. */
  items: any[];
}

const fmtDate = (d: Date | null) =>
  d ? d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—';

function toInput(row: any): DebtInput {
  return {
    id: row.id,
    name: row.name,
    balance: Number(row.balance || 0),
    apr: Number(row.interest_rate || 0),
    minimumPayment: Number(row.minimum_payment || 0),
    extraPayment: Number(row.extra_payment || 0),
    dueDay: row.due_day ? Number(row.due_day) : null,
    separatePayment: Number(row.settlement_separate_payment || 0),
    inSettlement: !!row.in_settlement_plan,
    businessSplitPct: Number(row.business_split_pct || 0),
    pslf: row.forgiveness_eligible
      ? {
          made: Number(row.pslf_payments_made || 0),
          required: 120,
          forgivenessDate: row.forgiveness_date || null,
        }
      : null,
  };
}

export function DebtCardsPanel({ items }: Props) {
  const { formatCurrency } = useCurrency();

  const inputs = useMemo(() => (items || []).map(toInput), [items]);

  // Snowball order: smallest balance first, forgiveness debts excluded.
  const snowballOrdered = useMemo(
    () => inputs.filter((d) => !d.pslf && d.balance > 0).sort((a, b) => a.balance - b.balance),
    [inputs],
  );
  const steps = useMemo(() => snowballPlan(snowballOrdered), [snowballOrdered]);
  const stepById = useMemo(
    () => new Map(steps.map((s) => [s.debtId, s])),
    [steps],
  );

  const totals = useMemo(() => {
    const balance = inputs.reduce((s, d) => s + d.balance, 0);
    const monthly = inputs.reduce((s, d) => s + d.minimumPayment + (d.extraPayment || 0) + (d.separatePayment || 0), 0);
    const interestAvoided = inputs.reduce((s, d) => s + debtCardMetrics(d).interestAvoided, 0);
    return { balance, monthly, interestAvoided };
  }, [inputs]);

  if (!inputs.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Add a debt to see per-debt payoff dates, interest avoided and the snowball order.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total balance</p>
            <p className="text-2xl font-bold">{formatCurrency(totals.balance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Monthly commitment</p>
            <p className="text-2xl font-bold">{formatCurrency(totals.monthly)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Interest avoided by extra payments</p>
            <p className="text-2xl font-bold text-emerald-500">
              {formatCurrency(totals.interestAvoided)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {inputs.map((d) => {
          const m = debtCardMetrics(d);
          const step = stepById.get(d.id);
          const pslf = d.pslf ? pslfStatus(d) : null;
          const paidPct = pslf
            ? Math.min(100, (pslf.made / (pslf.required || 120)) * 100)
            : null;

          return (
            <Card key={d.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  {d.name}
                  {d.inSettlement && (
                    <Badge variant="secondary" className="gap-1">
                      <ShieldCheck className="h-3 w-3" /> Settlement
                    </Badge>
                  )}
                  {pslf && (
                    <Badge variant="secondary" className="gap-1">
                      <Landmark className="h-3 w-3" /> PSLF
                    </Badge>
                  )}
                  {!!d.businessSplitPct && (
                    <Badge variant="outline">{d.businessSplitPct}% business</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <p className="font-semibold">{formatCurrency(d.balance)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">APR</p>
                    <p className="font-semibold">{d.apr.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Monthly payment</p>
                    <p className="font-semibold">
                      {formatCurrency(m.totalPayment + (d.separatePayment || 0))}
                      {!!d.extraPayment && (
                        <span className="ml-1 text-xs text-emerald-500">
                          (+{formatCurrency(d.extraPayment)} extra)
                        </span>
                      )}
                    </p>
                    {!!d.separatePayment && (
                      <p className="text-xs text-muted-foreground">
                        incl. {formatCurrency(d.separatePayment)} billed separately
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {pslf ? 'Forgiveness date' : 'Projected payoff'}
                    </p>
                    <p className="font-semibold">
                      {pslf ? fmtDate(pslf.forgiveness) : fmtDate(m.current.payoffDate)}
                    </p>
                  </div>
                </div>

                {pslf ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        {pslf.made} of {pslf.required} qualifying payments
                      </span>
                      <span>{pslf.remaining} to go</span>
                    </div>
                    <Progress value={paidPct ?? 0} />
                    <p className="text-xs text-muted-foreground">
                      Payments continue at {formatCurrency(d.minimumPayment)}/mo — the remaining
                      balance is forgiven, not amortised to zero.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1 rounded-md bg-muted/40 p-2">
                    <p className="flex items-center gap-2 text-xs">
                      <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />
                      Interest avoided:{' '}
                      <span className="font-semibold text-emerald-500">
                        {formatCurrency(m.interestAvoided)}
                      </span>
                    </p>
                    <p className="flex items-center gap-2 text-xs">
                      <CalendarClock className="h-3.5 w-3.5 text-primary" />
                      {m.monthsAccelerated > 0
                        ? `${m.monthsAccelerated} months earlier than minimums only`
                        : 'Add an extra payment to accelerate this debt'}
                    </p>
                    {step && step.rolledInFrom.length > 0 && (
                      <p className="flex items-center gap-2 text-xs">
                        <Snowflake className="h-3.5 w-3.5 text-sky-500" />
                        Snowball adds{' '}
                        {formatCurrency(step.totalPayment - step.minimumPayment - step.extraPayment)}{' '}
                        from {step.rolledInFrom.map((r) => r.name).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {steps.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Snowball order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {steps.map((s, i) => (
              <div key={s.debtId} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0">
                <span className="flex items-center gap-2">
                  <Badge variant="outline">{i + 1}</Badge>
                  {s.name}
                </span>
                <span className="text-right">
                  <span className="font-semibold">{formatCurrency(s.totalPayment)}/mo</span>
                  <span className="block text-xs text-muted-foreground">
                    clears {fmtDate(s.payoffDate)}
                  </span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default DebtCardsPanel;
