import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Default new-dollar allocation derived from the Montgomery allocation rules.
// Sums across post-2030 monthly step-ups + accelerator + annual lump averaged to /mo.
// Roth 457(b): $100 + (raise 60%) + $208 acc + $500 + $300 + $100 + $250 ≈ heavy
// Roth TDA: (raise 40%) + $388 + $200 + $100 + $250
// HSA: prioritized first until max
// Taxable: $3000/yr lump + SS once invested
const SLICES = [
  { name: 'HSA (priority until max)', value: 22, fill: 'hsl(var(--chart-1, var(--primary)))' },
  { name: 'Roth 457(b)', value: 38, fill: 'hsl(var(--chart-2, var(--primary)))' },
  { name: 'Roth TDA', value: 28, fill: 'hsl(var(--chart-3, var(--primary)))' },
  { name: 'Taxable brokerage', value: 12, fill: 'hsl(var(--chart-4, var(--primary)))' },
];

export function AllocationPieChart() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <PieChartIcon className="h-5 w-5 text-primary" />
          Default New-Dollar Allocation
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Where each new dollar of contribution is directed. HSA is funded first until on pace, then Roth-heavy.
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={SLICES}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
                label={(d) => (d.value >= 5 ? `${d.value}%` : '')}
                labelLine={false}
              >
                {SLICES.map((s) => (
                  <Cell key={s.name} fill={s.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number) => `${v}%`}
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Allocation flexes by trigger: July 2026 $100 → Roth 457(b). Annual raises → HSA first, then 60/40
          Roth 457(b)/TDA. Sept 2027 $888 → $500 Roth 457(b) + $388 Roth TDA. Annual $3K lump → taxable
          brokerage (or Roth/HSA if room). $3,540 SS at age 70 → taxable.
        </p>
      </CardContent>
    </Card>
  );
}
