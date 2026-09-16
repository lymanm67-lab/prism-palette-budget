import { ArrowDown, ArrowUp } from 'lucide-react';
import {
  TARGET_PATH_LABEL,
  TARGET_QUALITY_LABEL,
  type GeometryResult,
} from '@/lib/swingedge/tradeGeometry';

const money = (n: number | null | undefined) =>
  n === null || n === undefined
    ? '—'
    : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const PATH_TONE: Record<string, string> = {
  CLEAR: 'text-emerald-500',
  PARTIALLY_BLOCKED: 'text-amber-500',
  BLOCKED: 'text-destructive',
  INSUFFICIENT_DATA: 'text-muted-foreground',
};

/**
 * Mini trade-geometry panel: where you would enter, where you would be wrong,
 * what stands in the way, and where you would take profit.
 *
 * Every number comes from the geometry engine — nothing is filled in when a
 * level is missing.
 */
export default function TradeGeometryPanel({
  symbol,
  geometry,
}: {
  symbol: string;
  geometry: GeometryResult;
}) {
  const g = geometry;
  const rows: { label: string; value: string; note?: string }[] = [
    { label: 'Risk per share', value: money(g.riskPerShare) },
    { label: `Reward multiple`, value: `${g.rewardMultiple}R` },
    { label: 'Mathematical target', value: money(g.mathematicalTarget), note: g.targetMethod },
    {
      label: 'Reward to resistance',
      value: g.rewardToResistance === null ? '—' : money(g.rewardToResistance),
    },
    {
      label: 'R to resistance',
      value: g.rToResistance === null ? 'Not recorded' : `${g.rToResistance.toFixed(2)}R`,
      note: g.resistanceTooClose ? 'Resistance too close' : undefined,
    },
    { label: 'Reward to risk', value: g.rewardRisk === null ? '—' : `${g.rewardRisk.toFixed(2)} : 1` },
    { label: 'Target quality', value: TARGET_QUALITY_LABEL[g.targetQuality] },
    {
      label: 'Target confidence',
      value: g.targetConfidence === 'LOW' ? 'Low' : 'Normal',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {symbol} · trade geometry
        </div>

        <div className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-muted-foreground">
              <ArrowUp className="h-4 w-4 text-emerald-500" /> Target
            </span>
            <span className="font-semibold">{money(g.target)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-muted-foreground">
              <ArrowUp className="h-4 w-4 text-amber-500" /> Resistance in the way
            </span>
            <span>{g.resistance === null ? 'Not recorded' : money(g.resistance)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-md bg-muted/50 px-2 py-1.5">
            <span className="text-muted-foreground">Entry</span>
            <span className="font-semibold">{money(g.entry)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-muted-foreground">
              <ArrowDown className="h-4 w-4 text-destructive" /> Stop — where you are wrong
            </span>
            <span>{money(g.stop)}</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Target path</div>
        <p className={`mt-1 text-sm font-semibold ${PATH_TONE[g.targetPath]}`}>
          {TARGET_PATH_LABEL[g.targetPath]}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{g.targetPathReason}</p>
        {g.targetStateNote && (
          <p className="mt-2 text-xs text-amber-500">{g.targetStateNote}</p>
        )}
      </div>

      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{r.label}</span>
            <span className="text-right">
              {r.value}
              {r.note && <span className="ml-1 text-xs text-muted-foreground">({r.note})</span>}
            </span>
          </div>
        ))}
      </div>

      <div className="grid gap-x-6 gap-y-2 rounded-lg bg-muted/40 p-3 sm:grid-cols-2">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Max approved shares</span>
          <span>{g.maxShares === null ? 'Set your risk limit first' : g.maxShares}</span>
        </div>
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Planned risk</span>
          <span>{g.plannedRisk === null ? '—' : money(g.plannedRisk)}</span>
        </div>
      </div>

      <p className="text-xs italic text-muted-foreground">
        These levels are estimates read from the chart. Write your own entry, stop and target in the
        Trade Planner before trading anything.
      </p>
    </div>
  );
}
