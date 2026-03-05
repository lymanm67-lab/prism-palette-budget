import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Wallet,
  TrendingUp,
  PiggyBank,
  ShieldCheck,
  Target,
  BarChart3,
  Bot,
  CheckCircle2,
  CreditCard,
  LineChart,
} from 'lucide-react';

const STEPS = [
  { id: 'welcome' },
  { id: 'journey' },
  { id: 'features' },
  { id: 'plan' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

const JOURNEY_OPTIONS = [
  {
    label: 'Living paycheck to paycheck',
    desc: 'Trying to make ends meet and build a safety net',
    icon: Wallet,
    gradient: 'from-[hsl(var(--prism-orange))] to-[hsl(var(--prism-amber))]',
  },
  {
    label: 'Working on getting out of debt',
    desc: 'Juggling loans, credit cards, or collections',
    icon: CreditCard,
    gradient: 'from-[hsl(var(--prism-rose))] to-[hsl(var(--prism-orange))]',
  },
  {
    label: 'Budgeting but not consistent',
    desc: "Started budgeting but can't stick with it",
    icon: BarChart3,
    gradient: 'from-[hsl(var(--prism-sky))] to-[hsl(var(--prism-teal))]',
  },
  {
    label: 'Ready to build wealth',
    desc: 'Debt-free or nearly there, want to grow savings & investments',
    icon: TrendingUp,
    gradient: 'from-[hsl(var(--prism-teal))] to-[hsl(var(--prism-lime))]',
  },
];

const FEATURES = [
  {
    title: 'Zero-based budgeting',
    desc: 'Track every dollar with smart categories and real-time insights.',
    icon: Target,
  },
  {
    title: 'Multi-account tracking',
    desc: 'Checking, savings, credit, investments — all in one place.',
    icon: Wallet,
  },
  {
    title: 'AI Tax Assistant',
    desc: 'Get answers to tax questions and plan deductions with AI guidance.',
    icon: Bot,
  },
  {
    title: 'Business & personal',
    desc: 'Separate business and personal finances with dedicated profiles.',
    icon: LineChart,
  },
  {
    title: 'Smart reports',
    desc: 'See your net worth, cash flow, and spending trends at a glance.',
    icon: BarChart3,
  },
  {
    title: 'Bank-level security',
    desc: 'Your data is encrypted and protected with enterprise-grade security.',
    icon: ShieldCheck,
  },
];

const PLAN_ITEMS = [
  'Zero-based budgeting tools to track every dollar',
  'Multi-account management for all your finances',
  'AI-powered tax guidance and deduction tracking',
  'Detailed spending reports and trend analysis',
  'Business profile management and expense separation',
  'CSV import and bank connection support',
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedJourney, setSelectedJourney] = useState<number | null>(null);

  const stepId = STEPS[currentStep].id;
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const canGoNext =
    stepId === 'welcome' ||
    stepId === 'features' ||
    stepId === 'plan' ||
    (stepId === 'journey' && selectedJourney !== null);

  const journeyLabel = selectedJourney !== null ? JOURNEY_OPTIONS[selectedJourney].label : undefined;

  const next = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep((s) => s + 1);
    else {
      const params = journeyLabel ? `?journey=${encodeURIComponent(journeyLabel)}` : '';
      navigate(`/auth${params}`);
    }
  };
  const prev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const slideVariants = {
    enter: { opacity: 0, x: 60 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -60 },
  };

  return (
    <div className="relative flex min-h-screen flex-col auth-gradient-bg overflow-hidden">
      {/* Floating orbs */}
      <div className="orb w-96 h-96 bg-[hsl(var(--prism-teal))] -top-20 -left-20" style={{ animationDelay: '0s' }} />
      <div className="orb w-80 h-80 bg-[hsl(var(--prism-orange))] top-1/2 -right-20" style={{ animationDelay: '-5s' }} />
      <div className="orb w-64 h-64 bg-[hsl(var(--prism-sky))] bottom-10 left-1/3" style={{ animationDelay: '-10s' }} />

      {/* Progress bar */}
      <div className="relative z-10 mx-auto mt-6 flex w-full max-w-md items-center gap-3 px-6">
        {currentStep > 0 && (
          <button onClick={prev} className="text-white/50 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--prism-teal))] to-[hsl(var(--prism-orange))]"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
        <span className="text-xs text-white/30 tabular-nums">
          {currentStep + 1}/{STEPS.length}
        </span>
      </div>

      {/* Step content */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={stepId}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-2xl"
          >
            {/* ——— Welcome ——— */}
            {stepId === 'welcome' && (
              <div className="text-center space-y-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                  className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl prism-gradient prism-glow"
                >
                  <Sparkles className="h-10 w-10 text-white" />
                </motion.div>
                <div>
                  <h1 className="font-display text-5xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
                    Take Control of{' '}
                    <span className="prism-gradient-text">Your Money</span>
                  </h1>
                  <p className="mt-4 text-lg text-white/50 max-w-md mx-auto">
                    The #1 money coach in your pocket. Budget smarter, track
                    spending, and build real wealth — all in one app.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={next}
                    size="lg"
                    className="prism-gradient hover:opacity-90 transition-opacity text-lg h-14 px-10 gap-2 font-bold rounded-2xl prism-glow"
                  >
                    Get Started <ArrowRight className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() => navigate('/auth')}
                    className="text-white/40 hover:text-white hover:bg-white/5 h-14 px-8 rounded-2xl"
                  >
                    I already have an account
                  </Button>
                </div>
              </div>
            )}

            {/* ——— Journey quiz ——— */}
            {stepId === 'journey' && (
              <div className="space-y-8">
                <div className="text-center">
                  <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">
                    Where are you in your{' '}
                    <span className="prism-gradient-text">financial journey</span>?
                  </h2>
                  <p className="mt-2 text-white/40">
                    This helps us personalize your experience
                  </p>
                </div>
                <div className="space-y-3">
                  {JOURNEY_OPTIONS.map((opt, i) => {
                    const Icon = opt.icon;
                    const selected = selectedJourney === i;
                    return (
                      <motion.button
                        key={i}
                        onClick={() => setSelectedJourney(i)}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className={`w-full flex items-center gap-4 rounded-2xl border p-5 text-left transition-all duration-200 ${
                          selected
                            ? 'border-[hsl(var(--prism-teal))]/60 bg-[hsl(var(--prism-teal))]/10 shadow-lg shadow-[hsl(var(--prism-teal))]/10'
                            : 'border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20'
                        }`}
                      >
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${opt.gradient}`}
                        >
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-display font-semibold text-white">
                            {opt.label}
                          </p>
                          <p className="text-sm text-white/40">{opt.desc}</p>
                        </div>
                        {selected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="shrink-0"
                          >
                            <CheckCircle2 className="h-6 w-6 text-[hsl(var(--prism-teal))]" />
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ——— Features ——— */}
            {stepId === 'features' && (
              <div className="space-y-8">
                <div className="text-center">
                  <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">
                    Everything you need to{' '}
                    <span className="prism-gradient-text">succeed</span>
                  </h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {FEATURES.map((feat, i) => {
                    const Icon = feat.icon;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/8 transition-colors"
                      >
                        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--prism-teal))] to-[hsl(var(--prism-sky))]">
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="font-display font-semibold text-white">
                          {feat.title}
                        </h3>
                        <p className="mt-1 text-sm text-white/40">{feat.desc}</p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ——— Plan ——— */}
            {stepId === 'plan' && (
              <div className="space-y-8 text-center">
                <div>
                  <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">
                    Your personalized plan is{' '}
                    <span className="prism-gradient-text">ready</span>
                  </h2>
                  <p className="mt-2 text-white/40">
                    Here's what's included when you sign up:
                  </p>
                </div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 text-left space-y-4"
                >
                  <div className="flex items-center gap-2 text-white font-display font-semibold">
                    <PiggyBank className="h-5 w-5 text-[hsl(var(--prism-teal))]" />
                    What's <span className="text-[hsl(var(--prism-teal))]">included</span> in your plan:
                  </div>
                  <div className="h-px bg-white/10" />
                  <ul className="space-y-3">
                    {PLAN_ITEMS.map((item, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.06 }}
                        className="flex items-start gap-3"
                      >
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--prism-teal))]" />
                        <span className="text-sm text-white/70">{item}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom CTA */}
      <div className="relative z-10 pb-10 px-6">
        <div className="mx-auto max-w-md flex flex-col items-center gap-3">
          {stepId !== 'welcome' && (
            <Button
              onClick={next}
              disabled={!canGoNext}
              size="lg"
              className="w-full prism-gradient hover:opacity-90 transition-opacity text-lg h-14 gap-2 font-bold rounded-2xl prism-glow disabled:opacity-40"
            >
              {stepId === 'plan' ? (
                <>
                  Create My Account <ArrowRight className="h-5 w-5" />
                </>
              ) : (
                <>
                  Continue <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>
          )}
          <button
            onClick={() => navigate('/auth')}
            className="text-xs text-white/30 hover:text-white/60 transition-colors underline underline-offset-4"
          >
            Skip onboarding
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
