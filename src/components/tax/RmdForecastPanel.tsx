import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { RmdYear } from '@/lib/tax/rmdEngine';
import { money } from './TaxExecutiveDashboard';

export function RmdForecastPanel({ rows }: { rows: RmdYear[] }) {
  const data = useMemo(
    () =>
      rows.map((r) => ({
        year: r.year,
        age: r.age,
        RMD: Math.round(r.rmd),
        Tax: Math.round(r.federalTax),
        Balance: Math.round(r.startBalance),
        Rate: Number(r.marginalRate.toFixed(1)),
      })),
    [rows],
  );

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardContent className="p-4">
          <h3 className="font-display font-semibold">Pre-tax balance vs. required withdrawals</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Projected through your planning horizon. Withdrawals begin at your configured required-withdrawal age.
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `$${Math.round(v / 1000)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => money(v)} />
                <Legend />
                <Area type="monotone" dataKey="Balance" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                <Area type="monotone" dataKey="RMD" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="p-4">
          <h3 className="font-display font-semibold">Estimated federal tax by year</h3>
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `$${Math.round(v / 1000)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => money(v)} />
                <Bar dataKey="Tax" fill="hsl(var(--prism-amber, var(--primary)))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="p-0">
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card/95 text-xs text-muted-foreground">
                <tr>
                  {['Year', 'Age', 'Start balance', 'RMD', 'QCD', 'Taxable', 'Fed tax', 'Marginal', 'IRMAA'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.year} className="border-t border-border/50">
                    <td className="px-3 py-1.5">{r.year}</td>
                    <td className="px-3 py-1.5">{r.age}</td>
                    <td className="px-3 py-1.5">{money(r.startBalance)}</td>
                    <td className="px-3 py-1.5">{money(r.rmd)}</td>
                    <td className="px-3 py-1.5">{r.qcd ? money(r.qcd) : '—'}</td>
                    <td className="px-3 py-1.5">{money(r.taxableIncome)}</td>
                    <td className="px-3 py-1.5">{money(r.federalTax)}</td>
                    <td className="px-3 py-1.5">{r.marginalRate}%</td>
                    <td className="px-3 py-1.5">{r.irmaaTier > 0 ? `Tier ${r.irmaaTier}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
