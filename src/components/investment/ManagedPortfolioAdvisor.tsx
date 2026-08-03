import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, TrendingUp, TrendingDown, Minus, ShieldCheck } from 'lucide-react';
import { useInvestmentHoldings } from '@/hooks/use-investment-data';
import { formatCurrencyFull } from '@/lib/investment/projection';
import {
  DEFAULT_ANSWERS,
  MODEL_PORTFOLIOS,
  analyzePortfolio,
  buildRebalanceSteps,
  computeFeeDrag,
  scoreRisk,
  type ProfilerAnswers,
  type RiskLevel,
} from '@/lib/investment/portfolioModels';

const pct = (n: number) => `${n.toFixed(1)}%`;
const bps = (n: number) => `${(n * 100).toFixed(2)}%`;

export function ManagedPortfolioAdvisor({ plan }: { plan?: any }) {
  const { data: holdings = [], isLoading } = useInvestmentHoldings();

  const [answers, setAnswers] = useState<ProfilerAnswers>(() => ({
    ...DEFAULT_ANSWERS,
    horizonYears:
      plan?.current_age && plan?.retirement_age
        ? Math.max(1, Number(plan.retirement_age) - Number(plan.current_age))
        : DEFAULT_ANSWERS.horizonYears,
  }));
  const [overrideLevel, setOverrideLevel] = useState<RiskLevel | null>(null);
  const [grossReturn, setGrossReturn] = useState(8);
  const [annualContribution, setAnnualContribution] = useState(6000);

  const { score, level } = useMemo(() => scoreRisk(answers), [answers]);
  const activeLevel = overrideLevel ?? level;
  const model = MODEL_PORTFOLIOS[activeLevel];

  const analysis = useMemo(() => analyzePortfolio(holdings as any[], model), [holdings, model]);
  const steps = useMemo(() => buildRebalanceSteps(analysis, holdings as any[]), [analysis, holdings]);
  const feeDrag = useMemo(
    () =>
      computeFeeDrag(
        analysis.total,
        annualContribution,
        grossReturn / 100,
        answers.horizonYears,
        analysis.currentEr,
        analysis.modelEr,
      ),
    [analysis, annualContribution, grossReturn, answers.horizonYears],
  );

  const set = <K extends keyof ProfilerAnswers>(k: K, v: ProfilerAnswers[K]) =>
    setAnswers((a) => ({ ...a, [k]: v }));

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Educational only — not investment advice.</strong> PrismMoney™ does not hold assets,
          execute trades, or manage money. Model portfolios are illustrative allocations; expense
          ratios are estimated when fund data is unavailable. Confirm anything here with a licensed
          fiduciary before acting.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">1. Risk Profile</TabsTrigger>
          <TabsTrigger value="model">2. Model</TabsTrigger>
          <TabsTrigger value="drift">3. Drift</TabsTrigger>
          <TabsTrigger value="fees">4. Fee Drag</TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------ 1. profiler */}
        <TabsContent value="profile" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Risk Profiler</CardTitle>
              <CardDescription>Five inputs determine your recommended model portfolio.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Years until you need this money: <strong>{answers.horizonYears}</strong></Label>
                <Slider
                  value={[answers.horizonYears]}
                  min={1}
                  max={40}
                  step={1}
                  onValueChange={([v]) => set('horizonYears', v)}
                />
              </div>

              <div className="space-y-2">
                <Label>
                  If your portfolio dropped 30% in a year, you would:{' '}
                  <strong>
                    {['Sell everything', 'Sell some', 'Hold and wait', 'Keep contributing', 'Buy more'][answers.lossTolerance - 1]}
                  </strong>
                </Label>
                <Slider
                  value={[answers.lossTolerance]}
                  min={1}
                  max={5}
                  step={1}
                  onValueChange={([v]) => set('lossTolerance', v)}
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Income stability:{' '}
                  <strong>{['Very volatile', 'Volatile', 'Moderate', 'Stable', 'Very stable'][answers.incomeStability - 1]}</strong>
                </Label>
                <Slider
                  value={[answers.incomeStability]}
                  min={1}
                  max={5}
                  step={1}
                  onValueChange={([v]) => set('incomeStability', v)}
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Investing experience:{' '}
                  <strong>{['None', 'Limited', 'Some', 'Comfortable', 'Extensive'][answers.experience - 1]}</strong>
                </Label>
                <Slider
                  value={[answers.experience]}
                  min={1}
                  max={5}
                  step={1}
                  onValueChange={([v]) => set('experience', v)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cushion">Emergency fund (months of expenses)</Label>
                <Input
                  id="cushion"
                  type="number"
                  min={0}
                  max={24}
                  value={answers.cashCushionMonths}
                  onChange={(e) => set('cashCushionMonths', Number(e.target.value) || 0)}
                  className="max-w-[140px]"
                />
              </div>

              <div className="rounded-lg border bg-muted/40 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Recommended model</p>
                    <p className="text-xl font-semibold">{MODEL_PORTFOLIOS[level].name}</p>
                    <p className="text-xs text-muted-foreground">Risk score {score} / 5.00 (level {level})</p>
                  </div>
                  <ShieldCheck className="h-8 w-8 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------ 2. models */}
        <TabsContent value="model" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Your profile suggests <strong>{MODEL_PORTFOLIOS[level].name}</strong>. You can compare and
            select a different model to analyze against.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {([1, 2, 3, 4, 5] as RiskLevel[]).map((lv) => {
              const m = MODEL_PORTFOLIOS[lv];
              const selected = lv === activeLevel;
              return (
                <Card
                  key={lv}
                  role="button"
                  tabIndex={0}
                  onClick={() => setOverrideLevel(lv)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setOverrideLevel(lv);
                    }
                  }}
                  className={`cursor-pointer transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                    selected ? 'border-primary shadow-md' : 'hover:border-primary/50'
                  }`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-sm">{m.name}</CardTitle>
                      <div className="flex gap-1">
                        {lv === level && <Badge variant="secondary" className="text-[10px]">Suggested</Badge>}
                        {selected && <Badge className="text-[10px]">Selected</Badge>}
                      </div>
                    </div>
                    <CardDescription className="text-xs">{m.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {m.sleeves.map((s) => (
                      <div key={s.symbol} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            {s.symbol} · {s.name}
                          </span>
                          <span className="font-medium">{s.weight}%</span>
                        </div>
                        <Progress value={s.weight} className="h-1.5" />
                      </div>
                    ))}
                    <p className="pt-1 text-xs text-muted-foreground">
                      Blended expense ratio: <strong>{bps(m.blendedEr)}</strong>
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ------------------------------------------------ 3. drift */}
        <TabsContent value="drift" className="mt-4 space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Drift vs {model.name}</CardTitle>
              <CardDescription>
                Your real holdings ({formatCurrencyFull(analysis.total)}) mapped to asset classes.
                Tolerance band: ±5 percentage points.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading holdings…</p>
              ) : analysis.total === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No investment holdings found. Connect a brokerage or add holdings to see drift analysis.
                </p>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    {analysis.needsRebalance ? (
                      <Badge variant="destructive">Rebalance suggested · max drift {pct(analysis.maxAbsDrift)}</Badge>
                    ) : (
                      <Badge variant="secondary">Within tolerance · max drift {pct(analysis.maxAbsDrift)}</Badge>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="py-2 text-left">Asset class</th>
                          <th className="py-2 text-right">Actual</th>
                          <th className="py-2 text-right">Current %</th>
                          <th className="py-2 text-right">Target %</th>
                          <th className="py-2 text-right">Drift</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.rows.map((r) => (
                          <tr key={r.cls} className="border-b last:border-0">
                            <td className="py-2">{r.label}</td>
                            <td className="py-2 text-right">{formatCurrencyFull(r.actualValue)}</td>
                            <td className="py-2 text-right">{pct(r.actualPct)}</td>
                            <td className="py-2 text-right text-muted-foreground">{pct(r.targetPct)}</td>
                            <td className="py-2 text-right">
                              <span
                                className={`inline-flex items-center gap-1 ${
                                  r.status === 'on_target'
                                    ? 'text-muted-foreground'
                                    : r.status === 'over'
                                      ? 'text-destructive'
                                      : 'text-primary'
                                }`}
                              >
                                {r.status === 'on_target' ? (
                                  <Minus className="h-3 w-3" />
                                ) : r.status === 'over' ? (
                                  <TrendingUp className="h-3 w-3" />
                                ) : (
                                  <TrendingDown className="h-3 w-3" />
                                )}
                                {r.driftPct > 0 ? '+' : ''}
                                {pct(r.driftPct)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {steps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Suggested adjustments</CardTitle>
                <CardDescription>
                  Tax-location aware: bonds and REITs are placed in tax-deferred accounts first.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {steps.map((s) => (
                  <div key={`${s.action}-${s.cls}`} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        {s.action === 'trim' ? 'Reduce' : 'Add'} {s.label}
                      </span>
                      <Badge variant={s.action === 'trim' ? 'destructive' : 'secondary'}>
                        {formatCurrencyFull(s.amount)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{s.note}</p>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  Where possible, rebalance by directing <em>new</em> contributions rather than selling —
                  it avoids capital-gains tax in taxable accounts.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ------------------------------------------------ 4. fee drag */}
        <TabsContent value="fees" className="mt-4 space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fee Drag Over {answers.horizonYears} Years</CardTitle>
              <CardDescription>
                Your estimated blended expense ratio vs the {model.name} model, compounded.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="gross">Gross annual return (%)</Label>
                  <Input
                    id="gross"
                    type="number"
                    step="0.1"
                    value={grossReturn}
                    onChange={(e) => setGrossReturn(Number(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contrib">Annual contributions ($)</Label>
                  <Input
                    id="contrib"
                    type="number"
                    step="100"
                    value={annualContribution}
                    onChange={(e) => setAnnualContribution(Number(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Your blended ER</p>
                  <p className="text-lg font-semibold">{bps(feeDrag.currentEr)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrencyFull(feeDrag.annualFeesToday)} / yr today
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Model ER</p>
                  <p className="text-lg font-semibold">{bps(feeDrag.modelEr)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrencyFull(feeDrag.annualFeesModel)} / yr today
                  </p>
                </div>
                <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
                  <p className="text-xs text-muted-foreground">Projected difference</p>
                  <p className="text-lg font-semibold">{formatCurrencyFull(feeDrag.lifetimeSavings)}</p>
                  <p className="text-xs text-muted-foreground">
                    {feeDrag.lifetimeSavings >= 0 ? 'saved by' : 'lost by'} switching to the model
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2">Ending balance — current funds</td>
                      <td className="py-2 text-right font-medium">{formatCurrencyFull(feeDrag.currentFinal)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">Ending balance — {model.name} model</td>
                      <td className="py-2 text-right font-medium">{formatCurrencyFull(feeDrag.modelFinal)}</td>
                    </tr>
                    <tr>
                      <td className="py-2">Expense-ratio spread</td>
                      <td className="py-2 text-right font-medium">{bps(feeDrag.erSavings)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-muted-foreground">
                Expense ratios are estimated from ticker and fund-name patterns where fund data is not
                synced. Verify actual ratios on each fund's prospectus before making changes.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => { setAnswers(DEFAULT_ANSWERS); setOverrideLevel(null); }}>
          Reset profiler
        </Button>
      </div>
    </div>
  );
}
