import { CalendarClock, CalendarDays, CalendarRange, Target, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Moment } from './moment-types';

const TABS: { id: Moment; label: string; sub: string; icon: any }[] = [
  { id: 'all',   label: 'All plays', sub: '10 cards',        icon: Sparkles },
  { id: 'today', label: 'Today',     sub: 'Right now moves', icon: CalendarClock },
  { id: 'week',  label: 'This week', sub: 'Paycheck cycle',  icon: CalendarDays },
  { id: 'month', label: 'This month',sub: 'Bill rhythm',     icon: CalendarRange },
  { id: 'long',  label: 'Long game', sub: 'Wealth & rules',  icon: Target },
];

export function MomentTabs({ value, onChange }: { value: Moment; onChange: (m: Moment) => void }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm p-1.5">
      <div className="flex items-center gap-1 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = value === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={cn(
                'flex-1 min-w-[110px] flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-all',
                active
                  ? 'bg-prism-teal/15 border border-prism-teal/40 shadow-sm shadow-prism-teal/10'
                  : 'border border-transparent hover:bg-background/60 hover:border-border/50',
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-prism-teal' : 'text-muted-foreground')} />
              <div className="min-w-0">
                <div className={cn('text-xs font-bold leading-tight', active ? 'text-foreground' : 'text-muted-foreground')}>
                  {t.label}
                </div>
                <div className="text-[10px] text-muted-foreground leading-tight">{t.sub}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
