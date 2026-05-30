import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { HeartPulse } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { InvestmentPlan } from '@/hooks/use-investment-plan';

export function HSAPlanner({ plan }: { plan: InvestmentPlan | null }) {
  const [years, setYears] = useState(25);
  const [drawdown, setDrawdown] = useState(0);
  const [withdrawAtRetire, setWithdrawAtRetire] = useState(true);

  const hsaBalance = plan?.hsa_balance ?? 0;
  const monthly = (plan?.hsa_monthly_contribution ?? 0) + (plan?.hsa_employer_contribution ?? 0);
  const ret = (plan?.hsa_return_pct ?? 7) / 100 / 12;

  const series = useMemo(() => {
    const rows: { year: number; balance: number }[] = [];
    let bal = hsaBalance;
    for (let y = 0; y <= years; y++) {
      rows.push({ year: y, balance: Math.round(bal) });
      for (let m = 0; m < 12; m++) {
        bal = bal * (1 + ret) + monthly;
        if (withdrawAtRetire && y >= years - 1) bal -= drawdown / 12;
      }
      if (bal < 0) bal = 0;
    }
    return rows;
  }, [hsaBalance, monthly, ret, years, drawdown, withdrawAtRetire]);

  const finalBal = series[series.length - 1]?.balance ?? 0;

  if (!plan) return <Card><CardContent className="p-6 text-sm text-muted-foreground">Complete the Setup wizard first.</CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><HeartPulse className="h-4 w-4 text-primary" /> HSA long-term projection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">Invested HSAs grow tax-free for qualified medical expenses and can be used like a retirement account after 65 (taxable for non-medical).</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><Label>Years</Label><Input type="number" value={years} onChange={e => setYears(Number(e.target.value))} /></div>
          <div><Label>Annual medical draw ($)</Label><Input type="number" value={drawdown} onChange={e => setDrawdown(Number(e.target.value))} /></div>
          <div className="flex items-end gap-2"><Switch checked={withdrawAtRetire} onCheckedChange={setWithdrawAtRetire} /><span className="text-sm">Draw only at retirement</span></div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Projected balance</div>
            <div className="text-xl font-semibold text-primary">${finalBal.toLocaleString()}</div>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
              <Line type="monotone" dataKey="balance" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[11px] text-muted-foreground italic">Confirm HSA eligibility, contribution limits, and tax treatment with a qualified tax professional.</p>
      </CardContent>
    </Card>
  );
}
