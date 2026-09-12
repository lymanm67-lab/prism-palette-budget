// Readiness points — one number showing whether enough preparation has been done.
// Points come from learning and discipline only; profit earns nothing here.

import { Link } from 'react-router-dom';
import { ArrowRight, Award, Lock, Unlock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useReadinessPoints } from '@/hooks/use-swingedge-training';
import {
  LIVE_CONSIDERATION_THRESHOLD,
  PAPER_TRADING_THRESHOLD,
} from '@/lib/swingedge/readinessPoints';

export default function ReadinessPointsCard({ compact = false }: { compact?: boolean }) {
  const points = useReadinessPoints();

  const tone =
    points.stage === 'LIVE_CANDIDATE'
      ? 'border-prism-lime/50 bg-prism-lime/10 text-prism-lime'
      : points.stage === 'PAPER_TRADING'
        ? 'border-prism-amber/50 bg-prism-amber/10 text-prism-amber'
        : 'border-prism-rose/50 bg-prism-rose/10 text-prism-rose';

  const nextGate = points.canPaperTrade ? LIVE_CONSIDERATION_THRESHOLD : PAPER_TRADING_THRESHOLD;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <Award className="h-4 w-4 text-muted-foreground" />
          Readiness points
          <Badge variant="outline" className={cn('text-[10px]', tone)}>
            {points.total} points
          </Badge>
        </CardTitle>
        <CardDescription>{points.headline}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Progress value={points.progressPct} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {points.total} of {nextGate} points toward{' '}
            {points.canPaperTrade ? 'considering small live trades' : 'your first paper trade'}.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex items-start gap-2 rounded-lg border p-3">
            {points.canPaperTrade ? (
              <Unlock className="mt-0.5 h-4 w-4 shrink-0 text-prism-lime" />
            ) : (
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">Paper trading</p>
              <p className="text-xs text-muted-foreground">
                {points.canPaperTrade
                  ? 'Unlocked. Take setups on paper and journal every one.'
                  : `${points.pointsToPaperTrade} points to go — ${PAPER_TRADING_THRESHOLD} needed.`}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg border p-3">
            {points.canConsiderLive ? (
              <Unlock className="mt-0.5 h-4 w-4 shrink-0 text-prism-lime" />
            ) : (
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">Real money conversation</p>
              <p className="text-xs text-muted-foreground">
                {points.canConsiderLive
                  ? 'Preparation done. The behaviour checks below still decide it.'
                  : `${points.pointsToLive} points to go — ${LIVE_CONSIDERATION_THRESHOLD} needed.`}
              </p>
            </div>
          </div>
        </div>

        {compact ? null : (
          <div className="space-y-2">
            {points.lines.map((line) => (
              <div key={line.label} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{line.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {line.detail}
                    {line.possibleNote ? ` · ${line.possibleNote}` : ''}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">+{line.earned}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/swingedge/academy">
              Earn points in the Academy <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
          {points.canPaperTrade ? (
            <Button asChild size="sm">
              <Link to="/swingedge/planner">
                Plan a trade <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
