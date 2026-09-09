import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { FreedCashSource } from '@/hooks/use-freed-cash';
import { neverCutView } from '@/lib/freed-cash/reality';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

interface Props {
  sources: FreedCashSource[];
}

/** The cost of the road not taken: what these bills would still be costing. */
export function NeverCutCard({ sources }: Props) {
  const v = useMemo(() => neverCutView(sources, new Date()), [sources]);
  const year = new Date().getUTCFullYear();
  const pct = v.originalMonthlySpend > 0 ? (v.currentMonthlySpend / v.originalMonthlySpend) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">What if I never cut these costs?</CardTitle>
        <CardDescription>
          Comparing the recurring spending you would still have against what you actually pay now.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Original recurring spending</p>
            <p className="text-xl font-semibold">{money(v.originalMonthlySpend)}/mo</p>
            <p className="text-[11px] text-muted-foreground">{money(v.originalMonthlySpend * 12)} a year</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Current recurring spending</p>
            <p className="text-xl font-semibold text-emerald-600">{money(v.currentMonthlySpend)}/mo</p>
            <p className="text-[11px] text-muted-foreground">
              {pct.toFixed(0)}% of the original level · {money(v.currentMonthlySpend * 12)} a year
            </p>
          </div>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, 100 - pct)}%` }} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: `${year} realized savings`, value: money(v.realizedThisYear), note: 'Already not spent' },
            {
              label: `${year + 1} projected full year`,
              value: money(v.nextYearProjected),
              note: 'If today’s savings stay in place',
            },
            { label: '5-year avoided spending', value: money(v.fiveYearAvoided), note: 'At the current run rate' },
            { label: '10-year avoided spending', value: money(v.tenYearAvoided), note: 'At the current run rate' },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border p-3">
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
              <p className="text-lg font-semibold">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.note}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Projections assume the savings stay in force and no new costs replace them. They are estimates, not
          promises.
        </p>
      </CardContent>
    </Card>
  );
}
