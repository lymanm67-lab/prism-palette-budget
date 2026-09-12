import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { CandleAnalysis } from '@/lib/swingedge/candleEngine';
import type { CandleAssessment } from '@/lib/swingedge/candleContext';

const BAND_TONE: Record<string, string> = {
  'STRONG CONFIRMATION': 'border-prism-emerald/50 text-prism-emerald bg-prism-emerald/10',
  CONFIRMATION: 'border-prism-emerald/40 text-prism-emerald bg-prism-emerald/5',
  'WEAK CONFIRMATION': 'border-prism-amber/50 text-prism-amber bg-prism-amber/10',
  'LOW SIGNIFICANCE': 'border-border text-muted-foreground bg-muted/40',
};

const STATUS_TONE: Record<string, string> = {
  CONFIRMED: 'border-prism-emerald/50 text-prism-emerald',
  DETECTED: 'border-border text-foreground',
  'WAITING FOR CONFIRMATION': 'border-prism-amber/50 text-prism-amber',
  FAILED: 'border-prism-rose/50 text-prism-rose',
};

const price = (n: number | null | undefined) => (n === null || n === undefined ? '—' : `$${n.toFixed(2)}`);

function PatternDetail({ a }: { a: CandleAssessment }) {
  return (
    <div className="space-y-3 rounded-md border border-border/60 bg-background/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{a.pattern.name}</span>
        <Badge variant="outline" className={cn(BAND_TONE[a.band])}>
          {a.band} · {a.score}
        </Badge>
        <Badge variant="outline" className={cn(STATUS_TONE[a.pattern.status])}>
          {a.pattern.status}
        </Badge>
        <Badge variant="outline">{a.role}</Badge>
        <span className="text-xs text-muted-foreground">{a.pattern.date}</span>
      </div>

      <div className="grid gap-2 text-xs sm:grid-cols-3">
        <div>
          <div className="text-muted-foreground">Direction</div>
          <div className="font-medium">{a.pattern.direction}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Where it formed</div>
          <div className="font-medium">{a.location}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Pattern high / low</div>
          <div className="font-medium tabular-nums">
            {price(a.pattern.patternHigh)} / {price(a.pattern.patternLow)}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Confirms above</div>
          <div className="font-medium tabular-nums">{price(a.pattern.confirmationLevel)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Proven wrong at</div>
          <div className="font-medium tabular-nums">
            {price(a.invalidation.price)} <span className="font-normal text-muted-foreground">({a.invalidation.basis})</span>
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Entry area implied</div>
          <div className="font-medium tabular-nums">
            {a.entryZone ? `${price(a.entryZone.low)} – ${price(a.entryZone.high)}` : '—'}
          </div>
        </div>
      </div>

      <ul className="space-y-1">
        {a.components.map((c) => (
          <li key={c.key} className="text-xs">
            <span className="font-medium">
              {c.label} {c.points}/{c.max}
            </span>{' '}
            <span className="text-muted-foreground">{c.detail}</span>
          </li>
        ))}
      </ul>

      {a.flags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {a.flags.map((f) => (
            <Badge key={f} variant="outline" className="text-[11px]">
              {f}
            </Badge>
          ))}
        </div>
      )}

      <div className="space-y-2 text-xs">
        <div>
          <div className="font-semibold uppercase tracking-wide text-muted-foreground">Why does this candle matter?</div>
          <p>{a.why}</p>
        </div>
        <div>
          <div className="font-semibold uppercase tracking-wide text-muted-foreground">
            Why might it not matter?
          </div>
          <p className="text-muted-foreground">{a.whyNot}</p>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        The level above is an input to the stop engine, not a stop. Your stop is set in the Trade Planner, where
        structure and volatility are weighed against it.
      </p>
    </div>
  );
}

export default function CandlePatternCard({
  analysis,
  advanced,
}: {
  analysis: CandleAnalysis;
  advanced?: boolean;
}) {
  const [show, setShow] = useState(true);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  if (!analysis.dataOk) {
    return (
      <Card className="border-prism-amber/40 bg-prism-amber/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Candlestick patterns</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-prism-amber">{analysis.dataMessage}</CardContent>
      </Card>
    );
  }

  const list = showAll ? analysis.history : analysis.assessments.slice(0, 4);
  const conf = analysis.confirmation;

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Candlestick patterns in context</CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="show-candle-patterns" className="text-xs text-muted-foreground">
              Show candle patterns
            </Label>
            <Switch id="show-candle-patterns" checked={show} onCheckedChange={setShow} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          A pattern is evidence about what just happened, never a prediction. Candlestick evidence contributes up to 7
          points inside Setup Quality — it can never on its own make a trade a GO.
        </p>
      </CardHeader>

      {show && (
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline">Trend {analysis.context.trend}</Badge>
            <Badge variant="outline">Setup {analysis.context.setup}</Badge>
            <Badge variant="outline">Weekly {analysis.weeklyTrend ?? 'unknown'}</Badge>
            <Badge variant="outline">
              Contribution to setup quality {conf.setupPoints}/7
            </Badge>
          </div>

          <p className="text-sm">{conf.setupDetail}</p>

          {conf.warnings.length > 0 && (
            <ul className="list-disc space-y-1 rounded-md border border-prism-amber/40 bg-prism-amber/10 p-3 pl-6 text-xs text-prism-amber">
              {conf.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}

          {list.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No pattern reached the display threshold on recent candles. That is a normal outcome, not a fault —
              most days do not produce a meaningful candlestick signal.
            </p>
          )}

          <div className="space-y-2">
            {list.map((a) => {
              const key = `${a.pattern.key}-${a.pattern.index}`;
              const open = openKey === key;
              return (
                <div key={key}>
                  <button
                    type="button"
                    onClick={() => setOpenKey(open ? null : key)}
                    aria-expanded={open}
                    className="flex w-full flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2 text-left text-sm hover:bg-muted/40"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{a.pattern.name}</span>
                      <Badge variant="outline" className={cn('text-[11px]', BAND_TONE[a.band])}>
                        {a.score}
                      </Badge>
                      <Badge variant="outline" className={cn('text-[11px]', STATUS_TONE[a.pattern.status])}>
                        {a.pattern.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{a.location}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{a.pattern.date}</span>
                  </button>
                  {open && (
                    <div className="mt-2">
                      <PatternDetail a={a} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Show only what matters now' : `Show pattern history (${analysis.history.length})`}
            </Button>
            {!advanced && (
              <span className="text-xs text-muted-foreground">
                Beginner mode shows the well-known patterns only. Turn on advanced settings to see everything.
              </span>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
