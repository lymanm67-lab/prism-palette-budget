import { Progress } from '@/components/ui/progress';
import { money } from '@/lib/travel/travelFund';

interface Props {
  saved: number;
  target: number;
  ticks?: number[];
}

export function TravelProgressBar({ saved, target, ticks }: Props) {
  const pct = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
  const remaining = Math.max(0, target - saved);
  const marks = ticks ?? [0, 1000, 2000, 3000, 4000, 5000, 6000];

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-2xl font-display font-bold tabular-nums">{money(saved)}</p>
          <p className="text-xs text-muted-foreground">saved of {money(target)}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold tabular-nums text-prism-teal">{pct.toFixed(0)}% funded</p>
          <p className="text-xs text-muted-foreground">{money(remaining)} remaining</p>
        </div>
      </div>

      <Progress value={pct} className="h-3" />

      <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
        {marks.map((m) => (
          <span key={m}>{m === 0 ? '$0' : `$${(m / 1000).toFixed(0)}k`}</span>
        ))}
      </div>

      {remaining <= 0 && (
        <p className="text-center text-sm font-display font-bold text-prism-lime tracking-wide">
          ANNUAL TRIP FULLY FUNDED
        </p>
      )}
    </div>
  );
}
