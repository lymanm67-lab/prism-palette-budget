import { useMemo } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { analyzeLiquidity, PRESSURE_LABEL } from '@/lib/swingedge/liquidity';
import type { Candle } from '@/lib/swingedge/types';

const compact = (n: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

export default function LiquidityPressureCard({ candles, symbol }: { candles: Candle[]; symbol: string }) {
  const read = useMemo(() => analyzeLiquidity(candles), [candles]);
  const data = useMemo(
    () =>
      read.bars.slice(-40).map((b) => ({
        date: b.datetime.slice(5, 10),
        Buying: Math.round(b.buyVolume),
        Selling: -Math.round(b.sellVolume),
      })),
    [read.bars],
  );
  const buyPct = read.buyShare20 != null ? Math.round(read.buyShare20 * 100) : null;
  const tone =
    read.score == null ? 'secondary' : read.score >= 57 ? 'default' : read.score <= 43 ? 'destructive' : 'secondary';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Buyer vs seller pressure · {symbol}</CardTitle>
          {read.state && <Badge variant={tone as 'default'}>{PRESSURE_LABEL[read.state]}</Badge>}
        </div>
        <CardDescription>
          Who has been pushing price over the last 20 candles, and whether there is enough trading to get clean fills.
          Supporting evidence only — price structure still comes first.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Pressure score" value={read.score != null ? `${read.score}/100` : 'not available'} />
          <Stat label="Buy share (20)" value={buyPct != null ? `${buyPct}%` : 'not available'} />
          <Stat label="Relative volume" value={read.relativeVolume != null ? `${read.relativeVolume.toFixed(2)}×` : 'not available'} />
          <Stat
            label="Liquidity"
            value={read.avgDollarVolume != null ? `${read.grade} · $${compact(read.avgDollarVolume)}/day` : 'UNKNOWN'}
          />
        </div>

        {buyPct != null && (
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Buyers {buyPct}%</span>
              <span>Sellers {100 - buyPct}%</span>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full bg-muted">
              <div className="bg-prism-lime" style={{ width: `${buyPct}%` }} />
              <div className="flex-1 bg-destructive/80" />
            </div>
          </div>
        )}

        {data.length > 0 && (
          <div className="h-48 w-full">
            <ResponsiveContainer>
              <BarChart data={data} stackOffset="sign" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} interval={6} />
                <YAxis tickFormatter={(v) => compact(Math.abs(v))} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={44} />
                <Tooltip
                  formatter={(v: number, n: string) => [compact(Math.abs(v)), `${n} volume (est.)`]}
                  contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--popover-foreground))' }}
                  labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                  itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                />
                <Bar dataKey="Buying" stackId="v" fill="hsl(var(--prism-lime))" />
                <Bar dataKey="Selling" stackId="v" fill="hsl(var(--destructive))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <ul className="space-y-1 text-xs text-muted-foreground">
          {read.obvTrend && <li>Volume trend (OBV): {read.obvTrend.toLowerCase()}.</li>}
          {read.cmf20 != null && <li>Money flow (CMF 20): {read.cmf20.toFixed(2)}.</li>}
          {read.notes.map((n) => <li key={n}>{n}</li>)}
        </ul>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
