import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, ListChecks, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';
import type { MoneyPurposeSnapshot } from '@/hooks/use-money-purpose';
import { buildReconciliationAudit } from '@/lib/blueprint/reconciliation';
import { cn } from '@/lib/utils';

const KIND_STYLES: Record<string, string> = {
  gross: 'font-bold border-b border-border',
  deduction: 'text-muted-foreground',
  net: 'font-bold border-y border-primary/30 bg-primary/5',
  bucket: '',
  check: 'font-semibold',
  info: 'text-muted-foreground italic',
};

export default function ReconciliationDrilldown({ snap }: { snap: MoneyPurposeSnapshot }) {
  const { formatCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const audit = useMemo(() => buildReconciliationAudit(snap), [snap]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="font-display flex items-center gap-2 text-sm">
            <ListChecks className="h-4 w-4 text-primary" />
            Every-Dollar Reconciliation
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                'gap-1 text-[10px]',
                audit.balanced
                  ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                  : 'border-red-500/40 text-red-600 dark:text-red-400',
              )}
            >
              {audit.balanced ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
              {audit.balanced ? 'No double counting' : 'Review needed'}
            </Badge>
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-[11px]" onClick={() => setOpen((o) => !o)}>
              {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {open ? 'Hide audit' : 'Show audit'}
            </Button>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          GROSS → payroll withholdings → NET → purpose buckets. Each dollar appears exactly once.
        </p>
      </CardHeader>
      {open && (
        <CardContent className="space-y-3">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-2 py-1.5 text-left">Flow</th>
                  <th className="px-2 py-1.5 text-right">Amount</th>
                  <th className="px-2 py-1.5 text-left">Source</th>
                </tr>
              </thead>
              <tbody>
                {audit.lines.map((l) => (
                  <tr key={l.label} className={cn('border-b last:border-0', KIND_STYLES[l.kind])}>
                    <td className="px-2 py-1.5">
                      {l.label}
                      {l.detail && <p className="text-[10px] font-normal text-muted-foreground">{l.detail}</p>}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{formatCurrency(l.amount)}</td>
                    <td className="px-2 py-1.5 text-[10px] text-muted-foreground">{l.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {audit.doubleCountWarnings.length > 0 ? (
            <div className="space-y-1.5 rounded-lg border border-red-500/30 bg-red-500/5 p-2.5 text-xs">
              {audit.doubleCountWarnings.map((w) => (
                <p key={w} className="flex gap-1.5 text-red-600 dark:text-red-400">
                  <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0" /> {w}
                </p>
              ))}
            </div>
          ) : (
            <p className="flex gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5 text-xs text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" />
              Audit passed: buckets + unallocated tie out to net pay exactly, payroll wealth is credited only once
              (to the BUILD WEALTH target), and employer contributions are memo-only.
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
