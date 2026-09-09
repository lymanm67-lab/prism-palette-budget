import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, ArrowRight, Layers, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FundingLedger } from '@/components/wealth/FundingLedger';
import { useFreedCashSources, useFreedCashRedirects } from '@/hooks/use-freed-cash';
import { conversionMetrics } from '@/lib/freed-cash/conversion';
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  DEFAULT_ASSUMPTIONS,
  FundingSource,
  HORIZONS,
  WealthAssumptions,
  defaultFundingSources,
  duplicateWarnings,
  money,
  projectWealth,
  runScenarios,
  type FundCategory,
} from '@/lib/wealth/sourceOfFunds';

const SRC_KEY = 'prism.wealthProjection.sources.v1';
const CFG_KEY = 'prism.wealthProjection.assumptions.v1';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(fallback) ? parsed : { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

export default function WealthProjection() {
  const { data: fcSources = [] } = useFreedCashSources();
  const { data: fcRedirects = [] } = useFreedCashRedirects();

  const [assumptions, setAssumptions] = useState<WealthAssumptions>(() => load(CFG_KEY, DEFAULT_ASSUMPTIONS));
  const [sources, setSources] = useState<FundingSource[]>(() => load(SRC_KEY, defaultFundingSources()));
  const [horizon, setHorizon] = useState<number>(25);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    localStorage.setItem(CFG_KEY, JSON.stringify(assumptions));
  }, [assumptions]);
  useEffect(() => {
    localStorage.setItem(SRC_KEY, JSON.stringify(sources));
  }, [sources]);

  const freedCash = useMemo(() => conversionMetrics(fcSources, fcRedirects), [fcSources, fcRedirects]);

  // Seed the freed-cash line once from what is actually being redirected today.
  useEffect(() => {
    if (seeded || !fcSources.length) return;
    setSeeded(true);
    setSources((list) =>
      list.map((s) =>
        s.id === 'freed-cash' && s.monthly === 0
          ? { ...s, monthly: Math.round(freedCash.executedMonthly) }
          : s,
      ),
    );
  }, [seeded, fcSources.length, freedCash.executedMonthly]);

  const patchSource = useCallback((id: string, patch: Partial<FundingSource>) => {
    setSources((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const patchAssumptions = useCallback(
    (patch: Partial<WealthAssumptions>) => setAssumptions((a) => ({ ...a, ...patch })),
    [],
  );

  const projection = useMemo(
    () => projectWealth(sources, assumptions, assumptions.returnPct, horizon),
    [sources, assumptions, horizon],
  );
  const scenarios = useMemo(() => runScenarios(sources, assumptions), [sources, assumptions]);
  const warnings = useMemo(
    () => duplicateWarnings(sources, freedCash.executedMonthly),
    [sources, freedCash.executedMonthly],
  );

  const activeCategories = useMemo(
    () => CATEGORY_ORDER.filter((c) => (projection.byCategory[c] || 0) > 0),
    [projection],
  );

  const growthChart = projection.yearly.map((y) => ({
    year: y.year,
    'Money you put in': Math.round(y.cumulativeContributions + projection.startingAssets),
    'Investment growth': Math.round(y.cumulativeGrowth),
    Balance: Math.round(y.balance),
  }));

  const sourceChart = projection.yearly.map((y) => {
    const row: Record<string, number | string> = { year: y.year };
    for (const c of activeCategories) row[CATEGORY_LABELS[c]] = Math.round(y.byCategory[c] || 0);
    return row;
  });

  const monthlyNow = sources
    .filter((s) => s.enabled)
    .reduce((sum, s) => sum + (s.monthly || 0), 0);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Wealth projection &amp; where the money comes from</h1>
        <p className="text-sm text-muted-foreground">
          Every dollar in this projection is traced back to a real source — your paycheck, your employer, the
          spending you cut, released debt payments, raises and refunds — plus investment growth. Nothing is
          counted twice, and returns are assumptions, not promises.
        </p>
      </header>

      {warnings.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Check these before you trust the number
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {warnings.map((w, i) => (
              <p key={i} className="text-sm text-muted-foreground">
                {w.message}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Going in each month" value={money(monthlyNow)} hint="All sources turned on today" />
        <Stat label="Starting balance" value={money(projection.startingAssets)} hint="Already invested" />
        <Stat
          label={`Balance in ${horizon} years`}
          value={money(projection.ending)}
          hint={`At ${assumptions.returnPct}% a year`}
          highlight
        />
        <Stat
          label="Growth vs money in"
          value={`${money(projection.growth)} / ${money(projection.contributions)}`}
          hint="Growth is never credited to a source"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {HORIZONS.map((h) => (
          <Button key={h} size="sm" variant={horizon === h ? 'default' : 'outline'} onClick={() => setHorizon(h)}>
            {h} years
          </Button>
        ))}
        <Button size="sm" variant="ghost" asChild>
          <Link to="/planning/freed-cash">
            Freed Cash Engine <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
        <Button size="sm" variant="ghost" asChild>
          <Link to="/planning/investments">Investment plan</Link>
        </Button>
      </div>

      <Tabs defaultValue="scenarios">
        <TabsList className="flex-wrap">
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          <TabsTrigger value="sources">Source of funds</TabsTrigger>
          <TabsTrigger value="ledger">Funding ledger</TabsTrigger>
          <TabsTrigger value="assumptions">Assumptions</TabsTrigger>
        </TabsList>

        <TabsContent value="scenarios" className="space-y-4 pt-4">
          <div className="grid gap-3 lg:grid-cols-3">
            {scenarios.map((sc) => (
              <Card key={sc.key} className={sc.returnPct === assumptions.returnPct ? 'border-primary/40' : ''}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    {sc.label}
                    <Badge variant="secondary">{sc.returnPct}% / yr</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sc.byHorizon.map((h) => (
                    <div key={h.years} className="flex items-baseline justify-between rounded-lg border p-2">
                      <span className="text-xs text-muted-foreground">{h.years} years</span>
                      <span className="text-lg font-semibold">{money(h.ending)}</span>
                    </div>
                  ))}
                  <p className="text-[11px] text-muted-foreground">
                    Growth at {sc.byHorizon[0].years} yrs: {money(sc.byHorizon[0].growth)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-primary" />
                Money you put in vs investment growth
              </CardTitle>
              <CardDescription>
                The gap between the two lines is what the market did, not what you contributed.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthChart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={72} tickFormatter={(v) => money(Number(v))} />
                  <ReTooltip formatter={(v: number) => money(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area
                    type="monotone"
                    dataKey="Money you put in"
                    stackId="1"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.25)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Investment growth"
                    stackId="1"
                    stroke="hsl(160 60% 45%)"
                    fill="hsl(160 60% 45% / 0.25)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="space-y-4 pt-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {activeCategories.map((c) => (
              <Card key={c}>
                <CardContent className="space-y-1 p-4">
                  <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[c]}</p>
                  <p className="text-xl font-semibold">{money(projection.byCategory[c])}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {((projection.byCategory[c] / Math.max(1, projection.ending)) * 100).toFixed(1)}% of the
                    ending balance
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-4 w-4 text-primary" />
                Dollars in, by source, over time
              </CardTitle>
              <CardDescription>Growth is excluded here so each bar is real money added.</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceChart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={72} tickFormatter={(v) => money(Number(v))} />
                  <ReTooltip formatter={(v: number) => money(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {activeCategories.map((c) => (
                    <Bar
                      key={c}
                      dataKey={CATEGORY_LABELS[c]}
                      stackId="a"
                      fill={CATEGORY_COLORS[c as FundCategory]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger" className="pt-4">
          <FundingLedger sources={sources} totals={projection.bySource} onPatch={patchSource} />
        </TabsContent>

        <TabsContent value="assumptions" className="pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Assumptions</CardTitle>
              <CardDescription>
                Retirement money and self-directed money are kept apart. Your HSA is left out unless you turn
                it on.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Start month">
                  <Input
                    type="month"
                    value={assumptions.startMonth}
                    onChange={(e) => patchAssumptions({ startMonth: e.target.value || assumptions.startMonth })}
                  />
                </Field>
                <Field label="Your age today">
                  <Input
                    type="number"
                    value={assumptions.currentAge}
                    onChange={(e) => patchAssumptions({ currentAge: Number(e.target.value) || 0 })}
                  />
                </Field>
                <Field label="Expected return (%)">
                  <Input
                    type="number"
                    value={assumptions.returnPct}
                    onChange={(e) => patchAssumptions({ returnPct: Math.max(0, Number(e.target.value) || 0) })}
                  />
                </Field>
                <Field label="Retirement balance">
                  <Input
                    type="number"
                    value={assumptions.startingRetirement}
                    onChange={(e) =>
                      patchAssumptions({ startingRetirement: Math.max(0, Number(e.target.value) || 0) })
                    }
                  />
                </Field>
                <Field label="Self-directed balance">
                  <Input
                    type="number"
                    value={assumptions.startingSelfDirected}
                    onChange={(e) =>
                      patchAssumptions({ startingSelfDirected: Math.max(0, Number(e.target.value) || 0) })
                    }
                  />
                </Field>
                <Field label="HSA balance">
                  <Input
                    type="number"
                    value={assumptions.startingHsa}
                    onChange={(e) => patchAssumptions({ startingHsa: Math.max(0, Number(e.target.value) || 0) })}
                  />
                </Field>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label className="text-sm">Include the HSA in this projection</Label>
                  <p className="text-xs text-muted-foreground">
                    Off by default — HSA money is kept out of retirement totals.
                  </p>
                </div>
                <Switch
                  checked={assumptions.includeHsa}
                  onCheckedChange={(v) => patchAssumptions({ includeHsa: v })}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAssumptions(DEFAULT_ASSUMPTIONS);
                  setSources(defaultFundingSources());
                }}
              >
                Reset to defaults
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">
        This is a projection of your current strategy, not a guarantee. Returns are assumed, taxes and fees are
        not modelled, and money only counts once it has a real source.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? 'border-primary/40 bg-primary/5' : ''}>
      <CardContent className="space-y-1 p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
