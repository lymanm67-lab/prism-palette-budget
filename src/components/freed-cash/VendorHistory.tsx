import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { vendorRollup } from '@/lib/freed-cash/analytics';
import type { FreedCashSource } from '@/hooks/use-freed-cash';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

export function VendorHistory({ sources }: { sources: FreedCashSource[] }) {
  const rows = useMemo(() => vendorRollup(sources), [sources]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Vendor history</CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          Which vendors gave up real money, which ones clawed it back, and where reactivation risk sits.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">No vendors recorded yet.</p>
        )}
        {rows.map((r) => (
          <div key={r.vendor} className="rounded-lg border border-border/60 bg-card/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{r.vendor}</p>
                <Badge variant="secondary">
                  {r.count} change{r.count === 1 ? '' : 's'}
                </Badge>
                {r.reversals > 0 && <Badge variant="destructive">{r.reversals} reversed</Badge>}
                {r.highRisk > 0 && <Badge variant="outline">{r.highRisk} high risk</Badge>}
              </div>
              <p className="text-sm font-semibold">
                {money(r.verifiedMonthly)}/mo · {money(r.annualVerified)}/yr
              </p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Verified {money(r.verifiedMonthly)} · in pipeline {money(r.pipelineMonthly)} · reversed{' '}
              {money(r.reversedMonthly)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
