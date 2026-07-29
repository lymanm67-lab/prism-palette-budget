import { useMemo, useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowDown, Gauge, RotateCcw, TrendingUp, ShieldCheck, AlertTriangle } from 'lucide-react';
import {
  DEFAULT_PAYROLL_BASELINE,
  PayrollBaseline,
  buildAffordabilityMeter,
  buildContributionCap,
  buildPhases,
  buildSmartRecommendations,
  buildCashFlowWaterfall,
  buildStages,
  employeeContributionTotal,
  TARGET_MIN_PCT,
  TARGET_MAX_PCT,
} from '@/lib/investment/contributionOptimizer';

const STORAGE_KEY = 'montgomery-contribution-optimizer-v1';

const money = (n: number, d = 2) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: d,
    minimumFractionDigits: d,
  }).format(Number.isFinite(n) ? n : 0);

const pctText = (n: number) => `${(n * 100).toFixed(1)}%`;

const BAND_STYLES: Record<string, { dot: string; text: string; border: string }> = {
  comfortable: { dot: '🟢', text: 'text-prism-lime', border: 'border-prism-lime/40' },
  moderate: { dot: '🟡', text: 'text-prism-amber', border: 'border-prism-amber/40' },
  aggressive: { dot: '🔴', text: 'text-prism-rose', border: 'border-prism-rose/40' },
};

export default function ContributionOptimizer() {
  const [p, setP] = useState<PayrollBaseline>(DEFAULT_PAYROLL_BASELINE);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setP({ ...DEFAULT_PAYROLL_BASELINE, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch {
      /* ignore */
    }
  }, [p]);

  const set = (k: keyof PayrollBaseline) => (v: string) =>
    setP((prev) => ({ ...prev, [k]: Number(v) || 0 }));

  const cap = useMemo(() => buildContributionCap(p), [p]);
  const meter = useMemo(() => buildAffordabilityMeter(p), [p]);
  const phases = useMemo(() => buildPhases(p), [p]);
  const stages = useMemo(() => buildStages(p), [p]);
  const recs = useMemo(() => buildSmartRecommendations(p), [p]);
  const flow = useMemo(() => buildCashFlowWaterfall(p), [p]);
  const total = employeeContributionTotal(p);
  const nextRec = recs.find((r) => r.affordable) ?? recs[0];
  const band = BAND_STYLES[meter.band];

  return (
    <div className="space-y-6">
      <Card className="border-prism-teal/30 bg-card/60 backdrop-blur">
        <CardHeader className="pb-2">
          <Badge variant="outline" className="w-fit border-prism-teal/40 text-prism-teal">
            Intelligent Contribution Optimizer™
          </Badge>
          <CardTitle className="text-lg text-foreground">Contribution Philosophy</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed">
          The Montgomery Family follows a progressive contribution strategy. Retirement savings
          increase as income rises and debt obligations decline. The system recommends affordable
          contribution increases rather than immediately targeting annual IRS maximums.
        </CardContent>
      </Card>

      {/* Payroll baseline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Current Payroll Baseline</CardTitle>
          <CardDescription>
            These values update automatically whenever a new payroll statement is entered.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Monthly Net Pay" value={money(p.netPayMonthly)} accent />
          <Kpi label="Employee Retirement / HSA" value={money(total)} sub="Total current elections" />
          <Kpi label="Employer Retirement" value={money(p.employerMonthly)} sub="IU base plan" />
          <Kpi
            label="Employee % of Net Pay"
            value={pctText(cap.currentPct)}
            sub={`Target ${pctText(TARGET_MIN_PCT)}–${pctText(TARGET_MAX_PCT)}`}
          />
          <Line label="HSA" value={p.hsaMonthly} />
          <Line label="Traditional TDA" value={p.tradTdaMonthly} />
          <Line label="Traditional 457(b)" value={p.trad457Monthly} />
          <Line label="Roth TDA" value={p.rothTdaMonthly} />
          <Line label="Roth 457(b)" value={p.roth457Monthly} />
          <Line label="Roth IRA (post-tax)" value={p.rothIraMonthly} />
        </CardContent>
      </Card>

      {/* Phases */}
      <div className="grid gap-4 lg:grid-cols-3">
        {phases.map((ph) => (
          <Card key={ph.id} className="border-border/60 flex flex-col">
            <CardHeader className="pb-2">
              <Badge variant="secondary" className="w-fit">{ph.window}</Badge>
              <CardTitle className="text-base">{ph.title}</CardTitle>
              <CardDescription>{ph.summary}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm flex-1">
              {ph.available > 0 && (
                <p className="text-prism-amber font-semibold">
                  {money(ph.available)}/mo available
                </p>
              )}
              <ul className="space-y-1">
                {ph.lines.map((l) => (
                  <li key={l.account} className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{l.account}</span>
                    <span className="font-medium text-foreground">{money(l.amount)}</span>
                  </li>
                ))}
              </ul>
              {ph.note && <p className="text-xs text-muted-foreground pt-1">{ph.note}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Phase 3 stage detail */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Phase 3 — Staged Deployment Order</CardTitle>
          <CardDescription>
            Each increase begins only after the previous stage reaches its target.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {stages.map((s) => (
            <div key={s.stage} className="flex items-start gap-3">
              <div className="h-8 w-8 shrink-0 rounded-full bg-prism-teal/15 text-prism-teal text-sm font-semibold flex items-center justify-center">
                {s.stage}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <span className="font-medium text-foreground">{s.name}</span>
                  <span className="text-muted-foreground">
                    +{money(s.amount)}/mo · target {money(s.target)}/mo
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{s.description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Contribution cap */}
      <Card className={cap.withinRange ? 'border-prism-lime/40' : 'border-prism-amber/40'}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-prism-teal" /> Recommended Employee Retirement
            Contributions
          </CardTitle>
          <CardDescription>
            Target range {pctText(TARGET_MIN_PCT)}–{pctText(TARGET_MAX_PCT)} of net pay, excluding
            employer contributions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Current Percentage" value={pctText(cap.currentPct)} sub={money(cap.current)} />
            <Kpi
              label="Recommended Percentage"
              value={pctText(cap.recommendedPct)}
              sub={`${money(cap.recommendedMonthly)}/mo`}
              accent
            />
            <Kpi label="Maximum Comfortable" value={money(cap.maxComfortable)} sub="20% of net pay" />
            <Kpi label="Cash for Household Expenses" value={money(cap.cashRemaining)} />
          </div>
          <Progress
            value={Math.min(100, (cap.currentPct / TARGET_MAX_PCT) * 100)}
            className="h-2"
          />
          {cap.flag && (
            <p className="flex items-start gap-2 text-sm text-prism-amber">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> {cap.flag} A gradual increase is
              recommended instead of a large single step.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Affordability meter */}
      <Card className={band.border}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="h-4 w-4 text-prism-amber" /> Affordability Meter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Kpi label="Current Net Pay" value={money(meter.netPay)} />
            <Kpi label="Current Retirement Contributions" value={money(meter.contributions)} />
            <Kpi label="Monthly Living Expenses" value={money(meter.livingExpenses)} />
            <Kpi label="Monthly Debt Payments" value={money(meter.debtPayments)} />
            <Kpi label="Remaining Disposable Income" value={money(meter.disposable)} accent />
            <Kpi
              label="Financial Flexibility Score"
              value={`${band.dot} ${meter.score}/100 · ${meter.bandLabel}`}
            />
          </div>
          <Progress value={meter.score} className="h-2" />
          <p className={`text-sm ${band.text}`}>
            {meter.bandLabel}: {pctText(meter.disposablePct)} of net pay remains after living
            expenses and debt payments.
          </p>
        </CardContent>
      </Card>

      {/* Smart recommendations */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-prism-lime" /> Smart Contribution Recommendations
          </CardTitle>
          <CardDescription>
            Next affordable increases — not IRS maximums.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {nextRec && (
            <div className="rounded-lg border border-prism-amber/40 p-4 space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Next Recommended Increase
              </p>
              <p className="text-lg font-semibold text-prism-amber">
                Increase {nextRec.account} by {money(nextRec.increase, 0)}/month
              </p>
              <p className="text-sm text-muted-foreground">
                New election {money(nextRec.newMonthly)}/mo · Estimated impact at age 75:{' '}
                <span className="text-foreground font-medium">
                  {money(nextRec.impactAtAge75, 0)}
                </span>
              </p>
            </div>
          )}
          <Separator />
          <ul className="space-y-3">
            {recs.map((r) => (
              <li key={r.account} className="flex flex-wrap items-start justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">
                    Increase {r.account} by {money(r.increase, 0)}/month{' '}
                    {!r.affordable && (
                      <Badge variant="outline" className="ml-1 text-xs">
                        after next cash-flow event
                      </Badge>
                    )}
                  </p>
                  <p className="text-muted-foreground">{r.rationale}</p>
                </div>
                <span className="text-muted-foreground whitespace-nowrap">
                  Age 75 impact {money(r.impactAtAge75, 0)}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Cash flow waterfall */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Cash Flow Waterfall</CardTitle>
          <CardDescription>How additional money gets invested over time.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-1">
            {flow.map((s, i) => (
              <li key={s.label}>
                <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground text-sm">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.detail}</p>
                  </div>
                  {s.amount !== null && (
                    <span className="font-semibold text-prism-amber">
                      +{money(s.amount, 0)}/mo
                    </span>
                  )}
                </div>
                {i < flow.length - 1 && (
                  <div className="flex justify-center py-1">
                    <ArrowDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Payroll inputs */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Payroll &amp; Cash-Flow Inputs</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setP(DEFAULT_PAYROLL_BASELINE)}>
            <RotateCcw className="h-4 w-4 mr-2" /> Reset
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Monthly Net Pay" value={p.netPayMonthly} onChange={set('netPayMonthly')} step="0.01" />
          <Field label="HSA / mo" value={p.hsaMonthly} onChange={set('hsaMonthly')} step="0.01" />
          <Field label="Traditional TDA / mo" value={p.tradTdaMonthly} onChange={set('tradTdaMonthly')} />
          <Field label="Traditional 457(b) / mo" value={p.trad457Monthly} onChange={set('trad457Monthly')} />
          <Field label="Roth TDA / mo" value={p.rothTdaMonthly} onChange={set('rothTdaMonthly')} />
          <Field label="Roth 457(b) / mo" value={p.roth457Monthly} onChange={set('roth457Monthly')} />
          <Field label="Roth IRA / mo" value={p.rothIraMonthly} onChange={set('rothIraMonthly')} />
          <Field label="Employer Retirement / mo" value={p.employerMonthly} onChange={set('employerMonthly')} step="0.01" />
          <Field label="Living Expenses / mo" value={p.livingExpensesMonthly} onChange={set('livingExpensesMonthly')} />
          <Field label="Debt Payments / mo" value={p.debtPaymentsMonthly} onChange={set('debtPaymentsMonthly')} />
          <Field label="Marketing Budget" value={p.marketingBudget} onChange={set('marketingBudget')} />
          <Field label="Student Loan Payment" value={p.studentLoanPayment} onChange={set('studentLoanPayment')} />
          <Field label="Debt Payoff Redirect" value={p.debtPayoffRedirect} onChange={set('debtPayoffRedirect')} />
          <Field label="Expected Return (decimal)" value={p.expectedReturn} onChange={set('expectedReturn')} step="0.01" />
          <Field label="Years to Age 75" value={p.yearsToAge75} onChange={set('yearsToAge75')} />
        </CardContent>
      </Card>

      <Card className="border-prism-amber/30 bg-card/60 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Executive Advisor Insight</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed">
          The Montgomery Family's investment strategy emphasizes consistency over maximizing
          contributions immediately. The objective is to increase retirement savings gradually as
          cash flow improves, ensuring that investment growth is sustainable and does not compromise
          current financial stability. Each debt payoff, salary increase, and budget improvement
          becomes an opportunity to strengthen long-term wealth while maintaining household
          flexibility.
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/60 p-3 space-y-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold ${accent ? 'text-prism-amber' : 'text-foreground'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{money(value)}</span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: string) => void;
  step?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input type="number" step={step ?? '1'} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
