import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { fundamentalBand, type FundamentalScoreResult } from '@/lib/swingedge/fundamentals';
import { ADVANCED_PRODUCT_TEXT, type EtfQualityResult } from '@/lib/swingedge/etfQuality';
import { FUNDAMENTAL_PARTIAL_TEXT, FUNDAMENTAL_UNAVAILABLE_TEXT } from '@/lib/swingedge/fundamentalProvider';

interface Props {
  assetType: 'STOCK' | 'ETF';
  fundamental: FundamentalScoreResult | null;
  etf: EtfQualityResult | null;
}

const TREND_TEXT: Record<string, string> = {
  IMPROVING: 'The reported figures are improving over recent periods.',
  STABLE: 'The reported figures are broadly steady.',
  DETERIORATING: 'The reported figures are heading the wrong way.',
  INSUFFICIENT_DATA: 'Not enough reporting periods to judge a direction.',
};

export default function QualityScoreCard({ assetType, fundamental, etf }: Props) {
  const isEtf = assetType === 'ETF';
  const score = isEtf ? (etf?.score ?? null) : (fundamental?.score ?? null);
  const categories = isEtf ? (etf?.categories ?? []) : (fundamental?.categories ?? []);
  const coverage = isEtf ? (etf?.coverage ?? 0) : (fundamental?.coverage ?? 0);
  const confidence = isEtf ? etf?.confidence : fundamental?.confidence;
  const notes = (isEtf ? etf?.notes : fundamental?.notes) ?? [];

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{isEtf ? 'Fund quality' : 'Company quality'}</CardTitle>
          <div className="flex items-center gap-2">
            {!isEtf && <Badge variant="secondary">{fundamentalBand(score)}</Badge>}
            <span className="text-2xl font-bold tabular-nums">{score ?? '—'}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {isEtf
            ? 'A fund is judged on how cleanly it trades and what it holds — never on revenue or earnings it does not have.'
            : 'Judged with thresholds that suit the business model, not one set of numbers for every company.'}
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {score === null && (
          <p className="rounded-md border border-prism-amber/40 bg-prism-amber/10 p-3 text-xs text-prism-amber">
            {FUNDAMENTAL_UNAVAILABLE_TEXT}
          </p>
        )}
        {score !== null && coverage < 1 && (
          <p className="rounded-md border border-prism-amber/30 bg-prism-amber/5 p-3 text-xs text-prism-amber">
            {FUNDAMENTAL_PARTIAL_TEXT}
          </p>
        )}

        {etf?.advancedProduct && (
          <p className="rounded-md border border-prism-rose/40 bg-prism-rose/10 p-3 text-xs text-prism-rose">
            {ADVANCED_PRODUCT_TEXT} Flagged because: {etf.advancedReasons.join(', ')}.
          </p>
        )}

        {!isEtf && fundamental && (
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">{fundamental.profile.label}</Badge>
            <Badge variant="outline">Trend: {fundamental.trend.replace('_', ' ')}</Badge>
            <Badge variant="outline">Valuation: {fundamental.valuation.replace('_', ' ')}</Badge>
          </div>
        )}

        {categories.length > 0 && (
          <ul className="space-y-2">
            {categories.map((c) => (
              <li key={c.key} className="border-b border-border/50 pb-2 last:border-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">{c.label}</span>
                  <span className={cn('text-xs tabular-nums', c.available ? 'text-foreground' : 'text-muted-foreground')}>
                    {c.available ? `${c.points}/${c.max}` : `no data (${c.max} points left out)`}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{c.detail}</p>
              </li>
            ))}
          </ul>
        )}

        {!isEtf && fundamental && fundamental.redFlags.length > 0 && (
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Warning signs</h4>
            <ul className="space-y-1 text-xs">
              {fundamental.redFlags.map((f) => (
                <li key={f.key} className="flex gap-2">
                  <AlertTriangle
                    className={cn(
                      'mt-0.5 h-3.5 w-3.5 shrink-0',
                      f.severity === 'CRITICAL' || f.severity === 'HIGH' ? 'text-prism-rose' : 'text-prism-amber',
                    )}
                  />
                  <span>
                    <span className="font-medium">{f.label} ({f.severity.toLowerCase()}). </span>
                    {f.detail}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-muted-foreground">
              A warning sign never moves a stop. It is a reason to review the idea.
            </p>
          </div>
        )}

        {!isEtf && fundamental && (
          <p className="text-xs text-muted-foreground">{TREND_TEXT[fundamental.trend]}</p>
        )}

        {confidence && (
          <div className="border-t border-border/60 pt-2 text-xs text-muted-foreground">
            <p>
              Data confidence {confidence.level} — score built on {confidence.coveragePct}% of the required figures.
            </p>
            <ul className="list-disc pl-4">
              {confidence.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            {notes.map((n) => (
              <p key={n} className="mt-1">
                {n}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
