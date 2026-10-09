// Trade Planner — Liquidity Confirmation Checklist (Phase 2).
// Turns the liquidity engine's read into plain pass/fail checks the trader
// confirms before committing. Thin liquidity or sellers in control fails the
// check; missing data is shown as unknown, never guessed.

import { useMemo } from 'react';
import { CheckCircle2, CircleDashed, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { analyzeLiquidity, PRESSURE_LABEL } from '@/lib/swingedge/liquidity';
import type { Candle } from '@/lib/swingedge/types';

type Status = 'PASS' | 'FAIL' | 'UNKNOWN';

interface LiquidityCheck {
  key: string;
  status: Status;
  sentence: string;
  detail: string;
}

const Icon = ({ status }: { status: Status }) =>
  status === 'PASS' ? (
    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-prism-lime" />
  ) : status === 'FAIL' ? (
    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
  ) : (
    <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
  );

export default function LiquidityChecklistCard({ candles }: { candles: Candle[] }) {
  const checks = useMemo<LiquidityCheck[]>(() => {
    const read = analyzeLiquidity(candles);
    if (read.score == null) {
      return [
        {
          key: 'data',
          status: 'UNKNOWN',
          sentence: 'Not enough trading history to confirm liquidity.',
          detail: read.notes[0] ?? 'Needs at least 20 candles with volume.',
        },
      ];
    }

    const buyPct = read.buyShare20 != null ? Math.round(read.buyShare20 * 100) : null;
    const list: LiquidityCheck[] = [
      {
        key: 'liquidity',
        status: read.grade === 'THIN' ? 'FAIL' : 'PASS',
        sentence:
          read.grade === 'THIN'
            ? 'Liquidity is thin — fills can slip and stops can gap.'
            : `Liquidity is ${read.grade.toLowerCase()} — clean fills are realistic.`,
        detail:
          read.avgDollarVolume != null
            ? `About $${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(read.avgDollarVolume)} trades per day on average.`
            : 'Dollar volume unavailable.',
      },
      {
        key: 'pressure',
        status:
          read.state === 'SELLERS_IN_CONTROL' ? 'FAIL' : read.state === 'SELLERS_LEANING' ? 'UNKNOWN' : 'PASS',
        sentence:
          read.state === 'SELLERS_IN_CONTROL'
            ? 'Sellers are in control — buyers are not supporting this entry.'
            : read.state === 'SELLERS_LEANING'
              ? 'Sellers are leaning — buyer support is weak.'
              : `${PRESSURE_LABEL[read.state!]} — pressure supports the trade.`,
        detail: `Pressure score ${read.score}/100${buyPct != null ? `, buyers ${buyPct}% of the last 20 candles' volume` : ''}.`,
      },
      {
        key: 'moneyflow',
        status: read.cmf20 != null && read.cmf20 < -0.1 ? 'FAIL' : 'PASS',
        sentence:
          read.cmf20 != null && read.cmf20 < -0.1
            ? 'Money is flowing out of this stock.'
            : 'Money flow is neutral or positive.',
        detail: read.cmf20 != null ? `Chaikin Money Flow (20): ${read.cmf20.toFixed(2)}.` : 'Money flow unavailable.',
      },
      {
        key: 'obv',
        status: read.obvTrend === 'FALLING' ? 'FAIL' : read.obvTrend === 'RISING' ? 'PASS' : 'UNKNOWN',
        sentence:
          read.obvTrend === 'FALLING'
            ? 'Volume trend is falling — participation is drying up.'
            : read.obvTrend === 'RISING'
              ? 'Volume trend is rising — participation is building.'
              : 'Volume trend is flat.',
        detail: 'On-balance volume over the last 20 candles.',
      },
    ];
    return list;
  }, [candles]);

  const failing = checks.filter((c) => c.status === 'FAIL').length;
  const score = useMemo(() => analyzeLiquidity(candles).score, [candles]);

  return (
    <Card className={failing > 0 ? 'border-destructive/50' : undefined}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Liquidity confirmation</CardTitle>
          {score != null && (
            <Badge variant={failing > 0 ? 'destructive' : 'outline'} className="text-xs">
              {score}/100
            </Badge>
          )}
        </div>
        <CardDescription>
          {failing === 0
            ? 'Liquidity and buyer/seller pressure support this trade.'
            : `${failing} liquidity ${failing === 1 ? 'check fails' : 'checks fail'} — size down or wait.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {checks.map((c) => (
            <li key={c.key} className="flex gap-2 text-sm">
              <Icon status={c.status} />
              <span className="min-w-0">
                <span className={c.status === 'FAIL' ? 'font-medium text-destructive' : 'font-medium'}>
                  {c.sentence}
                </span>
                <span className="block text-xs text-muted-foreground">{c.detail}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Estimated from where each candle closed in its range — not actual order flow. Supporting evidence only;
          price structure still comes first.
        </p>
      </CardContent>
    </Card>
  );
}
