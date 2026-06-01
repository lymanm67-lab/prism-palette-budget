import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, Play, RefreshCw, FileText, Loader2 } from 'lucide-react';
import { useLatestCoachPlan, useStartCoachPlan } from '@/hooks/use-coach-plan';
import { CoachPlanWizard } from './CoachPlanWizard';
import { STEPS } from './wizard-steps';
import { cn } from '@/lib/utils';

export function CoachPlanBanner() {
  const { data: plan, isLoading } = useLatestCoachPlan();
  const startPlan = useStartCoachPlan();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const total = STEPS.length;
  const current = plan?.current_step ?? 1;
  const completed = plan ? Math.min(current - 1, total) : 0;
  const pct = Math.round((completed / total) * 100);

  const isCompleted = plan?.status === 'completed' && !!plan?.generated_plan;
  const isInProgress = plan?.status === 'in_progress';

  const handleStart = async () => {
    const created = await startPlan.mutateAsync();
    setActiveId(created.id);
    setWizardOpen(true);
  };

  const handleResume = () => {
    if (!plan) return;
    setActiveId(plan.id);
    setWizardOpen(true);
  };

  return (
    <>
      <div className="rounded-xl border border-border/40 bg-card/30 backdrop-blur-md p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Progress ring */}
        <div className="relative h-16 w-16 shrink-0">
          <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-border/30" />
            <circle
              cx="18" cy="18" r="15.9" fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeDasharray="100"
              strokeDashoffset={100 - (isCompleted ? 100 : pct)}
              strokeLinecap="round"
              className={cn('transition-all', isCompleted ? 'text-prism-lime' : 'text-prism-teal')}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className={cn('h-5 w-5', isCompleted ? 'text-prism-lime' : 'text-prism-teal')} />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">
            {isCompleted ? 'Your Money Coach Plan is ready' : 'Build your Money Coach Plan'}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isLoading
              ? 'Loading…'
              : isCompleted
                ? 'Personalized plan based on your answers — view, download as PDF, or restart anytime.'
                : isInProgress
                  ? `${completed} of ${total} steps complete · resume where you left off.`
                  : `${total} quick steps · ~6 minutes · one personalized plan tied to every card on this page.`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {isCompleted && (
            <>
              <Button asChild size="sm">
                <Link to="/coach/plan"><FileText className="h-4 w-4 mr-1.5" /> View plan</Link>
              </Button>
              <Button size="sm" variant="outline" onClick={handleStart} disabled={startPlan.isPending}>
                {startPlan.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
                Start over
              </Button>
            </>
          )}
          {isInProgress && (
            <>
              <Button size="sm" onClick={handleResume}>
                <Play className="h-4 w-4 mr-1.5" /> Resume
              </Button>
              <Button size="sm" variant="outline" onClick={handleStart} disabled={startPlan.isPending}>
                {startPlan.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
                Start over
              </Button>
            </>
          )}
          {!plan && !isLoading && (
            <Button size="sm" onClick={handleStart} disabled={startPlan.isPending}>
              {startPlan.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Play className="h-4 w-4 mr-1.5" />}
              Start guided plan
            </Button>
          )}
        </div>
      </div>

      <CoachPlanWizard
        planId={activeId ?? plan?.id ?? null}
        open={wizardOpen}
        onOpenChange={setWizardOpen}
      />
    </>
  );
}
