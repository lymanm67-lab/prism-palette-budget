import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DollarSign } from 'lucide-react';
import { ssClaimingOptimizer, spiaEstimate, bucketStrategy, swrAnalysis } from '@/lib/investment/income';
import type { InvestmentPlan } from '@/hooks/use-investment-plan';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

export function IncomeEngineering({ plan }: { plan: InvestmentPlan | null }) {
  const [pia, setPia] = useState(plan?.ss_monthly_estimate ?? 2500);
  const [life, setLife] = useState(90);
  const ss = useMemo(() => ssClaimingOptimizer({ piaAt67: pia, lifeExpectancy: life }), [pia, life]);

  const [annuityPremium, setAnnuityPremium] = useState(200_000);
  const [annuityAge, setAnnuityAge] = useState(65);
  const spia = useMemo(() => spiaEstimate({ premium: annuityPremium, age: annuityAge }), [annuityPremium, annuityAge]);

  const [spend, setSpend] = useState(60_000);
  const buckets = useMemo(() => bucketStrategy({ annualSpend: spend }), [spend]);

  const [portfolio, setPortfolio] = useState(1_500_000);
  const swr = useMemo(() => swrAnalysis({ portfolio }), [portfolio]);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" /> Retirement Income Engineering</CardTitle></CardHeader>
      <CardContent>
        <Tabs defaultValue="ss">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="ss">SS Claiming</TabsTrigger>
            <TabsTrigger value="annuity">Annuity (SPIA)</TabsTrigger>
            <TabsTrigger value="buckets">Buckets</TabsTrigger>
            <TabsTrigger value="swr">SWR</TabsTrigger>
          </TabsList>

          <TabsContent value="ss" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>PIA at age 67 (monthly)</Label><Input type="number" value={pia} onChange={(e) => setPia(+e.target.value)} /></div>
              <div><Label>Life expectancy</Label><Input type="number" value={life} onChange={(e) => setLife(+e.target.value)} /></div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ss.results.map(r => ({ age: `Claim @ ${r.claimAge}`, lifetime: r.lifetimePV, monthly: r.monthly }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="age" />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="lifetime" fill="hsl(var(--primary))" name="Lifetime PV" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <div className="text-sm">Optimal claiming age: <Badge>{ss.recommended}</Badge></div>
            </div>
          </TabsContent>

          <TabsContent value="annuity" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">Single Premium Immediate Annuity converts lump sum into guaranteed income.</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Premium</Label><Input type="number" value={annuityPremium} onChange={(e) => setAnnuityPremium(+e.target.value)} /></div>
              <div><Label>Purchase age</Label><Input type="number" value={annuityAge} onChange={(e) => setAnnuityAge(+e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Payout rate</div><div className="text-xl font-bold">{spia.rate.toFixed(1)}%</div></div>
              <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Monthly income</div><div className="text-xl font-bold">{fmt(spia.monthly)}</div></div>
              <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Annual income</div><div className="text-xl font-bold">{fmt(spia.annual)}</div></div>
            </div>
          </TabsContent>

          <TabsContent value="buckets" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">Segment savings by withdrawal horizon to reduce sequence-of-returns risk.</p>
            <div><Label>Annual spend</Label><Input type="number" value={spend} onChange={(e) => setSpend(+e.target.value)} /></div>
            <div className="space-y-2">
              <div className="rounded-lg border p-3">
                <div className="font-semibold">Bucket 1 — Short ({buckets.shortBucket.years} yrs)</div>
                <div className="text-sm text-muted-foreground">{buckets.shortBucket.allocation}</div>
                <div className="text-lg font-bold">{fmt(buckets.shortBucket.amount)}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="font-semibold">Bucket 2 — Mid ({buckets.midBucket.years} yrs)</div>
                <div className="text-sm text-muted-foreground">{buckets.midBucket.allocation}</div>
                <div className="text-lg font-bold">{fmt(buckets.midBucket.amount)}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="font-semibold">Bucket 3 — Long (remainder)</div>
                <div className="text-sm text-muted-foreground">{buckets.longBucket.allocation}</div>
                <div className="text-xs text-muted-foreground mt-1">{buckets.longBucket.purpose}</div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="swr" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">4% rule with Guyton-Klinger guardrails for adaptive withdrawals.</p>
            <div><Label>Portfolio at retirement</Label><Input type="number" value={portfolio} onChange={(e) => setPortfolio(+e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-primary/10 p-3"><div className="text-xs text-muted-foreground">Initial annual withdrawal</div><div className="text-xl font-bold text-primary">{fmt(swr.initialAnnual)}</div></div>
              <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Initial monthly</div><div className="text-xl font-bold">{fmt(swr.initialMonthly)}</div></div>
            </div>
            <div className="text-sm space-y-1">
              <div>↑ Cut 10% if annual exceeds <strong>{fmt(swr.cutTrigger)}</strong></div>
              <div>↓ Raise 10% if annual drops below <strong>{fmt(swr.raiseTrigger)}</strong></div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
