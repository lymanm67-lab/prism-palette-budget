import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { HandHeart } from 'lucide-react';
import { dafContribution, qcdAnalysis, appreciatedStockDonation } from '@/lib/investment/charitable';

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

export function CharitablePlanner() {
  const [dafAmt, setDafAmt] = useState(25_000);
  const [taxRate, setTaxRate] = useState(32);
  const [gainPct, setGainPct] = useState(50);
  const daf = useMemo(() => dafContribution({ contributionAmount: dafAmt, marginalTaxRatePct: taxRate, appreciatedStockGainPct: gainPct }), [dafAmt, taxRate, gainPct]);

  const [rmd, setRmd] = useState(30_000);
  const [qcd, setQcd] = useState(15_000);
  const qcdRes = useMemo(() => qcdAnalysis({ rmdAmount: rmd, qcdAmount: qcd, marginalTaxRatePct: taxRate }), [rmd, qcd, taxRate]);

  const [fmv, setFmv] = useState(50_000);
  const [basis, setBasis] = useState(15_000);
  const stock = useMemo(() => appreciatedStockDonation({ fmv, costBasis: basis, marginalTaxRatePct: taxRate }), [fmv, basis, taxRate]);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><HandHeart className="h-5 w-5 text-primary" /> Charitable Giving</CardTitle></CardHeader>
      <CardContent>
        <Tabs defaultValue="daf">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="daf">DAF</TabsTrigger>
            <TabsTrigger value="qcd">QCD (RMD offset)</TabsTrigger>
            <TabsTrigger value="stock">Appreciated stock</TabsTrigger>
          </TabsList>

          <TabsContent value="daf" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">Donor-Advised Fund: bunch deductions in a high-income year, grant out over time.</p>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Contribution</Label><Input type="number" value={dafAmt} onChange={(e) => setDafAmt(+e.target.value)} /></div>
              <div><Label>Marginal tax %</Label><Input type="number" value={taxRate} onChange={(e) => setTaxRate(+e.target.value)} /></div>
              <div><Label>% appreciated</Label><Input type="number" value={gainPct} onChange={(e) => setGainPct(+e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Income tax saved</div><div className="text-xl font-bold">{fmt(daf.incomeTaxSaved)}</div></div>
              <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Cap gains avoided</div><div className="text-xl font-bold">{fmt(daf.capGainsAvoided)}</div></div>
              <div className="rounded-lg bg-primary/10 p-3"><div className="text-xs text-muted-foreground">Net cost</div><div className="text-xl font-bold text-primary">{fmt(daf.netCost)}</div></div>
            </div>
          </TabsContent>

          <TabsContent value="qcd" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">Qualified Charitable Distribution: give directly from IRA to offset RMD (age 70½+).</p>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>RMD amount</Label><Input type="number" value={rmd} onChange={(e) => setRmd(+e.target.value)} /></div>
              <div><Label>QCD amount</Label><Input type="number" value={qcd} onChange={(e) => setQcd(+e.target.value)} /></div>
              <div><Label>Tax %</Label><Input type="number" value={taxRate} onChange={(e) => setTaxRate(+e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-primary/10 p-3"><div className="text-xs text-muted-foreground">Tax saved</div><div className="text-xl font-bold text-primary">{fmt(qcdRes.taxSaved)}</div></div>
              <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Remaining taxable RMD</div><div className="text-xl font-bold">{fmt(qcdRes.remainingTaxableRmd)}</div></div>
            </div>
            {qcdRes.note && <div className="text-xs text-amber-600">{qcdRes.note}</div>}
          </TabsContent>

          <TabsContent value="stock" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">Donating appreciated stock directly avoids capital gains tax.</p>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Fair market value</Label><Input type="number" value={fmv} onChange={(e) => setFmv(+e.target.value)} /></div>
              <div><Label>Cost basis</Label><Input type="number" value={basis} onChange={(e) => setBasis(+e.target.value)} /></div>
              <div><Label>Tax %</Label><Input type="number" value={taxRate} onChange={(e) => setTaxRate(+e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <div className="font-semibold text-sm">Sell & donate cash</div>
                <div className="text-xs text-muted-foreground">Tax owed: {fmt(stock.sellAndDonate.taxOwed)}</div>
                <div className="text-xs text-muted-foreground">Net donation: {fmt(stock.sellAndDonate.netDonation)}</div>
              </div>
              <div className="rounded-lg border border-primary p-3">
                <div className="font-semibold text-sm text-primary">Donate stock directly</div>
                <div className="text-xs text-muted-foreground">Tax owed: $0</div>
                <div className="text-xs text-muted-foreground">Net donation: {fmt(stock.donateStock.netDonation)}</div>
              </div>
            </div>
            <div className="rounded-lg bg-primary/10 p-3"><div className="text-xs text-muted-foreground">Advantage of direct donation</div><div className="text-xl font-bold text-primary">{fmt(stock.advantage)}</div></div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
