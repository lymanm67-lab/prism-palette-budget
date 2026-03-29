import { cn } from '@/lib/utils';

export type IssueStatus =
  | 'identified' | 'preparing' | 'submitted' | 'under_review'
  | 'updated' | 'removed' | 'validated' | 'follow_up' | 'escalate';

const statusStyles: Record<IssueStatus, string> = {
  identified: 'bg-muted text-muted-foreground',
  preparing: 'bg-blue-500/10 text-blue-600',
  submitted: 'bg-primary/10 text-primary',
  under_review: 'bg-amber-500/10 text-amber-600',
  updated: 'bg-emerald-500/10 text-emerald-600',
  removed: 'bg-emerald-500/15 text-emerald-700',
  validated: 'bg-destructive/10 text-destructive',
  follow_up: 'bg-orange-500/10 text-orange-600',
  escalate: 'bg-destructive/15 text-destructive',
};

const statusLabels: Record<IssueStatus, string> = {
  identified: 'Identified',
  preparing: 'Preparing',
  submitted: 'Submitted',
  under_review: 'Under Review',
  updated: 'Updated',
  removed: 'Removed',
  validated: 'Validated',
  follow_up: 'Follow-Up Needed',
  escalate: 'Escalate',
};

export default function StatusChip({ status, className }: { status: IssueStatus; className?: string }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
      statusStyles[status],
      className
    )}>
      {statusLabels[status]}
    </span>
  );
}
