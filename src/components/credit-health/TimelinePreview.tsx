import { Check, Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface Milestone {
  day: string;
  label: string;
  focus: string;
  status: 'completed' | 'active' | 'upcoming';
}

const milestones: Milestone[] = [
  { day: '7 Days', label: 'Stabilize & Organize', focus: 'Pull reports, file disputes, stop missed payments', status: 'active' },
  { day: '45 Days', label: 'Review & Reduce', focus: 'Check dispute results, reduce balances', status: 'upcoming' },
  { day: '90 Days', label: 'Build Momentum', focus: 'Maintain payments, track progress', status: 'upcoming' },
  { day: '120 Days', label: 'Optimize & Prepare', focus: 'Confirm corrections, prepare for approvals', status: 'upcoming' },
];

const statusStyles = {
  completed: { dot: 'bg-emerald-500 text-white', line: 'bg-emerald-500', text: 'text-emerald-600' },
  active: { dot: 'bg-primary text-primary-foreground ring-4 ring-primary/20', line: 'bg-muted', text: 'text-primary' },
  upcoming: { dot: 'bg-muted text-muted-foreground', line: 'bg-muted', text: 'text-muted-foreground' },
};

export default function TimelinePreview() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Your Action Timeline
          </CardTitle>
          <button
            onClick={() => navigate('/capital/credit-health/timeline')}
            className="text-xs font-medium text-primary flex items-center gap-1 hover:underline"
          >
            View Full Plan <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {milestones.map((m, i) => {
            const st = statusStyles[m.status];
            return (
              <div
                key={m.day}
                className={cn(
                  'flex-shrink-0 w-[160px] p-3 rounded-xl border transition-colors',
                  m.status === 'active' ? 'border-primary/30 bg-primary/5' : 'border-border bg-card hover:bg-accent/30'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn('h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold', st.dot)}>
                    {m.status === 'completed' ? <Check className="h-3 w-3" /> : i + 1}
                  </div>
                  <span className={cn('text-xs font-bold', st.text)}>{m.day}</span>
                </div>
                <p className="text-xs font-semibold mb-1">{m.label}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{m.focus}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
