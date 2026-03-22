import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useTTS } from '@/hooks/use-tts';
import { toast } from 'sonner';
import { useAccounts, useTransactions, useCategories, useBudgets, useCategoryGroups } from '@/hooks/use-finance-data';
import { useGoals } from '@/hooks/use-goals';
import { useDebtPlans } from '@/hooks/use-debt-plans';
import { useRecurringTransactions } from '@/hooks/use-recurring';
import {
  Landmark, ArrowLeftRight, PiggyBank, Tags, Target, TrendingDown,
  TrendingUp, Calculator, Map, Bot, Home, Wallet, RepeatIcon,
  Volume2, Pause, Play, Square, ChevronDown, ChevronRight, ChevronLeft,
  CheckCircle2, Circle, Sparkles, BookOpen, Rocket, BarChart3,
  Zap, Eye, X, RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import Confetti from '@/components/Confetti';

interface TrainingStep {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  route: string;
  summary: string;
  ttsScript: string;
  steps: string[];
  tips: string[];
}

const TRAINING_STEPS: TrainingStep[] = [
  {
    id: 'accounts',
    title: 'Set Up Accounts',
    icon: Landmark,
    color: 'text-prism-sky',
    route: '/accounts',
    summary: 'Add your bank accounts, credit cards, and other financial accounts to track balances.',
    ttsScript: `Let's start by setting up your accounts. Go to the Accounts page and click "Add Account." Enter your account name, like "Chase Checking" or "Amex Platinum." Choose the account type — checking, savings, credit card, investment, or loan. Set the current balance and currency. You can also connect your bank automatically using Plaid for real-time syncing. Once added, your accounts appear on the dashboard and are used throughout the app for transactions and budgets.`,
    steps: [
      'Navigate to Accounts from the sidebar',
      'Click "Add Account" button',
      'Enter account name (e.g., "Chase Checking")',
      'Select account type (checking, savings, credit, etc.)',
      'Enter current balance',
      'Optionally connect via Plaid for auto-sync',
    ],
    tips: [
      'Add all accounts you use regularly for a complete financial picture',
      'Credit card balances should be entered as positive numbers',
      'Use Plaid to auto-import transactions from supported banks',
    ],
  },
  {
    id: 'safe-to-spend',
    title: 'Safe-to-Spend & Guardrails',
    icon: Wallet,
    color: 'text-prism-teal',
    route: '/dashboard',
    summary: 'Set up your Safe-to-Spend number step by step — the core of your financial control system.',
    ttsScript: `Let's set up your Safe-to-Spend number. This is the most important feature in PrismMoney — it tells you exactly what you can safely spend each day, week, and month.

Here is the exact formula:

Safe-to-Spend equals your Monthly Income, minus Recurring Bills, minus Subscriptions, minus what you've Already Spent this month, multiplied by your Safety Buffer.

Let me walk you through each piece:

Step 1: Add your bank accounts. Go to Accounts in the sidebar and click Add Account. Add every checking and savings account you use. Enter the current balance for each one. This gives PrismMoney your total available cash.

Step 2: Record your income. Go to Transactions and click Add Transaction. Enter your income sources as positive amounts — for example, your salary of 5,000 dollars, freelance income of 1,500 dollars, or business revenue. Make sure the date is in the current month so it counts toward this month's Safe-to-Spend.

Step 3: Set up your recurring bills. Go to Recurring in the sidebar and click Add Recurring. Add every regular bill: rent or mortgage, utilities, car payment, insurance, loan payments. Set the correct frequency — monthly, weekly, biweekly, quarterly, or yearly. PrismMoney automatically converts these to monthly amounts for the calculation.

Step 4: Check your subscriptions. Go to Subscriptions in the sidebar. PrismMoney auto-detects recurring charges from your transactions. Review the list to make sure all active subscriptions are included — Netflix, Spotify, gym memberships, software tools, and so on.

Step 5: Choose your financial mode. Go back to the Dashboard and click the Mode button — the shield icon in the top right corner. Choose one of three modes:

Guardrail Mode applies a 15 percent safety buffer by default. This means 15 percent of your remaining money is set aside as protection. This is the recommended starting point.

Balanced Mode uses a 10 percent buffer — more flexibility but less protection.

Green Light Mode uses only a 5 percent buffer — maximum flexibility for users who have built consistent habits.

You can also manually adjust the buffer percentage to any number you want.

Here's a real example: Say you earn 6,000 dollars this month. Your recurring bills total 2,500 dollars. Subscriptions cost 200 dollars. You've already spent 800 dollars this month. That leaves 2,500 dollars. With a 15 percent Guardrail buffer, 375 dollars is set aside, giving you a Safe-to-Spend of 2,125 dollars for the rest of the month. Divided by the remaining days, that's your daily Safe-to-Spend.

Once set up, your number updates automatically every time you add a transaction, pay a bill, or receive income. You can also set daily and weekly spending limits under Spend Guardrails for extra alerts and protection.`,
    steps: [
      'Step 1: Go to Accounts → Add Account → enter each checking/savings account with its balance',
      'Step 2: Go to Transactions → Add Transaction → enter income as positive amounts (salary, freelance, revenue)',
      'Step 3: Go to Recurring → Add Recurring → enter every bill (rent, utilities, loans) with frequency',
      'Step 4: Go to Subscriptions → review auto-detected subscriptions and add any missing ones',
      'Step 5: Go to Dashboard → click Mode (shield icon) → choose Guardrail, Balanced, or Green Light',
      'Step 6: Optionally adjust your safety buffer percentage in the Mode settings',
      'Step 7: Review your Daily, Weekly, and Monthly Safe-to-Spend on the Dashboard',
    ],
    tips: [
      'Formula: Income − Bills − Subscriptions − Already Spent × (1 − Buffer%) = Safe-to-Spend',
      'Example: $6,000 income − $2,500 bills − $200 subs − $800 spent = $2,500 × 85% = $2,125/month',
      'Start with Guardrail Mode (15% buffer) — it protects you while you build habits',
      'Add ALL accounts and bills for an accurate number — missing data means an inaccurate Safe-to-Spend',
      'Your number updates in real time — no need to recalculate manually',
      'Switch between Combined, Personal, and Business views to see each context separately',
    ],
  },
  {
    id: 'categories',
    title: 'Organize Categories',
    icon: Tags,
    color: 'text-prism-lime',
    route: '/categories',
    summary: 'Create category groups and categories to classify your spending and income.',
    ttsScript: `Next, let's set up your categories. Categories help you organize every transaction. Go to the Categories page. You'll see category groups like "Housing," "Food," and "Income." Each group contains individual categories — for example, "Food" might include "Groceries," "Dining Out," and "Coffee." You can create new groups, add categories within them, and assign colors for easy visual identification. Categories are used in budgets, reports, and auto-categorization rules.`,
    steps: [
      'Go to Categories in the sidebar',
      'Review the default category groups',
      'Add new groups for your needs (e.g., "Side Hustle")',
      'Add categories within each group',
      'Assign colors for visual identification',
      'Set expense types (fixed, flexible, discretionary)',
    ],
    tips: [
      'Start with broad groups and refine as you learn your spending patterns',
      'Use consistent naming — auto-categorization rules match by merchant name',
      'Color-coded categories make charts and reports easier to read',
    ],
  },
  {
    id: 'transactions',
    title: 'Track Transactions',
    icon: ArrowLeftRight,
    color: 'text-prism-orange',
    route: '/transactions',
    summary: 'Add transactions manually, import from CSV, or sync via Plaid.',
    ttsScript: `Now let's add some transactions. You have three ways to get transactions in: manually, via CSV import, or through Plaid auto-sync. To add manually, click "Add Transaction" and enter the date, merchant, amount, account, and category. For bulk imports, use the CSV import — it supports Mint, Monarch Money, and generic formats. The app also auto-categorizes transactions using merchant rules you've set up. Use "Edit Multiple" mode to batch-edit categories or move transactions between accounts.`,
    steps: [
      'Go to Transactions in the sidebar',
      'Click "Add Transaction" for manual entry',
      'Or use CSV Import for bulk importing',
      'Use "Auto-categorize" to apply merchant rules',
      'Use "Edit Multiple" for batch changes',
      'Click any transaction to view or edit details',
    ],
    tips: [
      'Set up categorization rules in Settings → Rules to auto-categorize new transactions',
      'Use the search and filter tools to find specific transactions',
      'Split transactions across multiple categories when needed',
    ],
  },
  {
    id: 'budgets',
    title: 'Create Budgets',
    icon: PiggyBank,
    color: 'text-prism-amber',
    route: '/budgets',
    summary: 'Set monthly spending limits for each category and track your progress.',
    ttsScript: `Budgets help you control your spending. Go to the Budgets page to set planned amounts for each category each month. For example, you might budget 600 dollars for groceries and 200 dollars for dining out. The app tracks your actual spending against these budgets in real time. You'll see progress bars showing how much you've spent versus your limit. Enable rollover to carry unused budget amounts to the next month. Review your budget performance monthly to adjust as needed.`,
    steps: [
      'Navigate to Budgets from the sidebar',
      'Select the month you want to budget for',
      'Set planned amounts for each category',
      'Monitor spending vs. budget in real time',
      'Enable rollover for categories with variable spending',
      'Review and adjust monthly',
    ],
    tips: [
      'Start with your essential categories first (rent, utilities, groceries)',
      'Use the 50/30/20 rule: 50% needs, 30% wants, 20% savings',
      'Check your budget weekly to stay on track',
    ],
  },
  {
    id: 'recurring',
    title: 'Manage Recurring',
    icon: RepeatIcon,
    color: 'text-prism-sky',
    route: '/recurring',
    summary: 'Set up recurring bills and subscriptions so you never miss a payment.',
    ttsScript: `Recurring transactions keep you aware of upcoming bills. Go to the Recurring page and add your regular expenses — rent, subscriptions, insurance, loan payments. Set the frequency: weekly, biweekly, monthly, quarterly, or yearly. The app tracks next due dates and shows upcoming payments in both list and calendar views. This helps you plan cash flow and avoid surprises.`,
    steps: [
      'Go to Recurring in the sidebar',
      'Click "Add Recurring" to create a new entry',
      'Enter merchant, amount, frequency, and start date',
      'Assign to an account and category',
      'Toggle between List and Calendar views',
      'Review upcoming due dates regularly',
    ],
    tips: [
      'Add all subscriptions to catch forgotten charges',
      'Use the calendar view to see payment clusters',
      'Set end dates for temporary subscriptions',
    ],
  },
  {
    id: 'cashflow',
    title: 'Monitor Cash Flow',
    icon: Wallet,
    color: 'text-prism-teal',
    route: '/cash-flow',
    summary: 'Visualize income vs. expenses over time to understand your financial flow.',
    ttsScript: `The Cash Flow page gives you a bird's eye view of your money movement. See your income versus expenses charted over time. Identify months where you're spending more than you earn. The waterfall chart shows how each category contributes to your net cash flow. Use this to make informed decisions about spending adjustments.`,
    steps: [
      'Go to Cash Flow from the sidebar',
      'Review the income vs. expense chart',
      'Check net cash flow trends over time',
      'Identify spending spikes and patterns',
    ],
    tips: [
      'Positive cash flow means you are saving - aim to keep it green',
      'Compare month-over-month to spot trends',
    ],
  },
  {
    id: 'goals',
    title: 'Set Financial Goals',
    icon: Target,
    color: 'text-prism-lime',
    route: '/goals',
    summary: 'Create savings goals and track your progress toward financial milestones.',
    ttsScript: `Goals keep you motivated. Go to the Goals page and create targets like "Emergency Fund," "Vacation," or "Down Payment." Set a target amount and optional deadline. Update your current savings as you make progress. The app shows your percentage complete and estimated completion date. You can customize each goal with colors and icons.`,
    steps: [
      'Navigate to Goals in the sidebar',
      'Click "Add Goal" to create a new target',
      'Enter name, target amount, and optional deadline',
      'Update current amount as you save',
      'Track progress with visual indicators',
    ],
    tips: [
      'Start with an emergency fund goal (3-6 months of expenses)',
      'Break large goals into smaller milestones',
      'Review and update goals monthly',
    ],
  },
  {
    id: 'debt',
    title: 'Plan Debt Payoff',
    icon: TrendingDown,
    color: 'text-prism-rose',
    route: '/debt-payoff',
    summary: 'Create a debt payoff strategy using avalanche or snowball methods.',
    ttsScript: `If you have debt, the Debt Payoff planner helps you create a strategy. Add your debts with balances, interest rates, and minimum payments. Choose between the avalanche method, which pays off highest interest first, or the snowball method, which targets smallest balances first. Set an extra monthly payment amount and see your projected payoff timeline. The AI debt advisor can also provide personalized recommendations.`,
    steps: [
      'Go to Debt Payoff from the sidebar',
      'Add each debt with balance, rate, and minimum payment',
      'Choose a strategy: Avalanche or Snowball',
      'Set your extra monthly payment amount',
      'Review the projected payoff timeline',
      'Use the AI Debt Advisor for personalized tips',
    ],
    tips: [
      'Avalanche saves the most on interest over time',
      'Snowball gives quick wins for motivation',
      'Even small extra payments make a big difference',
    ],
  },
  {
    id: 'investments',
    title: 'Track Investments',
    icon: TrendingUp,
    color: 'text-prism-indigo',
    route: '/investments',
    summary: 'Monitor your investment portfolio and track asset allocation.',
    ttsScript: `The Investments page helps you keep an eye on your portfolio. Add your investment accounts and track holdings. See your asset allocation across stocks, bonds, and other investments. Monitor performance over time and review your investment strategy alongside your overall financial plan.`,
    steps: [
      'Navigate to Investments from the sidebar',
      'Add investment accounts',
      'Track holdings and balances',
      'Review asset allocation',
      'Monitor performance trends',
    ],
    tips: [
      'Update investment balances monthly for accurate net worth',
      'Diversify across asset classes to manage risk',
      'Consider your risk tolerance and time horizon',
    ],
  },
  {
    id: 'reports',
    title: 'Generate Reports',
    icon: BarChart3,
    color: 'text-prism-orange',
    route: '/reports',
    summary: 'View spending trends, category breakdowns, and financial summaries.',
    ttsScript: `Reports give you deep insights into your finances. View spending by category with pie charts and bar graphs. Compare spending month-over-month. See income trends and net worth progression. Export reports as PDFs for your records or tax preparation. The AI spending insights feature provides personalized analysis of your spending patterns.`,
    steps: [
      'Go to Reports from the sidebar',
      'Select the date range for your report',
      'View category breakdowns and trend charts',
      'Use AI Spending Insights for analysis',
      'Export reports as PDF when needed',
    ],
    tips: [
      'Review reports monthly to catch spending drift',
      'Use the business report view for tax-deductible expenses',
      'Compare year-over-year for long-term trends',
    ],
  },
  {
    id: 'tax',
    title: 'Tax Assistant',
    icon: Bot,
    color: 'text-prism-indigo',
    route: '/tax-assistant',
    summary: 'Get AI-powered answers to your tax questions and save responses for reference.',
    ttsScript: `The Tax Assistant uses AI to answer your tax questions. Ask about deductions, filing requirements, business expenses, or any tax-related topic. Save important responses for future reference. Tag saved responses for easy searching. Remember, this provides educational information — always consult a tax professional for specific advice.`,
    steps: [
      'Navigate to Tax Assistant from the sidebar',
      'Type your tax question in the chat',
      'Review the AI-generated response',
      'Save useful responses with tags',
      'Listen to responses with the TTS feature',
    ],
    tips: [
      'Be specific with your questions for better answers',
      'Save responses about deductions you plan to claim',
      'Use this alongside your Categories for business expense tracking',
    ],
  },
];

const WELCOME_TTS = `Welcome to PrismMoney! This Getting Started guide will walk you through every feature of the app, step by step. Each section includes a voice walkthrough you can listen to, detailed setup steps, and helpful tips. Start from the top with Accounts and work your way down, or jump to any section you need. Let's get your finances organized!`;

function StepCard({ step, index, isCompleted, isAutoDetected, onToggleComplete }: {
  step: TrainingStep;
  index: number;
  isCompleted: boolean;
  isAutoDetected?: boolean;
  onToggleComplete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const tts = useTTS();
  const navigate = useNavigate();

  const handleTTSToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tts.isSpeaking && !tts.isPaused) {
      tts.pause();
    } else if (tts.isPaused) {
      tts.resume();
    } else {
      tts.speak(step.ttsScript);
    }
  };

  return (
    <Card className={cn(
      'transition-all duration-200',
      isCompleted && 'border-prism-teal/30 bg-prism-teal/5',
      expanded && 'shadow-md'
    )}>
      <CardContent className="p-0">
        {/* Header - always visible */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center gap-2.5 sm:gap-4 p-3.5 sm:p-5 text-left"
        >
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-muted text-xs sm:text-sm font-bold text-muted-foreground">
              {index + 1}
            </span>
            <span className={cn(
              'flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0',
            )}>
              <step.icon className={cn('h-4 w-4 sm:h-5 sm:w-5', step.color)} />
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h3 className="font-display font-semibold text-sm sm:text-base">{step.title}</h3>
              {isCompleted && <CheckCircle2 className="h-4 w-4 text-prism-teal shrink-0" />}
              {isAutoDetected && <Badge variant="secondary" className="text-[10px] bg-prism-teal/10 text-prism-teal border-prism-teal/20">Auto</Badge>}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{step.summary}</p>
          </div>
          {expanded ? <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />}
        </button>

        {/* Expanded content */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <Separator />
              <div className="p-5 space-y-5">
                {/* TTS + Navigation controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant={tts.isSpeaking ? 'default' : 'outline'}
                    size="sm"
                    className="gap-1.5"
                    onClick={handleTTSToggle}
                  >
                    {tts.isSpeaking && !tts.isPaused ? (
                      <><Pause className="h-3.5 w-3.5" /> Pause</>
                    ) : tts.isPaused ? (
                      <><Play className="h-3.5 w-3.5" /> Resume</>
                    ) : (
                      <><Volume2 className="h-3.5 w-3.5" /> Listen to Guide</>
                    )}
                  </Button>
                  {tts.isSpeaking && (
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); tts.stop(); }}>
                      <Square className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 ml-auto"
                    onClick={(e) => { e.stopPropagation(); navigate(step.route); }}
                  >
                    <Rocket className="h-3.5 w-3.5" /> Go to {step.title.split(' ').pop()}
                  </Button>
                </div>

                {/* Steps */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-primary" /> Setup Steps
                  </h4>
                  <ol className="space-y-1.5">
                    {step.steps.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {s}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Tips */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-prism-amber" /> Pro Tips
                  </h4>
                  <ul className="space-y-1.5">
                    {step.tips.map((t, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-prism-amber shrink-0 mt-1">•</span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Mark complete */}
                <Button
                  variant={isCompleted ? 'outline' : 'default'}
                  size="sm"
                  className="gap-1.5"
                  onClick={(e) => { e.stopPropagation(); onToggleComplete(); }}
                >
                  {isCompleted ? (
                    <><Circle className="h-3.5 w-3.5" /> Mark Incomplete</>
                  ) : (
                    <><CheckCircle2 className="h-3.5 w-3.5" /> Mark Complete</>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

// ──────────────── Guided Tour Component ────────────────
const TOUR_SLIDES = [
  {
    title: 'Welcome to PrismMoney! 🎉',
    desc: 'This guided tour walks you through the key steps to get your finances organized. It takes about 5 minutes.',
    icon: Rocket,
    gradient: 'from-prism-navy to-prism-teal',
    tip: 'You can revisit this tour anytime from this page.',
  },
  {
    title: '1. Add Your Accounts',
    desc: 'Start by adding your bank accounts, credit cards, and investment accounts. This gives you a complete picture of your finances in one place.',
    icon: Landmark,
    gradient: 'from-prism-sky to-prism-teal',
    tip: 'Use Plaid to automatically connect your bank for real-time transaction syncing.',
    route: '/accounts',
  },
  {
    title: '2. Set Up Categories',
    desc: 'Categories organize your transactions into groups like "Housing," "Food," and "Income." They power your budgets and reports.',
    icon: Tags,
    gradient: 'from-prism-lime to-prism-teal',
    tip: 'Default categories are created automatically — customize them to match your lifestyle.',
    route: '/categories',
  },
  {
    title: '3. Add Transactions',
    desc: 'Import bank statements via CSV, add transactions manually, or connect via Plaid. The app auto-categorizes them using your rules.',
    icon: ArrowLeftRight,
    gradient: 'from-prism-orange to-prism-amber',
    tip: 'Supports Chase, Bank of America, Wells Fargo, Capital One, QuickBooks, and more.',
    route: '/transactions',
  },
  {
    title: '4. Create Your Budget',
    desc: 'Set planned spending amounts for each category. Track spending vs. budget in real time with visual progress bars.',
    icon: PiggyBank,
    gradient: 'from-prism-amber to-prism-orange',
    tip: 'Start with the 50/30/20 rule: 50% needs, 30% wants, 20% savings & debt payoff.',
    route: '/budgets',
  },
  {
    title: '5. Set Goals & Crush Debt',
    desc: 'Create savings goals, plan debt payoff strategies (avalanche or snowball), and track your progress over time.',
    icon: Target,
    gradient: 'from-prism-rose to-prism-orange',
    tip: 'Even small extra payments on debt make a huge difference over time.',
    route: '/goals',
  },
  {
    title: "You're All Set!",
    desc: 'Explore Reports, Cash Flow, Tax Assistant, and more as you go. Each step below has a detailed voice walkthrough.',
    icon: Sparkles,
    gradient: 'from-prism-violet to-prism-indigo',
    tip: 'Steps auto-complete as you add real data. No need to manually check them off!',
  },
];

function GuidedTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [slideIdx, setSlideIdx] = useState(0);
  const navigate = useNavigate();
  const slide = TOUR_SLIDES[slideIdx];
  const isLast = slideIdx === TOUR_SLIDES.length - 1;
  const isFirst = slideIdx === 0;
  const Icon = slide.icon;

  const handleNext = () => isLast ? onClose() : setSlideIdx(s => s + 1);
  const handlePrev = () => !isFirst && setSlideIdx(s => s - 1);
  const handleGoTo = () => { if (slide.route) { onClose(); navigate(slide.route); } };

  // Reset slide on open
  useEffect(() => { if (open) setSlideIdx(0); }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border-0 w-[calc(100vw-2rem)] sm:w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={slideIdx}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
          >
            {/* Hero area */}
            <div className={cn('p-5 sm:p-8 pb-4 sm:pb-6 bg-gradient-to-br text-white', slide.gradient)}>
              <div className="flex items-start justify-between mb-4 sm:mb-6">
                <div className="flex h-11 w-11 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <Icon className="h-5 w-5 sm:h-7 sm:w-7" />
                </div>
                <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold">{slide.title}</h2>
              <p className="mt-2 text-white/80 text-xs sm:text-sm leading-relaxed">{slide.desc}</p>
            </div>

            {/* Content area */}
            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div className="flex items-start gap-3 rounded-lg bg-primary/5 p-2.5 sm:p-3">
                <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-muted-foreground"><span className="font-medium text-foreground">Tip:</span> {slide.tip}</p>
              </div>

              {/* Progress dots */}
              <div className="flex items-center justify-center gap-1.5">
                {TOUR_SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSlideIdx(i)}
                    className={cn(
                      'h-2 rounded-full transition-all',
                      i === slideIdx ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                    )}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={handlePrev} disabled={isFirst} className="gap-1 text-xs sm:text-sm h-8">
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <div className="flex gap-1.5 sm:gap-2">
                  {slide.route && (
                    <Button variant="outline" size="sm" onClick={handleGoTo} className="gap-1 text-xs sm:text-sm h-8">
                      <Rocket className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Go There</span><span className="sm:hidden">Go</span>
                    </Button>
                  )}
                  <Button size="sm" onClick={handleNext} className="gap-1 text-xs sm:text-sm h-8">
                    {isLast ? 'Get Started' : 'Next'} {!isLast && <ChevronRight className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────── Main Page Component ────────────────
const GettingStarted = () => {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('prism-getting-started-progress');
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch { return new Set<string>(); }
  });
  const tts = useTTS();
  const [tourOpen, setTourOpen] = useState(() => {
    return !localStorage.getItem('prism-gs-tour-seen');
  });

  // Data hooks for auto-detection
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { data: transactions } = useTransactions();
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
  const { data: budgets } = useBudgets(currentMonth);
  const { data: recurring } = useRecurringTransactions();
  const { data: goals } = useGoals();
  const { data: debtPlans } = useDebtPlans();

  // Auto-detect completed steps based on real data
  const autoDetected = useMemo(() => {
    const auto = new Set<string>();
    if (accounts && accounts.length > 0) auto.add('accounts');
    if (categories && categories.length > 0) auto.add('categories');
    if (transactions && transactions.length > 0) auto.add('transactions');
    if (budgets && budgets.length > 0) auto.add('budgets');
    if (recurring && recurring.length > 0) auto.add('recurring');
    if (goals && goals.length > 0) auto.add('goals');
    if (debtPlans && debtPlans.length > 0) auto.add('debt');
    return auto;
  }, [accounts, categories, transactions, budgets, recurring, goals, debtPlans]);

  // Merge manual + auto-detected
  const mergedCompleted = useMemo(() => {
    return new Set([...completedSteps, ...autoDetected]);
  }, [completedSteps, autoDetected]);

  // Persist auto-detections to localStorage
  useEffect(() => {
    if (autoDetected.size > 0) {
      const merged = new Set([...completedSteps, ...autoDetected]);
      if (merged.size > completedSteps.size) {
        setCompletedSteps(merged);
        localStorage.setItem('prism-getting-started-progress', JSON.stringify([...merged]));
      }
    }
  }, [autoDetected]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleComplete = (id: string) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem('prism-getting-started-progress', JSON.stringify([...next]));
      return next;
    });
  };

  const progress = (mergedCompleted.size / TRAINING_STEPS.length) * 100;
  const allComplete = mergedCompleted.size === TRAINING_STEPS.length;

  // Fire confetti only once when all steps become complete
  const [confettiFired, setConfettiFired] = useState(false);
  useEffect(() => {
    if (allComplete && !confettiFired) {
      const alreadyCelebrated = localStorage.getItem('prism-gs-confetti-page');
      if (!alreadyCelebrated) {
        setConfettiFired(true);
        localStorage.setItem('prism-gs-confetti-page', '1');
      }
    }
  }, [allComplete, confettiFired]);

  const handleWelcomeTTS = () => {
    if (tts.isSpeaking && !tts.isPaused) tts.pause();
    else if (tts.isPaused) tts.resume();
    else tts.speak(WELCOME_TTS);
  };

  const closeTour = useCallback(() => {
    setTourOpen(false);
    localStorage.setItem('prism-gs-tour-seen', '1');
  }, []);

  const handleResetProgress = () => {
    setCompletedSteps(new Set());
    setConfettiFired(false);
    localStorage.removeItem('prism-getting-started-progress');
    localStorage.removeItem('prism-gs-confetti-page');
    localStorage.removeItem('prism-gs-confetti-widget');
    localStorage.removeItem('prism-gs-widget-dismissed');
    toast.success('Progress reset! You can redo all steps.');
  };

  // Count how many were auto-detected
  const autoCount = [...autoDetected].filter(id => !completedSteps.has(id) || autoDetected.has(id)).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-3xl">
      <Confetti trigger={confettiFired} />
      {/* Guided Tour */}
      <GuidedTour open={tourOpen} onClose={closeTour} />

      {/* Header */}
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold">Getting Started</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Learn how to set up and use every feature of PrismMoney.</p>
      </div>

      {/* Welcome card with progress */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-prism-teal/5">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl prism-gradient prism-glow shrink-0">
              <Rocket className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-lg sm:text-xl font-bold">Welcome to PrismMoney!</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Follow these {TRAINING_STEPS.length} steps to get your finances fully set up. 
                Each section includes a voice walkthrough, step-by-step instructions, and pro tips.
              </p>
              {autoCount > 0 && (
                <div className="flex items-center gap-1.5 mt-2">
                  <Badge variant="secondary" className="gap-1 text-[10px] sm:text-xs bg-prism-teal/10 text-prism-teal border-prism-teal/20">
                    <Zap className="h-3 w-3" /> {autoCount} auto-detected from your data
                  </Badge>
                </div>
              )}
              <div className="flex items-center gap-3 mt-3">
                <Progress value={progress} className="flex-1 h-2" />
                <span className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">
                  {mergedCompleted.size}/{TRAINING_STEPS.length} complete
                </span>
              </div>
            </div>
          </div>
          {/* Action buttons — stacked below on mobile */}
          <div className="flex items-center gap-1.5 sm:gap-2 mt-3 sm:mt-4 flex-wrap">
            {mergedCompleted.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground h-8 text-xs sm:text-sm"
                onClick={handleResetProgress}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs sm:text-sm"
              onClick={() => setTourOpen(true)}
            >
              <Eye className="h-3.5 w-3.5" /> Tour
            </Button>
            <Button
              variant={tts.isSpeaking ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5 h-8 text-xs sm:text-sm"
              onClick={handleWelcomeTTS}
            >
              {tts.isSpeaking && !tts.isPaused ? (
                <><Pause className="h-3.5 w-3.5" /> Pause</>
              ) : tts.isPaused ? (
                <><Play className="h-3.5 w-3.5" /> Resume</>
              ) : (
                <><Volume2 className="h-3.5 w-3.5" /> Welcome</>
              )}
            </Button>
            {tts.isSpeaking && (
              <Button variant="ghost" size="sm" className="h-8" onClick={tts.stop}>
                <Square className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Training steps */}
      <div className="space-y-3">
        {TRAINING_STEPS.map((step, i) => (
          <StepCard
            key={step.id}
            step={step}
            index={i}
            isCompleted={mergedCompleted.has(step.id)}
            isAutoDetected={autoDetected.has(step.id)}
            onToggleComplete={() => toggleComplete(step.id)}
          />
        ))}
      </div>

      {/* Completion message */}
      {mergedCompleted.size === TRAINING_STEPS.length && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-prism-teal/30 bg-prism-teal/5">
            <CardContent className="p-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-prism-teal/10 mx-auto mb-3">
                <CheckCircle2 className="h-8 w-8 text-prism-teal" />
              </div>
              <h3 className="font-display text-xl font-bold">You're All Set! 🎉</h3>
              <p className="text-sm text-muted-foreground mt-1">
                You've completed all the training steps. You're now a PrismMoney pro!
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};

export default GettingStarted;
