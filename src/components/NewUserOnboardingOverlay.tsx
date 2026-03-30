import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, Landmark, ArrowLeftRight, PiggyBank,
  RepeatIcon, Shield, CheckCircle2, Sparkles, X,
} from 'lucide-react';
import { useAccounts, useTransactions } from '@/hooks/use-finance-data';

const SETUP_STEPS = [
  {
    icon: Sparkles,
    title: 'Welcome to PrismMoney',
    desc: 'Your financial control system is ready. Let\'s get you set up in under 5 minutes.',
    gradient: 'from-[hsl(var(--prism-teal))] to-[hsl(var(--prism-lime))]',
  },
  {
    icon: Landmark,
    title: 'Add Your Accounts',
    desc: 'Start by adding your checking, savings, or credit accounts. This is how Prism knows your available cash.',
    route: '/accounts',
    gradient: 'from-[hsl(var(--prism-sky))] to-[hsl(var(--prism-teal))]',
  },
  {
    icon: ArrowLeftRight,
    title: 'Log a Transaction',
    desc: 'Add your income and recent spending. Prism will calculate your Safe-to-Spend from day one.',
    route: '/transactions',
    gradient: 'from-[hsl(var(--prism-orange))] to-[hsl(var(--prism-amber))]',
  },
  {
    icon: RepeatIcon,
    title: 'Set Up Bills',
    desc: 'Add recurring obligations like rent, utilities, and loan payments so they\'re automatically deducted.',
    route: '/recurring',
    gradient: 'from-[hsl(var(--prism-teal))] to-[hsl(var(--prism-indigo))]',
  },
  {
    icon: Shield,
    title: 'Choose Your Mode',
    desc: 'Guardrail mode keeps you conservative. Balanced gives flexibility. Green Light is for confident spenders.',
    route: '/dashboard',
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

    // Show overlay only for new users with no data
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

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {SETUP_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === step ? 'w-8 bg-primary' : i < step ? 'w-2 bg-primary/40' : 'w-2 bg-muted-foreground/20'
                }`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className={`flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br ${current.gradient} shadow-lg`}>
              <Icon className="h-10 w-10 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="text-center space-y-3 mb-8">
            <h2 className="font-display text-2xl font-bold">{current.title}</h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">{current.desc}</p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => goToStep(current.route)}
              size="lg"
              className="w-full h-12 gap-2 font-semibold rounded-xl"
            >
              {isLast ? (
                <>
                  <CheckCircle2 className="h-5 w-5" /> Start Using Prism
                </>
              ) : step === 0 ? (
                <>
                  Let's Go <ArrowRight className="h-5 w-5" />
                </>
              ) : (
                <>
                  Take Me There <ArrowRight className="h-5 w-5" />
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
                Skip this step
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
