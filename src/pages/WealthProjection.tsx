import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight, RefreshCw, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FlowStrip } from '@/components/wealth/FlowStrip';
import { ScenarioControls } from '@/components/wealth/ScenarioControls';
import { ContributionTimeline, TodayComparison } from '@/components/wealth/ContributionTimeline';
import { ContributionVsGrowth, SourceOfFundsCards } from '@/components/wealth/SourceOfFundsCards';
import { YearlyFundingLedger } from '@/components/wealth/YearlyFundingLedger';
import { FlowChecksPanel } from '@/components/wealth/FlowChecksPanel';
import { useWealthProjection } from '@/hooks/use-wealth-projection';
import { CONFIDENCE_LABELS, money, money2 } from '@/lib/wealth/sourceOfFunds';
import { REFUND_DESTINATION_LABELS } from '@/lib/wealth/taxRefundPool';

export default function WealthProjection() {
  const p = useWealthProjection();

  useEffect(() => {
    document.title = 'Wealth Projection & Source of Funds | PrismMoney';
  }, []);

  const firstMonth = p.result.months[0];
  const growthChart = p.result.years.map((y) => ({
    year: y.year,
    'Money you put in': Math.round(
      p.result.startingAssets +
        p.result.years
          .filter((x) => x.year <= y.year)
          .reduce((s, x) => s + x.invested, 0),
    ),
    'Investment growth': Math.round(
      p.result.years.filter((x) => x.year <= y.year).reduce((s, x) => s + x.growth, 0),
    ),
  }));

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Wealth Projection and Source of Funds</h1>
        <p className="text-sm text-muted-foreground">
          See where every invested dollar comes from, where flexible cash goes first, and how the plan may
          compound over time.
        </p>
      </header>

      <FlowStrip />

      <FlowChecksPanel checks={p.checks} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={`Going in ${firstMonth ? monthLabel(firstMonth.month) : 'first month'}`}
          value={money2(firstMonth?.investedTotal ?? 0)}
          hint={`First month of the plan · core ${money2(firstMonth?.coreTotal ?? 0)} + net freed cash ${money2(
            firstMonth?.netInvestableFreedCash ?? 0,
          )}`}
        />

        <Stat
          label="Starting balance"
          value={money(p.result.startingAssets)}
          hint={`${p.assumptions.starting.source} · updated ${p.assumptions.starting.lastUpdated} · ${
            CONFIDENCE_LABELS[p.assumptions.starting.status]
          }`}
        />
        <Stat
          label={`Combined invested assets in ${p.horizon} years`}
          value={money(p.result.ending)}
          hint={`${p.returnPct}% a year · ${p.result.monthCount} months`}
          highlight
        />
        <Stat
          label="Contributions vs growth"
          value={`${money(p.result.contributions)} / ${money(p.result.growth)}`}
          hint="Growth is never credited to a source"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={p.syncFromApp}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Pull latest app numbers
        </Button>
        <Button size="sm" variant="ghost" asChild>
          <Link to="/planning/freed-cash">
            Freed Cash Engine <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
        <Button size="sm" variant="ghost" asChild>
          <Link to="/planning/investments">Investment plan</Link>
        </Button>
        <Button size="sm" variant="ghost" asChild>
          <Link to="/reserves">Emergency fund &amp; buffer</Link>
        </Button>
      </div>

      <ScenarioControls
        strategy={p.strategy}
        onStrategy={p.setStrategy}
        returnPct={p.returnPct}
        onReturn={p.setReturnPct}
        horizon={p.horizon}
        onHorizon={p.setHorizon}
      />

      <Tabs defaultValue="timeline">
        <TabsList className="flex-wrap">
          <TabsTrigger value="timeline">Contribution rate</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          <TabsTrigger value="sources">Source of funds</TabsTrigger>
          <TabsTrigger value="ledger">Funding ledger</TabsTrigger>
          <TabsTrigger value="refunds">Tax refund pool</TabsTrigger>
          <TabsTrigger value="assumptions">Assumptions</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4 pt-4">
          <ContributionTimeline milestones={p.milestones} firstMonth={firstMonth} />
          <TodayComparison
            today={p.todayResult.ending}
            planned={p.result.ending}
            horizon={p.horizon}
          />
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-4 pt-4">
          <div className="grid gap-3 lg:grid-cols-4">
            {p.grid.map((g) => (
              <Card key={g.returnPct} className={g.returnPct === p.returnPct ? 'border-primary/40' : ''}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    {g.returnPct}% a year
                    <Badge variant="secondary">Illustrative</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {g.cells.map((c) => (
                    <div key={c.years} className="flex items-baseline justify-between rounded-lg border p-2">
                      <span className="text-xs text-muted-foreground">{c.years} yrs</span>
                      <span className="text-sm font-semibold">{money(c.ending)}</span>
                    </div>
                  ))}
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
              <CardDescription>The gap is what the market did, not what you contributed.</CardDescription>
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
          <SourceOfFundsCards result={p.result} />
          <ContributionVsGrowth result={p.result} />
        </TabsContent>

        <TabsContent value="ledger" className="pt-4">
          <YearlyFundingLedger result={p.result} />
        </TabsContent>

        <TabsContent value="refunds" className="space-y-3 pt-4">
          {p.refunds.map((r) => (
            <Card key={r.year} className={r.overAllocated > 0 ? 'border-destructive/40 bg-destructive/5' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{r.year} tax refund pool</CardTitle>
                <CardDescription>
                  Refund {money2(r.refundAmount)} · assigned {money2(r.assigned)} · unassigned{' '}
                  {money2(r.unassigned)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                {(p.refundYears.find((y) => y.year === r.year)?.assignments ?? []).map((a) => (
                  <div key={a.id} className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {REFUND_DESTINATION_LABELS[a.destination]}
                      {a.label ? ` — ${a.label}` : ''}
                    </span>
                    <span className="tabular-nums">{money2(a.amount)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-border/60 pt-1.5 font-medium">
                  <span>Invested from this refund</span>
                  <span className="tabular-nums">{money2(r.investingMonthly)}/mo</span>
                </div>
                {r.overAllocated > 0 && (
                  <p className="text-xs text-destructive">
                    Over-allocated by {money2(r.overAllocated)} — the buffer and investing cannot use the
                    same refund dollars.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="assumptions" className="pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Assumptions and starting balance</CardTitle>
              <CardDescription>
                Retirement, HSA and taxable money stay in separate buckets. Nothing here changes on its own.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Projection start">
                  <Input
                    type="month"
                    value={p.assumptions.startMonth}
                    onChange={(e) =>
                      p.patchAssumptions({ startMonth: e.target.value || p.assumptions.startMonth })
                    }
                  />
                </Field>
                <Field label="Your age today">
                  <Input
                    type="number"
                    value={p.assumptions.currentAge}
                    onChange={(e) => p.patchAssumptions({ currentAge: Number(e.target.value) || 0 })}
                  />
                </Field>
                <Field label="Buffer target">
                  <Input
                    type="number"
                    value={p.assumptions.bufferTarget}
                    onChange={(e) =>
                      p.patchAssumptions({ bufferTarget: Math.max(0, Number(e.target.value) || 0) })
                    }
                  />
                </Field>
                <Field label="Retirement balance">
                  <Input
                    type="number"
                    value={p.assumptions.starting.retirement}
                    onChange={(e) =>
                      p.patchAssumptions({
                        starting: {
                          ...p.assumptions.starting,
                          retirement: Math.max(0, Number(e.target.value) || 0),
                          manualOverride: true,
                          lastUpdated: new Date().toISOString().slice(0, 10),
                        },
                      })
                    }
                  />
                </Field>
                <Field label="Taxable / self-directed balance">
                  <Input
                    type="number"
                    value={p.assumptions.starting.taxable}
                    onChange={(e) =>
                      p.patchAssumptions({
                        starting: {
                          ...p.assumptions.starting,
                          taxable: Math.max(0, Number(e.target.value) || 0),
                          manualOverride: true,
                          lastUpdated: new Date().toISOString().slice(0, 10),
                        },
                      })
                    }
                  />
                </Field>
                <Field label="HSA balance">
                  <Input
                    type="number"
                    value={p.assumptions.starting.hsa}
                    onChange={(e) =>
                      p.patchAssumptions({
                        starting: {
                          ...p.assumptions.starting,
                          hsa: Math.max(0, Number(e.target.value) || 0),
                          manualOverride: true,
                          lastUpdated: new Date().toISOString().slice(0, 10),
                        },
                      })
                    }
                  />
                </Field>
                <Field label="Freed cash run rate (monthly)">
                  <Input
                    type="number"
                    value={p.timeline.freedCashBaselineMonthly}
                    onChange={(e) =>
                      p.patchTimeline({ freedCashBaselineMonthly: Math.max(0, Number(e.target.value) || 0) })
                    }
                  />
                </Field>
                <Field label="Buffer balance today">
                  <Input
                    type="number"
                    value={p.assumptions.bufferStartingBalance}
                    onChange={(e) =>
                      p.patchAssumptions({ bufferStartingBalance: Math.max(0, Number(e.target.value) || 0) })
                    }
                  />
                </Field>
                <Field label="Monthly buffer contribution">
                  <Input
                    type="number"
                    value={p.timeline.bufferMonthly}
                    onChange={(e) =>
                      p.patchTimeline({ bufferMonthly: Math.max(0, Number(e.target.value) || 0) })
                    }
                  />
                </Field>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label className="text-sm">Include the HSA in the combined total</Label>
                  <p className="text-xs text-muted-foreground">
                    HSA contributions are only counted when the HSA balance is included.
                  </p>
                </div>
                <Switch
                  checked={p.assumptions.includeHsa}
                  onCheckedChange={(v) => p.patchAssumptions({ includeHsa: v })}
                />
              </div>

              <div className="rounded-lg border p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Freed cash and buffer, as the app has them</p>
                <p>
                  Freed Cash Engine run rate {money2(p.freedCashLive.runRate)}/mo · redirected{' '}
                  {money2(p.freedCashLive.executedMonthly)}/mo · buffer {money2(p.bufferLive.balance)} of{' '}
                  {money2(p.bufferLive.target)}
                </p>
              </div>

              <Button variant="outline" size="sm" onClick={p.reset}>
                Reset to defaults
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">
        This models your current strategy, not a guarantee. Returns are illustrative, taxes and fees are not
        modelled, forgiven debt is never treated as an asset, and money only counts once it has a real source.
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
