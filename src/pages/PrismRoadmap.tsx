import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Shield, Briefcase, CreditCard, Landmark, PiggyBank,
  TrendingUp, Rocket, Home, KeyRound,
  CheckCircle2, Circle, ChevronDown, ChevronUp, Sparkles, Loader2, Save
} from 'lucide-react';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useAccounts } from '@/hooks/use-finance-data';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/use-currency';
import { toast } from 'sonner';

const PRISM_STEPS = [
  {
    number: 1,
    title: 'Set Your Safety Net',
    subtitle: 'Cover insurance deductibles first',
    icon: Shield,
    gradient: 'from-prism-teal to-prism-sky',
    description: 'Your first Prism layer: save enough to cover your highest insurance deductible so an unexpected bill never derails your plan. Think of it as the foundation your entire financial house rests on.',
    howTo: [
      'List all your insurance policies (health, home/renters, auto, disability)',
      'Identify your highest deductible amount',
      'Park that amount in a high-yield savings account',
    ],
    autoDetectKey: 'deductibles',
  },
  {
    number: 2,
    title: 'Collect the Match',
    subtitle: "Don't leave free dollars behind",
    icon: Briefcase,
    gradient: 'from-prism-sky to-prism-indigo',
    description: 'If your employer matches retirement contributions, contribute at least enough to claim every dollar. Skipping this is the only guaranteed way to lose free money.',
    howTo: [
      'Check if your employer offers a retirement plan with matching',
      'Learn the matching formula (e.g., 50% of the first 6%)',
      'Contribute at least enough to earn the full match',
    ],
    autoDetectKey: 'employer_match',
  },
  {
    number: 3,
    title: 'Slay Toxic Debt',
    subtitle: 'Destroy high-interest balances',
    icon: CreditCard,
    gradient: 'from-prism-rose to-prism-orange',
    description: 'Credit cards, payday loans, and anything above ~6% interest is actively draining your wealth. Attack these aggressively using avalanche or snowball payoff strategies.',
    howTo: [
      'List all debts with balances, rates, and minimum payments',
      'Flag every balance charging more than 6% interest',
      'Choose avalanche (highest rate first) or snowball (smallest balance first)',
      'Redirect every spare dollar toward your target debt',
    ],
    autoDetectKey: 'high_interest_debt',
  },
  {
    number: 4,
    title: 'Fortify Your Reserves',
    subtitle: '3-6 months of living expenses',
    icon: Landmark,
    gradient: 'from-prism-amber to-prism-orange',
    description: 'A fully-funded emergency reserve turns financial disasters into inconveniences. This is the layer that keeps you from ever sliding backward.',
    howTo: [
      'Calculate your monthly essential expenses ("burn rate")',
      'Multiply by 3-6 months based on income stability',
      'Store in a separate high-yield savings account for easy access',
    ],
    autoDetectKey: 'emergency_fund',
  },
  {
    number: 5,
    title: 'Unlock Tax-Free Growth',
    subtitle: 'Roth IRA & HSA contributions',
    icon: PiggyBank,
    gradient: 'from-prism-lime to-prism-teal',
    description: 'Roth IRAs and Health Savings Accounts let your money grow tax-free. Prioritize filling these buckets before investing in taxable accounts.',
    howTo: [
      'Open a Roth IRA if eligible (income limits apply)',
      'If you have a high-deductible health plan, open an HSA',
      'Aim to max both accounts annually ($7,000 Roth + $4,300/$8,550 HSA for 2025)',
    ],
    autoDetectKey: 'roth_hsa',
  },
  {
    number: 6,
    title: 'Fill the Retirement Tank',
    subtitle: 'Max your 401(k) / 403(b)',
    icon: TrendingUp,
    gradient: 'from-prism-indigo to-prism-violet',
    description: 'With tax-free buckets full, go back to your employer plan and push contributions to the annual limit. This shelters more income from taxes while your balance compounds.',
    howTo: [
      'Increase your 401(k)/403(b) contribution rate',
      'Aim to reach the annual salary deferral limit ($23,500 for 2025)',
      'Consider catch-up contributions if over 50',
    ],
    autoDetectKey: 'max_retirement',
  },
  {
    number: 7,
    title: 'Activate Wealth Mode',
    subtitle: 'Invest 25%+ of gross income',
    icon: Rocket,
    gradient: 'from-prism-teal to-prism-lime',
    description: 'This is the inflection point. When you invest at least 25% of your gross income across all accounts, compound growth shifts from theoretical to transformational.',
    howTo: [
      'Calculate 25% of your gross household income',
      'Sum all retirement contributions from prior steps',
      'Open a taxable brokerage account for the difference',
      'Invest in diversified, low-cost index funds',
    ],
    autoDetectKey: 'hyper_accumulation',
  },
  {
    number: 8,
    title: 'Design Your Future',
    subtitle: 'Fund big dreams & milestones',
    icon: Home,
    gradient: 'from-prism-orange to-prism-amber',
    description: 'With 25%+ invested, channel extra cash toward life\'s biggest goals — a dream home, kids\' education, a sabbatical, or early retirement.',
    howTo: [
      'List your major future financial goals',
      'Prioritize by importance and timeline',
      'Open dedicated savings or investment accounts for each',
      'Automate contributions so progress is effortless',
    ],
    autoDetectKey: 'prepaid_expenses',
  },
  {
    number: 9,
    title: 'Reach Debt Zero',
    subtitle: 'Complete financial independence',
    icon: KeyRound,
    gradient: 'from-prism-navy to-prism-teal',
    description: 'The final Prism layer: pay off every remaining balance — mortgage, student loans, everything. Cross this finish line 100% debt-free and financially independent.',
    howTo: [
      'List any remaining debts (mortgage, student loans)',
      'Decide whether to accelerate payoff or invest the surplus',
      'Make extra principal payments when cash flow allows',
      'Celebrate when the last balance hits zero!',
    ],
    autoDetectKey: 'low_interest_debt',
  },
];

const PrismRoadmap = () => {
  const { household } = useHousehold();
  const { formatCurrency } = useCurrency();
  const qc = useQueryClient();
  const { data: accounts } = useAccounts();
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<number, string>>({});

  // Fetch roadmap progress
  const { data: progress, isLoading } = useQuery({
    queryKey: ['roadmap_progress', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roadmap_progress')
        .select('*')
        .eq('household_id', household!.id);
      if (error) throw error;
      return data as any[];
    },
  });

  // Auto-detect statuses from existing data
  const autoStatus = useMemo(() => {
    if (!accounts) return {};
    const savingsBalance = accounts
      .filter(a => a.account_type === 'savings' && a.balance > 0)
      .reduce((s, a) => s + a.balance, 0);
    const creditDebt = accounts
      .filter(a => a.account_type === 'credit' && a.balance < 0)
      .reduce((s, a) => s + Math.abs(a.balance), 0);
    const investmentBalance = accounts
      .filter(a => a.account_type === 'investment' && a.balance > 0)
      .reduce((s, a) => s + a.balance, 0);
    const loanBalance = accounts
      .filter(a => a.account_type === 'loan' && a.balance < 0)
      .reduce((s, a) => s + Math.abs(a.balance), 0);

    return {
      deductibles: savingsBalance >= 500 ? 'likely' : 'needs_work',
      high_interest_debt: creditDebt === 0 ? 'complete' : 'in_progress',
      emergency_fund: savingsBalance >= 5000 ? 'likely' : 'needs_work',
      hyper_accumulation: investmentBalance > 0 ? 'in_progress' : 'not_started',
      low_interest_debt: loanBalance === 0 ? 'complete' : 'in_progress',
    } as Record<string, string>;
  }, [accounts]);

  const getStepProgress = (stepNum: number) => {
    return progress?.find(p => p.step_number === stepNum);
  };

  const toggleStep = useMutation({
    mutationFn: async ({ stepNum, completed }: { stepNum: number; completed: boolean }) => {
      const existing = getStepProgress(stepNum);
      if (existing) {
        const { error } = await supabase
          .from('roadmap_progress')
          .update({
            is_completed: completed,
            completed_at: completed ? new Date().toISOString() : null,
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('roadmap_progress')
          .insert({
            household_id: household!.id,
            step_number: stepNum,
            is_completed: completed,
            completed_at: completed ? new Date().toISOString() : null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roadmap_progress'] });
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const saveNotes = useMutation({
    mutationFn: async ({ stepNum, notes }: { stepNum: number; notes: string }) => {
      const existing = getStepProgress(stepNum);
      if (existing) {
        const { error } = await supabase
          .from('roadmap_progress')
          .update({ notes })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('roadmap_progress')
          .insert({
            household_id: household!.id,
            step_number: stepNum,
            notes,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roadmap_progress'] });
      toast.success('Notes saved!');
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const completedCount = progress?.filter(p => p.is_completed).length || 0;
  const overallProgress = (completedCount / 9) * 100;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            <span className="prism-gradient-text">Prism Financial Roadmap</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Your step-by-step path to financial freedom. 9 proven steps, personalized to your data.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm gap-1.5 px-3 py-1.5">
            <Sparkles className="h-3.5 w-3.5 text-prism-teal" />
            {completedCount}/9 Complete
          </Badge>
        </div>
      </div>

      {/* Overall progress */}
      <Card className="prism-card-shine border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">Overall Progress</p>
            <p className="font-display text-lg font-bold prism-gradient-text">{Math.round(overallProgress)}%</p>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-prism-navy via-prism-teal to-prism-lime"
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-3">
        {PRISM_STEPS.map((step) => {
          const stepProgress = getStepProgress(step.number);
          const isCompleted = stepProgress?.is_completed || false;
          const isExpanded = expandedStep === step.number;
          const autoHint = autoStatus[step.autoDetectKey];
          const StepIcon = step.icon;

          return (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: step.number * 0.05 }}
            >
              <Card className={`prism-card-shine border-border/50 transition-all ${isCompleted ? 'ring-1 ring-prism-teal/30 bg-prism-teal/[0.02]' : ''}`}>
                <CardContent className="p-0">
                  {/* Step header */}
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-xl"
                    onClick={() => setExpandedStep(isExpanded ? null : step.number)}
                  >
                    {/* Completion toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStep.mutate({ stepNum: step.number, completed: !isCompleted });
                      }}
                      className="shrink-0"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-7 w-7 text-prism-teal" />
                      ) : (
                        <Circle className="h-7 w-7 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors" />
                      )}
                    </button>

                    {/* Icon */}
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${step.gradient}`}>
                      <StepIcon className="h-5 w-5 text-white" />
                    </div>

                    {/* Title */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground">STEP {step.number}</span>
                        {autoHint === 'complete' && !isCompleted && (
                          <Badge variant="outline" className="text-[10px] text-prism-teal border-prism-teal/30">
                            Auto-detected ✓
                          </Badge>
                        )}
                        {autoHint === 'in_progress' && !isCompleted && (
                          <Badge variant="outline" className="text-[10px] text-prism-amber border-prism-amber/30">
                            In Progress
                          </Badge>
                        )}
                      </div>
                      <h3 className={`font-display font-bold text-base ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                        {step.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">{step.subtitle}</p>
                    </div>

                    {/* Expand */}
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                  </div>

                  {/* Expanded content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-0 border-t border-border/50 space-y-4">
                          <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
                            {step.description}
                          </p>

                          {/* How-to checklist */}
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">How to Tackle This</p>
                            <ul className="space-y-2">
                              {step.howTo.map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                  <CheckCircle2 className="h-4 w-4 text-prism-teal/50 shrink-0 mt-0.5" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Notes */}
                          <div className="space-y-2">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your Notes</p>
                            <Textarea
                              value={editingNotes[step.number] ?? stepProgress?.notes ?? ''}
                              onChange={(e) => setEditingNotes(prev => ({ ...prev, [step.number]: e.target.value }))}
                              placeholder="Add personal notes for this step..."
                              className="min-h-[80px] text-sm"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              onClick={() => saveNotes.mutate({
                                stepNum: step.number,
                                notes: editingNotes[step.number] ?? stepProgress?.notes ?? '',
                              })}
                            >
                              <Save className="h-3.5 w-3.5" /> Save Notes
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Completion celebration */}
      {completedCount === 9 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl p-8 text-center prism-gradient text-white"
        >
          <Sparkles className="h-12 w-12 mx-auto mb-4" />
          <h2 className="font-display text-2xl font-extrabold">Financial Mutant Status Achieved! 🎉</h2>
          <p className="mt-2 text-white/70 max-w-lg mx-auto">
            You've completed all 9 steps of the Prism Financial Roadmap. You are well on your way to true financial independence. Keep growing your army of dollar bills!
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default PrismRoadmap;
