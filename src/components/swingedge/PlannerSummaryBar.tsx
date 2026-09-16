import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const money = (n: number | null) =>
  n === null || !Number.isFinite(n)
    ? '—'
    : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

interface Props {
  symbol: string;
  entry: number | null;
  stop: number | null;
  target: number | null;
  riskPerShare: number | null;
  dollarRisk: number | null;
  shares: number | null;
  rewardRisk: number | null;
  verdictLabel: string;
  verdictTone: string;
}

/**
 * The one place the plan's numbers are repeated. It stays in view while the
 * stages below are worked through, so no stage has to restate the figures.
 */
export default function PlannerSummaryBar({
  symbol,
  entry,
  stop,
  target,
  riskPerShare,
  dollarRisk,
  shares,
  rewardRisk,
  verdictLabel,
  verdictTone,
}: Props) {
  const cells: { label: string; value: string }[] = [
    { label: 'Entry', value: money(entry) },
    { label: 'Stop', value: money(stop) },
    { label: 'Target', value: money(target) },
    { label: 'Risk / share', value: money(riskPerShare) },
    { label: 'Shares', value: shares === null || shares <= 0 ? '—' : String(shares) },
    { label: 'Dollar risk', value: money(dollarRisk) },
    { label: 'Reward : risk', value: rewardRisk === null ? '—' : `${rewardRisk} : 1` },
  ];

  return (
    <div className="sticky top-0 z-20 -mx-1 rounded-xl border border-border bg-card/95 px-3 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="text-sm font-bold tracking-wide">{symbol || 'No symbol'}</span>
        {cells.map((c) => (
          <span key={c.label} className="flex flex-col leading-tight">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{c.label}</span>
            <span className="text-sm font-semibold tabular-nums">{c.value}</span>
          </span>
        ))}
        <Badge variant="outline" className={cn('ml-auto text-xs', verdictTone)}>
          {verdictLabel}
        </Badge>
      </div>
    </div>
  );
}
