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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import {
  Layers,
  HeartPulse,
  PiggyBank,
  Landmark,
  Building2,
  LineChart,
  RotateCcw,
  ArrowDownWideNarrow,
  Sparkles,
} from 'lucide-react';
import {
  DEFAULT_WATERFALL_INPUTS,
  employerContributionMonthly,
  WaterfallInputs,
  analyzeHsa,
  buildPriorityRows,
  buildRedirectPlan,
  buildTaxDiversification,
  nextBestDollar,
  annualTaxSavings,
  futureValue,
} from '@/lib/investment/contributionWaterfall';
import ContributionOptimizer from '@/components/investment/ContributionOptimizer';


const STORAGE_KEY = 'montgomery-contribution-waterfall-v3';
const PAYSTUB_457_MONTHLY = DEFAULT_WATERFALL_INPUTS.plan457CurrentMonthly;
const PAYSTUB_TDA_MONTHLY = DEFAULT_WATERFALL_INPUTS.tdaCurrentMonthly;

const BROKERAGE_BALANCE = 3500;
const ROTH_IRA_MONTHLY = 100;

const normalizeAnnualTarget = (value: number | undefined, fallback: number) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;

  // Migrate old saved assumptions that were either stored as $1,000/mo or
  // $12,000/yr back to the realistic paycheck-sized defaults.
  return n >= 1000 ? fallback : n;
};

const normalizeWaterfallInputs = (saved: Partial<WaterfallInputs> = {}): WaterfallInputs => {
  const merged = { ...DEFAULT_WATERFALL_INPUTS, ...saved };

  return {
    ...merged,
    plan457CurrentMonthly:
      merged.plan457CurrentMonthly > 0 ? merged.plan457CurrentMonthly : PAYSTUB_457_MONTHLY,
    tdaCurrentMonthly: merged.tdaCurrentMonthly > 0 ? merged.tdaCurrentMonthly : PAYSTUB_TDA_MONTHLY,
    brokerageBalance: merged.brokerageBalance > 0 ? merged.brokerageBalance : BROKERAGE_BALANCE,
    rothIraCurrentMonthly:
      merged.rothIraCurrentMonthly > 0 ? merged.rothIraCurrentMonthly : ROTH_IRA_MONTHLY,
    rothIraAnnualTarget: normalizeAnnualTarget(
      merged.rothIraAnnualTarget,
      DEFAULT_WATERFALL_INPUTS.rothIraAnnualTarget
    ),
    plan457AnnualTarget: normalizeAnnualTarget(
      merged.plan457AnnualTarget,
      DEFAULT_WATERFALL_INPUTS.plan457AnnualTarget
    ),
    tdaAnnualTarget: normalizeAnnualTarget(
      merged.tdaAnnualTarget,
      DEFAULT_WATERFALL_INPUTS.tdaAnnualTarget
    ),
  };
};

const money = (n: number, d = 0) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: d,
    minimumFractionDigits: d,
  }).format(Number.isFinite(n) ? n : 0);

const PRIORITY_ICONS = [Landmark, HeartPulse, PiggyBank, Building2, Layers, LineChart];

const CHART_COLORS = [
  'hsl(var(--prism-teal))',
  'hsl(var(--prism-amber))',
  'hsl(var(--prism-lime))',
  'hsl(var(--prism-rose))',
  'hsl(var(--primary))',
  'hsl(var(--muted-foreground))',
];

export default function ContributionWaterfall() {
  const [inputs, setInputs] = useState<WaterfallInputs>(normalizeWaterfallInputs());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setInputs(normalizeWaterfallInputs(JSON.parse(raw)));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
    } catch {
      /* ignore */
    }
  }, [inputs]);

  const set = (k: keyof WaterfallInputs) => (v: string) =>
    setInputs((p) => ({ ...p, [k]: Number(v) || 0 }));

  const rows = useMemo(() => buildPriorityRows(inputs), [inputs]);
  const hsa = useMemo(() => analyzeHsa(inputs), [inputs]);
  const redirect = useMemo(() => buildRedirectPlan(inputs), [inputs]);
  const tax = useMemo(() => buildTaxDiversification(inputs), [inputs]);
  const next = useMemo(() => nextBestDollar(inputs), [inputs]);

  useEffect(() => {
    document.title = 'Contribution Waterfall | Tax-Efficient Investment Priority';
    const meta = document.querySelector('meta[name="description"]');
    if (meta)
      meta.setAttribute(
        'content',
        'Dynamic Investment Priority Engine allocating each new retirement dollar across employer plan, HSA, Roth IRA, 457(b), TDA and brokerage.'
      );
  }, []);

  const employerMonthly = employerContributionMonthly(inputs);
  const totalMonthly =
    employerMonthly +
    inputs.hsaCurrentMonthly +
    inputs.rothIraCurrentMonthly +
    inputs.plan457CurrentMonthly +
    inputs.tdaCurrentMonthly +
    inputs.brokerageCurrentMonthly;

  const pieData = [
    { name: 'Tax-Deferred', value: Math.round(tax.deferred) },
    { name: 'Tax-Free', value: Math.round(tax.free) },
    { name: 'Taxable', value: Math.round(tax.taxable) },
  ];
  const projectedPie = [
    { name: 'Tax-Deferred', value: Math.round(tax.projected.deferred) },
    { name: 'Tax-Free', value: Math.round(tax.projected.free) },
    { name: 'Taxable', value: Math.round(tax.projected.taxable) },
  ];

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
      <header className="space-y-2">
        <Badge variant="outline" className="border-prism-amber/40 text-prism-amber">
          Family Office • Dynamic Investment Priority Engine
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Tax-Efficient Investment Allocation &amp; Contribution Waterfall™
        </h1>
        <p className="text-muted-foreground max-w-4xl">
          Every new dollar is allocated by a disciplined, tax-efficient sequence — not spread
          evenly — to maximize long-term after-tax wealth.
        </p>
      </header>

      {/* Investment Policy Statement */}
      <Card className="border-prism-teal/30 bg-card/60 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-prism-teal" /> Investment Policy Statement
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed">
          The Montgomery Family invests each new dollar according to a disciplined, tax-efficient
          sequence rather than contributing equally across all accounts. The objective is to
          maximize long-term after-tax wealth while maintaining sufficient liquidity for current
          healthcare expenses, reducing lifetime taxes, and preserving retirement assets for future
          income and legacy planning.
        </CardContent>
      </Card>

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Next Best Dollar" value={next.name} sub={next.reason} accent />
        <KpiCard
          label="Total Monthly Investing"
          value={money(totalMonthly)}
          sub={`${money(totalMonthly * 12)} annualized`}
        />
        <KpiCard
          label="Tax-Free Share Today"
          value={`${tax.freePct.toFixed(1)}%`}
          sub={`${money(tax.free)} of ${money(tax.total)}`}
        />
        <KpiCard
          label="Projected Tax-Free at Retirement"
          value={money(tax.projected.free)}
          sub={`${inputs.yearsToRetirement} yrs @ ${(inputs.expectedReturn * 100).toFixed(0)}%`}
        />
      </div>

      <Tabs defaultValue="optimizer" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="optimizer">Contribution Optimizer</TabsTrigger>
          <TabsTrigger value="waterfall">Priority Waterfall</TabsTrigger>
          <TabsTrigger value="hsa">HSA Engine</TabsTrigger>
          <TabsTrigger value="redirect">Cash-Flow Redirect</TabsTrigger>
          <TabsTrigger value="diversification">Tax Diversification</TabsTrigger>
          <TabsTrigger value="income">Retirement Income</TabsTrigger>
          <TabsTrigger value="scorecard">Scorecard</TabsTrigger>
          <TabsTrigger value="assumptions">Assumptions</TabsTrigger>
        </TabsList>

        {/* ---------------- OPTIMIZER ---------------- */}
        <TabsContent value="optimizer" className="pt-4">
          <ContributionOptimizer />
        </TabsContent>

        {/* ---------------- WATERFALL ---------------- */}
        <TabsContent value="waterfall" className="space-y-4 pt-4">

          {rows.map((r, idx) => {
            const Icon = PRIORITY_ICONS[idx] ?? Layers;
            return (
              <Card key={r.key} className="border-border/60">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <Icon className="h-5 w-5 text-prism-teal" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          Priority {r.priority} · {r.name}
                        </CardTitle>
                        <CardDescription>{r.subtitle}</CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary">{r.taxTreatment}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-4 text-sm">
                    <Stat label="Current / mo" value={money(r.currentMonthly, 2)} />
                    <Stat label="Target / mo" value={money(r.targetMonthly, 2)} />
                    <Stat label="Remaining Annual" value={money(r.remainingAnnual)} />
                    <Stat label="Balance" value={money(r.balance)} />
                  </div>
                  <Progress value={r.percentComplete} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {r.percentComplete.toFixed(0)}% of target funded
                    {r.key === 'employer' &&
                      ` · ${money(employerMonthly * 12)}/yr employer-funded (${((employerMonthly * 12 / inputs.iuSalary) * 100).toFixed(2)}% of eligible salary) — fully funded foundation; continue while employed.`}
                    {r.key === 'rothIra' &&
                      ` · Est. tax-free retirement value ${money(
                        futureValue(r.currentMonthly, inputs) + r.balance * Math.pow(1 + inputs.expectedReturn, inputs.yearsToRetirement)
                      )}`}
                    {(r.key === 'plan457' || r.key === 'tda') &&
                      ` · Annual tax savings ${money(
                        annualTaxSavings(r.currentMonthly, inputs)
                      )} · Est. future tax-free income value ${money(
                        futureValue(r.currentMonthly * (1 - inputs.preTaxSplit), inputs)
                      )}`}
                    {r.key === 'brokerage' &&
                      ' · Flexible investment, opportunity fund, legacy account and bridge for future goals.'}
                    {r.key === 'hsa' &&
                      ' · Qualified HSA withdrawals remain tax-free when used for eligible medical expenses.'}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* ---------------- HSA ---------------- */}
        <TabsContent value="hsa" className="space-y-4 pt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard label="Current HSA Contribution" value={money(hsa.currentMonthly, 2) + '/mo'} />
            <KpiCard
              label="Recommended Contribution"
              value={money(hsa.recommendedMonthly, 2) + '/mo'}
              accent
            />
            <KpiCard
              label="Avg Monthly Medical Expenses"
              value={money(hsa.totalMedicalMonthly, 2)}
              sub={`${money(hsa.routineMonthly)} routine + ${money(hsa.physicianMonthly)} physician`}
            />
            <KpiCard label="Net Monthly HSA Growth" value={money(hsa.netGrowthMonthly, 2)} />
            <KpiCard label="Employer HSA Contributions" value={money(hsa.employerMonthly, 2) + '/mo'} />
            <KpiCard
              label="Annual HSA Balance Projection"
              value={money(hsa.projectedBalance1yr)}
              sub={`${money(hsa.annualGrowth)} net added this year`}
            />
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Qualified Medical Expense Assumptions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Routine medical and prescription costs: {money(hsa.routineMonthly)}/month</p>
              <p>
                Quarterly physician visits: {money(inputs.physicianVisitCost)} per quarter (
                {money(hsa.physicianMonthly)}/month average)
              </p>
              <p>
                Average total qualified medical expenses: {money(hsa.totalMedicalMonthly)}/month ·
                approximately {money(hsa.annualMedical)} annually
              </p>
              <Separator className="my-2" />
              <p>
                Qualified HSA withdrawals remain <strong>tax-free</strong> when used for eligible
                medical expenses. Dollars above the operating target compound as a long-term
                tax-advantaged asset.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- REDIRECT ---------------- */}
        <TabsContent value="redirect" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowDownWideNarrow className="h-4 w-4 text-prism-amber" /> Beginning January 2027
              </CardTitle>
              <CardDescription>
                Marketing &amp; education budget {money(inputs.marketingEducationBudget)} less
                student loan payment {money(inputs.studentLoanPayment)} ={' '}
                {money(redirect.jan2027Available)} available redirect
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AllocationChart slices={redirect.jan2027Slices} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">After Consumer Debt Payoff</CardTitle>
              <CardDescription>
                {money(redirect.debtPayoffAvailable)}/month redirected down the waterfall
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AllocationChart slices={redirect.debtPayoffSlices} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- DIVERSIFICATION ---------------- */}
        <TabsContent value="diversification" className="space-y-4 pt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <TaxPie title="Current Balances by Tax Treatment" data={pieData} />
            <TaxPie
              title={`Projected at Retirement (${inputs.yearsToRetirement} yrs)`}
              data={projectedPie}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard
              label="Tax-Deferred"
              value={money(tax.deferred)}
              sub={`${tax.deferredPct.toFixed(1)}% · TDA, 457(b) pre-tax, employer plan`}
            />
            <KpiCard
              label="Tax-Free"
              value={money(tax.free)}
              sub={`${tax.freePct.toFixed(1)}% · Roth IRA, Roth TDA/457(b), HSA`}
              accent
            />
            <KpiCard
              label="Taxable"
              value={money(tax.taxable)}
              sub={`${tax.taxablePct.toFixed(1)}% · Brokerage & cash investments`}
            />
          </div>
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              Estimated retirement income mix at a 4% draw:{' '}
              <strong className="text-foreground">
                {money(tax.projected.deferred * 0.04)}/yr taxable
              </strong>{' '}
              from tax-deferred accounts versus{' '}
              <strong className="text-foreground">{money(tax.projected.free * 0.04)}/yr tax-free</strong>{' '}
              from Roth and HSA assets.
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- INCOME LAYERS ---------------- */}
        <TabsContent value="income" className="space-y-3 pt-4">
          {[
            { n: 1, t: 'Social Security', d: 'Inflation-adjusted lifetime base income' },
            { n: 2, t: "Kateri's OPERS Pension", d: 'Guaranteed employer pension income' },
            { n: 3, t: 'Tax-Free Income', d: 'Roth accounts + HSA for qualified medical expenses' },
            { n: 4, t: 'Tax-Deferred Retirement Accounts', d: 'TDA, 457(b) pre-tax, employer plan' },
            { n: 5, t: 'Taxable Brokerage Assets', d: 'Capital gains treatment, step-up at death' },
          ].map((l) => (
            <Card key={l.n} className="border-border/60">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="h-9 w-9 shrink-0 rounded-full bg-prism-teal/15 text-prism-teal font-semibold flex items-center justify-center">
                  {l.n}
                </div>
                <div>
                  <p className="font-medium text-foreground">{l.t}</p>
                  <p className="text-sm text-muted-foreground">{l.d}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          <p className="text-xs text-muted-foreground">
            This sequence is intended to provide flexibility rather than requiring withdrawals in a
            fixed order. Actual withdrawal decisions should consider tax law, spending needs, and
            annual tax planning.
          </p>
        </TabsContent>

        {/* ---------------- SCORECARD ---------------- */}
        <TabsContent value="scorecard" className="pt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Investment Priority Scorecard</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {rows.map((r) => (
                <div key={r.key} className="space-y-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium text-foreground">{r.name}</span>
                    <span className="text-muted-foreground">
                      {money(r.currentMonthly, 2)} / {money(r.targetMonthly, 2)} per month ·{' '}
                      {r.percentComplete.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={r.percentComplete} className="h-2" />
                </div>
              ))}
              <Separator />
              <p className="text-sm">
                <span className="text-muted-foreground">Recommended next dollar: </span>
                <span className="font-semibold text-prism-amber">{next.name}</span>{' '}
                <span className="text-muted-foreground">— {next.reason}</span>
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- ASSUMPTIONS ---------------- */}
        <TabsContent value="assumptions" className="pt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Live Assumptions</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputs(normalizeWaterfallInputs())}
              >
                <RotateCcw className="h-4 w-4 mr-2" /> Reset
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="IU Eligible Salary" value={inputs.iuSalary} onChange={set('iuSalary')} />
              <Field
                label="Employer Contribution / mo (actual)"
                value={inputs.employerMonthlyActual}
                step="0.01"
                onChange={set('employerMonthlyActual')}
              />
              <Field
                label="Employer Rate fallback (decimal)"
                value={inputs.employerRate}
                step="0.01"
                onChange={set('employerRate')}
              />
              <Field
                label="Employer HSA / mo"
                value={inputs.employerHsaMonthly}
                onChange={set('employerHsaMonthly')}
              />
              <Field
                label="HSA Current / mo"
                value={inputs.hsaCurrentMonthly}
                onChange={set('hsaCurrentMonthly')}
              />
              <Field
                label="HSA Target / mo"
                value={inputs.hsaTargetMonthly}
                onChange={set('hsaTargetMonthly')}
              />
              <Field
                label="Routine Medical / mo"
                value={inputs.routineMedicalMonthly}
                onChange={set('routineMedicalMonthly')}
              />
              <Field
                label="Physician Visit (quarterly)"
                value={inputs.physicianVisitCost}
                onChange={set('physicianVisitCost')}
              />
              <Field label="HSA Balance" value={inputs.hsaBalance} onChange={set('hsaBalance')} />
              <Field
                label="Roth IRA Current / mo"
                value={inputs.rothIraCurrentMonthly}
                onChange={set('rothIraCurrentMonthly')}
              />
              <Field
                label="Roth IRA Annual Target"
                value={inputs.rothIraAnnualTarget}
                onChange={set('rothIraAnnualTarget')}
              />
              <Field
                label="Roth IRA Balance"
                value={inputs.rothIraBalance}
                onChange={set('rothIraBalance')}
              />
              <Field
                label="457(b) Current / mo"
                value={inputs.plan457CurrentMonthly}
                onChange={set('plan457CurrentMonthly')}
              />
              <Field
                label="457(b) Annual Target"
                value={inputs.plan457AnnualTarget}
                onChange={set('plan457AnnualTarget')}
              />
              <Field
                label="457(b) Balance"
                value={inputs.plan457Balance}
                onChange={set('plan457Balance')}
              />
              <Field
                label="TDA Current / mo"
                value={inputs.tdaCurrentMonthly}
                onChange={set('tdaCurrentMonthly')}
              />
              <Field
                label="TDA Annual Target"
                value={inputs.tdaAnnualTarget}
                onChange={set('tdaAnnualTarget')}
              />
              <Field label="TDA Balance" value={inputs.tdaBalance} onChange={set('tdaBalance')} />
              <Field
                label="Brokerage / mo"
                value={inputs.brokerageCurrentMonthly}
                onChange={set('brokerageCurrentMonthly')}
              />
              <Field
                label="Brokerage Balance"
                value={inputs.brokerageBalance}
                onChange={set('brokerageBalance')}
              />
              <Field
                label="Pre-Tax Split (decimal)"
                value={inputs.preTaxSplit}
                step="0.05"
                onChange={set('preTaxSplit')}
              />
              <Field
                label="Marketing & Education Budget"
                value={inputs.marketingEducationBudget}
                onChange={set('marketingEducationBudget')}
              />
              <Field
                label="Student Loan Payment"
                value={inputs.studentLoanPayment}
                onChange={set('studentLoanPayment')}
              />
              <Field
                label="Debt Payoff Redirect / mo"
                value={inputs.debtPayoffRedirect}
                onChange={set('debtPayoffRedirect')}
              />
              <Field
                label="Marginal Tax Rate (decimal)"
                value={inputs.marginalTaxRate}
                step="0.01"
                onChange={set('marginalTaxRate')}
              />
              <Field
                label="Expected Return (decimal)"
                value={inputs.expectedReturn}
                step="0.01"
                onChange={set('expectedReturn')}
              />
              <Field
                label="Years to Retirement"
                value={inputs.yearsToRetirement}
                onChange={set('yearsToRetirement')}
              />
              <Field
                label="Employer Plan Balance"
                value={inputs.employerPlanBalance}
                onChange={set('employerPlanBalance')}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Executive insight */}
      <Card className="border-prism-amber/30 bg-card/60 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Executive Family Office Insight</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground leading-relaxed">
          The Montgomery Family Wealth Operating System follows a tax-diversified investment
          strategy designed to balance current tax savings with future tax flexibility. The Health
          Savings Account is maintained as both a healthcare spending account and a long-term
          tax-advantaged asset, with contributions calibrated to cover approximately{' '}
          {money(hsa.annualMedical)} of expected annual qualified medical expenses while allowing
          modest long-term growth. Once the HSA operating target is met, additional retirement
          dollars are directed to the Roth IRA, followed by the Indiana University 457(b), the Tax
          Deferred Account, and finally the taxable brokerage account. This disciplined contribution
          sequence supports long-term wealth accumulation while preserving flexibility for
          retirement income and legacy planning.
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
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
    <Card className={accent ? 'border-prism-amber/40' : undefined}>
      <CardContent className="pt-5 space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p
          className={`text-xl font-semibold ${accent ? 'text-prism-amber' : 'text-foreground'}`}
        >
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
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
      <Input
        type="number"
        step={step ?? '1'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function AllocationChart({
  slices,
}: {
  slices: { key: string; name: string; amount: number; note: string }[];
}) {
  if (!slices.length) {
    return <p className="text-sm text-muted-foreground">No available redirect at this stage.</p>;
  }
  const data = slices.map((s) => ({ name: s.name, amount: Number(s.amount.toFixed(2)) }));
  return (
    <div className="space-y-4">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 24, right: 24 }}>
            <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis
              type="category"
              dataKey="name"
              width={110}
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                color: 'hsl(var(--foreground))',
              }}
              formatter={(v: number) => money(v, 2)}
            />
            <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-1 text-sm">
        {slices.map((s, i) => (
          <li key={s.key + i} className="flex items-start justify-between gap-3">
            <span className="text-muted-foreground">
              <span className="text-foreground font-medium">{s.name}</span> — {s.note}
            </span>
            <span className="font-medium text-foreground whitespace-nowrap">
              {money(s.amount, 2)}/mo
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TaxPie({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95}>
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                color: 'hsl(var(--foreground))',
              }}
              formatter={(v: number) => money(v)}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
