import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Rocket, ChevronRight, CheckCircle2,
  Landmark, Tags, ArrowLeftRight, PiggyBank, RepeatIcon,
  Wallet, Target, TrendingDown, TrendingUp, BarChart3, Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 'accounts', title: 'Set Up Accounts', icon: Landmark, route: '/accounts' },
  { id: 'categories', title: 'Organize Categories', icon: Tags, route: '/categories' },
  { id: 'transactions', title: 'Track Transactions', icon: ArrowLeftRight, route: '/transactions' },
  { id: 'budgets', title: 'Create Budgets', icon: PiggyBank, route: '/budgets' },
  { id: 'recurring', title: 'Manage Recurring', icon: RepeatIcon, route: '/recurring' },
  { id: 'cashflow', title: 'Monitor Cash Flow', icon: Wallet, route: '/cash-flow' },
  { id: 'goals', title: 'Set Financial Goals', icon: Target, route: '/goals' },
  { id: 'debt', title: 'Plan Debt Payoff', icon: TrendingDown, route: '/debt-payoff' },
  { id: 'investments', title: 'Track Investments', icon: TrendingUp, route: '/investments' },
  { id: 'reports', title: 'Generate Reports', icon: BarChart3, route: '/reports' },
  { id: 'tax', title: 'Tax Assistant', icon: Bot, route: '/tax-assistant' },
];

const GettingStartedWidget = () => {
  const navigate = useNavigate();

  const { completedSet, progress, nextSteps } = useMemo(() => {
    let completed = new Set<string>();
    try {
      const saved = localStorage.getItem('prism-getting-started-progress');
      if (saved) completed = new Set(JSON.parse(saved));
    } catch {}

    const pct = Math.round((completed.size / STEPS.length) * 100);
    const remaining = STEPS.filter(s => !completed.has(s.id)).slice(0, 3);
    return { completedSet: completed, progress: pct, nextSteps: remaining };
  }, []);

  // Don't show if all steps completed and user dismissed
  const dismissed = localStorage.getItem('prism-gs-widget-dismissed');
  if (progress === 100 && dismissed) return null;

  // All done state
  if (progress === 100) {
    return (
      <Card className="border-prism-teal/30 bg-gradient-to-r from-prism-teal/5 to-prism-lime/5">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-prism-teal/10 shrink-0">
            <CheckCircle2 className="h-5 w-5 text-prism-teal" />
          </div>
          <div className="flex-1">
            <p className="font-display font-bold text-sm">Setup Complete! 🎉</p>
            <p className="text-xs text-muted-foreground">You've finished all getting started steps.</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => {
              localStorage.setItem('prism-gs-widget-dismissed', '1');
              window.location.reload();
            }}
          >
            Dismiss
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-prism-teal/5">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl prism-gradient shrink-0">
              <Rocket className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-display font-bold text-sm">Getting Started</p>
              <p className="text-xs text-muted-foreground">
                {completedSet.size}/{STEPS.length} steps complete
              </p>
            </div>
          </div>
          <span className="text-lg font-display font-bold text-primary">{progress}%</span>
        </div>

        {/* Progress bar */}
        <Progress value={progress} className="h-2" />

        {/* Next unfinished steps */}
        {nextSteps.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Next up</p>
            {nextSteps.map((step) => {
              const Icon = step.icon;
              return (
                <button
                  key={step.id}
                  onClick={() => navigate(step.route)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-primary/5 group"
                >
                  <Icon className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm font-medium flex-1">{step.title}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              );
            })}
          </div>
        )}

        {/* Link to full guide */}
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
          onClick={() => navigate('/getting-started')}
        >
          View Full Guide <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default GettingStartedWidget;
