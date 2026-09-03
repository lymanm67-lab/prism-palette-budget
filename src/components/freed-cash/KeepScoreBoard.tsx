import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { businessRoi, keepScore } from '@/lib/freed-cash/analytics';
import type { FreedCashSource } from '@/hooks/use-freed-cash';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

const VERDICT: Record<string, { label: string; variant: 'destructive' | 'outline' | 'secondary' }> = {
  cut: { label: 'Cut candidate', variant: 'destructive' },
  review: { label: 'Re-justify', variant: 'outline' },
  keep: { label: 'Earns its place', variant: 'secondary' },
};

export function KeepScoreBoard({ sources }: { sources: FreedCashSource[] }) {
  const rows = useMemo(() => keepScore(sources), [sources]);
  const roi = useMemo(() => businessRoi(rows), [rows]);
  const stillPaying = rows.filter((r) => r.monthlyCost > 0);
  const totalRemaining = stillPaying.reduce((s, r) => s + r.monthlyCost, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Keep Score</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Every recurring expense must earn its place. Score grades what you are still paying —
            {' '}{money(totalRemaining)}/mo across {stillPaying.length} live expense
            {stillPaying.length === 1 ? '' : 's'}.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No sources to score yet.</p>
          )}
          {rows.map((r) => (
            <div key={r.source.id} className="rounded-lg border border-border/60 bg-card/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{r.source.name}</p>
                  <Badge variant={VERDICT[r.verdict].variant}>{VERDICT[r.verdict].label}</Badge>
                  <Badge variant="outline">{r.source.entity_scope}</Badge>
                </div>
                <p className="text-sm font-semibold">
                  {money(r.monthlyCost)}/mo still paid · {money(r.annualCost)}/yr
                </p>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <Progress value={r.score} className="h-2" />
                <span className="w-14 text-right text-xs text-muted-foreground">{r.score}/100</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{r.reasons.join(' · ')}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Business software ROI</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Business tools are judged on what they return, not on habit.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {roi.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No business-scoped sources recorded.
            </p>
          )}
          {roi.map((r) => (
            <div
              key={r.source.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/40 p-3"
            >
              <div>
                <p className="text-sm font-medium">{r.source.name}</p>
                <p className="text-xs text-muted-foreground">{r.verdict}</p>
              </div>
              <p className="text-sm font-semibold">
                {money(r.monthlyCost)}/mo · {money(r.annualCost)}/yr
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
