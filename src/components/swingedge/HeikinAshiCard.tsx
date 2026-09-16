// Heikin Ashi confirmation — a secondary read beside the chart.
//
// Standard candles create the trade. This card only says whether the smoothed
// trend agrees. It never sets a price, a level or a decision.

import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  HA_CONFIRMATION_LABEL,
  HA_HEALTH_LABEL,
  HA_TREND_LABEL,
  HEIKIN_ASHI_NOTE,
  HEIKIN_ASHI_WHAT,
  HEIKIN_ASHI_WHEN,
  haCaution,
  haConfirmation,
  haRead,
  type HaConfirmation,
  type HaRead,
} from '@/lib/swingedge/heikinAshi';
import type { Candle, TrendState } from '@/lib/swingedge/types';

export interface HeikinAshiTimeframeInput {
  key: string;
  label: string;
  candles: Candle[];
  /** Regular-candle trend for the same timeframe, or null when unknown. */
  regularTrend: TrendState | null;
  /** 15-minute is optional and hidden unless the reader asks for it. */
  optional?: boolean;
}

export interface HeikinAshiSummary {
  /** Daily confirmation is the one the rest of SwingEdge may reference. */
  confirmation: HaConfirmation | null;
  daily: HaRead | null;
}

/** Daily-timeframe summary other views can reuse without rendering the card. */
export function heikinAshiSummary(dailyCandles: Candle[], regularTrend: TrendState | null): HeikinAshiSummary {
  const daily = haRead(dailyCandles);
  return { daily, confirmation: haConfirmation(regularTrend, daily) };
}

const TONE: Record<HaConfirmation, string> = {
  CONFIRMS: 'border-prism-lime/40 text-prism-lime',
  PARTIALLY_CONFIRMS: 'border-prism-teal/40 text-prism-teal',
  NEUTRAL: 'border-border text-muted-foreground',
  CONTRADICTS: 'border-destructive/50 text-destructive',
};

export default function HeikinAshiCard({ timeframes }: { timeframes: HeikinAshiTimeframeInput[] }) {
  const [showWhy, setShowWhy] = useState(false);
  const [showOptional, setShowOptional] = useState(false);

  const rows = timeframes
    .filter((t) => !t.optional || showOptional)
    .map((t) => {
      const read = haRead(t.candles);
      return { ...t, read, confirmation: haConfirmation(t.regularTrend, read) };
    });

  const daily = rows.find((r) => r.key === 'DAILY');
  const overall = daily?.confirmation ?? null;
  const caution = haCaution(overall);
  const hasOptional = timeframes.some((t) => t.optional);

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Heikin Ashi confirmation</CardTitle>
          <Badge variant="outline" className={overall ? TONE[overall] : TONE.NEUTRAL}>
            {overall ? HA_CONFIRMATION_LABEL[overall].toUpperCase() : 'NOT AVAILABLE YET'}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{HEIKIN_ASHI_NOTE}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="text-right">
                {r.read ? HA_TREND_LABEL[r.read.trend] : 'not enough history yet'}
                {r.confirmation ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    · {HA_CONFIRMATION_LABEL[r.confirmation].toLowerCase()}
                  </span>
                ) : null}
              </span>
            </div>
          ))}
        </div>

        {daily?.read && (
          <div className="grid gap-1.5 rounded-md border border-border/60 p-2.5 text-sm sm:grid-cols-3">
            <span className="text-muted-foreground">
              Trend persistence: <span className="text-foreground">{daily.read.persistence.toLowerCase()}</span>
            </span>
            <span className="text-muted-foreground">
              Momentum: <span className="text-foreground">{daily.read.momentum.toLowerCase()}</span>
            </span>
            <span className="text-muted-foreground">
              Trend health: <span className="text-foreground">{HA_HEALTH_LABEL[daily.read.health]}</span>
            </span>
          </div>
        )}

        {daily?.read?.reversalWatch && (
          <p className="rounded-md border border-prism-amber/40 bg-prism-amber/5 p-2.5 text-sm">
            <span className="font-medium">Reversal watch.</span> The smoothed trend is losing strength. This is a
            heads-up to review, not a sell signal — wait for actual prices to confirm before changing the trade.
          </p>
        )}

        {caution && <p className="text-sm text-muted-foreground">{caution}</p>}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setShowWhy((v) => !v)}>
            {showWhy ? 'Hide why' : 'Why this reading'}
          </Button>
          {hasOptional && (
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowOptional((v) => !v)}>
              {showOptional ? 'Hide 15-minute' : 'Show 15-minute (optional)'}
            </Button>
          )}
          <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground" title={HEIKIN_ASHI_WHEN}>
            <HelpCircle className="h-3.5 w-3.5" /> What is Heikin Ashi?
          </span>
        </div>

        {showWhy && (
          <div className="space-y-2 rounded-md border border-border/60 p-3 text-sm">
            <p className="text-xs text-muted-foreground">{HEIKIN_ASHI_WHAT}</p>
            {daily?.read ? (
              <ul className="list-disc space-y-1 pl-5">
                {daily.read.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
                {daily.regularTrend ? (
                  <li>
                    The regular daily candles read{' '}
                    {daily.regularTrend === 'UP' ? 'up' : daily.regularTrend === 'DOWN' ? 'down' : 'sideways'}.
                  </li>
                ) : null}
              </ul>
            ) : (
              <p>There is not enough daily history yet to read the smoothed trend.</p>
            )}
            <p className="text-xs text-muted-foreground">
              Heikin Ashi can add confidence or a reason to wait. It can never create a go-ahead on its own, clear a
              blocked trade, or change your entry, stop or target.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
