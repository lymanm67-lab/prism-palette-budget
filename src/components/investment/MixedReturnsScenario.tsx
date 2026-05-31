import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Shuffle } from 'lucide-react';
import { InvestmentPlan } from '@/hooks/use-investment-plan';
import { runProjection, formatCurrencyFull, ProjectionInputs } from '@/lib/investment/projection';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, ReferenceLine } from 'recharts';

interface Props {
  plan: InvestmentPlan | null;
}

const RETURN_CYCLE = [6, 7, 8, 9, 10];

function buildInputs(
  plan: InvestmentPlan,
  horizonYears: number,
  useFutureDollars: boolean,
  returnPct: number,
  mixed?: number[],
): ProjectionInputs {
  return {
    currentAge: plan.current_age,
    retirementAge: plan.current_age + horizonYears,
    currentBalance: plan.current_balance,
    targetAmount: plan.target_amount,
    monthlyEmployeeContribution: plan.monthly_employee_contribution,
    monthlyEmployerContribution: plan.monthly_employer_contribution,
    expectedReturnPct: returnPct,
    employerMatchPct: plan.employer_match_pct ?? undefined,
    annualRaisePct: plan.annual_raise_pct,
    raiseRedirectPct: plan.raise_redirect_pct,
    currentMonthlyIncome: plan.current_monthly_income ?? undefined,
    debtPaymentAmount: plan.debt_payment_amount ?? undefined,
    debtPayoffDate: plan.debt_payoff_date,
    additionalMonthlyAmount: plan.additional_monthly_amount ?? undefined,
    additionalStartDate: plan.additional_start_date,
    ssMonthlyEstimate: plan.ss_monthly_estimate ?? undefined,
    ssClaimingAge: plan.ss_claiming_age ?? undefined,
    ssInvestWhileWorking: plan.ss_invest_while_working,
    ssInvestPct: plan.ss_invest_pct,
    hsaBalance: plan.hsa_balance,
    hsaMonthlyContribution: plan.hsa_monthly_contribution,
    hsaEmployerContribution: plan.hsa_employer_contribution,
    hsaInvested: plan.hsa_invested,
    hsaReturnPct: plan.hsa_return_pct,
    useFutureDollars,
    inflationPct: plan.inflation_pct,
    annualReturnsPct: mixed,
  };
}

function geometricMean(returnsPct: number[]): number {
  if (!returnsPct.length) return 0;
  const product = returnsPct.reduce((acc, r) => acc * (1 + r / 100), 1);
  return (Math.pow(product, 1 / returnsPct.length) - 1) * 100;
}

function sequenceForHorizon(years: number): number[] {
  return Array.from({ length: years }, (_, i) => RETURN_CYCLE[i % RETURN_CYCLE.length]);
}

export function MixedReturnsScenario({ plan }: Props) {
  const [horizon, setHorizon] = useState<'27' | '30'>('30');
  const [dollarMode, setDollarMode] = useState<'today' | 'nominal'>(
    plan?.use_future_dollars ? 'nominal' : 'today'
  );

  const horizonYears = parseInt(horizon, 10);
  const useFuture = dollarMode === 'nominal';

  const sequence = useMemo(() => sequenceForHorizon(horizonYears), [horizonYears]);
  const cagr = useMemo(() => geometricMean(sequence), [sequence]);

  if (!plan || !plan.current_age) return null;

  const goal = plan.target_amount || 4_000_000;
  const p7 = runProjection(buildInputs(plan, horizonYears, useFuture, 7)).projectedBalance;
  const p8 = runProjection(buildInputs(plan, horizonYears, useFuture, 8)).projectedBalance;
  const pMixed = runProjection(buildInputs(plan, horizonYears, useFuture, 7, sequence)).projectedBalance;

  const surplusMixed = pMixed - goal;
  const status = surplusMixed >= goal * 0.5 ? 'Strongly on track' : surplusMixed >= 0 ? 'On track' : 'Below goal';
  const badgeClass = surplusMixed >= 0
    ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
    : 'bg-rose-500/15 text-rose-500 border-rose-500/30';

  const data = [
    { name: 'Goal', value: goal, fill: 'hsl(var(--muted-foreground))' },
    { name: 'Flat 7%', value: p7, fill: 'hsl(var(--primary))' },
    { name: 'Flat 8%', value: p8, fill: 'hsl(var(--prism-amber, var(--primary)))' },
    { name: 'Mixed 6–10%', value: pMixed, fill: 'hsl(var(--prism-teal, var(--primary)))' },
  ];

  return (
    <Card className="bg-gradient-to-br from-card to-muted/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shuffle className="h-4 w-4 text-primary" />
              Mixed Market Returns Scenario
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Rotating annual returns of 6%, 7%, 8%, 9%, 10% over {horizonYears} years
              (~{cagr.toFixed(2)}% CAGR) — a more realistic stand-in for sequence-of-returns risk than any flat rate.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Viewing in {useFuture ? 'nominal (future) dollars' : "today's dollars (inflation-adjusted)"}.
            </p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Tabs value={horizon} onValueChange={(v) => setHorizon(v as '27' | '30')}>
              <TabsList className="h-8">
                <TabsTrigger value="27" className="text-xs h-6 px-2">27 yrs</TabsTrigger>
                <TabsTrigger value="30" className="text-xs h-6 px-2">30 yrs</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={dollarMode} onValueChange={(v) => setDollarMode(v as 'today' | 'nominal')}>
              <TabsList className="h-8">
                <TabsTrigger value="today" className="text-xs h-6 px-2">Today's $</TabsTrigger>
                <TabsTrigger value="nominal" className="text-xs h-6 px-2">Nominal $</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="h-56 w-full">
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => formatCurrencyFull(v)}
              />
              <ReferenceLine y={goal} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {data.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border bg-card/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Shuffle className="h-4 w-4 text-primary" /> Mixed Returns ({horizonYears} yr)
              </div>
              <Badge variant="outline" className={badgeClass}>{status}</Badge>
            </div>
            <p className="text-2xl font-semibold tabular-nums">{formatCurrencyFull(pMixed)}</p>
            <p className="text-xs text-muted-foreground">
              {surplusMixed >= 0 ? 'Surplus' : 'Gap'} of {formatCurrencyFull(Math.abs(surplusMixed))} vs {formatCurrencyFull(goal)} goal.
            </p>
          </div>
          <div className="rounded-lg border bg-card/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Activity className="h-4 w-4 text-primary" /> Effective CAGR
              </div>
              <Badge variant="outline" className="bg-muted/40">Geometric mean</Badge>
            </div>
            <p className="text-2xl font-semibold tabular-nums">{cagr.toFixed(2)}%</p>
            <p className="text-xs text-muted-foreground">
              Lands between flat 7% ({formatCurrencyFull(p7)}) and flat 8% ({formatCurrencyFull(p8)}) outcomes.
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-card/40 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Annual return sequence (year 1 → {horizonYears})
          </p>
          <div className="flex flex-wrap gap-1">
            {sequence.map((r, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-background px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-foreground/80"
                title={`Year ${i + 1}`}
              >
                <span className="text-muted-foreground">{i + 1}</span>
                <span>{r}%</span>
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-muted/40 p-4 text-sm space-y-2">
          <p>
            Real markets don't return a flat rate. This scenario rotates annual returns through 6%, 7%, 8%, 9%, and 10%
            on a repeating 5-year cycle to illustrate how varied yearly performance compounds. The order matters: this
            deterministic cycle is for education, not a forecast.
          </p>
          <p className="text-xs text-muted-foreground">
            Educational planning projection only — not financial, tax, legal, investment, Social Security, pension, or
            estate planning advice.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
