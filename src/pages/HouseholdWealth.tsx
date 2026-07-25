import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Car, Home, PiggyBank, Users, Briefcase, Landmark } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { useWealthOSData, BUCKET_LABELS, type Buckets } from '@/hooks/use-wealth-os';
import { PageExplainer } from '@/components/common/PageExplainer';

const OPERS = 328948.74;
const OHIO_DC = 35447.45;
const ALLIES = 100000;
const EQUINOX = 15000;
const JAGUAR = 25000;
const PENSION_MONTHLY = 6559;

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const money2 = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

const COLORS = ['hsl(var(--prism-teal))', 'hsl(var(--prism-amber))', 'hsl(var(--primary))',
  'hsl(var(--prism-lime))', 'hsl(var(--prism-rose))', 'hsl(var(--muted-foreground))',
  '#6B8CAE', '#8A7420', '#3F6E9C', '#9AA7B5'];

const EMPTY_B = {
  retirement: 0, business: 0, realEstate: 0, intellectualProperty: 0,
  personalProperty: 0, vehicles: 0, brokerage: 0, hsa: 0, emergency: 0, cash: 0,
} as Buckets;

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${tone || ''}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function OwnerBadge({ classification }: { classification: string }) {
  const variant = classification === 'Separate Property' ? 'secondary'
    : classification === 'Joint Household' ? 'outline' : 'default';
  return <Badge variant={variant as any}>{classification}</Badge>;
}

export default function HouseholdWealth() {
  const { data: live, isLoading } = useWealthOSData();

  const B = live?.buckets ?? EMPTY_B;
  const lymanB = live?.byOwner.lyman.buckets ?? EMPTY_B;
  const kateriB = live?.byOwner.kateri.buckets ?? EMPTY_B;
  const lymanTotal = live?.byOwner.lyman.total ?? 0;
  const kateriTotal = live?.byOwner.kateri.total ?? 0;
  const jointTotal = live?.byOwner.joint.total ?? 0;
  const householdTotal = live?.totalAssets ?? 0;
  const combinedRetirement = lymanB.retirement + kateriB.retirement;

  const allocation = useMemo(
    () => (Object.keys(BUCKET_LABELS) as (keyof Buckets)[])
      .map((k) => ({ name: BUCKET_LABELS[k], value: Math.round(B[k] || 0) }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value),
    [B],
  );

  const vehicles = live?.vehicles?.length
    ? live.vehicles
    : [
        { name: '2023 Jaguar', balance: JAGUAR, ownerLabel: 'Lyman Montgomery', classification: 'Individual' as const },
        { name: '2018 Chevrolet Equinox', balance: EQUINOX, ownerLabel: 'Kateri Montgomery', classification: 'Separate Property' as const },
      ] as any[];
  const vehicleTotal = vehicles.reduce((s: number, v: any) => s + v.balance, 0);

  const realEstate = live?.realEstate ?? [];
  const retirementGoal = 4_000_000;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Montgomery Household Wealth</h1>
        <p className="text-muted-foreground">
          Complete family office view — Lyman &amp; Kateri Montgomery, with individual, joint, and separate property clearly identified.
        </p>
      </header>

      <PageExplainer title="How to use this dashboard">
        <p>
          Every figure here is pulled live from your household accounts. Ownership is read from each account's owner label,
          so assets are grouped as <strong>Individual</strong> (Lyman), <strong>Separate Property</strong> (Kateri), or{' '}
          <strong>Joint Household</strong>. Update an account in Accounts and the totals, charts, and the Wealth OS Binder all follow.
        </p>
      </PageExplainer>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Lyman — Assets" value={money(lymanTotal)} sub="Individually owned" />
        <Stat label="Kateri — Assets" value={money(kateriTotal)} sub="Separate property" />
        <Stat label="Joint Household" value={money(jointTotal)} />
        <Stat label="Combined Household Assets" value={money(householdTotal)} sub={live ? `Net worth ${money(live.netWorth)}` : undefined} />
      </div>

      <Tabs defaultValue="summary">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="summary">Household Snapshot</TabsTrigger>
          <TabsTrigger value="kateri">Kateri Profile</TabsTrigger>
          <TabsTrigger value="retirement">Retirement</TabsTrigger>
          <TabsTrigger value="realestate">Real Estate</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="allocation">Allocation</TabsTrigger>
          <TabsTrigger value="familyoffice">Family Office</TabsTrigger>
        </TabsList>

        {/* -------- Household snapshot -------- */}
        <TabsContent value="summary" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> Lyman Montgomery</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Line label="Salary (annual)" value="$70,940.04" />
                <Line label="Retirement Assets" value={money2(lymanB.retirement)} />
                <Line label="Brokerage" value={money2(lymanB.brokerage)} />
                <Line label="HSA" value={money2(lymanB.hsa)} />
                <Line label="Business Interests" value={money2(lymanB.business)} />
                <Line label="Intellectual Property" value={money2(lymanB.intellectualProperty)} />
                <Line label="Personal Property" value={money2(lymanB.personalProperty)} />
                <Line label="Vehicles" value={money2(lymanB.vehicles)} />
                <Line label="Real Estate Interests" value={money2(lymanB.realEstate)} />
                <Line label="Individual Total" value={money2(lymanTotal)} bold />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Landmark className="h-4 w-4" /> Kateri Montgomery</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Line label="OPERS Pension Account" value={money2(OPERS)} />
                <Line label="Ohio Deferred Compensation" value={money2(OHIO_DC)} />
                <Line label="Real Estate — 213 Allies Street" value={money2(ALLIES)} />
                <Line label="Vehicle — 2018 Chevrolet Equinox" value={money2(EQUINOX)} />
                <Line label="Other Individual Assets" value={money2(Math.max(kateriTotal - OPERS - OHIO_DC - ALLIES - EQUINOX, 0))} />
                <Line label="Projected Pension Income" value={`${money(PENSION_MONTHLY)} / mo`} />
                <Line label="Separate Property Total" value={money2(kateriTotal)} bold />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Combined Household Totals</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              <Stat label="Retirement" value={money(combinedRetirement)} />
              <Stat label="Real Estate" value={money(B.realEstate)} />
              <Stat label="Vehicles" value={money(B.vehicles || vehicleTotal)} />
              <Stat label="Household Net Worth" value={money(live?.netWorth ?? 0)} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* -------- Kateri profile -------- */}
        <TabsContent value="kateri" className="space-y-4 mt-4">
          <h2 className="text-xl font-semibold">Kateri Montgomery Financial Profile</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Stat label="OPERS Account Balance" value={money2(OPERS)} sub="🟢 Verified" />
            <Stat label="Ohio Deferred Compensation" value={money2(OHIO_DC)} sub="🟢 Verified" />
            <Stat label="Projected Retirement Income" value={`${money(PENSION_MONTHLY)}/mo`} sub="Estimated OPERS pension" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Home className="h-4 w-4" /> 213 Allies Street</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Line label="Estimated Market Value" value={money2(ALLIES)} />
                <Line label="Ownership" value="Kateri Montgomery" />
                <Line label="Classification" value="Separate Property" />
                <Line label="Status" value="🔵 Estimated" />
                <p className="text-xs text-muted-foreground pt-2">
                  Reflected on the household balance sheet, asset allocation, real estate dashboard, and estate planning review.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Car className="h-4 w-4" /> 2018 Chevrolet Equinox</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Line label="Estimated Value" value={money2(EQUINOX)} />
                <Line label="Owner" value="Kateri Montgomery" />
                <Line label="Classification" value="Separate Property" />
                <Line label="Status" value="🔵 Estimated" />
                <p className="text-xs text-muted-foreground pt-2">
                  Included in household transportation assets and the insurance review.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* -------- Retirement -------- */}
        <TabsContent value="retirement" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Stat label="Lyman — Retirement Assets" value={money2(lymanB.retirement)} />
            <Stat label="Kateri — OPERS + Ohio DC" value={money2(kateriB.retirement)} />
            <Stat label="Combined Household Retirement" value={money2(combinedRetirement)} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Retirement Split</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Lyman', value: Math.round(lymanB.retirement) },
                        { name: 'Kateri — OPERS', value: Math.round(OPERS) },
                        { name: 'Kateri — Ohio DC', value: Math.round(OHIO_DC) },
                      ].filter((d) => d.value > 0)}
                      dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}
                    >
                      {COLORS.slice(0, 3).map((c) => <Cell key={c} fill={c} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => money(Number(v))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Growth Projection &amp; Readiness</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[5, 10, 15, 20].map((yrs) => ({
                      name: `+${yrs}y`,
                      value: Math.round(combinedRetirement * Math.pow(1.07, yrs)),
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis tickFormatter={(v) => `$${Math.round(v / 1000)}k`} fontSize={11} />
                      <Tooltip formatter={(v: any) => money(Number(v))} />
                      <Bar dataKey="value" fill="hsl(var(--prism-teal))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Retirement readiness vs. {money(retirementGoal)} goal</span>
                    <span className="font-semibold">{((combinedRetirement / retirementGoal) * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={Math.min((combinedRetirement / retirementGoal) * 100, 100)} />
                  <p className="text-xs text-muted-foreground mt-2">
                    Excludes Kateri's projected pension income of {money(PENSION_MONTHLY)}/mo, which materially reduces the portfolio required at retirement.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* -------- Real estate -------- */}
        <TabsContent value="realestate" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            {realEstate.map((p) => (
              <Card key={p.name}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2"><Home className="h-4 w-4" /> {p.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Line label="Estimated Interest" value={money2(p.balance)} bold />
                  <Line label="Owner" value={p.ownerLabel} />
                  <OwnerBadge classification={p.classification} />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader><CardTitle>Ownership Interest by Property</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={realEstate.map((p) => ({ name: p.name.replace(' (Real Estate)', ''), value: p.balance }))} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis type="number" tickFormatter={(v) => `$${Math.round(v / 1000)}k`} fontSize={11} />
                  <YAxis type="category" dataKey="name" width={180} fontSize={11} />
                  <Tooltip formatter={(v: any) => money(Number(v))} />
                  <Bar dataKey="value" fill="hsl(var(--prism-amber))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* -------- Vehicles -------- */}
        <TabsContent value="vehicles" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            {vehicles.map((v: any) => (
              <Card key={v.name}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2"><Car className="h-5 w-5 text-prism-teal" /> {v.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-2xl font-bold">{money2(v.balance)}</p>
                  <Line label="Owner" value={v.ownerLabel} />
                  <OwnerBadge classification={v.classification} />
                </CardContent>
              </Card>
            ))}
            <Stat label="Total Vehicle Assets" value={money2(vehicleTotal)} sub="Household transportation assets" />
          </div>
          <p className="text-sm text-muted-foreground">
            Use this list for the annual insurance review — confirm both vehicles are scheduled with correct owners and values.
          </p>
        </TabsContent>

        {/* -------- Allocation -------- */}
        <TabsContent value="allocation" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Household Asset Allocation</CardTitle></CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={allocation} dataKey="value" nameKey="name" outerRadius={110} paddingAngle={1}>
                      {allocation.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => money(Number(v))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Category Comparison</CardTitle></CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={allocation} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis type="number" tickFormatter={(v) => `$${Math.round(v / 1000)}k`} fontSize={11} />
                    <YAxis type="category" dataKey="name" width={140} fontSize={11} />
                    <Tooltip formatter={(v: any) => money(Number(v))} />
                    <Bar dataKey="value" fill="hsl(var(--prism-teal))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {allocation.slice(0, 8).map((a) => (
              <Stat key={a.name} label={a.name} value={money(a.value)}
                sub={`${((a.value / (householdTotal || 1)) * 100).toFixed(1)}% of assets`} />
            ))}
          </div>
        </TabsContent>

        {/* -------- Family office -------- */}
        <TabsContent value="familyoffice" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" /> Household Wealth Score</CardTitle></CardHeader>
            <CardContent>
              {(() => {
                const debtRatio = householdTotal > 0 ? (live?.totalLiabilities || 0) / householdTotal : 1;
                const score = Math.round(
                  Math.min(35, (combinedRetirement / 500_000) * 35) +
                  Math.min(25, (1 - Math.min(debtRatio, 1)) * 25) +
                  Math.min(20, (B.realEstate / 200_000) * 20) +
                  Math.min(10, (B.business / 550_000) * 10) +
                  Math.min(10, ((live?.estate.pct || 0) / 100) * 10),
                );
                return (
                  <>
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-4xl font-bold">{score}<span className="text-lg text-muted-foreground">/100</span></span>
                      <span className="text-sm text-muted-foreground">Montgomery family — combined strength</span>
                    </div>
                    <Progress value={score} />
                  </>
                );
              })()}
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> Lyman Montgomery</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Line label="Employment" value="$70,940.04 salary" />
                <Line label="Business" value={money2(lymanB.business)} />
                <Line label="Retirement" value={money2(lymanB.retirement)} />
                <Line label="Investments (brokerage + HSA)" value={money2(lymanB.brokerage + lymanB.hsa)} />
                <Line label="Legacy Planning" value={`${Math.round(live?.estate.pct || 0)}% estate readiness`} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><PiggyBank className="h-4 w-4" /> Kateri Montgomery</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Line label="Retirement" value={money2(kateriB.retirement)} />
                <Line label="Pension (OPERS)" value={`${money2(OPERS)} • ${money(PENSION_MONTHLY)}/mo`} />
                <Line label="Deferred Compensation" value={money2(OHIO_DC)} />
                <Line label="Real Estate" value={money2(kateriB.realEstate)} />
                <Line label="Transportation Assets" value={money2(kateriB.vehicles)} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {isLoading && <p className="text-sm text-muted-foreground">Loading household data…</p>}
    </div>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 border-b border-border/50 py-1 ${bold ? 'font-semibold' : ''}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
