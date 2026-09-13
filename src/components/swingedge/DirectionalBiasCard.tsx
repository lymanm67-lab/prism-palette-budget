// Directional Bias card. A historical tendency, never a forecast.

import { ArrowRight, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import CollapsibleSection from '@/components/swingedge/CollapsibleSection';
import {
  BIAS_CONFIDENCE_LABEL,
  type BiasDirection,
  type DirectionalBias,
} from '@/lib/swingedge/directionalBias';

const TONE: Record<BiasDirection, string> = {
  UP: 'bg-prism-lime/15 text-prism-lime border-prism-lime/40',
  SIDEWAYS: 'bg-muted text-muted-foreground border-border',
  DOWN: 'bg-prism-rose/15 text-prism-rose border-prism-rose/40',
};

const LABEL: Record<BiasDirection, string> = {
  UP: 'Leaned up',
  SIDEWAYS: 'Leaned sideways',
  DOWN: 'Leaned down',
};

const Icon = ({ d }: { d: BiasDirection }) =>
  d === 'UP' ? (
    <TrendingUp className="h-4 w-4" />
  ) : d === 'DOWN' ? (
    <TrendingDown className="h-4 w-4" />
  ) : (
    <Minus className="h-4 w-4" />
  );

export default function DirectionalBiasCard({ bias }: { bias: DirectionalBias }) {
  const primary = bias.periods.find((p) => p.period === bias.primaryPeriod) ?? bias.periods[0] ?? null;
  const insufficient = bias.confidence === 'INSUFFICIENT_DATA';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Directional bias</CardTitle>
          <Badge variant="outline" className={cn('gap-1 font-semibold', TONE[bias.direction])}>
            <Icon d={bias.direction} />
            {LABEL[bias.direction]}
          </Badge>
        </div>
        <CardDescription>
          When conditions looked broadly like this before, this is what followed. It is history, not a prediction.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline">Confidence {BIAS_CONFIDENCE_LABEL[bias.confidence]}</Badge>
          <Badge variant="outline">{bias.independentEpisodes} separate episodes</Badge>
          <Badge variant="outline">{bias.rawMatches} matching days</Badge>
          <Badge variant="outline">Over {bias.primaryPeriod} trading days</Badge>
        </div>

        {insufficient ? (
          <p className="rounded-md border border-border bg-muted/40 p-3 text-sm">
            There is not enough matching history here to read a bias. That is a blank, not a green light.
          </p>
        ) : (
          primary && (
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Finished up', value: primary.upPct, tone: 'text-prism-lime' },
                { label: 'Sideways', value: primary.sidewaysPct, tone: 'text-muted-foreground' },
                { label: 'Finished down', value: primary.downPct, tone: 'text-prism-rose' },
              ].map((c) => (
                <div key={c.label} className="rounded-md border border-border p-2">
                  <p className={cn('text-lg font-semibold', c.tone)}>{c.value}%</p>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                </div>
              ))}
            </div>
          )
        )}

        {primary && !insufficient && (
          <p className="text-xs text-muted-foreground">
            Middle outcome {primary.medianReturnPct}% · average best point along the way{' '}
            {primary.averageFavourableExcursionPct}% · average worst point {primary.averageAdverseExcursionPct}%
          </p>
        )}

        <CollapsibleSection id="analyzer-bias-why" title="Why this bias" defaultOpen={false}>
          <ul className="space-y-1 text-sm">
            {bias.whyThisBias.map((l) => (
              <li key={l} className="flex gap-2">
                <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                <span>{l}</span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>

        <CollapsibleSection id="analyzer-bias-change" title="What would change this bias" defaultOpen={false}>
          <ul className="space-y-1 text-sm">
            {bias.whatWouldChangeThisBias.map((l) => (
              <li key={l} className="flex gap-2">
                <span className="text-muted-foreground">·</span>
                <span>{l}</span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>

        {bias.periods.length > 1 && (
          <CollapsibleSection id="analyzer-bias-periods" title="Every period measured" defaultOpen={false}>
            <div className="space-y-1 text-xs">
              {bias.periods.map((p) => (
                <div key={p.period} className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">{p.period} trading days</span>
                  <span>
                    up {p.upPct}% · sideways {p.sidewaysPct}% · down {p.downPct}% ({p.sampleSize} episodes)
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {bias.warnings.map((w) => (
          <p key={w} className="rounded-md border border-prism-amber/40 bg-prism-amber/10 p-2 text-xs text-prism-amber">
            {w}
          </p>
        ))}

        <p className="text-xs text-muted-foreground">
          A bias can never authorise a trade on its own. Price structure and your risk rules decide that.
        </p>
      </CardContent>
    </Card>
  );
}
