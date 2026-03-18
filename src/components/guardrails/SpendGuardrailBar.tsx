import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Shield, TrendingDown, AlertTriangle, CheckCircle2, Settings2, Zap } from 'lucide-react';
import { useSpendGuardrails } from '@/hooks/use-spend-guardrails';
import { useCurrency } from '@/hooks/use-currency';
import { GuardrailSettingsDialog } from './GuardrailSettingsDialog';

const THRESHOLD_COLORS = {
  green: {
    bar: 'bg-prism-teal',
    badge: 'bg-prism-teal/10 text-prism-teal border-prism-teal/30',
    glow: 'shadow-prism-teal/20',
    text: 'text-prism-teal',
  },
  yellow: {
    bar: 'bg-prism-orange',
    badge: 'bg-prism-orange/10 text-prism-orange border-prism-orange/30',
    glow: 'shadow-prism-orange/20',
    text: 'text-prism-orange',
  },
  red: {
    bar: 'bg-prism-rose',
    badge: 'bg-prism-rose/10 text-prism-rose border-prism-rose/30',
    glow: 'shadow-prism-rose/20',
    text: 'text-prism-rose',
  },
};

export function SpendGuardrailBar() {
  const status = useSpendGuardrails();
  const { formatCurrency } = useCurrency();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Not configured — show setup prompt
  if (!status.isEnabled || (!status.dailyLimit && !status.weeklyLimit)) {
    return (
      <>
        <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-display font-semibold text-sm">Smart Spend Guardrails</p>
                <p className="text-xs text-muted-foreground">Set spending limits to stay on track — your financial coach in the moment.</p>
              </div>
            </div>
            <Button size="sm" onClick={() => setSettingsOpen(true)} className="gap-1.5">
              <Settings2 className="h-3.5 w-3.5" /> Set Up
            </Button>
          </CardContent>
        </Card>
        <GuardrailSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </>
    );
  }

  const showDaily = status.dailyLimit !== null;
  const showWeekly = status.weeklyLimit !== null;
  const dailyColors = THRESHOLD_COLORS[status.dailyThreshold];
  const weeklyColors = THRESHOLD_COLORS[status.weeklyThreshold];

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="prism-card-shine border-border/50 overflow-hidden">
          <CardContent className="p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="font-display font-bold text-sm">Smart Spend Guardrails</span>
              </div>
              <div className="flex items-center gap-2">
                {status.daysUntilExceed !== null && status.daysUntilExceed <= 2 && status.weeklyThreshold !== 'red' && (
                  <Badge variant="outline" className="text-[10px] bg-prism-orange/10 text-prism-orange border-prism-orange/30 gap-1">
                    <Zap className="h-3 w-3" />
                    Exceeds in {status.daysUntilExceed}d
                  </Badge>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSettingsOpen(true)}>
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Bars */}
            <div className={`grid gap-3 ${showDaily && showWeekly ? 'sm:grid-cols-2' : ''}`}>
              {showDaily && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Daily</span>
                    <span className="font-semibold">
                      <span className={dailyColors.text}>{formatCurrency(status.dailySpent)}</span>
                      <span className="text-muted-foreground"> / {formatCurrency(status.dailyLimit!)}</span>
                    </span>
                  </div>
                  <div className="relative h-2.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className={`absolute inset-y-0 left-0 rounded-full ${dailyColors.bar} transition-colors duration-500`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(status.dailyPercent, 100)}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                  {status.dailyBudgetRemaining !== null && status.dailyBudgetRemaining > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      {formatCurrency(status.dailyBudgetRemaining)} remaining today
                    </p>
                  )}
                </div>
              )}

              {showWeekly && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Weekly</span>
                    <span className="font-semibold">
                      <span className={weeklyColors.text}>{formatCurrency(status.weeklySpent)}</span>
                      <span className="text-muted-foreground"> / {formatCurrency(status.weeklyLimit!)}</span>
                    </span>
                  </div>
                  <div className="relative h-2.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className={`absolute inset-y-0 left-0 rounded-full ${weeklyColors.bar} transition-colors duration-500`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(status.weeklyPercent, 100)}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                  {status.weeklyBudgetRemaining !== null && status.weeklyBudgetRemaining > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      {formatCurrency(status.weeklyBudgetRemaining)} remaining this week
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Summary insight */}
            <div className="flex items-center gap-2 text-xs pt-1 border-t border-border/30">
              {status.dailyLimit && status.daysWithinBudget === status.totalDaysTracked ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-prism-teal shrink-0" />
                  <span className="text-muted-foreground">
                    You stayed within budget <span className="font-semibold text-prism-teal">{status.daysWithinBudget} out of {status.totalDaysTracked}</span> days this week 🎉
                  </span>
                </>
              ) : status.dailyLimit ? (
                <>
                  <TrendingDown className="h-3.5 w-3.5 text-prism-orange shrink-0" />
                  <span className="text-muted-foreground">
                    You stayed within budget <span className="font-semibold text-foreground">{status.daysWithinBudget} out of {status.totalDaysTracked}</span> days this week
                  </span>
                </>
              ) : status.daysUntilExceed !== null && status.daysUntilExceed <= 3 ? (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-prism-orange shrink-0" />
                  <span className="text-muted-foreground">
                    At your current pace, you'll exceed your budget in <span className="font-semibold text-prism-orange">{status.daysUntilExceed} days</span>
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-prism-teal shrink-0" />
                  <span className="text-muted-foreground">Spending is on track this week</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
      <GuardrailSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
