import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePracticeToday } from '@/hooks/use-swingedge-practice';
import { useTrainingProgress } from '@/hooks/use-swingedge-training';

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('text-sm font-semibold tabular-nums', tone)}>{value}</p>
    </div>
  );
}

/**
 * "Today's paper trading practice" — the day's practice numbers, all read from
 * what has actually been recorded. Anything unrecorded says so.
 */
export default function PracticeTodayCard() {
  const { data } = usePracticeToday();
  const { currentWeek } = useTrainingProgress();

  const r = (v: number | null) => (v === null ? 'not recorded' : `${v > 0 ? '+' : ''}${v}R`);

  return (
    <Card className="border-prism-violet/40">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Monitor className="h-4 w-4 text-prism-violet" />
            Today's paper trading practice
          </CardTitle>
          <Badge variant="outline">{data.marketRead ?? 'market read not recorded'}</Badge>
        </div>
        <CardDescription>
          SwingEdge decides. Thinkorswim paperMoney is where you practise the clicks.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Candidates" value={String(data.candidatesReviewed)} />
          <Stat label="Qualified" value={String(data.tradesQualified)} />
          <Stat label="Executed" value={String(data.tradesExecuted)} />
          <Stat label="Open trades" value={String(data.openTrades)} />
          <Stat
            label="Today"
            value={r(data.dailyR)}
            tone={data.dailyR !== null && data.dailyR < 0 ? 'text-prism-rose' : 'text-prism-lime'}
          />
          <Stat
            label="This week"
            value={r(data.weeklyR)}
            tone={data.weeklyR !== null && data.weeklyR < 0 ? 'text-prism-rose' : 'text-prism-lime'}
          />
          <Stat
            label="Rules followed"
            value={data.rulesFollowedPct === null ? 'not recorded' : `${data.rulesFollowedPct}%`}
          />
          <Stat label="Training week" value={currentWeek ? `Week ${currentWeek}` : 'not started'} />
        </div>
        {data.bestSkip ? (
          <p className="text-xs text-muted-foreground">
            Best skip today: <span className="font-semibold">{data.bestSkip}</span>
          </p>
        ) : null}
        <Button asChild size="sm" variant="outline">
          <Link to="/swingedge/practice">
            Open the practice lab
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
