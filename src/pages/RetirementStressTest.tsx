import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AssumptionsPanel } from '@/components/stress-test/AssumptionsPanel';
import { PercentileChart } from '@/components/stress-test/PercentileChart';
import { SensitivityTable } from '@/components/stress-test/SensitivityTable';
import { SuccessProbabilityCard } from '@/components/stress-test/SuccessProbabilityCard';
import { WorstCasePanel } from '@/components/stress-test/WorstCasePanel';
import { DisclaimerBlock } from '@/components/investment/DisclaimerBlock';
import {
  DEFAULT_GOALS,
  guardrailAdvice,
  type StressAssumptions,
  type StressGoals,
} from '@/lib/retirement/stressTest';
import {
  useStressAssumptionsSource,
  useStressRunner,
  useStressScenarios,
  useStressSnapshots,
} from '@/hooks/use-stress-test';
import { Play, Save, TrendingDown, TrendingUp, Minus, Activity } from 'lucide-react';

const money = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n).toLocaleString()}`;

const SLOTS = [
  { slot: 'base', name: 'Base Plan' },
  { slot: 'conservative', name: 'Conservative' },
  { slot: 'moderate', name: 'Moderate' },
  { slot: 'aggressive', name: 'Aggressive' },
];

export default function RetirementStressTest() {
  const { derived, isLoading, emergencyCash } = useStressAssumptionsSource();
  const { run, output, isRunning, error } = useStressRunner();
  const { scenarios, save, remove } = useStressScenarios();
  const { snapshots, add: addSnapshot } = useStressSnapshots();

  const [overrides, setOverrides] = useState<Partial<StressAssumptions>>({});
  const [goals, setGoals] = useState<StressGoals>(DEFAULT_GOALS);
  const [runs, setRuns] = useState(10_000);
  const [hasRun, setHasRun] = useState(false);

  const assumptions = useMemo<StressAssumptions>(() => ({ ...derived, ...overrides }), [derived, overrides]);

  useEffect(() => {
    document.title = 'Retirement Stress Test | PrismMoney';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        'content',
        'Monte Carlo retirement stress testing: success probability, sequence risk, inflation, long-term care and worst-case scenarios.',
      );
    }
  }, []);

  const doRun = () => {
    setHasRun(true);
    run(assumptions, goals, runs);
  };

  const base = output?.base;
  const guardrail = base ? guardrailAdvice(base) : null;

  return (
    <div className="container max-w-7xl space-y-6 py-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Retirement Stress Test</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Instead of assuming one average return every year, this runs your plan through thousands of different
          market, inflation, healthcare, longevity and shock scenarios — so you can see how well it holds up when
          reality gets messy.
        </p>
      </header>

      {/* Run controls */}
      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Simulations</p>
            <Select value={String(runs)} onValueChange={(v) => setRuns(Number(v))}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1000">1,000 (fast)</SelectItem>
                <SelectItem value="5000">5,000</SelectItem>
                <SelectItem value="10000">10,000 (full analysis)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={doRun} disabled={isRunning || isLoading}>
            <Play className="mr-1.5 h-4 w-4" />
            {isRunning ? 'Simulating…' : hasRun ? 'Re-run simulation' : 'Run stress test'}
          </Button>
          {base && (
            <>
              <Button
                variant="outline"
                onClick={() =>
                  save.mutate(
                    {
                      name: 'Base Plan',
                      slot: 'base',
                      assumptions,
                      goals,
                      results: {
                        successProbability: base.successProbability,
                        medianEnding: base.medianEnding,
                        p10Ending: base.p10Ending,
                        legacyProbability: base.legacyProbability,
                        medianDepletionAge: base.medianDepletionAge,
                        runs: base.runs,
                      },
                      runs,
                    },
                    { onSuccess: () => toast({ title: 'Scenario saved as Base Plan' }) },
                  )
                }
              >
                <Save className="mr-1.5 h-4 w-4" /> Save as scenario
              </Button>
              <Select
                onValueChange={(slot) => {
                  const meta = SLOTS.find((s) => s.slot === slot)!;
                  save.mutate(
                    {
                      name: meta.name,
                      slot,
                      assumptions,
                      goals,
                      results: {
                        successProbability: base.successProbability,
                        medianEnding: base.medianEnding,
                        p10Ending: base.p10Ending,
                        legacyProbability: base.legacyProbability,
                        medianDepletionAge: base.medianDepletionAge,
                        runs: base.runs,
                      },
                      runs,
                    },
                    { onSuccess: () => toast({ title: `Saved to ${meta.name}` }) },
                  );
                }}
              >
                <SelectTrigger className="w-52"><SelectValue placeholder="Save to comparison slot…" /></SelectTrigger>
                <SelectContent>
                  {SLOTS.map((s) => (
                    <SelectItem key={s.slot} value={s.slot}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() =>
                  addSnapshot.mutate(
                    {
                      portfolio_balance: assumptions.portfolioBalance + assumptions.hsaBalance,
                      monthly_contribution: (assumptions.employeeContribution + assumptions.employerContribution) / 12,
                      success_probability: base.successProbability,
                      legacy_probability: base.legacyProbability,
                      depletion_probability: base.depletionProbability,
                      assumptions,
                    },
                    { onSuccess: () => toast({ title: 'Annual review snapshot recorded' }) },
                  )
                }
              >
                <Activity className="mr-1.5 h-4 w-4" /> Record annual review
              </Button>
            </>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {isLoading && <Skeleton className="h-40 w-full" />}

      <AssumptionsPanel
        assumptions={assumptions}
        goals={goals}
        emergencyCash={emergencyCash}
        onChange={(patch) => setOverrides((p) => ({ ...p, ...patch }))}
        onGoalsChange={(patch) => setGoals((g) => ({ ...g, ...patch }))}
        onReset={() => setOverrides({})}
      />

      {isRunning && (
        <Card className="border-border/60 bg-card/60">
          <CardContent className="space-y-3 pt-6">
            <p className="text-sm text-muted-foreground">
              Running {runs.toLocaleString()} lifetime simulations plus every stress grid…
            </p>
            <Progress value={undefined} className="h-2 animate-pulse" />
          </CardContent>
        </Card>
      )}

      {base && output && (
        <>
          <SuccessProbabilityCard result={base} legacyTarget={goals.legacyTarget} legacyAge={goals.legacyTargetAge} />

          <PercentileChart result={base} lifeExpectancy={assumptions.lifeExpectancy} />

          {/* Income floor */}
          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Income Floor Analysis</CardTitle>
              <CardDescription>
                Guaranteed income is kept completely separate from portfolio withdrawals. This is how much of your
                essential retirement costs is covered before you touch investments.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Guaranteed income at retirement</p>
                <p className="text-xl font-bold tabular-nums">{money(base.guaranteedIncomeAtRetirement)}/yr</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Social Security + pension + other guaranteed sources</p>
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Essential expenses</p>
                <p className="text-xl font-bold tabular-nums">{money(base.essentialExpensesAtRetirement)}/yr</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Essentials + healthcare, inflated to retirement</p>
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Guaranteed Income Coverage Ratio</p>
                <p className="text-xl font-bold tabular-nums text-prism-teal">{base.guaranteedCoverageRatio.toFixed(0)}%</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Portfolio and HSA withdrawals fund the rest</p>
              </div>
            </CardContent>
          </Card>

          <SensitivityTable
            title="Sequence-of-Returns Risk"
            description="Losses early in retirement hurt far more than the same loss later. Each row forces a decline at a specific point relative to your retirement date."
            rows={output.sequence}
          />

          <SensitivityTable
            title="Historical Crisis Scenarios"
            description="Scenario models loosely inspired by past market environments. These are illustrations, not predictions."
            rows={output.crises}
          />

          <div className="grid gap-6 xl:grid-cols-2">
            <SensitivityTable
              title="Inflation Stress Test"
              description="Healthcare is allowed to run independently higher than general inflation."
              rows={output.inflation}
              firstColumnLabel="Inflation"
            />
            <SensitivityTable
              title="Long-Term Care Stress Test"
              description={`${assumptions.ltcYears} years of care beginning at age ${assumptions.ltcStartAge}, net of insurance benefit and any HSA applied.`}
              rows={output.ltc}
              firstColumnLabel="Care setting"
            />
            <SensitivityTable
              title="Retirement Timing"
              description="How the retirement date itself moves the odds."
              rows={output.retirementAge}
              firstColumnLabel="Timing"
            />
            <SensitivityTable
              title="Contribution Sensitivity"
              description="The marginal value of each additional dollar you invest monthly."
              rows={output.contributions}
              firstColumnLabel="Monthly contribution"
            />
            <SensitivityTable
              title="Spending Sensitivity"
              description="How retirement spending changes the outcome."
              rows={output.spending}
              firstColumnLabel="Spending level"
            />
          </div>

          {/* Guardrails */}
          {guardrail && (
            <Card className="border-border/60 bg-card/60 backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  {guardrail.tone === 'cut' ? (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  ) : guardrail.tone === 'raise' ? (
                    <TrendingUp className="h-4 w-4 text-prism-lime" />
                  ) : (
                    <Minus className="h-4 w-4 text-prism-teal" />
                  )}
                  Dynamic Guardrails — {guardrail.headline}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{guardrail.detail}</p>
                <p className="mt-2 text-xs text-muted-foreground">Nothing changes automatically — you approve any spending change yourself.</p>
              </CardContent>
            </Card>
          )}

          <WorstCasePanel assumptions={assumptions} goals={goals} />

          {/* Risks */}
          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top Risks to My Retirement Plan</CardTitle>
              <CardDescription>Ranked by projected damage to the median ending balance.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Risk</TableHead>
                    <TableHead className="text-right">Median impact</TableHead>
                    <TableHead className="text-right">Success impact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {output.risks.map((r) => (
                    <TableRow key={r.key}>
                      <TableCell>
                        <span className="font-medium">{r.label}</span>
                        <p className="text-xs text-muted-foreground">{r.explanation}</p>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-destructive">
                        {r.impactDollars < 0 ? `−${money(Math.abs(r.impactDollars))}` : money(r.impactDollars)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{r.impactProbability.toFixed(1)} pts</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recommended actions */}
          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">What Improves the Plan Most?</CardTitle>
              <CardDescription>
                {output.recommendations.alreadyStrong
                  ? 'Your plan already succeeds in nearly every simulation — no changes are necessary. These levers are listed for reference only.'
                  : 'Ranked by how much each action raises your probability of success.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {output.recommendations.actions.length === 0 && (
                <p className="text-sm text-muted-foreground">No adjustment materially improves the plan.</p>
              )}
              {output.recommendations.actions.map((a, i) => (
                <div key={a.label} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 p-3">
                  <div>
                    <p className="text-sm font-medium">{i + 1}. {a.label}</p>
                    <p className="text-xs text-muted-foreground">{a.detail}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-prism-lime">+{a.successGain.toFixed(1)} pts</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{money(a.medianGain)} median</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Technical details */}
          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardContent className="pt-4">
              <Accordion type="single" collapsible>
                <AccordionItem value="tech" className="border-none">
                  <AccordionTrigger className="text-sm">Technical details</AccordionTrigger>
                  <AccordionContent className="space-y-1 text-xs text-muted-foreground">
                    <p>Expected return: {assumptions.expectedReturnPct}% (haircut {assumptions.returnHaircutPct}%) · Standard deviation: {assumptions.volatilityPct}%</p>
                    <p>Simulations: {base.runs.toLocaleString()} · Return distribution: normal (Box–Muller) drawn independently each year, seeded for reproducibility</p>
                    <p>Inflation — general {assumptions.inflationPct}%, housing {assumptions.housingInflationPct}%, healthcare {assumptions.healthcareInflationPct}%, LTC {assumptions.ltcInflationPct}%, travel {assumptions.travelInflationPct}%</p>
                    <p>Percentile methodology: balances sorted per simulated year; 10th/25th/50th/75th/90th taken by index position across all runs</p>
                    <p>Withdrawals are grossed up by an effective {assumptions.effectiveTaxRatePct}% tax rate; guaranteed income is untaxed in this model and never mixed with portfolio draws. HSA is tracked as its own sleeve and drawn last. Emergency cash is excluded from invested assets.</p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </>
      )}

      {/* Scenario comparison */}
      {scenarios.length > 0 && (
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Scenario Comparison</CardTitle>
            <CardDescription>Saved scenarios side by side.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scenario</TableHead>
                  <TableHead className="text-right">Avg return</TableHead>
                  <TableHead className="text-right">Success</TableHead>
                  <TableHead className="text-right">Median ending</TableHead>
                  <TableHead className="text-right">10th percentile</TableHead>
                  <TableHead className="text-right">Legacy odds</TableHead>
                  <TableHead className="text-right">Depletion age</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {scenarios.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.assumptions?.expectedReturnPct ?? '—'}%</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {s.results?.successProbability != null ? `${Number(s.results.successProbability).toFixed(1)}%` : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{s.results?.medianEnding != null ? money(Number(s.results.medianEnding)) : '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.results?.p10Ending != null ? money(Number(s.results.p10Ending)) : '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.results?.legacyProbability != null ? `${Number(s.results.legacyProbability).toFixed(1)}%` : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.results?.medianDepletionAge ? <Badge variant="outline" className="text-destructive">{s.results.medianDepletionAge}</Badge> : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => remove.mutate(s.id)}>Remove</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Annual review */}
      {snapshots.length > 0 && (
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Annual Monte Carlo Review</CardTitle>
            <CardDescription>Whether the plan is getting stronger or weaker over time.</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={snapshots.map((s) => ({
                date: s.snapshot_date,
                success: Number(s.success_probability),
                legacy: Number(s.legacy_probability),
              }))}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="success" name="Success %" stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line type="monotone" dataKey="legacy" name="Legacy %" stroke="hsl(var(--prism-amber))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Monte Carlo simulations illustrate a range of possible outcomes based on assumptions. They do not
          predict future investment returns or guarantee retirement results.
        </p>
        <DisclaimerBlock />
      </div>
    </div>
  );
}
