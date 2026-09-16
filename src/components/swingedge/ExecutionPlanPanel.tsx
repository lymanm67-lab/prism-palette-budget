import { useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import ConditionalEntryBuilder from './ConditionalEntryBuilder';
import ConditionalOrderPreviewCard from './ConditionalOrderPreviewCard';
import ExecutionGuideDialog from './ExecutionGuideDialog';
import { buildConditionalGuide, conditionalOrderPreview } from '@/lib/swingedge/conditionalOrder';
import {
  ARMED_LABEL,
  BROKER_TRUTH_NOTE,
  EXECUTION_MODE_LABEL,
  EXECUTION_MODE_NOTE,
  PLAN_STATE_LABEL,
  type ConditionMode,
  type EntryCondition,
  type ExecutionMode,
  type PlanState,
} from '@/lib/swingedge/conditionalStaging';
import type { GuideTrade } from '@/lib/swingedge/thinkorswimGuide';

const MODES: ExecutionMode[] = ['EXECUTE_NOW', 'SET_ALERT', 'ARM_FOR_LATER'];

/**
 * Stage six of the Planner: how this plan reaches Thinkorswim. Execute now is
 * only emphasised when every gate passes; a waiting setup defaults to an alert
 * so the final judgement stays with the user.
 */
export default function ExecutionPlanPanel({
  mode,
  onModeChange,
  canExecuteNow,
  executeBlockers,
  waitingFor,
  planState,
  conditions,
  onConditionsChange,
  conditionMode,
  onConditionModeChange,
  advanced,
  expiresAt,
  onExpiresChange,
  cancelCondition,
  onCancelChange,
  trade,
  tradePlanId,
}: {
  mode: ExecutionMode;
  onModeChange: (m: ExecutionMode) => void;
  canExecuteNow: boolean;
  executeBlockers: string[];
  waitingFor: string[];
  planState: PlanState;
  conditions: EntryCondition[];
  onConditionsChange: (c: EntryCondition[]) => void;
  conditionMode: ConditionMode;
  onConditionModeChange: (m: ConditionMode) => void;
  advanced: boolean;
  expiresAt: string;
  onExpiresChange: (v: string) => void;
  cancelCondition: string;
  onCancelChange: (v: string) => void;
  trade: GuideTrade | null;
  tradePlanId?: string | null;
}) {
  const [guideOpen, setGuideOpen] = useState(false);
  const preview = useMemo(
    () => (trade ? conditionalOrderPreview(trade, conditions) : null),
    [trade, conditions],
  );
  const guide = useMemo(
    () => (trade ? buildConditionalGuide(trade, conditions) : null),
    [trade, conditions],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {MODES.map((m) => {
          const active = mode === m;
          const dimmed = m === 'EXECUTE_NOW' && !canExecuteNow;
          return (
            <Button
              key={m}
              size="sm"
              variant={active ? 'default' : 'outline'}
              className={cn(dimmed && !active && 'opacity-60')}
              onClick={() => onModeChange(m)}
            >
              {m === 'EXECUTE_NOW' ? <Zap className="mr-2 h-4 w-4" /> : null}
              {EXECUTION_MODE_LABEL[m]}
            </Button>
          );
        })}
        <Badge variant="outline" className="ml-auto text-xs">
          {PLAN_STATE_LABEL[planState]}
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">{EXECUTION_MODE_NOTE[mode]}</p>

      {mode === 'EXECUTE_NOW' && !canExecuteNow && (
        <Alert variant="destructive">
          <AlertTitle>Not ready to execute</AlertTitle>
          <AlertDescription>
            <ul className="space-y-0.5">
              {executeBlockers.map((b) => (
                <li key={b}>• {b}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs">Set an alert instead and read the trade again when it triggers.</p>
          </AlertDescription>
        </Alert>
      )}

      {mode === 'EXECUTE_NOW' && canExecuteNow && (
        <p className="flex items-center gap-2 rounded-md border border-prism-lime/40 bg-prism-lime/10 p-2 text-sm text-prism-lime">
          <CheckCircle2 className="h-4 w-4" /> Everything passes. Type the order in Thinkorswim using these exact
          values.
        </p>
      )}

      {mode !== 'EXECUTE_NOW' && (
        <>
          {waitingFor.length > 0 && (
            <div className="rounded-md border border-prism-amber/40 bg-prism-amber/10 p-2 text-sm">
              <p className="font-semibold text-prism-amber">Waiting for</p>
              <ul className="mt-1 space-y-0.5">
                {waitingFor.slice(0, 5).map((w) => (
                  <li key={w}>• {w}</li>
                ))}
              </ul>
            </div>
          )}

          {mode === 'ARM_FOR_LATER' && (
            <Badge variant="outline" className="border-prism-teal/40 bg-prism-teal/10 text-prism-teal">
              {ARMED_LABEL}
            </Badge>
          )}

          <ConditionalEntryBuilder
            conditions={conditions}
            onChange={onConditionsChange}
            mode={conditionMode}
            onModeChange={onConditionModeChange}
            advanced={advanced}
            expiresAt={expiresAt}
            onExpiresChange={onExpiresChange}
            cancelCondition={cancelCondition}
            onCancelChange={onCancelChange}
          />
        </>
      )}

      {preview ? (
        <ConditionalOrderPreviewCard preview={preview} />
      ) : (
        <p className="text-sm text-muted-foreground">
          The order preview appears once the symbol, entry, stop and target are set.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" disabled={!guide} onClick={() => setGuideOpen(true)}>
          <BookOpen className="mr-2 h-4 w-4" />
          {mode === 'SET_ALERT' ? 'Create Thinkorswim alert guide' : 'Show me how to enter this in Thinkorswim'}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">{BROKER_TRUTH_NOTE}</p>

      <ExecutionGuideDialog
        guide={guide}
        open={guideOpen}
        onOpenChange={setGuideOpen}
        tradePlanId={tradePlanId ?? null}
      />
    </div>
  );
}
