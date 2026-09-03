import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buildTimeline } from '@/lib/freed-cash/analytics';
import type { FreedCashRedirect, FreedCashSource } from '@/hooks/use-freed-cash';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

const KIND_LABEL: Record<string, string> = {
  effective: 'Took effect',
  verified: 'Verified',
  reversed: 'Reversed',
  renewal: 'Renewal',
  resume: 'Pause ends',
  redirect: 'Redirect',
};

interface Props {
  sources: FreedCashSource[];
  redirects: FreedCashRedirect[];
}

export function FreedCashTimeline({ sources, redirects }: Props) {
  const events = useMemo(() => buildTimeline(sources, redirects), [sources, redirects]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Freed cash history</CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          Every change, verification, reversal, renewal and redirect in one chronological record.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {events.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nothing recorded yet. Add a freed cash source to start the history.
          </p>
        )}
        {events.map((e, i) => (
          <div
            key={`${e.date}-${e.kind}-${i}`}
            className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border/60 bg-card/40 p-3"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={e.date > today ? 'outline' : 'secondary'}>{KIND_LABEL[e.kind]}</Badge>
                <p className="text-sm font-medium">{e.title}</p>
                {e.date > today && <span className="text-xs text-muted-foreground">upcoming</span>}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{e.detail}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                {new Date(e.date + 'T00:00:00').toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
              {e.monthly !== 0 && (
                <p className={`text-sm font-semibold ${e.monthly < 0 ? 'text-destructive' : ''}`}>
                  {money(e.monthly)}/mo
                </p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
