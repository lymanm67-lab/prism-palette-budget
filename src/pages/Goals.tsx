import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Confetti from '@/components/Confetti';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useCurrency } from '@/hooks/use-currency';
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from '@/hooks/use-goals';
import { Plus, Target, Loader2, Trash2, Pencil, Trophy, Wallet, CreditCard, TrendingUp } from 'lucide-react';
import PageOverview from '@/components/PageOverview';

const GOAL_TYPES = [
  { value: 'savings', label: 'Savings Goal', icon: Wallet },
  { value: 'debt_payoff', label: 'Debt Payoff', icon: CreditCard },
  { value: 'investment', label: 'Investment Target', icon: TrendingUp },
  { value: 'emergency_fund', label: 'Emergency Fund', icon: Target },
];

const Goals = () => {
  const { formatCurrency } = useCurrency();
  const { data: goals, isLoading } = useGoals();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', target_amount: '', current_amount: '', goal_type: 'savings', target_date: '', notes: '' });
  const [confettiTrigger, setConfettiTrigger] = useState(false);
  const prevGoalsRef = useRef<any[]>([]);

  // Detect when a goal newly reaches 100%
  useEffect(() => {
    if (!goals || goals.length === 0) {
      prevGoalsRef.current = goals || [];
      return;
    }
    const prev = prevGoalsRef.current;
    if (prev.length > 0) {
      const newlyCompleted = goals.some((g: any) => {
        const old = prev.find((p: any) => p.id === g.id);
        const wasIncomplete = !old || old.current_amount < old.target_amount;
        const isNowComplete = g.target_amount > 0 && g.current_amount >= g.target_amount;
        return wasIncomplete && isNowComplete;
      });
      if (newlyCompleted) {
        setConfettiTrigger(false);
        requestAnimationFrame(() => setConfettiTrigger(true));
      }
    }
    prevGoalsRef.current = goals;
  }, [goals]);

  const handleSave = async () => {
    const payload = {
      name: form.name,
      target_amount: parseFloat(form.target_amount) || 0,
      current_amount: parseFloat(form.current_amount) || 0,
      goal_type: form.goal_type,
      target_date: form.target_date || null,
      notes: form.notes || null,
    };
    if (editId) {
      await updateGoal.mutateAsync({ id: editId, ...payload });
    } else {
      await createGoal.mutateAsync(payload);
    }
    setForm({ name: '', target_amount: '', current_amount: '', goal_type: 'savings', target_date: '', notes: '' });
    setEditId(null);
    setOpen(false);
  };

  const openEdit = (g: any) => {
    setEditId(g.id);
    setForm({
      name: g.name,
      target_amount: String(g.target_amount),
      current_amount: String(g.current_amount),
      goal_type: g.goal_type,
      target_date: g.target_date || '',
      notes: g.notes || '',
    });
    setOpen(true);
  };

  if (isLoading) return (
    <div className="p-8">
      <div className="mb-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg mb-2" />
        <div className="h-4 w-96 bg-muted/60 animate-pulse rounded" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    </div>
  );

  if (!goals?.length) {
    return (
      <div className="space-y-4">
        <Confetti trigger={confettiTrigger} />
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            <span className="prism-gradient-text">Financial Goals</span>
          </h1>
        </div>
        <EmptyState
          icon={Target}
          title="No goals set yet"
          description="Create your first financial goal to start tracking progress toward your dreams, whether it's an emergency fund, vacation, or down payment."
          actionLabel="Create Goal"
          onAction={() => setOpen(true)}
        />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <Confetti trigger={confettiTrigger} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            <span className="prism-gradient-text">Financial Goals</span>
          </h1>
          <p className="text-muted-foreground mt-1">Track your savings goals and debt payoff targets.</p>
          <PageOverview title="Financial Goals" description="Create savings goals and track progress toward financial milestones." icon={Target} iconColor="text-prism-lime" ttsScript="The Goals page helps you stay motivated with clear financial targets. Create goals like Emergency Fund, Vacation, or Down Payment. Set a target amount and optional deadline. Update your current savings as you make progress." features={['Create savings, debt payoff, and investment goals','Visual progress tracking','Set target amounts and deadlines']} demoData={[{label:'Emergency Fund',value:'$8,500/$15,000',badge:'57%',color:'#14b8a6'},{label:'Vacation',value:'$1,200/$3,000',badge:'40%',color:'#f59e0b'}]} />
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditId(null); }}>
          <DialogTrigger asChild>
            <Button className="gap-2 prism-gradient text-white border-0 hover:opacity-90"><Plus className="h-4 w-4" /> Add Goal</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">{editId ? 'Edit Goal' : 'New Goal'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Goal Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Emergency Fund" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.goal_type} onValueChange={v => setForm(f => ({ ...f, goal_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GOAL_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Amount</Label>
                  <Input type="number" step="0.01" value={form.target_amount} onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Current Amount</Label>
                  <Input type="number" step="0.01" value={form.current_amount} onChange={e => setForm(f => ({ ...f, current_amount: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Target Date (optional)</Label>
                <Input type="date" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
              </div>
              <Button onClick={handleSave} disabled={!form.name || !form.target_amount} className="w-full prism-gradient text-white border-0 hover:opacity-90">
                {editId ? 'Update Goal' : 'Create Goal'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {(!goals || goals.length === 0) ? (
        <Card className="prism-card-shine border-border/50">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="h-16 w-16 rounded-2xl prism-gradient prism-glow flex items-center justify-center mb-4">
              <Target className="h-8 w-8 text-white" />
            </div>
            <h3 className="font-display text-lg font-bold mb-1">No goals yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm">Set your first financial goal to start tracking your progress.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const pct = goal.target_amount > 0 ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0;
            const goalType = GOAL_TYPES.find(t => t.value === goal.goal_type);
            const GoalIcon = goalType?.icon || Target;
            return (
              <motion.div key={goal.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="prism-card-shine border-border/50 hover-lift group">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-prism-teal to-prism-sky flex items-center justify-center">
                          <GoalIcon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-display font-semibold text-sm">{goal.name}</h3>
                          <p className="text-xs text-muted-foreground">{goalType?.label}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(goal)} aria-label="Edit goal">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteGoal.mutate(goal.id)} aria-label="Delete goal">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-display font-bold">{formatCurrency(goal.current_amount)}</span>
                        <span className="text-muted-foreground">of {formatCurrency(goal.target_amount)}</span>
                      </div>
                      <Progress value={pct} className="h-2.5" />
                      <p className="text-xs text-muted-foreground mt-1.5">{Math.round(pct)}% complete</p>
                    </div>
                    {goal.is_completed && (
                      <div className="flex items-center gap-2 text-prism-teal text-xs font-medium">
                        <Trophy className="h-4 w-4" /> Goal reached!
                      </div>
                    )}
                    {goal.target_date && !goal.is_completed && (
                      <p className="text-xs text-muted-foreground">Target: {new Date(goal.target_date).toLocaleDateString()}</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default Goals;
