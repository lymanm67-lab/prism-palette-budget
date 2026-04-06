import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, Landmark, PiggyBank,
  Target, Shield, CheckCircle2, Sparkles, X, Upload,
} from 'lucide-react';
import { useAccounts, useTransactions } from '@/hooks/use-finance-data';
import { Progress } from '@/components/ui/progress';

const SETUP_STEPS = [
  {
    icon: Sparkles,
    title: 'Welcome to PrismMoney',
    desc: 'Your financial command center is ready. We\'ll get you set up in 3 quick steps — takes about 2 minutes.',
    gradient: 'from-[hsl(var(--prism-teal))] to-[hsl(var(--prism-lime))]',
  },
  {
    icon: Upload,
    title: 'Step 1: Connect Your Money',
    desc: 'Upload a CSV or bank file to import your transactions. Every bank supports this — no paid integration needed.',
    route: '/accounts',
    actionLabel: 'Go to Accounts',
    gradient: 'from-[hsl(var(--prism-sky))] to-[hsl(var(--prism-teal))]',
    tips: ['Download last 90 days from your bank website', 'Supports CSV, OFX, and QIF formats'],
  },
  {
    icon: PiggyBank,
    title: 'Step 2: Set Your Budget',
    desc: 'Tell Prism how much you plan to spend in each category. We\'ll track it for you and show your Safe-to-Spend.',
    route: '/budgets',
    actionLabel: 'Set Up Budget',
    gradient: 'from-[hsl(var(--prism-orange))] to-[hsl(var(--prism-amber))]',
    tips: ['Start with your 3 biggest categories', 'You can always adjust later'],
  },
  {
    icon: Target,
    title: 'Step 3: Pick a Goal',
    desc: 'Whether it\'s an emergency fund, a vacation, or paying off debt — set a target and watch your progress.',
    route: '/goals',
    actionLabel: 'Create a Goal',
    gradient: 'from-[hsl(var(--prism-teal))] to-[hsl(var(--prism-indigo))]',
    tips: ['$1,000 emergency fund is a great starter', 'Prism tracks your pace to deadline'],
  },
  {
    icon: Shield,
    title: 'You\'re All Set!',
    desc: 'Your dashboard is ready. Prism will calculate your Safe-to-Spend, alert you to overspending, and keep you on track.',
    gradient: 'from-[hsl(var(--prism-indigo))] to-[hsl(var(--prism-violet))]',
  },
];

const STORAGE_KEY = 'prism_onboarding_completed';

export default function NewUserOnboardingOverlay() {
  const navigate = useNavigate();
  const { data: accounts } = useAccounts();
  const { data: transactions } = useTransactions();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (completed) return;
    const hasData = (accounts && accounts.length > 0) || (transactions && transactions.length > 0);
    if (!hasData && accounts !== undefined) {
      setVisible(true);
    }
  }, [accounts, transactions]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  };

  const goToStep = (route?: string) => {
    if (step === SETUP_STEPS.length - 1) {
      dismiss();
      navigate('/dashboard');
      return;
    }
    if (route && step > 0) {
      dismiss();
      navigate(route);
      return;
    }
    setStep((s) => s + 1);
  };

  if (!visible) return null;

  const current = SETUP_STEPS[step];
  const Icon = current.icon;
  const isLast = step === SETUP_STEPS.length - 1;
  const progressPercent = (step / (SETUP_STEPS.length - 1)) * 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-md p-4"
      >
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-8 shadow-2xl"
        >
          {/* Close */}
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>Setup Progress</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className={`flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br ${current.gradient} shadow-lg`}>
              <Icon className="h-10 w-10 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="text-center space-y-3 mb-6">
            <h2 className="font-display text-2xl font-bold">{current.title}</h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">{current.desc}</p>
          </div>

          {/* Tips */}
          {'tips' in current && current.tips && (
            <div className="bg-muted/50 rounded-xl p-3 mb-6 space-y-1.5">
              {current.tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-prism-teal shrink-0" />
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => goToStep('route' in current ? current.route : undefined)}
              size="lg"
              className="w-full h-12 gap-2 font-semibold rounded-xl"
            >
              {isLast ? (
                <>
                  <CheckCircle2 className="h-5 w-5" /> Go to Dashboard
                </>
              ) : step === 0 ? (
                <>
                  Let's Go <ArrowRight className="h-5 w-5" />
                </>
              ) : (
                <>
                  {'actionLabel' in current ? current.actionLabel : 'Continue'} <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>
            {step > 0 && !isLast && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep((s) => s + 1)}
                className="text-muted-foreground"
              >
                Skip — I'll do this later
              </Button>
            )}
            {step === 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={dismiss}
                className="text-muted-foreground"
              >
                I know my way around
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
