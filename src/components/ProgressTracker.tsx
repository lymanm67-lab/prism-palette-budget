import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useProgressStats } from '@/hooks/use-progress-tracker';
import { Target, CheckCircle2, AlertCircle, Flame, Trophy } from 'lucide-react';

export function ProgressTracker() {
  const stats = useProgressStats();

  const isComplete = stats.daysWithinBudget >= 90;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <Card className="prism-card-shine border-border/50">
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="font-display font-bold text-sm">Financial Control Progress</span>
            </div>
            <Badge variant="outline" className="text-[10px] gap-1">
              {isComplete ? (
                <><Trophy className="h-3 w-3 text-prism-orange" /> Complete!</>
              ) : (
                <>Day {stats.dayNumber} of 90</>
              )}
            </Badge>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="relative h-3 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-prism-teal to-prism-lime"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(stats.progressPercent, 100)}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{stats.daysWithinBudget} days within budget</span>
              <span>{90 - stats.daysWithinBudget} to go</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/30">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-prism-teal shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Within Budget</p>
                <p className="font-display text-sm font-bold">{stats.daysWithinBudget}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-prism-orange shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Days Missed</p>
                <p className="font-display text-sm font-bold">{stats.daysMissed}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-prism-rose shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Current Streak</p>
                <p className="font-display text-sm font-bold">{stats.currentStreak}</p>
              </div>
            </div>
          </div>

          {/* Encouragement message */}
          <p className="text-xs text-muted-foreground text-center pt-1">
            {stats.daysMissed > 0 && stats.totalDays > 0
              ? 'One day does not reset your progress. Stay consistent and keep moving forward.'
              : 'Stay within your Safe-to-Spend for 90 days to unlock more flexibility in your spending.'}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
