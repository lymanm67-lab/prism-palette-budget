import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CalendarCheck, Palmtree, ShieldCheck } from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';
import { monthLabel, summarizeForecast, type ForecastMonth } from '@/lib/budgeting/forecastEngine';
import { bufferStatus, BUFFER_STATUS_LABEL, type BufferThresholds } from '@/lib/budgeting/bufferLedger';

const PCT_ROWS: { key: 'live' | 'enjoy' | 'build_wealth' | 'eliminate_debt'; label: string; floor?: boolean }[] = [
  { key: 'live', label: 'Live' },
  { key: 'enjoy', label: 'Enjoy' },
  { key: 'build_wealth', label: 'Build Wealth', floor: true },
  { key: 'eliminate_debt', label: 'Eliminate Debt', floor: true },
];

const TONE = {
  good: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  watch: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
};

interface Props {
  months: ForecastMonth[];
  thresholds: BufferThresholds;
}

export default function WhatIfOutcomes({ months, thresholds }: Props) {
  const { formatCurrency } = useCurrency();
  const s = useMemo(() => summarizeForecast(months), [months]);

  if (!months.length) return null;

  const status = bufferStatus(s.bufferLow, thresholds);
  const statusTone = status === 'healthy' ? TONE.good : TONE.watch;

  const onTrack = (key: typeof PCT_ROWS[number]['key'], floor?: boolean) => {
    const actual = s.avgPct[key];
    const target = s.targetPct[key];
    return floor ? actual >= target - 1 : actual <= target + 1;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" /> Buffer & 45/10/25/20
          </CardTitle>
          <CardDescription>Averages across the simulated horizon.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-background/40 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Buffer at horizon end</span>
              <Badge variant="outline" className={statusTone}>{BUFFER_STATUS_LABEL[status]}</Badge>
            </div>
            <div className="text-xl font-bold">{formatCurrency(s.bufferEnding)}</div>
            <div className="text-xs text-muted-foreground">
              Low point {formatCurrency(s.bufferLow)}
              {s.bufferLowMonth ? ` in ${monthLabel(s.bufferLowMonth)}` : ''}
            </div>
          </div>

          <div className="space-y-3">
            {PCT_ROWS.map((row) => {
              const actual = s.avgPct[row.key];
              const target = s.targetPct[row.key];
              const ok = onTrack(row.key, row.floor);
              return (
                <div key={row.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{row.label}</span>
                    <span className={ok ? 'text-emerald-500' : 'text-amber-500'}>
                      {actual.toFixed(1)}% / {target}%
                    </span>
                  </div>
                  <Progress value={Math.min(100, target ? (actual / target) * 100 : 0)} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarCheck className="h-4 w-4 text-prism-lime" /> Debt payoff dates
          </CardTitle>
          <CardDescription>
            {s.debtFreeMonth
              ? `Every tracked balance clears by ${monthLabel(s.debtFreeMonth)}.`
              : `${formatCurrency(s.debtEnd)} still open at the end of the horizon.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {s.payoffs
            .slice()
            .sort((a, b) => (a.month || '9999').localeCompare(b.month || '9999'))
            .map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.month ? formatCurrency(p.startBalance) : `${formatCurrency(p.endBalance)} remaining`}
                  </div>
                </div>
                <Badge variant="outline" className={p.month ? TONE.good : ''}>
                  {p.month ? monthLabel(p.month) : 'Beyond horizon'}
                </Badge>
              </div>
            ))}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Palmtree className="h-4 w-4 text-[#1c8fb0]" /> Vacation Fund timeline
          </CardTitle>
          <CardDescription>
            {s.travelFundStartMonth
              ? `Funding starts ${monthLabel(s.travelFundStartMonth)} once vacation debt hits $0.`
              : 'Vacation debt does not clear inside this horizon yet.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="rounded-lg border border-border/60 bg-background/40 p-3">
            <div className="text-xs text-muted-foreground">Saved by horizon end</div>
            <div className="text-xl font-bold">{formatCurrency(s.travelFundTotal)}</div>
          </div>
          {s.travelFundMilestones.length ? (
            s.travelFundMilestones.map((m) => (
              <div
                key={m.amount}
                className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
              >
                <span>{formatCurrency(m.amount)} saved</span>
                <Badge variant="outline">{monthLabel(m.month)}</Badge>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">
              Raise the Travel Fund contribution or add to the snowball to reach the first milestone sooner.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
