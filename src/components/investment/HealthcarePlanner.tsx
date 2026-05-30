import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { HeartPulse, AlertTriangle } from 'lucide-react';
import { acaBridgeCost, medicareCost, ltcFunding, longevitySensitivity } from '@/lib/investment/healthcare';
import type { InvestmentPlan } from '@/hooks/use-investment-plan';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

export function HealthcarePlanner({ plan }: { plan: InvestmentPlan | null }) {
  const [retireAge, setRetireAge] = useState(plan?.retirement_age ?? 60);
  const [premium, setPremium] = useState(900);
  const [oopMax, setOopMax] = useState(9000);
  const aca = useMemo(() => acaBridgeCost({ retireAge, monthlyPremium: premium, oopMax }), [retireAge, premium, oopMax]);

  const [magi, setMagi] = useState(120_000);
  const mc = useMemo(() => medicareCost(magi), [magi]);

  const [careAge, setCareAge] = useState(80);
  const [careMonthly, setCareMonthly] = useState(8000);
  const [careYears, setCareYears] = useState(3);
  const ltc = useMemo(
    () => ltcFunding({ currentAge: plan?.current_age ?? 45, expectedCareAge: careAge, monthlyCost: careMonthly, careYears }),
    [plan?.current_age, careAge, careMonthly, careYears],
  );

  const [startBal, setStartBal] = useState(1_000_000);
  const [annualSpend, setAnnualSpend] = useState(60_000);
  const longevity = useMemo(
    () => longevitySensitivity({ retireAge, startBalance: startBal, annualSpend, returnPct: plan?.expected_return_pct ?? 6 }),
    [retireAge, startBal, annualSpend, plan?.expected_return_pct],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><HeartPulse className="h-5 w-5 text-primary" /> Healthcare & Longevity</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="aca">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="aca">ACA Bridge</TabsTrigger>
            <TabsTrigger value="medicare">Medicare/IRMAA</TabsTrigger>
            <TabsTrigger value="ltc">Long-term care</TabsTrigger>
            <TabsTrigger value="longevity">Longevity</TabsTrigger>
          </TabsList>

          <TabsContent value="aca" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">Estimate health insurance cost if retiring before Medicare (age 65).</p>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Retire age</Label><Input type="number" value={retireAge} onChange={(e) => setRetireAge(+e.target.value)} /></div>
              <div><Label>Monthly premium</Label><Input type="number" value={premium} onChange={(e) => setPremium(+e.target.value)} /></div>
              <div><Label>Annual OOP max</Label><Input type="number" value={oopMax} onChange={(e) => setOopMax(+e.target.value)} /></div>
            </div>
            <div className="rounded-lg bg-muted/40 p-4">
              <div className="text-sm text-muted-foreground">Total bridge cost ({aca.years} years to Medicare)</div>
              <div className="text-2xl font-bold">{fmt(aca.totalCost)}</div>
            </div>
          </TabsContent>

          <TabsContent value="medicare" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">High income triggers IRMAA surcharges on Medicare Part B & D.</p>
            <div><Label>Retirement MAGI</Label><Input type="number" value={magi} onChange={(e) => setMagi(+e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Monthly (Part B + D)</div><div className="text-xl font-bold">{fmt(mc.monthlyTotal)}</div></div>
              <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Annual</div><div className="text-xl font-bold">{fmt(mc.annualTotal)}</div></div>
            </div>
            {mc.irmaa && <div className="flex items-center gap-2 text-sm text-amber-600"><AlertTriangle className="h-4 w-4" /> IRMAA surcharge applies at this income level.</div>}
          </TabsContent>

          <TabsContent value="ltc" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">Plan for potential long-term care costs.</p>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Expected care age</Label><Input type="number" value={careAge} onChange={(e) => setCareAge(+e.target.value)} /></div>
              <div><Label>Monthly cost (today)</Label><Input type="number" value={careMonthly} onChange={(e) => setCareMonthly(+e.target.value)} /></div>
              <div><Label>Years of care</Label><Input type="number" value={careYears} onChange={(e) => setCareYears(+e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Total future cost</div><div className="text-xl font-bold">{fmt(ltc.totalFuture)}</div></div>
              <div className="rounded-lg bg-primary/10 p-3"><div className="text-xs text-muted-foreground">Lump sum needed today</div><div className="text-xl font-bold text-primary">{fmt(ltc.pvNeeded)}</div></div>
            </div>
          </TabsContent>

          <TabsContent value="longevity" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">Will your money last if you live to 85, 90, 95, or 100?</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Starting balance</Label><Input type="number" value={startBal} onChange={(e) => setStartBal(+e.target.value)} /></div>
              <div><Label>Annual spend</Label><Input type="number" value={annualSpend} onChange={(e) => setAnnualSpend(+e.target.value)} /></div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={longevity.map(l => ({ age: `to ${l.endAge}`, balance: l.depleted ? 0 : l.finalBalance, depleted: l.depleted }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="age" />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="balance" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {longevity.some(l => l.depleted) && (
              <div className="text-sm text-amber-600 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Plan runs out before age 100 — consider lower spending or higher returns.</div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
