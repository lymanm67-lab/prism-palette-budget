import { useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { PaycheckDeployment } from '@/hooks/use-paycheck-deploy';

const C = {
  bills: 'hsl(var(--prism-sky))',
  minDebt: 'hsl(var(--prism-rose))',
  extraDebt: 'hsl(var(--prism-orange))',
  savings: 'hsl(var(--prism-teal))',
  invest: 'hsl(var(--prism-lime))',
  buffer: 'hsl(var(--prism-navy-light))',
  spend: 'hsl(var(--prism-amber))',
};

const fmt$ = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

/** Pie of where the paycheck goes + bar chart of the biggest bills covered. */
export default function PaycheckCharts({ deployment, inactiveBills }: { deployment: PaycheckDeployment; inactiveBills?: Set<string> }) {
  const net = Number(deployment.net_amount) || 0;

  const pieData = useMemo(() => {
    const rows = [
      { name: 'Bills', value: Number(deployment.bills_amount || 0), color: C.bills },
      { name: 'Debt minimums', value: Number(deployment.min_debt_amount || 0), color: C.minDebt },
      { name: 'Debt attack', value: Number(deployment.extra_debt_amount || 0), color: C.extraDebt },
      { name: 'Savings', value: Number(deployment.savings_amount || 0), color: C.savings },
      { name: 'Investing', value: Number(deployment.investment_amount || 0), color: C.invest },
      { name: 'Smart Buffer', value: Number(deployment.buffer_amount || 0), color: C.buffer },
      { name: 'Safe-to-Spend', value: Number(deployment.safe_to_spend_amount || 0), color: C.spend },
    ].filter(r => r.value > 0);
    return rows;
  }, [deployment]);

  const barData = useMemo(() => {
    const bills = (Array.isArray(deployment.bills_breakdown) ? deployment.bills_breakdown : [])
      .filter((b: any) => !inactiveBills?.has(String(b.merchant || '').toLowerCase().replace(/[^a-z0-9]/g, '')))
      .map((b: any) => ({ name: String(b.merchant || 'Bill').slice(0, 14), amount: Number(b.amount) || 0 }))
      .sort((a: any, b: any) => b.amount - a.amount)
      .slice(0, 8);
    return bills;
  }, [deployment, inactiveBills]);

  if (pieData.length === 0 && barData.length === 0) return null;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {pieData.length > 0 && (
        <div className="rounded-md border border-border/40 bg-background/40 p-2.5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Where this paycheck goes</div>
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2} strokeWidth={0}>
                {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip
                formatter={(v: any, name: any) => [fmt$(Number(v)), name]}
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
              />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
      {barData.length > 0 && (
        <div className="rounded-md border border-border/40 bg-background/40 p-2.5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Biggest bills covered</div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 12, top: 4, bottom: 4 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(v: any) => [fmt$(Number(v)), 'Amount']}
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="amount" fill={C.bills} radius={[0, 4, 4, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
