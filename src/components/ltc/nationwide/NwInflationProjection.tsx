import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { NW, nwBenefitLadder } from '@/lib/ltc/nationwide';
import { money } from '../shared';
import { IllustrationTag, PlanningNotice } from './PlanningNotice';

export function NwInflationProjection() {
  const rows = nwBenefitLadder();
  const chart = rows.map((r) => ({ age: r.age, monthly: Math.round(r.monthlyBenefit), pool: Math.round(r.totalBenefit) }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-prism-lime" /> Inflation Protection Projection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Starting from the {money(NW.monthlyBenefitEach)} initial monthly benefit per insured with {NW.inflationPct}%
            compound annual inflation protection for life.
          </p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="age" tickFormatter={(v) => `Age ${v}`} fontSize={11} />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} fontSize={11} />
                <RTooltip formatter={(v: number) => money(v)} labelFormatter={(l) => `Older insured age ${l}`} />
                <Line type="monotone" dataKey="monthly" name="Monthly benefit (each)" stroke="hsl(var(--prism-lime))" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="text-left py-1.5">Older insured age</th>
                  <th className="text-right py-1.5">Monthly benefit (each)</th>
                  <th className="text-right py-1.5">Total LTC benefits</th>
                  <th className="text-right py-1.5">Source</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.age} className="border-b border-border/40">
                    <td className="py-1.5">Age {r.age}</td>
                    <td className="py-1.5 text-right tabular-nums font-semibold">{money(r.monthlyBenefit)}</td>
                    <td className="py-1.5 text-right tabular-nums">{money(r.totalBenefit)}</td>
                    <td className="py-1.5 text-right"><IllustrationTag illustrated={r.illustrated} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Where the illustration prints an exact value it is used verbatim. Every other row is a
            <strong> Planning Estimate Based on 3% Annual Compounding</strong> — no guaranteed values are invented beyond
            the illustration.
          </p>
        </CardContent>
      </Card>
      <PlanningNotice />
    </div>
  );
}
