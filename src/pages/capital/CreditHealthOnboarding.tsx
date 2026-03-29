import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ChevronRight, Target, AlertTriangle, CreditCard, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Step {
  question: string;
  options: { label: string; value: string; icon?: React.ReactNode }[];
}

const STEPS: Step[] = [
  {
    question: 'What\'s your current credit score range?',
    options: [
      { label: '300–579 (Needs work)', value: '300-579' },
      { label: '580–669 (Fair)', value: '580-669' },
      { label: '670–739 (Good)', value: '670-739' },
      { label: '740+ (Excellent)', value: '740+' },
      { label: 'I don\'t know', value: 'unknown' },
    ],
  },
  {
    question: 'What\'s your target score?',
    options: [
      { label: '620 (FHA loan minimum)', value: '620' },
      { label: '680 (Good rates)', value: '680' },
      { label: '720 (Best rates)', value: '720' },
      { label: '750+ (Premium tier)', value: '750' },
    ],
  },
  {
    question: 'What\'s your main goal?',
    options: [
      { label: 'Repair my credit', value: 'repair', icon: <AlertTriangle className="h-4 w-4" /> },
      { label: 'Build my score', value: 'build', icon: <Target className="h-4 w-4" /> },
      { label: 'Prepare for approval', value: 'approval', icon: <CreditCard className="h-4 w-4" /> },
    ],
  },
  {
    question: 'Do you have disputed items on your report?',
    options: [
      { label: 'Yes, I have disputes', value: 'yes' },
      { label: 'No disputes', value: 'no' },
      { label: 'Not sure', value: 'unsure' },
    ],
  },
  {
    question: 'Are you behind on any payments?',
    options: [
      { label: 'Yes, some accounts are past due', value: 'yes' },
      { label: 'No, everything is current', value: 'no' },
    ],
  },
  {
    question: 'Is your credit card utilization high?',
    options: [
      { label: 'Yes, over 50%', value: 'high' },
      { label: 'Moderate, 30-50%', value: 'moderate' },
      { label: 'Low, under 30%', value: 'low' },
      { label: 'I don\'t have credit cards', value: 'none' },
    ],
  },
  {
    question: 'Are you planning to apply for credit soon?',
    options: [
      { label: 'Yes, within 30 days', value: '30' },
      { label: 'Within 3-6 months', value: '90' },
      { label: 'No immediate plans', value: 'none' },
    ],
  },
];

const CreditHealthOnboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  const select = (value: string) => {
    setAnswers(p => ({ ...p, [step]: value }));
    if (step < STEPS.length - 1) {
      setTimeout(() => setStep(s => s + 1), 300);
    }
  };

  const finish = () => {
    // Store answers for personalization
    localStorage.setItem('prism_credit_health_onboarding', JSON.stringify(answers));
    navigate('/capital/credit-health');
  };

  const isLast = step === STEPS.length - 1 && answers[step];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Heart className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">Credit Health Setup</h1>
          <p className="text-sm text-muted-foreground">Help us personalize your dashboard</p>
        </div>

        {/* Progress */}
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <Card>
              <CardContent className="p-6 space-y-4">
                <p className="text-base font-semibold">{current.question}</p>
                <div className="space-y-2">
                  {current.options.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => select(opt.value)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3.5 rounded-xl border text-left text-sm font-medium transition-all',
                        answers[step] === opt.value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:border-primary/30 hover:bg-accent/30'
                      )}
                    >
                      {opt.icon && <span className="text-muted-foreground">{opt.icon}</span>}
                      <span className="flex-1">{opt.label}</span>
                      {answers[step] === opt.value && <ChevronRight className="h-4 w-4" />}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button variant="ghost" size="sm" onClick={() => step > 0 && setStep(s => s - 1)} disabled={step === 0}>
            Back
          </Button>
          <span className="text-xs text-muted-foreground">{step + 1} of {STEPS.length}</span>
          {isLast ? (
            <Button size="sm" onClick={finish}>
              Get Started <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => navigate('/capital/credit-health')}>
              Skip
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreditHealthOnboarding;
