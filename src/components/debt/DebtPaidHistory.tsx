import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { useDebtPaymentsApplied } from '@/hooks/use-debt-payments-applied';
import { useCurrency } from '@/hooks/use-currency';

/** Paid-off debts list + total debt payments grouped by year and month. */
export default function DebtPaidHistory({ items, paidOffNames }: { items: any[]; paidOffNames: string[] }) {
  const { formatCurrency } = useCurrency();
  const { rows } = useDebtPaymentsApplied(items);
  const [open, setOpen] = useState(false);

  const byYear = useMemo(() => {
    const years = new Map<string, { total: number; months: Map<string, number> }>();
    for (const r of rows) for (const p of r.payments) {
      const y = p.date.slice(0, 4), m = p.date.slice(0, 7);
      const yr = years.get(y) ?? { total: 0, months: new Map() };
      yr.total += p.amount;
      yr.months.set(m, (yr.months.get(m) ?? 0) + p.amount);
      years.set(y, yr);
    }
    return [...years.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [rows]);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Debt paid by month & year</CardTitle>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label="Toggle debt paid history">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-4 text-sm">
          {paidOffNames.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {paidOffNames.map(n => (
                <span key={n} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-prism-teal/15 text-prism-teal">
                  <CheckCircle2 className="h-3 w-3" /> {n} · Paid off
                </span>
              ))}
            </div>
          )}
          {byYear.length === 0 && <p className="text-muted-foreground">No matched debt payments found in your transactions yet.</p>}
          {byYear.map(([year, y]) => (
            <div key={year}>
              <div className="flex justify-between font-semibold border-b border-border/40 pb-1">
                <span>{year}</span><span>{formatCurrency(y.total)}</span>
              </div>
              {[...y.months.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([m, amt]) => (
                <div key={m} className="flex justify-between py-0.5 text-muted-foreground">
                  <span>{new Date(m + '-15').toLocaleDateString(undefined, { month: 'long' })}</span>
                  <span className="text-foreground">{formatCurrency(amt)}</span>
                </div>
              ))}
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Totals come from bank payments matched to each debt by name.</p>
        </CardContent>
      )}
    </Card>
  );
}
