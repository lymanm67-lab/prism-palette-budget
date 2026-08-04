import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MhStat } from '@/components/medical-housing/MhFields';
import { useThvImpact, useThvUpsert, useThvDelete } from '@/hooks/use-tiny-home-village';
import { IMPACT_METRICS, money, pct } from '@/lib/legacy/tinyHomeVillage';

function fmt(kind: string, v: number) {
  if (kind === 'money') return money(v);
  if (kind === 'pct') return pct(v);
  if (kind === 'months') return `${v} mo`;
  return String(v ?? 0);
}

export default function VillageImpactTab() {
  const { data: years = [] } = useThvImpact();
  const upsert = useThvUpsert('thv_impact');
  const del = useThvDelete('thv_impact');
  const [metric, setMetric] = useState(IMPACT_METRICS[1].key);

  const activeMetric = IMPACT_METRICS.find((m) => m.key === metric)!;
  const latest = years[years.length - 1];
  const prior = years[years.length - 2];

  const chartData = years.map((y) => ({
    year: String(y.year),
    value: Number((y.metrics ?? {})[metric]) || 0,
  }));

  const addYear = () => {
    const next = years.length ? Math.max(...years.map((y) => y.year)) + 1 : new Date().getFullYear();
    upsert.mutate({ year: next, metrics: {} } as any);
  };

  const setMetricValue = (row: any, key: string, v: number) =>
    upsert.mutate({ id: row.id, metrics: { ...(row.metrics ?? {}), [key]: v } });

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MhStat label="Reporting years" value={String(years.length)} />
        <MhStat
          label="Residents housed (latest)"
          value={String(Number((latest?.metrics ?? {}).residents_housed) || 0)}
        />
        <MhStat
          label="Program completion rate (latest)"
          value={pct(Number((latest?.metrics ?? {}).program_completion_rate) || 0)}
          tone="good"
        />
        <MhStat
          label="Cost per resident (latest)"
          value={money(Number((latest?.metrics ?? {}).cost_per_resident) || 0)}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Impact trend</CardTitle>
            <Select value={metric} onValueChange={setMetric}>
              <SelectTrigger className="h-9 w-[280px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMPACT_METRICS.map((m) => (
                  <SelectItem key={m.key} value={m.key}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length < 2 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Add at least two reporting years to see a trend.
            </p>
          ) : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: any) => fmt(activeMetric.kind, Number(v))}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={activeMetric.label}
                    stroke="hsl(var(--prism-teal, 173 80% 40%))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {latest && prior && (
            <p className="mt-2 text-xs text-muted-foreground">
              {activeMetric.label}: {fmt(activeMetric.kind, Number((prior.metrics ?? {})[metric]) || 0)} in{' '}
              {prior.year} → {fmt(activeMetric.kind, Number((latest.metrics ?? {})[metric]) || 0)} in {latest.year}.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Annual impact reporting</p>
        <Button size="sm" variant="outline" onClick={addYear}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add reporting year
        </Button>
      </div>

      {years.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No impact reporting years yet.
          </CardContent>
        </Card>
      )}

      {years.map((row) => (
        <Card key={row.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">{row.year} impact report</CardTitle>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-prism-rose"
                onClick={() => del.mutate(row.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {IMPACT_METRICS.map((m) => (
              <div key={m.key} className="space-y-1">
                <label className="text-xs text-muted-foreground">{m.label}</label>
                <Input
                  type="number"
                  key={String((row.metrics ?? {})[m.key] ?? 0)}
                  defaultValue={(row.metrics ?? {})[m.key] ?? 0}
                  onBlur={(e) => {
                    const v = parseFloat(e.target.value);
                    if (Number.isFinite(v) && v !== Number((row.metrics ?? {})[m.key] ?? 0)) {
                      setMetricValue(row, m.key, v);
                    }
                  }}
                  className="h-9"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
