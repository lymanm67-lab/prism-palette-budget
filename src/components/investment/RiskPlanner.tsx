import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, Activity } from 'lucide-react';
import { runMonteCarlo, targetAllocation, sequenceOfReturnsStress } from '@/lib/investment/risk';
import type { InvestmentPlan } from '@/hooks/use-investment-plan';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell } from 'recharts';

export function RiskPlanner({ plan }: { plan: InvestmentPlan | null }) {
  const yearsToRet = plan && plan.current_age && plan.retirement_age ? plan.retirement_age - plan.current_age : 25;
  const monthly = (plan?.monthly_employee_contribution ?? 0) + (plan?.monthly_employer_contribution ?? 0);

  // Monte Carlo state
  const [volatility, setVolatility] = useState(15);
  const [yearsInRet, setYearsInRet] = useState(30);
  const [annualWithdrawal, setAnnualWithdrawal] = useState(60_000);
  const [mcSeed, setMcSeed] = useState(42);

  const mc = useMemo(() => runMonteCarlo({
    currentBalance: plan?.current_balance ?? 100_000,
    monthlyContribution: monthly,
    yearsToRetirement: yearsToRet,
    yearsInRetirement: yearsInRet,
    annualWithdrawal,
    expectedReturnPct: plan?.expected_return_pct ?? 8,
    volatilityPct: volatility,
    inflationPct: plan?.inflation_pct ?? 2.5,
    runs: 1000,
    seed: mcSeed,
  }), [plan, monthly, yearsToRet, yearsInRet, annualWithdrawal, volatility, mcSeed]);

  // Glide path
  const age = plan?.current_age ?? 45;
  const target = targetAllocation(age);
  const allocationData = [
    { name: 'Equities', value: target.equity, color: 'hsl(var(--primary))' },
    { name: 'Bonds', value: target.bonds, color: 'hsl(var(--muted-foreground))' },
    { name: 'Cash', value: target.cash, color: 'hsl(var(--accent))' },
  ];

  // Stress test
  const [badYears, setBadYears] = useState(5);
  const [badReturn, setBadReturn] = useState(-10);
  const stress = useMemo(() => sequenceOfReturnsStress({
    currentBalance: plan?.current_balance ?? 100_000,
    monthlyContribution: monthly,
    yearsToRetirement: yearsToRet,
    badYears,
    badYearReturnPct: badReturn,
    normalReturnPct: plan?.expected_return_pct ?? 8,
  }), [plan, monthly, yearsToRet, badYears, badReturn]);

  const stressChartData = stress.yearly.map((s, i) => ({
    year: s.year,
    stressed: s.balance,
    baseline: stress.baseline[i].balance,
  }));

  const successColor = mc.successRate >= 85 ? 'text-green-600' : mc.successRate >= 70 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Shield className="h-4 w-4 text-primary" /> Risk & allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-muted/40 p-3 text-xs flex items-start gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
            <p>Probabilities are simulations based on assumed return and volatility. Past performance does not guarantee future results. Verify investment decisions with a qualified financial advisor.</p>
          </div>

          <Tabs defaultValue="mc">
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="mc">Monte Carlo</TabsTrigger>
              <TabsTrigger value="glide">Glide path</TabsTrigger>
              <TabsTrigger value="stress">Sequence stress test</TabsTrigger>
            </TabsList>

            <TabsContent value="mc" className="mt-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><Label>Volatility % (annual)</Label><Input type="number" value={volatility} onChange={e => setVolatility(Number(e.target.value))} /></div>
                <div><Label>Years in retirement</Label><Input type="number" value={yearsInRet} onChange={e => setYearsInRet(Number(e.target.value))} /></div>
                <div><Label>Year-1 withdrawal ($)</Label><Input type="number" value={annualWithdrawal} onChange={e => setAnnualWithdrawal(Number(e.target.value))} /></div>
                <div className="flex items-end"><Button variant="outline" size="sm" onClick={() => setMcSeed(Math.floor(Math.random() * 1e6))}>Re-run</Button></div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                <Card><CardContent className="p-3">
                  <div className="text-xs text-muted-foreground">Success rate</div>
                  <div className={`text-2xl font-semibold ${successColor}`}>{mc.successRate.toFixed(1)}%</div>
                  <div className="text-[11px] text-muted-foreground">{mc.runs} runs</div>
                </CardContent></Card>
                <Card><CardContent className="p-3">
                  <div className="text-xs text-muted-foreground">Median ending</div>
                  <div className="text-lg font-semibold">${mc.median.toLocaleString()}</div>
                </CardContent></Card>
                <Card><CardContent className="p-3">
                  <div className="text-xs text-muted-foreground">10th–90th pct</div>
                  <div className="text-sm font-semibold">${(mc.p10/1000).toFixed(0)}k – ${(mc.p90/1000).toFixed(0)}k</div>
                </CardContent></Card>
                <Card><CardContent className="p-3">
                  <div className="text-xs text-muted-foreground">Worst / best year</div>
                  <div className="text-sm font-semibold">{mc.worstYear}% / +{mc.bestYear}%</div>
                </CardContent></Card>
              </div>

              <p className="text-sm pt-2">
                {mc.successRate >= 85 && <span className="text-green-600">Strong plan — high probability of lasting through retirement.</span>}
                {mc.successRate >= 70 && mc.successRate < 85 && <span className="text-amber-600">Reasonable, but consider raising contributions or lowering withdrawal.</span>}
                {mc.successRate < 70 && <span className="text-red-600">High depletion risk. Increase savings, reduce withdrawals, or work longer.</span>}
              </p>
            </TabsContent>

            <TabsContent value="glide" className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground">Target allocation by age uses the rule of thumb <em>equity % ≈ 110 − age</em>, capped 30–95%.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={allocationData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                      <Tooltip formatter={(v: number) => `${v}%`} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {allocationData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 text-sm">
                  <div>At age <strong>{age}</strong>, target allocation:</div>
                  <div>Equities: <Badge variant="outline">{target.equity}%</Badge></div>
                  <div>Bonds: <Badge variant="outline">{target.bonds}%</Badge></div>
                  <div>Cash: <Badge variant="outline">{target.cash}%</Badge></div>
                  <p className="text-xs text-muted-foreground pt-2">Re-evaluate annually. Reduce equity exposure as you approach retirement to limit sequence-of-returns risk.</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="stress" className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground flex items-start gap-2"><Activity className="h-3 w-3 mt-0.5" /> Models a bear market in the first N years and compares it to a steady-return baseline.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div><Label>Bad years (front-loaded)</Label><Input type="number" value={badYears} onChange={e => setBadYears(Number(e.target.value))} /></div>
                <div><Label>Bad-year return %</Label><Input type="number" value={badReturn} onChange={e => setBadReturn(Number(e.target.value))} /></div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Gap vs baseline</div>
                  <div className="text-xl font-semibold text-amber-600">{stress.gapPct}%</div>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stressChartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                    <Legend />
                    <Line type="monotone" dataKey="baseline" name="Baseline" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="stressed" name="Stressed" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="text-sm">
                Stressed: <strong>${stress.finalStressed.toLocaleString()}</strong> vs Baseline: <strong>${stress.finalBaseline.toLocaleString()}</strong>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
