import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ListTree } from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';
import { usePurposeLedger } from '@/hooks/use-purpose-ledger';
import { CORE_KEYS, type CoreKey } from '@/lib/budgeting/blueprint5010';
import { PURPOSE_META } from '@/lib/budgeting/moneyPurpose';
import { cn } from '@/lib/utils';

/**
 * Per-month, line-level proof of the 50/10/20/20 percentages: every transaction
 * and payroll item that lands in each bucket, plus everything deliberately
 * excluded and why.
 */
export default function PurposeLedger({ month, netIncome }: { month: string; netIncome: number }) {
  const { formatCurrency } = useCurrency();
  const ledger = usePurposeLedger(month);
  const [open, setOpen] = useState<CoreKey | null>(null);

  const pct = (n: number) => (netIncome > 0 ? ((n / netIncome) * 100).toFixed(1) : '0.0');

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="font-display flex items-center gap-2 text-sm">
          <ListTree className="h-4 w-4 text-primary" />
          Bucket Ledger — verify every percentage
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Line-by-line for {month}. Percentages are measured against take-home income of {formatCurrency(netIncome)}.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {ledger.loading && <p className="text-xs text-muted-foreground">Loading transactions…</p>}

        {CORE_KEYS.map((key) => {
          const b = ledger.buckets[key];
          const meta = PURPOSE_META[key];
          const isOpen = open === key;
          return (
            <Collapsible key={key} open={isOpen} onOpenChange={(v) => setOpen(v ? key : null)}>
              <CollapsibleTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-lg border border-border/60 bg-card/60 p-2.5 text-left transition-colors hover:bg-muted/50">
                  <span className="h-6 w-1.5 rounded-full" style={{ background: meta.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold" style={{ color: meta.color }}>
                      {meta.short}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {b.lines.length} item{b.lines.length === 1 ? '' : 's'}
                      {b.payrollTotal > 0 && ` · incl. ${formatCurrency(b.payrollTotal)} payroll credit`}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-sm font-bold tabular-nums">{formatCurrency(b.total)}</span>
                    <span className="block text-[11px] text-muted-foreground tabular-nums">{pct(b.total)}% of net</span>
                  </span>
                  <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-1 overflow-x-auto rounded-lg border border-border/40">
                  <table className="w-full text-[11px]">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-medium">Date</th>
                        <th className="px-2 py-1.5 text-left font-medium">Item</th>
                        <th className="px-2 py-1.5 text-left font-medium">Category</th>
                        <th className="px-2 py-1.5 text-left font-medium">Source</th>
                        <th className="px-2 py-1.5 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {b.lines.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-2 py-3 text-center text-muted-foreground">
                            Nothing counted toward {meta.short} this month.
                          </td>
                        </tr>
                      )}
                      {b.lines.map((l) => (
                        <tr key={l.id} className="border-t border-border/30">
                          <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-muted-foreground">{l.date}</td>
                          <td className="px-2 py-1.5">
                            {l.description}
                            {l.note && <span className="block text-[10px] text-muted-foreground">{l.note}</span>}
                          </td>
                          <td className="px-2 py-1.5 text-muted-foreground">{l.categoryName}</td>
                          <td className="px-2 py-1.5">
                            <Badge variant="outline" className="text-[9px] uppercase">
                              {l.source}
                            </Badge>
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{formatCurrency(l.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-border/60 bg-muted/30 font-semibold">
                      <tr>
                        <td className="px-2 py-1.5" colSpan={4}>
                          Transactions {formatCurrency(b.transactionsTotal)}
                          {b.payrollTotal > 0 && ` + payroll ${formatCurrency(b.payrollTotal)}`}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{formatCurrency(b.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}

        {ledger.excluded.length > 0 && (
          <div className="rounded-lg border border-dashed border-border/60 p-2.5">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Deliberately excluded (no double counting)
            </p>
            <ul className="space-y-1 text-[11px] text-muted-foreground">
              {ledger.excluded.map((e) => (
                <li key={e.label} className="flex flex-wrap items-baseline justify-between gap-2">
                  <span>
                    <span className="font-medium text-foreground">{e.label}</span> · {e.count} item{e.count === 1 ? '' : 's'} — {e.reason}
                  </span>
                  <span className="tabular-nums">{formatCurrency(e.total)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
