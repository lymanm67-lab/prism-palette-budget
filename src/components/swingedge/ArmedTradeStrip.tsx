import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  ARMED_LABEL,
  ARMED_NEEDS_REVIEW_LABEL,
  BROKER_TRUTH_NOTE,
  PLAN_STATE_LABEL,
  type PlanState,
} from '@/lib/swingedge/conditionalStaging';

/**
 * Shown on the Analyzer when this symbol is already staged. It reports the plan
 * and never offers to create a second conditional order.
 */
export default function ArmedTradeStrip({
  symbol,
  planState,
  entryCondition,
  lastRevalidatedAt,
  needsReview,
  reviewReasons,
}: {
  symbol: string;
  planState: string | null;
  entryCondition: string | null;
  lastRevalidatedAt: string | null;
  needsReview: boolean;
  reviewReasons: string[];
}) {
  const stateLabel = planState && planState in PLAN_STATE_LABEL
    ? PLAN_STATE_LABEL[planState as PlanState]
    : 'Waiting for condition';

  return (
    <Card className={cn('border-2', needsReview ? 'border-destructive' : 'border-prism-teal/40')}>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              'font-semibold',
              needsReview
                ? 'border-destructive/40 bg-destructive/10 text-destructive'
                : 'border-prism-teal/40 bg-prism-teal/10 text-prism-teal',
            )}
          >
            {needsReview ? ARMED_NEEDS_REVIEW_LABEL : ARMED_LABEL}
          </Badge>
          <span className="text-sm font-semibold">{symbol}</span>
          <span className="text-xs text-muted-foreground">Status: {stateLabel}</span>
          <Button size="sm" variant="outline" asChild className="ml-auto">
            <Link to={`/swingedge/planner?symbol=${symbol}`}>
              View trade plan <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-1 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Entry condition: </span>
            {entryCondition ?? 'not recorded on this plan'}
          </p>
          <p>
            <span className="text-muted-foreground">Last checked: </span>
            {lastRevalidatedAt ? new Date(lastRevalidatedAt).toLocaleString() : 'not since it was armed'}
          </p>
        </div>

        {needsReview && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" /> Conditions have changed since you armed this
            </p>
            <ul className="mt-1 space-y-0.5">
              {reviewReasons.map((r) => (
                <li key={r}>• {r}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-muted-foreground">{BROKER_TRUTH_NOTE}</p>
      </CardContent>
    </Card>
  );
}
