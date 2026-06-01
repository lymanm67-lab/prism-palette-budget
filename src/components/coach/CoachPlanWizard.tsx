import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { STEPS, nextActiveStep, type StepDef } from './wizard-steps';
import {
  useCoachPlan,
  useSaveCoachPlanStep,
  useGenerateCoachPlan,
  type CoachPlan,
} from '@/hooks/use-coach-plan';

interface Props {
  planId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CoachPlanWizard({ planId, open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { data: plan } = useCoachPlan(planId);
  const saveStep = useSaveCoachPlanStep();
  const generate = useGenerateCoachPlan();

  const [stepNum, setStepNum] = useState<number>(1);
  const [answer, setAnswer] = useState<any>(undefined);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (plan && open) {
      const s = plan.current_step || 1;
      setStepNum(s);
      setAnswer((plan.answers as any)?.[String(s)]);
    }
  }, [plan, open]);

  const step: StepDef | undefined = STEPS[stepNum - 1];
  const totalActive = useMemo(() => {
    // count steps not skipped given current answers
    const ans = plan?.answers || {};
    return STEPS.filter(s => !s.shouldSkip?.(ans)).length;
  }, [plan?.answers]);
  const completedCount = useMemo(() => Math.min(stepNum - 1, totalActive), [stepNum, totalActive]);
  const progress = Math.round((completedCount / totalActive) * 100);

  if (!plan || !step) return null;

  const isValid = step.isValid ? step.isValid(answer) : true;
  const isLast = stepNum === STEPS.length;

  const handleNext = async () => {
    if (!planId) return;
    if (!isValid) {
      toast.error('Please answer before continuing');
      return;
    }
    const merged = { ...(plan.answers as object || {}), [String(stepNum)]: answer };
    const nextStep = nextActiveStep(stepNum + 1, merged);

    await saveStep.mutateAsync({ id: planId, step: stepNum, answer, nextStep });

    if (nextStep > STEPS.length) {
      // generate plan
      setGenerating(true);
      try {
        await generate.mutateAsync(planId);
        toast.success('Your plan is ready!');
        onOpenChange(false);
        navigate('/coach/plan');
      } catch (e: any) {
        toast.error(e?.message || 'Could not generate plan');
      } finally {
        setGenerating(false);
      }
      return;
    }

    setStepNum(nextStep);
    setAnswer((plan.answers as any)?.[String(nextStep)]);
  };

  const handleBack = () => {
    if (stepNum <= 1) return;
    // find previous non-skipped
    let prev = stepNum - 1;
    while (prev >= 1 && STEPS[prev - 1].shouldSkip?.(plan.answers)) prev--;
    if (prev < 1) return;
    setStepNum(prev);
    setAnswer((plan.answers as any)?.[String(prev)]);
  };

  const StepComp = step.Component;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
              Step {stepNum} of {STEPS.length} · {step.title}
            </span>
            <span className="text-[11px] font-mono text-prism-teal">{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
          <DialogTitle className="text-xl mt-3">{step.title}</DialogTitle>
          <p className="text-xs text-muted-foreground">{step.why}</p>
        </DialogHeader>

        <div className="py-4">
          <StepComp value={answer} onChange={setAnswer} allAnswers={plan.answers as Record<string, any>} />
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
          <Button variant="ghost" onClick={handleBack} disabled={stepNum <= 1 || generating}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Button onClick={handleNext} disabled={!isValid || generating || saveStep.isPending}>
            {generating ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Generating plan…</>
            ) : isLast ? (
              <>Generate my plan <Sparkles className="h-4 w-4 ml-1" /></>
            ) : (
              <>Next <ArrowRight className="h-4 w-4 ml-1" /></>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
