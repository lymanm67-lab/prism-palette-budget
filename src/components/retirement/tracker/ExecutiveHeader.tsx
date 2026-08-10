import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Trophy } from 'lucide-react';
import { MILESTONES, money, pct } from '@/lib/retirement/investmentTracker';

interface Props {
  totalPortfolio: number;
  monthlyGain: number | null;
  ytdGain: number;
  ytdContributions: number;
  projectedMillionDate: string;
  projectedFourMDate: string;
  projectedAt85: number;
  ytdReturnPct: number | null;
}

export function ExecutiveHeader({
  totalPortfolio,
  monthlyGain,
  ytdGain,
  ytdContributions,
  projectedMillionDate,
  projectedFourMDate,
  projectedAt85,
  ytdReturnPct,
}: Props) {
  const nextMilestone = MILESTONES.find((m) => m > totalPortfolio) ?? MILESTONES[MILESTONES.length - 1];
  const remaining = Math.max(0, nextMilestone - totalPortfolio);
  const progress = Math.min(100, (totalPortfolio / nextMilestone) * 100);
  const roadTo1M = Math.min(100, (totalPortfolio / 1_000_000) * 100);
  const roadTo4M = Math.min(100, (totalPortfolio / 4_000_000) * 100);

  return (
    <Card className="border-prism-amber/30 bg-gradient-to-br from-primary/10 via-background to-emerald-500/5">
      <CardContent className="p-5 md:p-7 space-y-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-prism-amber">
            Montgomery Retirement Wealth
          </p>
          <p className="text-xs text-muted-foreground mt-2">Current portfolio</p>
          <p className="text-4xl md:text-5xl font-semibold text-foreground tabular-nums">
            {money(totalPortfolio, 2)}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-prism-amber/30 bg-prism-amber/5 p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-prism-amber">
              <Trophy className="h-3.5 w-3.5" /> Next milestone
            </div>
            <p className="text-2xl font-semibold text-foreground mt-1 tabular-nums">
              {money(nextMilestone)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {money(remaining, 2)} to go · {progress.toFixed(2)}%
            </p>
            <Progress value={progress} className="mt-2 h-1.5" />
          </div>

          <div className="rounded-xl border border-border bg-card/60 p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Road to $1 million</p>
            <p className="text-2xl font-semibold text-foreground mt-1 tabular-nums">{roadTo1M.toFixed(2)}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {money(Math.max(0, 1_000_000 - totalPortfolio), 2)} remaining
            </p>
            <Progress value={roadTo1M} className="mt-2 h-1.5" />
          </div>

          <div className="rounded-xl border border-border bg-card/60 p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Road to $4 million</p>
            <p className="text-2xl font-semibold text-foreground mt-1 tabular-nums">{roadTo4M.toFixed(2)}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {money(Math.max(0, 4_000_000 - totalPortfolio), 2)} remaining
            </p>
            <Progress value={roadTo4M} className="mt-2 h-1.5" />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat
            label="This month"
            value={monthlyGain == null ? '—' : money(monthlyGain, 2)}
            hint="Estimated investment gain"
            tone={monthlyGain == null ? 'neutral' : monthlyGain >= 0 ? 'up' : 'down'}
          />
          <Stat
            label="This year"
            value={ytdReturnPct == null ? '—' : pct(ytdReturnPct)}
            hint="Estimated YTD return"
            tone={ytdReturnPct == null ? 'neutral' : ytdReturnPct >= 0 ? 'up' : 'down'}
          />
          <Stat label="Contributions YTD" value={money(ytdContributions, 2)} hint="Employee + employer" />
          <Stat label="Projected $1M" value={projectedMillionDate} hint="At planning baseline" />
          <Stat label="Projected $4M" value={projectedFourMDate} hint="At planning baseline" />
          <Stat label="Value at age 85" value={money(projectedAt85)} hint="Planning baseline" />
        </div>

        <p className="text-[11px] text-muted-foreground">
          YTD investment gain {money(ytdGain, 2)}. Estimated figures are cash-flow adjusted and are not
          institution-reported personal rates of return.
        </p>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'up' | 'down' | 'neutral';
}) {
  const toneClass =
    tone === 'up' ? 'text-emerald-500' : tone === 'down' ? 'text-destructive' : 'text-foreground';
  const Icon = tone === 'up' ? TrendingUp : tone === 'down' ? TrendingDown : null;
  return (
    <div className="rounded-lg border border-border bg-card/60 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold tabular-nums mt-0.5 flex items-center gap-1 ${toneClass}`}>
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {value}
      </p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}
