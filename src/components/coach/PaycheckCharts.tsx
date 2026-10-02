import { useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';
import type { PaycheckDeployment } from '@/hooks/use-paycheck-deploy';
import { usePaycheckTree } from '@/components/coach/usePaycheckTree';

const fmt$ = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const pctOf = (n: number, net: number) => (net > 0 ? Math.round((n / net) * 100) : 0);

/** Pie of where the paycheck goes + bar chart of the biggest bills covered,
 *  built from the same live numbers the money tree shows. */
export default function PaycheckCharts({ deployment }: { deployment: PaycheckDeployment }) {
  const { net, pillars, billItems } = usePaycheckTree(deployment);

  const pieData = useMemo(
    () => pillars
      .filter(p => p.takeHome > 0.5)
      .map(p => ({ name: p.label, value: Math.round(p.takeHome * 100) / 100, color: `hsl(${p.color})` })),
    [pillars],
  );

  const barData = useMemo(() => billItems.slice(0, 8), [billItems]);

  if (pieData.length === 0 && barData.length === 0) return null;

  const total = pieData.reduce((s, d) => s + d.value, 0);
  const barTotal = barData.reduce((s, b) => s + b.value, 0);
  const top = barData[0];
  const byName = (label: string) => pieData.find(d => d.name === label)?.value || 0;
  const billsShare = pctOf(byName('Bills & Essentials'), net);
  const debtShare = pctOf(byName('Debt Freedom'), net);
  const futureShare = pctOf(byName('Savings & Buffer') + byName('Wealth & Investing'), net);
  const spend = byName('Guilt-Free Spend');
  const spendShare = pctOf(spend, net);
  const bizShare = pctOf(byName('Business Expenses'), net);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {pieData.length > 0 && (
        <div className="rounded-md border border-border/40 bg-background/40 p-2.5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Where this paycheck goes</div>
          <p className="text-[11px] leading-snug text-muted-foreground mb-2">
            Of your {fmt$(net)} take-home, <span style={{ color: 'hsl(var(--prism-sky))' }} className="font-semibold">{billsShare}%</span> covers your bills
            {debtShare > 0 && <> and <span style={{ color: 'hsl(var(--prism-rose))' }} className="font-semibold">{debtShare}%</span> attacks debt</>}
            , <span style={{ color: 'hsl(var(--prism-lime))' }} className="font-semibold">{futureShare}%</span> builds your future
            {bizShare > 0 && <> ({bizShare}% runs the business)</>}
            , leaving <span style={{ color: 'hsl(var(--prism-amber))' }} className="font-semibold">{fmt$(spend)} ({spendShare}%)</span> to spend guilt-free.
          </p>
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2} strokeWidth={0}>
                {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip
                formatter={(v: any, name: any) => [`${fmt$(Number(v))} · ${pctOf(Number(v), net)}% of net pay`, name]}
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
            These bills take <span style={{ color: 'hsl(var(--prism-sky))' }} className="font-semibold">{pctOf(barTotal, net)}% of your pay</span>
            {top && <> — <span className="font-semibold">{top.label}</span> is the biggest at {fmt$(top.value)} ({pctOf(top.value, net)}%)</>}
            {billItems.length > barData.length && <>, with {billItems.length - barData.length} more bills covered below the top 8</>}.
          </p>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 88, top: 4, bottom: 4 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(v: any) => [`${fmt$(Number(v))} · ${pctOf(Number(v), net)}% of net pay`, 'Amount']}
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={16}>
                {barData.map((b, i) => <Cell key={i} fill="hsl(var(--prism-sky))" opacity={1 - i * 0.09} />)}
                <LabelList
                  dataKey="value"
                  content={(props: any) => (
                    <text
                      x={(props.x ?? 0) + (props.width ?? 0) + 8}
                      y={(props.y ?? 0) + (props.height ?? 0) / 2}
                      dominantBaseline="middle"
                      textAnchor="start"
                      fontSize={9}
                      fill="hsl(var(--muted-foreground))"
                    >
                      {`${fmt$(Number(props.value))} · ${pctOf(Number(props.value), net)}%`}
                    </text>
                  )}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {total > 0 && net > 0 && Math.abs(total - net) > net * 0.02 && (
        <p className="md:col-span-2 text-[10px] text-muted-foreground italic">
          Chart areas come from your live budget and debt lists, so they may differ slightly from the totals saved with this plan ({fmt$(net)} take-home; charts cover {fmt$(total)}).
        </p>
      )}
    </div>
  );
}
