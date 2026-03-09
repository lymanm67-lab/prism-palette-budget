import { useMemo } from 'react';
import { useGoals } from '@/hooks/use-goals';
import { useCurrency } from '@/hooks/use-currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Target, ChevronRight, Sparkles, TrendingUp, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { differenceInDays, parseISO, format } from 'date-fns';
import { motion } from 'framer-motion';

export default function GoalTrackerWidget() {
  const { data: goals, isLoading } = useGoals();
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();

  const activeGoals = useMemo(() => {
    if (!goals) return [];
    return goals
      .filter(g => !g.is_completed)
      .sort((a, b) => {
        // Sort by progress percentage descending
        const aProgress = (a.current_amount / a.target_amount) * 100;
        const bProgress = (b.current_amount / b.target_amount) * 100;
        return bProgress - aProgress;
      })
      .slice(0, 3);
  }, [goals]);

  const stats = useMemo(() => {
    if (!goals) return { total: 0, completed: 0, totalSaved: 0, totalTarget: 0 };
    const completed = goals.filter(g => g.is_completed).length;
    const totalSaved = goals.reduce((s, g) => s + g.current_amount, 0);
    const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);
    return { total: goals.length, completed, totalSaved, totalTarget };
  }, [goals]);

  if (isLoading) {
    return (
      <Card className="prism-card-shine">
        <CardContent className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  if (!goals || goals.length === 0) {
    return (
      <Card className="prism-card-shine border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-3">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold">No goals yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Set savings goals to track your progress
          </p>
          <Button onClick={() => navigate('/goals')} size="sm">
            Create a Goal
          </Button>
        </CardContent>
      </Card>
    );
  }

  const overallProgress = stats.totalTarget > 0 
    ? Math.round((stats.totalSaved / stats.totalTarget) * 100) 
    : 0;

  return (
    <Card className="prism-card-shine">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5 text-primary" />
            Goal Progress
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/goals')} className="text-xs">
            View All <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall progress */}
        <div className="rounded-lg bg-gradient-to-r from-primary/10 to-transparent p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">
              {stats.completed}/{stats.total} completed
            </span>
          </div>
          <Progress value={overallProgress} className="h-2" />
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>{formatCurrency(stats.totalSaved)} saved</span>
            <span>{formatCurrency(stats.totalTarget)} target</span>
          </div>
        </div>

        {/* Individual goals */}
        <div className="space-y-3">
          {activeGoals.map((goal, index) => {
            const progress = Math.round((goal.current_amount / goal.target_amount) * 100);
            const remaining = goal.target_amount - goal.current_amount;
            const daysLeft = goal.target_date 
              ? differenceInDays(parseISO(goal.target_date), new Date())
              : null;

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group rounded-lg border border-border/50 p-3 hover:border-border transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-8 w-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${goal.color}20` }}
                    >
                      <Target className="h-4 w-4" style={{ color: goal.color || 'hsl(var(--primary))' }} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{goal.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(remaining)} to go
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-bold" style={{ color: goal.color || 'hsl(var(--primary))' }}>
                    {progress}%
                  </span>
                </div>
                <Progress 
                  value={progress} 
                  className="h-1.5"
                  style={{ '--progress-color': goal.color } as any}
                />
                {daysLeft !== null && daysLeft > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{daysLeft} days left</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
