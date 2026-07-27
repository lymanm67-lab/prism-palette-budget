import { cn } from '@/lib/utils';
import type { BucketResult } from '@/lib/budgeting/moneyBlueprint';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const TONE: Record<BucketResult['status'], { text: string; bar: string; chip: string; word: string }> = {
  in: {
    text: 'text-emerald-600 dark:text-emerald-400',
    bar: 'bg-emerald-500',
    chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30',
    word: 'In range',
  },
  over: {
    text: 'text-rose-600 dark:text-rose-400',
    bar: 'bg-rose-500',
    chip: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/30',
    word: 'Over',
  },
  under: {
    text: 'text-amber-600 dark:text-amber-400',
    bar: 'bg-amber-500',
    chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30',
    word: 'Under',
  },
};

export function BlueprintBucketBar({ bucket, compact }: { bucket: BucketResult; compact?: boolean }) {
  const tone = TONE[bucket.status];
  const width = Math.min(Math.max(bucket.pct, 0), 100);
  const bandLeft = Math.min(bucket.min, 100);
  const bandWidth = Math.min(bucket.max, 100) - bandLeft;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className={cn('font-medium', compact ? 'text-xs' : 'text-sm')}>{bucket.label}</span>
        <span className="flex items-center gap-2">
          <span className={cn('tabular-nums font-semibold', compact ? 'text-xs' : 'text-sm')}>
            {money(bucket.total)}
          </span>
          <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium tabular-nums', tone.chip)}>
            {bucket.pct}% · {tone.word}
          </span>
        </span>
      </div>
      <div className="relative h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className="absolute inset-y-0 bg-foreground/10"
          style={{ left: `${bandLeft}%`, width: `${Math.max(bandWidth, 1)}%` }}
        />
        <div className={cn('absolute inset-y-0 left-0 rounded-full opacity-90', tone.bar)} style={{ width: `${width}%` }} />
      </div>
      {!compact && (
        <p className="text-[11px] text-muted-foreground">
          Target {bucket.min}–{bucket.max === 100 ? '∞' : bucket.max}% of take-home
        </p>
      )}
    </div>
  );
}
