import type { ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Props {
  /** Stage number, 1 to 5. */
  n: number;
  /** The decision this stage answers, in plain words. */
  title: string;
  /** One-line summary shown when the stage is closed. */
  summary: string;
  /** True once the stage has everything it needs. */
  complete: boolean;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/**
 * One decision of the Trade Planner. Only the open stage shows its controls;
 * the rest collapse to a single line so the screen holds one question at a time.
 */
export default function PlannerStage({
  n,
  title,
  summary,
  complete,
  open,
  onToggle,
  children,
}: Props) {
  return (
    <Card className={cn('overflow-hidden', open && 'border-primary/40')}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
            complete ? 'bg-prism-lime/20 text-prism-lime' : 'bg-primary/15 text-primary',
          )}
        >
          {complete ? <Check className="h-4 w-4" /> : n}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold leading-tight">{title}</span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">{summary}</span>
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
            !open && '-rotate-90',
          )}
        />
      </button>
      {open ? <div className="space-y-3 border-t border-border p-4">{children}</div> : null}
    </Card>
  );
}
