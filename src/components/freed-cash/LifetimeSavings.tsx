import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FreedCashSource, summarizeLifetime } from '@/hooks/use-freed-cash';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const money2 = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export function LifetimeSavings({ sources }: { sources: FreedCashSource[] }) {
  const lifetime = useMemo(() => summarizeLifetime(sources), [sources]);
  const historicalRows = lifetime.rows.filter((r) => r.source.status === 'historical');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Lifetime savings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total avoided spend</p>
              <p className="text-3xl font-bold">{money(lifetime.total)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Accrued from each cancellation date through today.
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Historical items</p>
              <p className="text-2xl font-semibold">{money(lifetime.historicalTotal)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Older cancellations — excluded from the active monthly figure.
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Current sources</p>
              <p className="text-2xl font-semibold">{money(lifetime.activeTotal)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Accrued savings from sources still tracked and verified.
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Estimated: each row assumes the monthly savings amount held steady since its effective date. Mark
            an item <span className="font-medium">Historical</span> to keep it out of redirects and sweeps
            while still counting it here.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">By year cancelled</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lifetime.byYear.length === 0 && (
              <p className="text-sm text-muted-foreground">No sources recorded yet.</p>
            )}
            {lifetime.byYear.map((y) => (
              <div key={y.year} className="flex items-center justify-between text-sm">
                <span className="font-medium">{y.year}</span>
                <span className="flex items-center gap-2">
                  <Badge variant="secondary">{y.count}</Badge>
                  <span className="font-semibold">{money(y.amount)}</span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top vendors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lifetime.byVendor.slice(0, 12).map((v) => (
              <div key={v.vendor} className="flex items-center justify-between text-sm">
                <span className="truncate pr-2">{v.vendor}</span>
                <span className="flex items-center gap-2 whitespace-nowrap">
                  <span className="text-xs text-muted-foreground">{money2(v.monthly)}/mo</span>
                  <span className="font-semibold">{money(v.amount)}</span>
                </span>
              </div>
            ))}
            {lifetime.byVendor.length === 0 && (
              <p className="text-sm text-muted-foreground">No sources recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Historical items ({historicalRows.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {historicalRows.length === 0 && (
            <p className="text-sm text-muted-foreground">
              None yet. Add older cancellations on the Sources tab and set status to “Historical (already
              cancelled)”.
            </p>
          )}
          {historicalRows.map((r, i) => (
            <div key={r.source.id}>
              {i > 0 && <Separator className="mb-3" />}
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <div>
                  <p className="font-medium">{r.source.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.source.vendor ? `${r.source.vendor} · ` : ''}
                    since {r.source.effective_date} · {r.months} months · {money2(r.monthly)}/mo
                  </p>
                </div>
                <span className="font-semibold">{money(r.accrued)}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
