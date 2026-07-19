import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, ArrowRight, Clock, AlertTriangle } from 'lucide-react';
import { ESCALATION_LADDER, computeNextAction, daysUntilNextAction, getCurrentStep } from '@/lib/credit-repair/escalation-engine';
import type { CreditDispute } from '@/hooks/use-disputes';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Props {
  dispute: CreditDispute & { round?: number | null; escalation_channel?: string | null; next_action_date?: string | null; next_action_type?: string | null };
  onSelectLetterTemplate?: (templateId: string) => void;
  onRefresh?: () => void;
}

export default function EscalationCadence({ dispute, onSelectLetterTemplate, onRefresh }: Props) {
  const { household } = useHousehold();
  const currentRound = dispute.round ?? 1;
  const currentStep = getCurrentStep(currentRound);
  const nextAction = useMemo(() => computeNextAction(dispute), [dispute]);
  const daysUntil = useMemo(() => daysUntilNextAction(dispute), [dispute]);

  const progressPct = Math.min(100, (currentRound / ESCALATION_LADDER.length) * 100);

  const advance = async () => {
    if (!nextAction || !household) return;
    const newRound = nextAction.step.round;
    const today = format(new Date(), 'yyyy-MM-dd');
    try {
      const { error: logErr } = await (supabase as any).from('dispute_escalation_log').insert({
        household_id: household.id,
        dispute_id: dispute.id,
        round: newRound,
        action: nextAction.step.actionType,
        channel: nextAction.step.channel,
        sent_date: today,
        notes: `Advanced to ${nextAction.step.actionLabel}`,
      });
      if (logErr) throw logErr;
      const { error: updErr } = await (supabase as any)
        .from('credit_disputes')
        .update({
          round: newRound,
          escalation_channel: nextAction.step.channel,
          submitted_date: today,
          response_due_date: format(new Date(Date.now() + 30 * 86400000), 'yyyy-MM-dd'),
          status: 'submitted',
        })
        .eq('id', dispute.id);
      if (updErr) throw updErr;
      toast.success(`Advanced to ${nextAction.step.actionLabel}`);
      onRefresh?.();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-primary" />
            Escalation Cadence — Round {currentRound} of {ESCALATION_LADDER.length}
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">{currentStep.channel.toUpperCase()}</Badge>
        </div>
        <Progress value={progressPct} className="h-1.5 mt-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          {ESCALATION_LADDER.map(step => {
            const done = step.round < currentRound;
            const current = step.round === currentRound;
            return (
              <div key={step.round} className={`flex items-start gap-2 p-2 rounded ${current ? 'bg-primary/5 border border-primary/20' : ''}`}>
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                ) : current ? (
                  <Clock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium flex items-center gap-2">
                    {step.actionLabel}
                    {current && <Badge variant="secondary" className="text-[9px]">CURRENT</Badge>}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {nextAction && (
          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Next: {nextAction.step.actionLabel}</span>
              <span className={`font-medium ${daysUntil !== null && daysUntil <= 0 ? 'text-amber-600' : 'text-foreground'}`}>
                {daysUntil !== null && daysUntil <= 0 ? (
                  <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Ready now</span>
                ) : (
                  `${daysUntil}d`
                )}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => onSelectLetterTemplate?.(nextAction.step.actionType)}
              >
                Draft {nextAction.step.actionLabel.split('—')[1]?.trim() || 'letter'}
              </Button>
              <Button
                size="sm"
                className="flex-1 text-xs"
                disabled={daysUntil !== null && daysUntil > 0}
                onClick={advance}
              >
                Advance to Round {nextAction.step.round}
              </Button>
            </div>
          </div>
        )}

        {!nextAction && (dispute.outcome === 'resolved' || dispute.status === 'resolved') && (
          <div className="border-t pt-3 text-xs text-emerald-600 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            Dispute resolved — no further escalation needed.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
