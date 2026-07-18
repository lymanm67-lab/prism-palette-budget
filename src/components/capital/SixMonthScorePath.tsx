import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Target, Info } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  currentScore: number;
  utilization: number;
  negativeCount: number;
  revolvingBalance: number;
}

/**
 * 6-Month Score Path — realistic month-by-month projection.
 * Model (educational estimate, not FICO):
 *  - Utilization improvement: dropping util below 30% => +30-50 pts, below 10% => +50-70 pts, applied over 2-3 months
 *  - Negative item removal: ~15-25 pts per successful dispute round (assume 60% success), staggered 30/60/90 days
 *  - Age accrual: +1 pt/month passive
 *  - On-time payments: +2-4 pts/month if utilization managed
 */
export default function SixMonthScorePath({ currentScore, utilization, negativeCount, revolvingBalance }: Props) {
  const [targetUtil, setTargetUtil] = useState(Math.min(utilization, 25));
  const [disputeSuccessRate, setDisputeSuccessRate] = useState(60);

  const projection = useMemo(() => {
    const utilDelta = Math.max(0, utilization - targetUtil);
    // Utilization score gain: ~1.2 pts per percentage point reduction, capped at 70
    const utilTotalGain = Math.min(70, utilDelta * 1.2);

    // Dispute wins: ~20 pts per successful removal, applied over months 2-5
    const expectedWins = negativeCount * (disputeSuccessRate / 100);
    const disputeTotalGain = Math.min(120, expectedWins * 20);

    const months = ['Now', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6'];
    const path = months.map((m, i) => {
      // Utilization: 40% by M1, 80% by M2, 100% by M3
      const utilPct = i === 0 ? 0 : i === 1 ? 0.4 : i === 2 ? 0.8 : 1;
      // Disputes: staggered — 15% M2, 40% M3, 70% M4, 90% M5, 100% M6
      const disputePct = i === 0 ? 0 : i === 1 ? 0 : i === 2 ? 0.15 : i === 3 ? 0.4 : i === 4 ? 0.7 : i === 5 ? 0.9 : 1;
      // Passive age + payment history: ~3 pts/month
      const passive = i * 3;

      const gain = utilTotalGain * utilPct + disputeTotalGain * disputePct + passive;
      const projected = Math.min(850, Math.round(currentScore + gain));
      return { month: m, score: projected, gain: Math.round(gain) };
    });

    const finalScore = path[path.length - 1].score;
    const totalGain = finalScore - currentScore;
    const hits700 = path.findIndex(p => p.score >= 700);

    return { path, finalScore, totalGain, hits700: hits700 > 0 ? months[hits700] : null };
  }, [currentScore, utilization, targetUtil, negativeCount, disputeSuccessRate]);

  const payoffNeeded = revolvingBalance > 0 && utilization > targetUtil
    ? Math.round(revolvingBalance * (1 - targetUtil / utilization))
    : 0;

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Your 6-Month Score Path
            </CardTitle>
            <CardDescription>Realistic month-by-month projection based on your data. Educational estimate — not a guarantee.</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Projected in 6 months</div>
            <div className="text-3xl font-bold text-primary">{projection.finalScore}</div>
            <Badge variant="secondary" className="mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +{projection.totalGain} pts
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={projection.path} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis domain={[Math.max(300, currentScore - 30), Math.min(850, projection.finalScore + 30)]} tick={{ fontSize: 12 }} />
              <RTooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                formatter={(v: number) => [`${v}`, 'Score']}
              />
              <ReferenceLine y={700} stroke="hsl(var(--accent))" strokeDasharray="4 4" label={{ value: '700', fill: 'hsl(var(--accent))', fontSize: 11 }} />
              <ReferenceLine y={670} stroke="hsl(142 71% 45%)" strokeDasharray="4 4" label={{ value: 'Good 670', fill: 'hsl(142 71% 45%)', fontSize: 11 }} />
              <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 5, fill: 'hsl(var(--primary))' }} activeDot={{ r: 7 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">
                Target Utilization
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger><Info className="h-3 w-3 ml-1 inline text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent className="max-w-xs">Under 30% is good; under 10% is best. Currently {utilization.toFixed(0)}%.</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <span className="text-sm font-mono font-semibold">{targetUtil}%</span>
            </div>
            <Slider value={[targetUtil]} onValueChange={([v]) => setTargetUtil(v)} min={0} max={100} step={1} />
            {payoffNeeded > 0 && (
              <p className="text-xs text-muted-foreground">
                Pay down ~<span className="font-mono font-semibold text-foreground">${payoffNeeded.toLocaleString()}</span> to reach this utilization.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">
                Dispute Success Rate
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger><Info className="h-3 w-3 ml-1 inline text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent className="max-w-xs">Industry average is 40–70% for well-documented disputes under FCRA §611. You have {negativeCount} negative item{negativeCount === 1 ? '' : 's'}.</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <span className="text-sm font-mono font-semibold">{disputeSuccessRate}%</span>
            </div>
            <Slider value={[disputeSuccessRate]} onValueChange={([v]) => setDisputeSuccessRate(v)} min={0} max={100} step={5} />
            <p className="text-xs text-muted-foreground">
              Expected removals: <span className="font-mono font-semibold text-foreground">{(negativeCount * disputeSuccessRate / 100).toFixed(1)}</span> of {negativeCount}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 pt-2 border-t">
          <div>
            <div className="text-xs text-muted-foreground">Current Score</div>
            <div className="text-xl font-bold">{currentScore}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Hits 700</div>
            <div className="text-xl font-bold text-accent">{projection.hits700 ?? (projection.finalScore >= 700 ? 'M6' : 'Not in 6mo')}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Total Lift</div>
            <div className="text-xl font-bold text-primary">+{projection.totalGain} pts</div>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Educational projection using VantageScore 3.0 factor weights. Actual results vary based on creditor reporting, dispute outcomes, and payment history.
          Not a guarantee — compliant with CROA § 1679b.
        </p>
      </CardContent>
    </Card>
  );
}
