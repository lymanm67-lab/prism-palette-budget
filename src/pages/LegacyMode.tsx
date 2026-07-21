import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLegacyWorth, useLegacyWorthHistory, useFinancialFreedom, useUserProgression } from '@/hooks/use-financial-os';
import { LIFE_STAGE_LABELS } from '@/lib/legacy/legacyWorthEngine';
import { BELT_META } from '@/lib/progression/beltRules';
import { Sparkles, Target, Clock, TrendingUp, Users, ScrollText, Layers, AlertCircle, Pencil, HelpCircle } from 'lucide-react';
import { PageExplainer } from '@/components/PageExplainer';

const FACTOR_EDIT_ROUTES: Record<string, { to: string; hint: string }> = {
  net_worth:        { to: '/net-worth',             hint: 'View Net Worth breakdown (Assets − Liabilities)' },
  retirement:       { to: '/planning/investments',  hint: 'Raise annual contribution or target' },
  passive_income:   { to: '/planning/investments',  hint: 'Add dividend / rental income sources' },
  emergency_fund:   { to: '/accounts',              hint: 'Grow liquid savings to 6× monthly expenses' },
  insurance:        { to: '/legacy/family',         hint: 'Insurance Coverage tab — add policies' },
  debt:             { to: '/debts',                 hint: 'Update balances & APR; attack high-APR first' },
  estate:           { to: '/legacy/family',         hint: 'Estate Checklist tab — check off items' },
  trust:            { to: '/legacy/family',         hint: 'Family Trust tab — draft & fund' },
  tax:              { to: '/retirement-optimizer',  hint: 'Roth advisor + HSA intelligence' },
  diversification:  { to: '/investments',           hint: 'Reduce single-position concentration' },
  giving:           { to: '/transactions',          hint: 'Tag charitable transactions' },
  literacy:         { to: '/kungfoo',               hint: 'Earn the next belt — complete milestones' },
  governance:       { to: '/legacy/family',         hint: 'Constitution + Annual Meeting tabs' },
  real_estate_biz:  { to: '/accounts',              hint: 'Add real estate equity / business assets' },
};
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line, Tooltip, XAxis, YAxis } from 'recharts';
import NetWorthSummaryCard from '@/components/NetWorthSummaryCard';

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export default function LegacyMode() {
  const { data: lw, isLoading } = useLegacyWorth();
  const { data: history } = useLegacyWorthHistory(90);
  const ff = useFinancialFreedom();
  const { data: progression } = useUserProgression();

  const radarData = useMemo(() => (lw?.factors || []).map(f => ({ factor: f.label.split(' ')[0], score: f.score })), [lw]);
  const trendData = useMemo(() => (history || []).map((h: any) => ({ date: h.snapshot_date.slice(5), score: Number(h.score) })), [history]);

  if (isLoading) return <div className="p-6 text-muted-foreground">Computing Legacy Worth…</div>;
  if (!lw) return <div className="p-6">Connect accounts to see your Legacy Worth.</div>;

  const stage = LIFE_STAGE_LABELS[lw.lifeStage];
  const belt = progression?.current_belt ?? 'white';
  const beltMeta = BELT_META[belt as keyof typeof BELT_META];

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Compliance banner */}
      <div className="rounded-md border border-border/40 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
        Educational planning only. Not legal, tax, or investment advice — consult qualified professionals.
      </div>

      <PageExplainer
        title="How to read this page (with examples)"
        sections={[
          {
            heading: 'What Legacy Worth™ measures',
            body: (
              <p>
                A 0–1000 signature score across 14 factors — net worth, emergency fund, insurance, trust
                readiness, family governance, debt health, and more. Higher = more resilient, transferable
                wealth across generations.
              </p>
            ),
          },
          {
            heading: 'The Belt & Stage badges',
            body: (
              <ul className="list-disc pl-5 space-y-1">
                <li><b className="text-foreground">Stage</b> — where you are on the wealth journey (Builder → Steward → Multi-Gen).</li>
                <li><b className="text-foreground">Belt</b> — martial-arts style rank tied to your score (White → Black).</li>
              </ul>
            ),
          },
          {
            heading: 'How to update a factor',
            body: (
              <p>
                Click the <b className="text-foreground">Edit</b> button on any factor tile — it deep-links
                to the source page (Accounts, Debts, Net Worth, Insurance, Trust, etc.). Scores refresh
                automatically once the underlying data changes.
              </p>
            ),
          },
          {
            heading: 'Example',
            body: (
              <p>
                Adding a $500k term life policy on the Insurance page bumps <i>Insurance Protection</i>{' '}
                from 0 → ~64/100, which lifts your overall Legacy Worth™ by ~30–50 points.
              </p>
            ),
          },
        ]}
      />

      {/* Hero */}
      <Card className="bg-gradient-to-br from-prism-teal/10 via-prism-amber/5 to-transparent border-prism-teal/30">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Your Signature Metric</p>
              <div className="flex items-baseline gap-3">
                <div className="text-6xl md:text-7xl font-bold bg-gradient-to-br from-prism-teal to-prism-amber bg-clip-text text-transparent">
                  {Math.round(lw.score)}
                </div>
                <div className="text-lg text-muted-foreground">/ 1000</div>
              </div>
              <h1 className="text-2xl font-bold mt-2">Legacy Worth™</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">{stage.label}</Badge>
                <Badge className="text-xs" style={{ background: beltMeta.color, color: '#000' }}>
                  🥋 {beltMeta.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-3 max-w-md">{stage.description}</p>
            </div>
            <div className="text-right">
              <Button asChild variant="outline" size="sm">
                <Link to="/legacy/family">
                  <Users className="h-3.5 w-3.5 mr-1.5" /> Family Legacy Suite
                </Link>
              </Button>
              <div className="mt-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/kungfoo"><Layers className="h-3.5 w-3.5 mr-1.5" /> KUNG FOO Plan</Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Net Worth (Assets − Liabilities) */}
      <NetWorthSummaryCard />

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile icon={TrendingUp} label="Net Worth" value={fmt(lw.netWorth)} />
        <KpiTile icon={Target} label="Financial Freedom" value={`${((ff.data?.fiPercentage ?? 0) * 100).toFixed(1)}%`} sub={`${Math.round((ff.data?.currentPortfolio ?? 0)).toLocaleString()} / ${Math.round((ff.data?.targetPortfolio ?? 0)).toLocaleString()}`} />
        <KpiTile icon={Clock} label="Days Until Freedom" value={ff.data?.daysUntilFreedom != null ? ff.data.daysUntilFreedom.toLocaleString() : '—'} sub={ff.data?.yearsUntilOptional ? `${ff.data.yearsUntilOptional.toFixed(1)} years` : ''} />
        <KpiTile icon={Sparkles} label="Projected Estate at 85" value={fmt(lw.estateAt85)} />
      </div>

      {/* Trend + radar */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">90-day Legacy Worth trend</CardTitle></CardHeader>
          <CardContent>
            {trendData.length > 1 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={[0, 1000]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--prism-teal))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-6">Come back tomorrow — first data point captured today.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">14-factor breakdown</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="factor" tick={{ fontSize: 9 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 8 }} />
                <Radar dataKey="score" stroke="hsl(var(--prism-amber))" fill="hsl(var(--prism-amber))" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* How to use */}
      <Card className="border-prism-sky/30 bg-prism-sky/5">
        <CardContent className="p-4 flex gap-3">
          <HelpCircle className="h-5 w-5 text-prism-sky shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-semibold">How to raise your Legacy Worth</p>
            <p className="text-xs text-muted-foreground">
              This score is auto-calculated from data across the app. To update any factor, click its <span className="font-medium text-foreground">Edit</span> button below — it takes you to the exact page where that data lives. Your score refreshes on your next visit and a daily snapshot feeds the 90-day trend.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Factor drilldown — all 14, editable */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All 14 factors — edit any source</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...lw.factors].sort((a, b) => a.score - b.score).map(f => {
            const route = FACTOR_EDIT_ROUTES[f.key];
            return (
              <div key={f.key} className="space-y-1.5 rounded-md border border-border/40 p-3">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <div className="font-medium">{f.label}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{Math.round(f.score)}/100 · +{f.weight} pts</span>
                    {route && (
                      <Button asChild size="sm" variant="outline" className="h-7 px-2 text-xs">
                        <Link to={route.to}><Pencil className="h-3 w-3 mr-1" />Edit</Link>
                      </Button>
                    )}
                  </div>
                </div>
                <Progress value={f.score} className="h-1.5" />
                <p className="text-xs text-muted-foreground pl-1">→ {route?.hint ?? f.next}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid gap-3 md:grid-cols-3">
        <Link to="/kungfoo" className="block">
          <Card className="hover:border-prism-teal/60 transition-colors">
            <CardContent className="p-4 flex items-start gap-3">
              <Layers className="h-5 w-5 text-prism-teal shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">KUNG FOO™ Order of Operations</p>
                <p className="text-xs text-muted-foreground mt-0.5">Where every dollar goes next.</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/legacy/family" className="block">
          <Card className="hover:border-prism-teal/60 transition-colors">
            <CardContent className="p-4 flex items-start gap-3">
              <ScrollText className="h-5 w-5 text-prism-amber shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Family Legacy Suite</p>
                <p className="text-xs text-muted-foreground mt-0.5">Trust · Constitution · Estate · Simulator.</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/legacy/belts" className="block">
          <Card className="hover:border-prism-teal/60 transition-colors">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-prism-sky shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Belt Progression</p>
                <p className="text-xs text-muted-foreground mt-0.5">Earn the next rank.</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

function KpiTile({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          <span>{label}</span>
        </div>
        <div className="text-xl md:text-2xl font-bold mt-1">{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}
