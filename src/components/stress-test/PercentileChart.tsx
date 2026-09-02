import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Area, AreaChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { StressResult } from '@/lib/retirement/stressTest';

const money = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n).toLocaleString()}`;

const KEY_AGES = [62, 65, 67, 70, 75, 80, 85, 90];

export function PercentileChart({ result, lifeExpectancy }: { result: StressResult; lifeExpectancy: number }) {
  const data = result.percentilePaths.map((p) => ({
    age: p.age,
    pessimistic: Math.round(p.p10),
    lower: Math.round(p.p25),
    median: Math.round(p.median),
    upper: Math.round(p.p75),
    optimistic: Math.round(p.p90),
  }));

  const rows = [...KEY_AGES.filter((a) => a >= result.ages[0] && a <= lifeExpectancy), lifeExpectancy]
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .map((age) => result.percentilePaths.find((p) => p.age === age))
    .filter(Boolean) as StressResult['percentilePaths'];

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Monte Carlo Projection &amp; Outcome Percentiles</CardTitle>
        <CardDescription>
          The shaded band is the pessimistic-to-optimistic range of invested assets across every simulation.
          The solid line is the median outcome — half of the runs land above it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
              <XAxis dataKey="age" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
              <YAxis tickFormatter={money} tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" width={64} />
              <Tooltip
                formatter={(v: number, name) => [money(v), String(name)]}
                labelFormatter={(l) => `Age ${l}`}
                contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="optimistic" name="Optimistic (90th)" stroke="hsl(var(--prism-lime))" fill="hsl(var(--prism-lime))" fillOpacity={0.12} />
              <Area type="monotone" dataKey="pessimistic" name="Pessimistic (10th)" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.1} />
              <Line type="monotone" dataKey="median" name="Median" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Age</TableHead>
                <TableHead className="text-right">10th</TableHead>
                <TableHead className="text-right">25th</TableHead>
                <TableHead className="text-right">Median</TableHead>
                <TableHead className="text-right">75th</TableHead>
                <TableHead className="text-right">90th</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.age}>
                  <TableCell className="font-medium">{r.age}{r.age === lifeExpectancy ? ' (life expectancy)' : ''}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(r.p10)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(r.p25)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{money(r.median)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(r.p75)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(r.p90)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
