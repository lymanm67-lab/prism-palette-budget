// Multi-timeframe alignment card. One row per timeframe, plus a panel per
// timeframe showing only what that timeframe is responsible for.

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import CollapsibleSection from '@/components/swingedge/CollapsibleSection';
import {
  MTF_MANAGEMENT_TEXT,
  MTF_PRINCIPLE,
  MTF_REVALIDATION_TRIGGERS,
  MTF_STOP_TEXT,
  type AlignmentState,
  type MtfRow,
  type MultiTimeframeResult,
} from '@/lib/swingedge/multiTimeframe';

const ALIGN_TONE: Record<AlignmentState, string> = {
  STRONG_ALIGNMENT: 'bg-prism-lime/15 text-prism-lime border-prism-lime/40',
  ALIGNED: 'bg-prism-lime/10 text-prism-lime border-prism-lime/30',
  MIXED: 'bg-prism-amber/15 text-prism-amber border-prism-amber/40',
  CONFLICT: 'bg-prism-rose/15 text-prism-rose border-prism-rose/40',
};

const num = (n: number | null, suffix = '') => (n === null ? '—' : `${n}${suffix}`);

/** Only the fields that timeframe is actually responsible for. */
function panelFields(row: MtfRow): { label: string; value: string }[] {
  const m = row.metrics;
  const structure =
    m.structure === 'HIGHER_HIGHS_AND_LOWS'
      ? 'Higher highs and higher lows'
      : m.structure === 'LOWER_HIGHS_AND_LOWS'
        ? 'Lower highs and lower lows'
        : m.structure === 'MIXED'
          ? 'Mixed'
          : '—';

  const common = [
    { label: 'Trend', value: m.trend ?? '—' },
    { label: 'Structure', value: structure },
  ];

  if (row.key === 'WEEKLY') {
    return [
      ...common,
      { label: '20 EMA', value: num(m.ema20) },
      { label: '50 SMA', value: num(m.sma50) },
      { label: 'Major support', value: num(m.support) },
      { label: 'Major resistance', value: num(m.resistance) },
    ];
  }
  if (row.key === 'DAILY') {
    return [
      ...common,
      { label: 'Setup', value: m.setup ?? '—' },
      { label: '20 EMA', value: num(m.ema20) },
      { label: '50 SMA', value: num(m.sma50) },
      { label: 'RSI 14', value: num(m.rsi) },
      { label: 'ATR 14', value: num(m.atr) },
      { label: 'Support', value: num(m.support) },
      { label: 'Resistance', value: num(m.resistance) },
      { label: 'Volume vs normal', value: num(m.relativeVolume ? Math.round(m.relativeVolume * 100) / 100 : null, '×') },
    ];
  }
  if (row.key === 'H4') {
    return [
      ...common,
      { label: 'Momentum', value: m.rsiState ?? '—' },
      { label: 'RSI 14', value: num(m.rsi) },
      { label: 'Support response', value: num(m.support) },
      { label: 'Resistance', value: num(m.resistance) },
      { label: 'Normal move', value: num(m.atrPercentOfPrice, '% of price') },
    ];
  }
  if (row.key === 'H1') {
    return [
      ...common,
      { label: 'Momentum', value: m.rsiState ?? '—' },
      { label: 'Short-term support', value: num(m.support) },
      { label: 'Short-term resistance', value: num(m.resistance) },
      { label: 'Volume vs normal', value: num(m.relativeVolume ? Math.round(m.relativeVolume * 100) / 100 : null, '×') },
    ];
  }
  return [
    { label: 'Momentum', value: m.rsiState ?? '—' },
    { label: 'Intraday support', value: num(m.support) },
    { label: 'Intraday resistance', value: num(m.resistance) },
  ];
}

export default function MultiTimeframeCard({
  result,
  className,
}: {
  result: MultiTimeframeResult | null;
  className?: string;
}) {
  if (!result) return null;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Multi-timeframe alignment</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn('font-semibold', ALIGN_TONE[result.alignment])}>
              {result.score}/100 · {result.alignmentLabel}
            </Badge>
            <Badge variant="secondary">{result.decision.replace('_', ' ')}</Badge>
          </div>
        </div>
        <CardDescription>{result.headline}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <Progress value={result.score} className="h-2" />

        <div className="space-y-1">
          {result.rows.map((row) => (
            <div key={row.key} className="flex items-start justify-between gap-3 border-b border-border/40 pb-1">
              <div>
                <span className="font-medium">{row.label}</span>
                <span className="ml-2 text-xs text-muted-foreground">{row.role}</span>
              </div>
              <div className="text-right">
                <div className={cn('text-xs font-semibold', !row.available && 'text-muted-foreground')}>
                  {row.available ? row.stateLabel : 'not read'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {row.points.toFixed(1)} of {row.weight}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-2 rounded-md border border-border/50 bg-muted/20 p-3 text-xs sm:grid-cols-3">
          <div>
            <div className="text-muted-foreground">Daily thesis</div>
            <div>{result.dailyThesis}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Entry timeframe</div>
            <div>{result.entryTimeframe}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Management timeframe</div>
            <div>{result.managementTimeframe}</div>
          </div>
        </div>

        {result.hardGates.map((g) => (
          <p
            key={g}
            className="flex gap-2 rounded-md border border-prism-rose/40 bg-prism-rose/10 p-2 text-prism-rose"
          >
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> {g}
          </p>
        ))}

        {result.warnings.map((w) => (
          <p
            key={w.code}
            className="flex gap-2 rounded-md border border-prism-amber/40 bg-prism-amber/10 p-2 text-xs text-prism-amber"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <span className="font-semibold">{w.label}</span> — {w.detail}
            </span>
          </p>
        ))}

        <Tabs defaultValue="DAILY">
          <TabsList className="flex flex-wrap">
            {result.rows.map((row) => (
              <TabsTrigger key={row.key} value={row.key}>
                {row.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {result.rows.map((row) => (
            <TabsContent key={row.key} value={row.key} className="space-y-2 pt-2">
              <p className="text-xs text-muted-foreground">{row.question}</p>
              <p className="text-sm">{row.headline}</p>
              {row.available ? (
                <div className="grid gap-2 text-xs sm:grid-cols-3">
                  {panelFields(row).map((f) => (
                    <div key={f.label} className="rounded-md border border-border/40 p-2">
                      <div className="text-muted-foreground">{f.label}</div>
                      <div className="font-medium tabular-nums">{f.value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  This timeframe has no data here, so nothing is being assumed about it.
                </p>
              )}
            </TabsContent>
          ))}
        </Tabs>

        <CollapsibleSection id="mtf-rules" title="How the timeframes are used" defaultOpen={false}>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {MTF_PRINCIPLE.map((p) => (
              <li key={p}>· {p}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">{MTF_MANAGEMENT_TEXT}</p>
          <p className="mt-1 text-xs text-muted-foreground">{MTF_STOP_TEXT}</p>
          <p className="mt-2 text-xs font-medium">Read this again when:</p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {MTF_REVALIDATION_TRIGGERS.map((t) => (
              <li key={t}>· {t}</li>
            ))}
          </ul>
        </CollapsibleSection>
      </CardContent>
    </Card>
  );
}
