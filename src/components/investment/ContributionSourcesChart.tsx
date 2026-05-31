import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import type { YearPoint } from '@/lib/investment/projection';
import { formatCurrency } from '@/lib/investment/projection';

interface Props {
  yearly: YearPoint[];
}

const SERIES = [
  { key: 'cumStarting', label: 'Starting balance', color: 'hsl(var(--muted-foreground))' },
  { key: 'cumEmployee', label: 'Employee base', color: 'hsl(var(--primary))' },
  { key: 'cumEmployer', label: 'Employer match', color: 'hsl(217 91% 60%)' },
  { key: 'cumRaiseRedirect', label: 'Raise redirect', color: 'hsl(142 76% 45%)' },
  { key: 'cumDebtRedirect', label: 'Debt → wealth', color: 'hsl(38 92% 55%)' },
  { key: 'cumAdditional', label: 'Additional contribs', color: 'hsl(280 70% 60%)' },
  { key: 'cumSocialSecurity', label: 'SS reinvested', color: 'hsl(190 80% 50%)' },
  { key: 'cumGrowth', label: 'Investment growth', color: 'hsl(var(--accent))' },
] as const;

export function ContributionSourcesChart({ yearly }: Props) {
  const data = useMemo(
    () =>
      yearly.map((p) => ({
        age: Math.round(p.age),
        cumStarting: p.cumStarting,
        cumEmployee: p.cumEmployee,
        cumEmployer: p.cumEmployer,
        cumRaiseRedirect: p.cumRaiseRedirect,
        cumDebtRedirect: p.cumDebtRedirect,
        cumAdditional: p.cumAdditional,
        cumSocialSecurity: p.cumSocialSecurity,
        cumGrowth: p.cumGrowth,
      })),
    [yearly]
  );

  // Hide series that are zero across all years
  const activeSeries = SERIES.filter((s) => data.some((d) => (d as any)[s.key] > 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="h-4 w-4 text-primary" /> Where your retirement money comes from
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          Stacked over time so you can see how much of your final balance comes from each source — base contributions, employer match, raises you redirect, debt payments converted to wealth, and compound growth.
        </p>
        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="age" tick={{ fontSize: 11 }} label={{ value: 'Age', position: 'insideBottom', offset: -4, fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} />
              <Tooltip
                formatter={(v: number, name: string) => [formatCurrency(v), name]}
                labelFormatter={(label) => `Age ${label}`}
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {activeSeries.map((s) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stackId="1"
                  stroke={s.color}
                  fill={s.color}
                  fillOpacity={0.7}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
