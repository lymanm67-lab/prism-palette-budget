import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Activity, Brain, ShoppingBag, Wallet, CalendarClock, Target, ArrowRight, Check } from 'lucide-react';

const STORAGE_KEY = 'prism.coach.tour.completed.v1';

const STEPS = [
  {
    icon: Sparkles,
    title: 'Meet PrismMoney™ Coach',
    body: 'Coach moves Prism past tracking. It explains what happened, why, what to do next, and how to prevent it from happening again — for every dollar you earn and spend.',
    bullets: [
      'Cards 1–2 explain what shifted and why',
      'Cards 3–4 build a recovery plan + prevention rule',
      'Cards 5–10 protect, project, and deploy your money',
    ],
  },
  {
    icon: Activity,
    title: 'Decisions, not dashboards',
    body: 'Every Coach card carries a confidence level and a clear next step — no jargon, no shame. Coach speaks supportively, even when calling out a trend.',
    bullets: [
      'High / Medium / Low confidence on every recommendation',
      'Pattern detection: outlier vs developing vs repeated',
      'Purchase Guard checks need, want, or strategic before you buy',
    ],
  },
  {
    icon: Wallet,
    title: 'Every dollar gets a job',
    body: 'Coach reserves bills, covers debt, funds goals, applies your Smart Buffer, and tells you the true Safe-to-Spend for the next paycheck — before the money lands.',
    bullets: [
      'Paycheck Deployment plan with applied/skipped status',
      'Bill timing optimizer catches collision windows',
      'Wealth Redirector projects 1-yr and 3-yr impact',
    ],
  },
];

interface Props {
  forceOpen?: boolean;
  onClose?: () => void;
}

export function CoachOnboardingTour({ forceOpen, onClose }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      setStep(0);
      return;
    }
    try {
      const done = localStorage.getItem(STORAGE_KEY);
      if (!done) setOpen(true);
    } catch {/* ignore */}
  }, [forceOpen]);

  const finish = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {/* ignore */}
    setOpen(false);
    onClose?.();
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish();
  };

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) finish(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-[10px] bg-prism-amber/10 border-prism-amber/30 text-prism-amber">
              Step {step + 1} of {STEPS.length}
            </Badge>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Coach tour</span>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-prism-amber/10 border border-prism-amber/30">
              <Icon className="h-5 w-5 text-prism-amber" />
            </div>
            <DialogTitle className="font-display text-xl leading-tight">{current.title}</DialogTitle>
          </div>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{current.body}</p>

        <ul className="space-y-1.5">
          {current.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-prism-teal" />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <div className="flex gap-1 pt-2">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-prism-amber' : 'bg-muted'}`}
            />
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={finish}>Skip tour</Button>
          <Button size="sm" onClick={handleNext} className="gap-1">
            {step === STEPS.length - 1 ? <>Start coaching <Sparkles className="h-3 w-3" /></> : <>Next <ArrowRight className="h-3 w-3" /></>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function resetCoachTour() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {/* ignore */}
}
