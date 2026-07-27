import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calculator, AlertTriangle } from 'lucide-react';
import {
  rothVsTraditional, rothConversionLadder, projectRMDs, withdrawalOrder,
  BRACKETS_SINGLE_2025, BRACKETS_MFJ_2025, marginalRate,
} from '@/lib/investment/tax';
import type { InvestmentPlan } from '@/hooks/use-investment-plan';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export function TaxPlanner({ plan }: { plan: InvestmentPlan | null }) {
  const [filing, setFiling] = useState<'single' | 'mfj'>('single');
  const brackets = filing === 'single' ? BRACKETS_SINGLE_2025 : BRACKETS_MFJ_2025;

  const [annualContrib, setAnnualContrib] = useState(23_000);
  const [yearsToRet, setYearsToRet] = useState(
    plan && plan.current_age && plan.retirement_age ? plan.retirement_age - plan.current_age : 25,
  );
  const [returnPct, setReturnPct] = useState(plan?.expected_return_pct ?? 8);
  const [incomeNow, setIncomeNow] = useState((plan?.current_monthly_income ?? 6000) * 12);
  const [incomeRetire, setIncomeRetire] = useState(60_000);

  const mNow = marginalRate(incomeNow, brackets);
  const mRet = marginalRate(incomeRetire, brackets);

  const rvt = useMemo(() => rothVsTraditional({
    annualContribution: annualContrib,
    years: yearsToRet,
    returnPct,
    marginalNow: mNow,
    marginalRetire: mRet,
  }), [annualContrib, yearsToRet, returnPct, mNow, mRet]);

  // Ladder
  const [tradBalance, setTradBalance] = useState(400_000);
  const [fillToRate, setFillToRate] = useState(0.12);
  const [ladderYears, setLadderYears] = useState(10);
  const ladder = useMemo(() => rothConversionLadder({
    traditionalBalance: tradBalance,
    baseTaxableIncome: incomeRetire,
    yearsAvailable: ladderYears,
    fillToTopOfBracketRate: fillToRate,
    brackets,
    returnPct,
  }), [tradBalance, incomeRetire, ladderYears, fillToRate, brackets, returnPct]);

  // RMDs
  const rmds = useMemo(() => projectRMDs({
    traditionalBalance: tradBalance,
    currentAge: plan?.current_age ?? 50,
    returnPct,
    throughAge: 95,
  }), [tradBalance, plan?.current_age, returnPct]);

  const order = withdrawalOrder({
    taxable: plan?.current_balance ? plan.current_balance * 0.3 : 50_000,
    traditional: tradBalance,
    roth: plan?.current_balance ? plan.current_balance * 0.2 : 30_000,
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Calculator className="h-4 w-4 text-primary" /> Tax & withdrawal planning</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-muted/40 p-3 text-xs flex items-start gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
            <p>Uses simplified 2025 federal brackets. Does not include state tax, NIIT, IRMAA, or FICA. Verify with a qualified tax professional before acting.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <Label>Filing status</Label>
              <Select value={filing} onValueChange={v => setFiling(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="mfj">Married filing jointly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Annual taxable income (now, $)</Label><Input type="number" value={incomeNow} onChange={e => setIncomeNow(Number(e.target.value))} /></div>
            <div><Label>Expected retirement income ($)</Label><Input type="number" value={incomeRetire} onChange={e => setIncomeRetire(Number(e.target.value))} /></div>
          </div>

          <Tabs defaultValue="rvt">
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="rvt">Roth vs Traditional</TabsTrigger>
              <TabsTrigger value="ladder">Conversion ladder</TabsTrigger>
              <TabsTrigger value="rmd">RMDs</TabsTrigger>
              <TabsTrigger value="order">Withdrawal order</TabsTrigger>
            </TabsList>

            <TabsContent value="rvt" className="mt-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div><Label>Annual contribution ($)</Label><Input type="number" value={annualContrib} onChange={e => setAnnualContrib(Number(e.target.value))} /></div>
                <div><Label>Years to retirement</Label><Input type="number" value={yearsToRet} onChange={e => setYearsToRet(Number(e.target.value))} /></div>
                <div><Label>Expected return %</Label><Input type="number" value={returnPct} onChange={e => setReturnPct(Number(e.target.value))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <Card className="border-primary/30">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">Roth (after-tax)</div>
                    <div className="text-xl font-semibold text-primary">${rvt.roth.toLocaleString()}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">Marginal now: {(mNow * 100).toFixed(0)}%</div>
                  </CardContent>
                </Card>
                <Card className="border-primary/30">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">Traditional (after-tax)</div>
                    <div className="text-xl font-semibold text-primary">${rvt.traditional.toLocaleString()}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">Marginal retirement: {(mRet * 100).toFixed(0)}%</div>
                  </CardContent>
                </Card>
              </div>
              <p className="text-sm">
                Winner: <Badge variant="outline" className="capitalize">{rvt.winner}</Badge>{' '}
                by <strong>${rvt.differenceUSD.toLocaleString()}</strong> after taxes.
              </p>
            </TabsContent>

            <TabsContent value="ladder" className="mt-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div><Label>Traditional balance ($)</Label><Input type="number" value={tradBalance} onChange={e => setTradBalance(Number(e.target.value))} /></div>
                <div>
                  <Label>Fill to top of bracket</Label>
                  <Select value={String(fillToRate)} onValueChange={v => setFillToRate(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.1">10%</SelectItem>
                      <SelectItem value="0.12">12%</SelectItem>
                      <SelectItem value="0.22">22%</SelectItem>
                      <SelectItem value="0.24">24%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Years available (pre-RMD)</Label><Input type="number" value={ladderYears} onChange={e => setLadderYears(Number(e.target.value))} /></div>
              </div>
              <div className="text-sm mt-2">
                Total converted: <strong>${ladder.totalConverted.toLocaleString()}</strong> ·
                Total tax: <strong>${ladder.totalTax.toLocaleString()}</strong> ·
                Effective rate: <strong>{(ladder.effectiveRate * 100).toFixed(1)}%</strong>
              </div>
              <div className="border rounded-md max-h-60 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 sticky top-0">
                    <tr><th className="text-left p-2">Year</th><th className="text-right p-2">Convert</th><th className="text-right p-2">Tax owed</th><th className="text-right p-2">Remaining</th></tr>
                  </thead>
                  <tbody>
                    {ladder.yearly.map(r => (
                      <tr key={r.year} className="border-t">
                        <td className="p-2">{r.year}</td>
                        <td className="p-2 text-right">${r.conversion.toLocaleString()}</td>
                        <td className="p-2 text-right">${r.taxOwed.toLocaleString()}</td>
                        <td className="p-2 text-right">${r.remaining.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="rmd" className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground">Required Minimum Distributions begin at age 73 using the IRS Uniform Lifetime Table.</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rmds}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="age" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="rmd" name="RMD" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs">First RMD (age 73): <strong>${(rmds[0]?.rmd ?? 0).toLocaleString()}</strong></p>
            </TabsContent>

            <TabsContent value="order" className="mt-4 space-y-2">
              {order.map((step, i) => (
                <div key={step.account} className="border rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">{i + 1}. {step.account}</div>
                    <Badge variant="outline">${Math.round(step.balance).toLocaleString()}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{step.rationale}</p>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
