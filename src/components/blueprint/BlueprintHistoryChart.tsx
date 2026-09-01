import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { History, Flame } from 'lucide-react';
import { useBlueprintHistory } from '@/hooks/use-blueprint-history';
import { PURPOSE_META, PHASE_LABEL } from '@/lib/budgeting/moneyPurpose';
import type { CoreKey } from '@/lib/budgeting/blueprint5010';

const CORE: CoreKey[] = ['live', 'enjoy', 'build_wealth', 'eliminate_debt'];

export default function BlueprintHistoryChart({ month }: { month: string }) {
  const [months, setMonths] = useState<3 | 6 | 12>(6);
  const { points, liveStreak, loading } = useBlueprintHistory(month, months);

  const data = points.map((p) => ({
    label: p.label,
    phase: PHASE_LABEL[p.phase],
    live: p.actual.live,
    enjoy: p.actual.enjoy,
    build_wealth: p.actual.build_wealth,
    eliminate_debt: p.actual.eliminate_debt,
    liveTarget: p.target.live,
    enjoyTarget: p.target.enjoy,
    wealthTarget: p.target.build_wealth,
    debtTarget: p.target.eliminate_debt,
  }));

  const avgAlignment = points.length
    ? Math.round(points.reduce((s, p) => s + p.alignmentScore, 0) / points.length)
    : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="font-display flex items-center gap-2 text-sm">
            <History className="h-4 w-4 text-primary" />
            Blueprint History — Actual vs Target
          </CardTitle>
          <div className="flex items-center gap-2">
            {liveStreak > 0 && (
              <Badge variant="outline" className="gap-1 border-emerald-500/40 text-[10px] text-emerald-600 dark:text-emerald-400">
                <Flame className="h-3 w-3" /> {liveStreak}-mo LIVE streak at/below target
              </Badge>
            )}
            <Badge variant="secondary" className="text-[10px]">Avg alignment {avgAlignment}/100</Badge>
            <ToggleGroup type="single" size="sm" value={String(months)} onValueChange={(v) => v && setMonths(Number(v) as 3 | 6 | 12)}>
              {[3, 6, 12].map((m) => (
                <ToggleGroupItem key={m} value={String(m)} className="h-7 px-2 text-[11px]">{m}M</ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Each line is the actual share of take-home pay. Dashed guides are the current-phase targets; target shifts
          (45/10/25/20 → 45/10/35/10 → 45/10/45/0) happen automatically as debt clears.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-64 animate-pulse rounded-lg bg-muted/30" />
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="currentColor" opacity={0.5} />
                <YAxis tick={{ fontSize: 10 }} stroke="currentColor" opacity={0.5} unit="%" />
                <Tooltip
                  formatter={(v: any, name: any) => [`${Number(v).toFixed(1)}%`, name]}
                  contentStyle={{ fontSize: 11 }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {CORE.map((k) => (
                  <Line
                    key={k}
                    type="monotone"
                    dataKey={k}
                    name={PURPOSE_META[k].short}
                    stroke={PURPOSE_META[k].color}
                    strokeWidth={2}
                    dot={{ r: 2.5 }}
                  />
                ))}
                <ReferenceLine y={50} stroke={PURPOSE_META.live.color} strokeDasharray="5 4" opacity={0.5} />
                <ReferenceLine y={10} stroke={PURPOSE_META.enjoy.color} strokeDasharray="5 4" opacity={0.5} />
                <ReferenceLine y={20} stroke={PURPOSE_META.build_wealth.color} strokeDasharray="5 4" opacity={0.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
