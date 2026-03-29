import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ChevronDown, Clock, Target, Lightbulb, CalendarDays } from 'lucide-react';
import PageOverview from '@/components/PageOverview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { motion, AnimatePresence } from 'framer-motion';

interface CheckItem {
  id: string;
  text: string;
}

interface MilestoneData {
  day: string;
  label: string;
  coachNote: string;
  items: CheckItem[];
}

const MILESTONES: MilestoneData[] = [
  {
    day: 'First 7 Days', label: 'Stabilize & Organize',
    coachNote: 'Focus on gathering information and stopping any active damage. Don\'t worry about score changes yet — this phase is about getting organized.',
    items: [
      { id: '7-1', text: 'Pull all three credit reports' },
      { id: '7-2', text: 'Identify factual errors on each report' },
      { id: '7-3', text: 'Separate errors from accurate negatives' },
      { id: '7-4', text: 'File disputes for clear errors' },
      { id: '7-5', text: 'Stop any missed payments — bring accounts current' },
      { id: '7-6', text: 'Calculate your current utilization rate' },
      { id: '7-7', text: 'Set up autopay on all accounts' },
      { id: '7-8', text: 'Avoid new credit applications' },
    ],
  },
  {
    day: 'Day 45', label: 'Review & Reduce',
    coachNote: 'Dispute responses should be arriving. This is when you shift focus from cleanup to balance reduction.',
    items: [
      { id: '45-1', text: 'Review dispute results from all bureaus' },
      { id: '45-2', text: 'Confirm what was updated or removed' },
      { id: '45-3', text: 'Follow up on unresolved disputes' },
      { id: '45-4', text: 'Reduce revolving balances below 30%' },
      { id: '45-5', text: 'Monitor reporting lag — changes may not show yet' },
      { id: '45-6', text: 'Avoid closing old credit cards' },
    ],
  },
  {
    day: 'Day 90', label: 'Build Momentum',
    coachNote: 'By now, early improvements should be visible. Stay consistent — the biggest gains come from sustained good habits.',
    items: [
      { id: '90-1', text: 'Maintain on-time payment streak' },
      { id: '90-2', text: 'Keep utilization consistently low' },
      { id: '90-3', text: 'Track remaining score barriers' },
      { id: '90-4', text: 'Preserve account age — don\'t close old accounts' },
      { id: '90-5', text: 'Avoid unnecessary hard inquiries' },
      { id: '90-6', text: 'Review score trend for progress' },
    ],
  },
  {
    day: 'Day 120', label: 'Optimize & Prepare',
    coachNote: 'You\'re entering the optimization phase. If you\'re preparing for a loan or major application, now is the time to fine-tune.',
    items: [
      { id: '120-1', text: 'Confirm all corrections remain accurate' },
      { id: '120-2', text: 'Identify remaining score caps' },
      { id: '120-3', text: 'Continue maintaining low balances' },
      { id: '120-4', text: 'Build long-term credit maintenance habits' },
      { id: '120-5', text: 'Check approval readiness assessment' },
    ],
  },
];

const STORAGE_KEY = 'prism_credit_timeline_checks';

const CreditHealthTimeline = () => {
  const navigate = useNavigate();
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  });
  const [openMilestones, setOpenMilestones] = useState<Record<string, boolean>>({ 'First 7 Days': true });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
  }, [checked]);

  const toggle = (id: string) => setChecked(p => ({ ...p, [id]: !p[id] }));
  const toggleMilestone = (day: string) => setOpenMilestones(p => ({ ...p, [day]: !p[day] }));

  const getProgress = (items: CheckItem[]) => {
    const done = items.filter(i => checked[i.id]).length;
    return items.length > 0 ? Math.round((done / items.length) * 100) : 0;
  };

  const overallItems = MILESTONES.flatMap(m => m.items);
  const overallProgress = getProgress(overallItems);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/capital/credit-health')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Action Timeline</h1>
            <p className="text-sm text-muted-foreground">Your step-by-step credit improvement plan</p>
          </div>
        </div>
        <PageOverview
          title="Action Timeline"
          description="A structured, milestone-based plan that walks you through credit repair from the first week through six months, with checkable tasks and coach notes."
          icon={CalendarDays}
          iconColor="text-prism-teal"
          features={[
            'Five milestone phases from Day 1 through 6 months',
            'Checkable tasks that save your progress locally',
            'Coach notes explaining the strategy behind each phase',
            'Overall progress bar tracking your completion percentage',
          ]}
          ttsScript="Welcome to the Action Timeline. This is your structured credit improvement plan, broken into five milestone phases. The first phase covers your first seven days — stabilizing and organizing your credit situation. You'll pull reports, identify errors, file disputes, and set up autopay. At day 45, you review dispute results and focus on reducing balances. Day 90 is about building positive history and considering tools like secured cards. At six months, you reassess your full profile and plan strategically. Each milestone has checkable tasks — check them off as you complete them, and your progress is saved automatically. The overall progress bar at the top shows how far you've come."
        />
      </div>

      {/* Overall progress */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5" />
        <CardContent className="relative p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <span className="font-semibold">Overall Progress</span>
            </div>
            <span className="text-lg font-bold text-primary">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-2.5 [&>div]:bg-primary" />
          <p className="text-xs text-muted-foreground mt-2">
            {overallItems.filter(i => checked[i.id]).length} of {overallItems.length} steps completed
          </p>
        </CardContent>
      </Card>

      {/* Timeline milestones */}
      <div className="relative">
        {/* Vertical connector line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

        <div className="space-y-4">
          {MILESTONES.map((m, idx) => {
            const progress = getProgress(m.items);
            const isOpen = openMilestones[m.day] ?? false;
            const isComplete = progress === 100;

            return (
              <div key={m.day} className="relative pl-12">
                {/* Timeline dot */}
                <div className={cn(
                  'absolute left-3 top-5 h-5 w-5 rounded-full border-2 flex items-center justify-center z-10',
                  isComplete
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : progress > 0
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'bg-background border-muted-foreground/30'
                )}>
                  {isComplete ? <Check className="h-3 w-3" /> : <span className="text-[8px] font-bold">{idx + 1}</span>}
                </div>

                <Collapsible open={isOpen} onOpenChange={() => toggleMilestone(m.day)}>
                  <Card className={cn(isComplete && 'border-emerald-500/30')}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-accent/30 transition-colors pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={cn('text-xs font-bold uppercase tracking-wider', isComplete ? 'text-emerald-600' : 'text-primary')}>{m.day}</p>
                            <CardTitle className="text-base mt-1">{m.label}</CardTitle>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold">{progress}%</span>
                            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
                          </div>
                        </div>
                        <Progress value={progress} className={cn('h-1.5 mt-2', isComplete ? '[&>div]:bg-emerald-500' : '[&>div]:bg-primary')} />
                      </CardHeader>
                    </CollapsibleTrigger>
                    <AnimatePresence>
                      {isOpen && (
                        <CollapsibleContent forceMount>
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <CardContent className="pt-0 space-y-3">
                              {/* Coach note */}
                              <div className="flex gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                                <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                <p className="text-xs text-muted-foreground leading-relaxed">{m.coachNote}</p>
                              </div>

                              {/* Checklist */}
                              <div className="space-y-1.5">
                                {m.items.map(item => (
                                  <button
                                    key={item.id}
                                    onClick={() => toggle(item.id)}
                                    className={cn(
                                      'flex items-center gap-3 w-full text-left p-2.5 rounded-lg transition-colors',
                                      checked[item.id] ? 'bg-emerald-500/5' : 'hover:bg-accent/30'
                                    )}
                                  >
                                    <div className={cn(
                                      'h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors',
                                      checked[item.id] ? 'bg-emerald-500 border-emerald-500' : 'border-muted-foreground/30'
                                    )}>
                                      {checked[item.id] && <Check className="h-3 w-3 text-white" />}
                                    </div>
                                    <span className={cn('text-sm', checked[item.id] && 'line-through text-muted-foreground')}>
                                      {item.text}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </CardContent>
                          </motion.div>
                        </CollapsibleContent>
                      )}
                    </AnimatePresence>
                  </Card>
                </Collapsible>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CreditHealthTimeline;
