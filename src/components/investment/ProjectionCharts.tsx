import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend, LineChart, Line } from 'recharts';
import { YearPoint } from '@/lib/investment/projection';

const CHART_TEXT = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };

export function ProjectionCharts({ yearly, target }: { yearly: YearPoint[]; target: number }) {
  const data = yearly.map((y) => ({
    age: Math.round(y.age),
    Balance: Math.round(y.balance),
    Employee: Math.round(y.totalEmployeeContrib),
    Employer: Math.round(y.totalEmployerContrib),
    Growth: Math.round(y.totalGrowth),
    Goal: target,
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-sm">Projected Balance Over Time</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="age" tick={CHART_TEXT} />
              <YAxis tick={CHART_TEXT} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                formatter={(v: number) => `$${v.toLocaleString()}`}
              />
              <Area type="monotone" dataKey="Balance" stroke="hsl(var(--primary))" fill="url(#balGrad)" />
              <Line type="monotone" dataKey="Goal" stroke="hsl(var(--destructive))" strokeDasharray="5 5" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Contributions vs. Growth</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="age" tick={CHART_TEXT} />
              <YAxis tick={CHART_TEXT} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                formatter={(v: number) => `$${v.toLocaleString()}`}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Employee" stackId="a" fill="hsl(var(--primary))" />
              <Bar dataKey="Employer" stackId="a" fill="hsl(38 92% 55%)" />
              <Bar dataKey="Growth" stackId="a" fill="hsl(280 70% 60%)" />

            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
