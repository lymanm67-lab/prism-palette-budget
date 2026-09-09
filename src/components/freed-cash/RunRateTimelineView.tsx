import { useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { FreedCashSource } from '@/hooks/use-freed-cash';
import { runRateTimeline } from '@/lib/freed-cash/reality';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

interface Props {
  sources: FreedCashSource[];
}

/** When each future saving becomes active, and the run rate it produces. */
export function RunRateTimelineView({ sources }: Props) {
  const { current, events, endingRunRate } = useMemo(() => runRateTimeline(sources, new Date(), 24), [sources]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Future run rate timeline</CardTitle>
        <CardDescription>
          Additions from the pipeline and losses from expirations, in date order. Nothing here counts as realized
          savings yet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Current run rate</p>
            <p className="text-xl font-semibold">{money(current)}/mo</p>
            <p className="text-[11px] text-muted-foreground">{money(current * 12)} annualized</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Run rate after every event below</p>
            <p className="text-xl font-semibold">{money(endingRunRate)}/mo</p>
            <p className="text-[11px] text-muted-foreground">{money(endingRunRate * 12)} annualized</p>
          </div>
        </div>

        {events.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No upcoming additions or expirations in the next 24 months.
          </p>
        ) : (
          <ol className="relative space-y-3 border-l border-border pl-5">
            {events.map((e, i) => (
              <li key={`${e.date}-${e.sourceName}-${i}`} className="relative">
                <span
                  className={`absolute -left-[27px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full ${
                    e.direction === 'added' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-destructive/20 text-destructive'
                  }`}
                >
                  {e.direction === 'added' ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                </span>
                <div className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">{e.label}</p>
                      <p className="text-sm font-medium">{e.sourceName}</p>
                    </div>
                    <Badge variant={e.direction === 'added' ? 'default' : 'destructive'} className="text-[11px]">
                      {e.direction === 'added' ? '+' : '−'}
                      {money(e.amount)}/mo
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    New run rate {money(e.runRateAfter)}/mo · {money(e.annualizedAfter)} annualized
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
