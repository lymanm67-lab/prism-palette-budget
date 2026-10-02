import { useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';
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

const BAR_COLORS = [C.bills, C.minDebt, C.extraDebt, C.savings, C.invest, C.buffer, C.spend, C.bills, C.minDebt, C.extraDebt];

const fmt$ = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const pctOf = (n: number, net: number) => (net > 0 ? Math.round((n / net) * 100) : 0);

/** Pie of where the paycheck goes + bar chart of the biggest bills covered, with plain-English story text. */
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
      .map((b: any) => ({
        name: String(b.merchant || 'Bill').slice(0, 14),
        amount: Number(b.amount) || 0,
        pct: pctOf(Number(b.amount) || 0, net),
        color: '',
      }))
      .sort((a: any, b: any) => b.amount - a.amount)
      .slice(0, 8);
    bills.forEach((b: any, i: number) => { b.color = BAR_COLORS[i % BAR_COLORS.length]; });
    return bills;
  }, [deployment, inactiveBills, net]);

  const barTotal = barData.reduce((s: number, b: any) => s + b.amount, 0);
  const top = barData[0];
  const futureShare = pctOf(
    (Number(deployment.savings_amount || 0)) + (Number(deployment.investment_amount || 0)) + (Number(deployment.buffer_amount || 0)),
    net,
  );
  const spendShare = pctOf(Number(deployment.safe_to_spend_amount || 0), net);
  const debtShare = pctOf((Number(deployment.min_debt_amount || 0)) + (Number(deployment.extra_debt_amount || 0)), net);
  const billsShare = pctOf(Number(deployment.bills_amount || 0), net);

  if (pieData.length === 0 && barData.length === 0) return null;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {pieData.length > 0 && (
        <div className="rounded-md border border-border/40 bg-background/40 p-2.5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Where this paycheck goes</div>
          <p className="text-[11px] leading-snug text-muted-foreground mb-2">
            Of your {fmt$(net)} take-home, <span style={{ color: C.bills }} className="font-semibold">{billsShare}%</span> covers your bills and{' '}
            <span style={{ color: C.extraDebt }} className="font-semibold">{debtShare}%</span> attacks debt, while{' '}
            <span style={{ color: C.savings }} className="font-semibold">{futureShare}%</span> builds your future — leaving{' '}
            <span style={{ color: C.spend }} className="font-semibold">{fmt$(Number(deployment.safe_to_spend_amount || 0))} ({spendShare}%)</span> to spend guilt-free.
          </p>
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2} strokeWidth={0}>
                {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip
                formatter={(v: any, name: any) => [`${fmt$(Number(v))} · ${pctOf(Number(v), net)}% of pay`, name]}
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
          <p className="text-[11px] leading-snug text-muted-foreground mb-2">
            These bills take <span style={{ color: C.bills }} className="font-semibold">{pctOf(barTotal, net)}% of your pay</span>
            {top && <> — <span className="font-semibold" style={{ color: top.color }}>{top.name}</span> is the biggest at {fmt$(top.amount)} ({top.pct}%)</>}
            {barTotal < Number(deployment.bills_amount || 0) && <>, with {fmt$(Number(deployment.bills_amount || 0) - barTotal)} more spread across the rest</>}.
          </p>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 68, top: 4, bottom: 4 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(v: any) => [`${fmt$(Number(v))} · ${pctOf(Number(v), net)}% of net pay`, 'Amount']}
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="amount" radius={[0, 4, 4, 0]} maxBarSize={16}>
                {barData.map((d: any, i: number) => <Cell key={i} fill={d.color} />)}
                <LabelList
                  dataKey="amount"
                  position="right"
                  formatter={(v: any) => `${fmt$(Number(v))} · ${pctOf(Number(v), net)}%`}
                  style={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
