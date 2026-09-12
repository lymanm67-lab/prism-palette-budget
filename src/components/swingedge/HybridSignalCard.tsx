import { AlertTriangle, CheckCircle2, CircleSlash, Clock, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { CONFIDENCE_DISCLAIMER } from '@/lib/swingedge/confidence';
import { NOT_A_PROBABILITY, SIGNAL_MEANING, SIGNAL_TONE, type HybridResult } from '@/lib/swingedge/hybrid';
import { DEVELOPING_LABEL, DEVELOPING_TEXT } from '@/lib/swingedge/signalLifecycle';

export interface HybridSignalCardProps {
  result: HybridResult;
  qualityLabel: string;
  qualityScore: number | null;
  technicalScore: number;
  riskScore: number;
  coveragePct: number | null;
  validUntil: string | null;
  dataSources: string[];
}

function ScoreRow({ label, value, weight, max = 100 }: { label: string; value: number | null; weight: number; max?: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {label} <span className="opacity-70">({Math.round(weight * 100)}% of the total)</span>
        </span>
        <span className="text-sm font-semibold tabular-nums">{value === null ? 'no data' : Math.round(value)}</span>
      </div>
      <Progress value={value === null ? 0 : (value / max) * 100} className="h-1.5" />
    </div>
  );
}

export default function HybridSignalCard({
  result,
  qualityLabel,
  qualityScore,
  technicalScore,
  riskScore,
  coveragePct,
  validUntil,
  dataSources,
}: HybridSignalCardProps) {
  const failed = result.checks.filter((c) => !c.passed);

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Combined signal</CardTitle>
          <div className="flex items-center gap-2">
            {result.developing && (
              <Badge variant="outline" className="border-prism-amber/50 text-prism-amber">
                {DEVELOPING_LABEL}
              </Badge>
            )}
            <Badge variant="outline" className={cn('font-semibold', SIGNAL_TONE[result.signal])}>
              {result.signal}
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{SIGNAL_MEANING[result.signal]}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <div className="text-3xl font-bold tabular-nums">{result.hybridScore ?? '—'}</div>
            <div className="text-xs text-muted-foreground">
              Combined score{result.band ? ` — ${result.band}` : ''}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary">Data confidence: {result.confidence}</Badge>
            {coveragePct !== null && <Badge variant="secondary">Data coverage: {coveragePct}%</Badge>}
            {validUntil && (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" /> Valid until {new Date(validUntil).toLocaleString()}
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <ScoreRow label={qualityLabel} value={qualityScore} weight={result.weights.quality} />
          <ScoreRow label="Chart setup" value={technicalScore} weight={result.weights.technical} />
          <ScoreRow label="Risk quality" value={riskScore} weight={result.weights.risk} />
        </div>

        {result.blocking.length > 0 && (
          <Alert variant="destructive">
            <CircleSlash className="h-4 w-4" />
            <AlertDescription>
              <span className="font-semibold">A rule is broken, so no score can promote this.</span>
              <ul className="mt-1 list-disc pl-4">
                {result.blocking.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Why this reading</h4>
          <ul className="space-y-1 text-sm">
            {result.reasons.map((r) => (
              <li key={r} className="flex gap-2">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-prism-sky" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        {result.conflicts.length > 0 && (
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Where the layers disagree
            </h4>
            <ul className="space-y-1 text-sm">
              {result.conflicts.map((c) => (
                <li key={c.key} className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-prism-amber" />
                  <span>
                    <span className="font-medium">{c.label}. </span>
                    {c.explanation}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Checks {result.checks.length - failed.length}/{result.checks.length} passed
            </h4>
            <ul className="space-y-1 text-xs">
              {result.checks.map((c) => (
                <li key={c.key} className="flex items-start gap-2">
                  {c.passed ? (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-prism-lime" />
                  ) : (
                    <CircleSlash className="mt-0.5 h-3.5 w-3.5 shrink-0 text-prism-rose" />
                  )}
                  <span>
                    {c.label}: needs {c.required}, currently {c.actual}.
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              What would change this
            </h4>
            <ul className="list-disc space-y-1 pl-4 text-xs">
              {result.whatWouldChangeIt.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        </div>

        {result.developing && <p className="text-xs text-prism-amber">{DEVELOPING_TEXT}</p>}

        <div className="space-y-1 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <p>Data sources: {dataSources.join(', ') || 'none'}. Method {result.methodologyVersion}.</p>
          <p>{CONFIDENCE_DISCLAIMER}</p>
          <p>{NOT_A_PROBABILITY}</p>
        </div>
      </CardContent>
    </Card>
  );
}
