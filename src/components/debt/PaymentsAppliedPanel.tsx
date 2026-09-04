import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, ReceiptText } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrency } from '@/hooks/use-currency';
import { useApplyDebtPayments, useDebtPaymentsApplied } from '@/hooks/use-debt-payments-applied';

const fmtDay = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default function PaymentsAppliedPanel({ debts }: { debts: any[] }) {
  const { formatCurrency } = useCurrency();
  const { rows, totals, isLoading } = useDebtPaymentsApplied(debts);
  const apply = useApplyDebtPayments();
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const pending = rows.filter((r) => r.payments.length > 0);

  return (
    <Card className="prism-card-shine border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="font-display flex items-center gap-2 text-lg">
          <ReceiptText className="h-4 w-4 text-prism-teal" /> Payments Applied to Balances
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Payments recorded in Transactions reduce what you owe. Interest is accrued to the payment
          date, and only the principal portion lowers the balance.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Matching payments to debts…</p>
        ) : !pending.length ? (
          <p className="text-sm text-muted-foreground">
            No new payment transactions since each debt's balance date. Balances are current.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Stored balance', value: formatCurrency(totals.storedTotal) },
                { label: 'Live balance', value: formatCurrency(totals.liveTotal), tone: 'text-prism-teal' },
                { label: 'Principal applied', value: formatCurrency(totals.principalTotal), tone: 'text-emerald-500' },
                { label: 'Interest accrued', value: formatCurrency(totals.interestTotal), tone: 'text-rose-500' },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-border/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
                  <p className={`mt-1 font-display text-lg font-bold tabular-nums ${s.tone || ''}`}>{s.value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {pending.map((r) => (
                <div key={r.debtId} className="rounded-lg border border-border/60 p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{r.debtName}</span>
                      <Badge variant="secondary">{r.payments.length} payment{r.payments.length > 1 ? 's' : ''}</Badge>
                      {r.balanceAsOf && (
                        <span className="text-[11px] text-muted-foreground">since {fmtDay(r.balanceAsOf)}</span>
                      )}
                    </div>
                    <div className="text-right text-sm">
                      <span className="text-muted-foreground line-through tabular-nums">
                        {formatCurrency(r.storedBalance)}
                      </span>{' '}
                      <span className="font-bold tabular-nums text-prism-teal">
                        {formatCurrency(r.liveBalance)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Paid</p>
                      <p className="font-semibold tabular-nums">{formatCurrency(r.totalPaid)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">To principal</p>
                      <p className="font-semibold tabular-nums text-emerald-500">{formatCurrency(r.principalPaid)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">To interest</p>
                      <p className="font-semibold tabular-nums text-rose-500">{formatCurrency(r.interestPaid)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="h-7"
                      disabled={apply.isPending}
                      onClick={() =>
                        apply.mutate(
                          { debtId: r.debtId, newBalance: r.liveBalance, asOf: r.payments[0]?.date },
                          {
                            onSuccess: () => toast.success(`${r.debtName} balance updated`),
                            onError: (e: any) => toast.error(e.message || 'Could not update balance'),
                          },
                        )
                      }
                    >
                      Apply to balance
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setOpen((o) => ({ ...o, [r.debtId]: !o[r.debtId] }))}
                    >
                      {open[r.debtId] ? <ChevronDown className="mr-1 h-3 w-3" /> : <ChevronRight className="mr-1 h-3 w-3" />}
                      {open[r.debtId] ? 'Hide' : 'Show'} payments
                    </Button>
                  </div>

                  {open[r.debtId] && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="text-muted-foreground">
                          <tr className="border-b border-border/60">
                            <th className="py-1 text-left font-medium">Date</th>
                            <th className="py-1 text-left font-medium">Merchant</th>
                            <th className="py-1 text-right font-medium">Payment</th>
                            <th className="py-1 text-right font-medium">Interest</th>
                            <th className="py-1 text-right font-medium">Principal</th>
                            <th className="py-1 text-right font-medium">Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.payments.map((p) => (
                            <tr key={p.id} className="border-b border-border/30">
                              <td className="py-1">{fmtDay(p.date)}</td>
                              <td className="py-1">{p.merchant || '—'}</td>
                              <td className="py-1 text-right tabular-nums">{formatCurrency(p.amount)}</td>
                              <td className="py-1 text-right tabular-nums text-rose-500">{formatCurrency(p.interest)}</td>
                              <td className="py-1 text-right tabular-nums text-emerald-500">{formatCurrency(p.principal)}</td>
                              <td className="py-1 text-right tabular-nums font-medium">{formatCurrency(p.balanceAfter)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
