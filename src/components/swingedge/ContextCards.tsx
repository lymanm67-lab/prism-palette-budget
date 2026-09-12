// Market regime, relative strength and tradability, shown as evidence.
// None of these is a prediction, and none of them is a separate score on top of
// the Hybrid reading — regime and relative strength shade alignment inside the
// Technical Score, and tradability is a gate on whether a name is worth trading.

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import CollapsibleSection from '@/components/swingedge/CollapsibleSection';
import {
  REGIME_LABEL,
  REGIME_MEANING,
  type MarketRegime,
  type MarketRegimeResult,
} from '@/lib/swingedge/marketRegime';
import { RS_LABEL, type RelativeStrengthResult } from '@/lib/swingedge/relativeStrength';
import type { TradabilityResult } from '@/lib/swingedge/tradability';

const REGIME_TONE: Record<MarketRegime, string> = {
  STRONG_BULL: 'bg-prism-lime/15 text-prism-lime border-prism-lime/40',
  BULL: 'bg-prism-lime/10 text-prism-lime border-prism-lime/30',
  NEUTRAL: 'bg-muted text-muted-foreground border-border',
  TRANSITION: 'bg-prism-amber/15 text-prism-amber border-prism-amber/40',
  HIGH_VOLATILITY: 'bg-prism-amber/15 text-prism-amber border-prism-amber/40',
  CAUTIOUS: 'bg-prism-amber/15 text-prism-amber border-prism-amber/40',
  BEAR: 'bg-prism-rose/15 text-prism-rose border-prism-rose/40',
};

export function MarketRegimeCard({ regime }: { regime: MarketRegimeResult }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">What the market is doing</CardTitle>
          <Badge variant="outline" className={cn('font-semibold', REGIME_TONE[regime.regime])}>
            {REGIME_LABEL[regime.regime]}
          </Badge>
        </div>
        <CardDescription>{REGIME_MEANING[regime.regime]}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>{regime.summary}</p>
        <CollapsibleSection id="analyzer-regime-inputs" title="Every check behind this" defaultOpen={false}>
          <ul className="space-y-1 text-sm">
            {regime.inputs.map((i) => (
              <li key={i.label} className="flex items-start justify-between gap-3">
                <span className={cn(i.passed ? 'text-prism-lime' : 'text-muted-foreground')}>
                  {i.passed ? '✓' : '·'} {i.label}
                </span>
                <span className="text-xs text-muted-foreground">{i.detail}</span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
        <p className="text-xs text-muted-foreground">
          This describes conditions now. It says nothing about what happens next.
        </p>
      </CardContent>
    </Card>
  );
}

export function RelativeStrengthCard({ rs }: { rs: RelativeStrengthResult }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Strength against its benchmark</CardTitle>
          {rs.overall ? (
            <Badge variant="outline" className="font-semibold">
              {RS_LABEL[rs.overall]}
            </Badge>
          ) : (
            <Badge variant="outline">No comparison</Badge>
          )}
        </div>
        <CardDescription>Past {rs.lookback} trading days, side by side.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {rs.comparisons.map((c) => (
          <div key={c.label} className="flex items-start justify-between gap-3">
            <span>{c.label}</span>
            <span className="text-right">
              {c.spreadPct === null ? (
                <span className="text-xs text-muted-foreground">{c.detail}</span>
              ) : (
                <>
                  <span
                    className={cn(
                      'font-semibold tabular-nums',
                      c.spreadPct > 0 ? 'text-prism-lime' : c.spreadPct < 0 ? 'text-prism-rose' : '',
                    )}
                  >
                    {c.spreadPct > 0 ? '+' : ''}
                    {c.spreadPct}%
                  </span>
                  <span className="block text-xs text-muted-foreground">{c.detail}</span>
                </>
              )}
            </span>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          Being stronger in the past is not a promise about the future.
        </p>
      </CardContent>
    </Card>
  );
}

export function TradabilityCard({ t }: { t: TradabilityResult }) {
  const tone =
    t.verdict === 'TRADABLE'
      ? 'bg-prism-lime/15 text-prism-lime border-prism-lime/40'
      : t.verdict === 'THIN'
        ? 'bg-prism-amber/15 text-prism-amber border-prism-amber/40'
        : 'bg-prism-rose/15 text-prism-rose border-prism-rose/40';
  return (
    <Card className={cn(t.hardGate && 'border-destructive')}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Can you get in and out</CardTitle>
          <Badge variant="outline" className={cn('font-semibold', tone)}>
            {t.verdict === 'TRADABLE' ? 'Tradable' : t.verdict === 'THIN' ? 'Thin' : 'Avoid'}
          </Badge>
        </div>
        <CardDescription>{t.summary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: 'Price', value: t.price ? `$${t.price}` : '—' },
            {
              label: 'Average volume',
              value: t.avgVolume === null ? '—' : t.avgVolume.toLocaleString(),
            },
            {
              label: 'Traded daily',
              value:
                t.avgDollarVolume === null
                  ? '—'
                  : `$${Math.round(t.avgDollarVolume / 1_000_000).toLocaleString()}M`,
            },
            { label: 'Daily range', value: t.atrPct === null ? '—' : `${t.atrPct}%` },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border bg-card/50 p-2">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-0.5 font-semibold tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>
        <p>
          <span className="font-semibold">{t.spread.label}:</span>{' '}
          {t.spread.spread === null ? '—' : `$${t.spread.spread} (${t.spread.spreadPct}% of price)`}
        </p>
        <p className="text-xs text-muted-foreground">{t.spread.note}</p>
        <ul className="space-y-1">
          {t.reasons.map((r) => (
            <li key={r} className={cn(t.hardGate && 'font-semibold text-destructive')}>
              {r}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
