// Trade Readiness card. The score never overrides a hard gate.

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import CollapsibleSection from '@/components/swingedge/CollapsibleSection';
import {
  READINESS_BAND_LABEL,
  type ReadinessBand,
  type TradeReadinessResult,
} from '@/lib/swingedge/tradeReadiness';

const TONE: Record<ReadinessBand, string> = {
  READY: 'bg-prism-lime/15 text-prism-lime border-prism-lime/40',
  QUALIFIED: 'bg-prism-lime/10 text-prism-lime border-prism-lime/30',
  WAIT: 'bg-prism-amber/15 text-prism-amber border-prism-amber/40',
  REVIEW: 'bg-prism-amber/20 text-prism-amber border-prism-amber/50',
  NOT_READY: 'bg-prism-rose/15 text-prism-rose border-prism-rose/40',
};

export default function TradeReadinessCard({ readiness }: { readiness: TradeReadinessResult }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Trade readiness</CardTitle>
          <Badge variant="outline" className={cn('font-semibold', TONE[readiness.band])}>
            {readiness.score}/100 · {READINESS_BAND_LABEL[readiness.band]}
          </Badge>
        </div>
        <CardDescription>{readiness.headline}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <Progress value={readiness.score} className="h-2" />

        {readiness.hardGates.map((g) => (
          <p
            key={g}
            className="flex gap-2 rounded-md border border-prism-rose/40 bg-prism-rose/10 p-2 text-sm text-prism-rose"
          >
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> {g}
          </p>
        ))}

        {readiness.hardGates.length > 0 && (
          <p className="text-xs text-prism-rose">
            A gate is a stop, not a deduction. The score above cannot clear it.
          </p>
        )}

        <CollapsibleSection id="analyzer-readiness-items" title="Every item scored" defaultOpen={false}>
          <div className="space-y-1 text-sm">
            {readiness.items.map((i) => (
              <div key={i.key} className="flex items-center justify-between gap-3">
                <span className={cn(i.score === null && 'text-muted-foreground')}>{i.label}</span>
                <span className="text-xs text-muted-foreground">
                  {i.score === null ? 'not available' : `${i.points.toFixed(1)} of ${i.weight}`} · {i.detail}
                </span>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {readiness.unavailable.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {readiness.unavailable.length} item{readiness.unavailable.length === 1 ? '' : 's'} could not be measured, so
            they scored zero rather than being skipped.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
