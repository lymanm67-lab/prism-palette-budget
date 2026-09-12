import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { VERDICT_MEANING, VERDICT_TONE, type SymbolScore } from '@/lib/swingedge/score';
import type { RiskScoreResult } from '@/lib/swingedge/riskScore';

export function TechnicalCard({ score }: { score: SymbolScore }) {
  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Chart setup</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn(VERDICT_TONE[score.verdict])}>
              {score.verdict.replace(/_/g, ' ')}
            </Badge>
            <span className="text-2xl font-bold tabular-nums">{score.score}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{VERDICT_MEANING[score.verdict]}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-2">
          {score.components.map((c) => (
            <li key={c.key} className="border-b border-border/50 pb-2 last:border-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium">{c.label}</span>
                <span className="text-xs tabular-nums">
                  {c.points}/{c.max}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{c.detail}</p>
            </li>
          ))}
        </ul>
        {score.risks.length > 0 && (
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Against it</h4>
            <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              {score.risks.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Reward against risk is deliberately not part of this score — that belongs to the risk layer, so a wide stop
          cannot flatter the chart read.
        </p>
      </CardContent>
    </Card>
  );
}

export function RiskQualityCard({ risk }: { risk: RiskScoreResult }) {
  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Risk quality</CardTitle>
          <span className="text-2xl font-bold tabular-nums">{risk.score}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Graded on the estimated levels below. Your own entry, stop and target in the Trade Planner replace them.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-2">
          {risk.components.map((c) => (
            <li key={c.key} className="border-b border-border/50 pb-2 last:border-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium">{c.label}</span>
                <span className="text-xs tabular-nums">
                  {c.points}/{c.max}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{c.detail}</p>
            </li>
          ))}
        </ul>
        {risk.hardGateFailures.length > 0 && (
          <div className="rounded-md border border-prism-rose/40 bg-prism-rose/10 p-3 text-xs text-prism-rose">
            <p className="font-semibold">Rules broken outright</p>
            <ul className="list-disc pl-4">
              {risk.hardGateFailures.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        )}
        {risk.warnings.length > 0 && (
          <ul className="list-disc space-y-1 pl-4 text-xs text-prism-amber">
            {risk.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
