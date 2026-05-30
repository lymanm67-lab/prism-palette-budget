import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Building } from 'lucide-react';
import { realEstateProjection, businessSaleEvent, stockCompVesting } from '@/lib/investment/realassets';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

export function RealAssetsPlanner() {
  const [reValue, setReValue] = useState(500_000);
  const [reIncome, setReIncome] = useState(1500);
  const [reYears, setReYears] = useState(20);
  const reRows = useMemo(() => realEstateProjection({ currentValue: reValue, monthlyNetIncome: reIncome, years: reYears }), [reValue, reIncome, reYears]);

  const [saleAmt, setSaleAmt] = useState(1_000_000);
  const [saleYears, setSaleYears] = useState(10);
  const [yearsAfter, setYearsAfter] = useState(15);
  const sale = useMemo(() => businessSaleEvent({ saleAmount: saleAmt, saleYearsAway: saleYears, yearsAfterSale: yearsAfter }), [saleAmt, saleYears, yearsAfter]);

  const [shares, setShares] = useState(1000);
  const [pps, setPps] = useState(150);
  const [vest, setVest] = useState(4);
  const sc = useMemo(() => stockCompVesting({ unvestedShares: shares, pricePerShare: pps, vestYears: vest }), [shares, pps, vest]);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Building className="h-5 w-5 text-primary" /> Real Assets & Business Events</CardTitle></CardHeader>
      <CardContent>
        <Tabs defaultValue="re">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="re">Real Estate</TabsTrigger>
            <TabsTrigger value="sale">Business Sale</TabsTrigger>
            <TabsTrigger value="rsu">Stock Comp / RSU</TabsTrigger>
          </TabsList>

          <TabsContent value="re" className="space-y-4 mt-4">
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Current value</Label><Input type="number" value={reValue} onChange={(e) => setReValue(+e.target.value)} /></div>
              <div><Label>Monthly net income</Label><Input type="number" value={reIncome} onChange={(e) => setReIncome(+e.target.value)} /></div>
              <div><Label>Years</Label><Input type="number" value={reYears} onChange={(e) => setReYears(+e.target.value)} /></div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reRows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                  <Line dataKey="value" stroke="hsl(var(--primary))" name="Property value" />
                  <Line dataKey="cumulativeIncome" stroke="hsl(var(--accent))" name="Cumulative income" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="sale" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">Model a future business sale, taxes, and reinvestment growth.</p>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Sale amount</Label><Input type="number" value={saleAmt} onChange={(e) => setSaleAmt(+e.target.value)} /></div>
              <div><Label>Years until sale</Label><Input type="number" value={saleYears} onChange={(e) => setSaleYears(+e.target.value)} /></div>
              <div><Label>Years to grow after</Label><Input type="number" value={yearsAfter} onChange={(e) => setYearsAfter(+e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Net proceeds</div><div className="text-xl font-bold">{fmt(sale.netProceeds)}</div></div>
              <div className="rounded-lg bg-destructive/10 p-3"><div className="text-xs text-muted-foreground">Capital gains tax</div><div className="text-xl font-bold">{fmt(sale.taxPaid)}</div></div>
              <div className="rounded-lg bg-primary/10 p-3"><div className="text-xs text-muted-foreground">Future value</div><div className="text-xl font-bold text-primary">{fmt(sale.futureValue)}</div></div>
            </div>
          </TabsContent>

          <TabsContent value="rsu" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">Convert vesting stock comp into monthly investment contributions.</p>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Unvested shares</Label><Input type="number" value={shares} onChange={(e) => setShares(+e.target.value)} /></div>
              <div><Label>Price/share</Label><Input type="number" value={pps} onChange={(e) => setPps(+e.target.value)} /></div>
              <div><Label>Vest years</Label><Input type="number" value={vest} onChange={(e) => setVest(+e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Net per year</div><div className="text-xl font-bold">{fmt(sc.netPerYear)}</div></div>
              <div className="rounded-lg bg-primary/10 p-3"><div className="text-xs text-muted-foreground">Invest per month (50%)</div><div className="text-xl font-bold text-primary">{fmt(sc.investPerMonth)}</div></div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
