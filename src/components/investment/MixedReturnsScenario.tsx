import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Shuffle } from 'lucide-react';
import { InvestmentPlan } from '@/hooks/use-investment-plan';
import { runProjection, formatCurrencyFull, ProjectionInputs } from '@/lib/investment/projection';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, ReferenceLine } from 'recharts';
import { cn } from '@/lib/utils';

interface Props {
  plan: InvestmentPlan | null;
}

type PresetKey = 'historical' | 'volatile' | 'bull';

const PRESETS: Record<PresetKey, { label: string; cycle: number[]; blurb: string }> = {
  historical: {
    label: 'Historical Avg',
    // 7-yr cycle, geo-mean ≈ 10.4% — close to the long-run S&P 500 nominal total return.
    cycle: [-8, 22, 18, 12, -4, 28, 10],
    blurb: 'Modeled on the long-run S&P 500 average (~10.5% CAGR) with realistic up/down years.',
  },
  volatile: {
    label: 'Volatile',
    // 2000–2009-ish "lost decade then recovery"; mixes the dot-com crash + 2008.
    cycle: [-9, -12, -22, 29, 11, 5, 16, 5, -37, 26],
    blurb: 'Modeled on the 2000–2009 "lost decade" — shows what happens if a bad sequence hits early.',
  },
  bull: {
    label: 'Strong Bull',
    // 1989–1998 actual S&P 500 nominal total returns.
    cycle: [31, -3, 30, 7, 10, 1, 37, 23, 33, 28],
    blurb: 'Modeled on the 1989–1998 bull market — an optimistic ceiling, not a forecast.',
  },
};

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

function sequenceForHorizon(cycle: number[], years: number, reverse: boolean): number[] {
  const base = Array.from({ length: years }, (_, i) => cycle[i % cycle.length]);
  return reverse ? base.slice().reverse() : base;
}

export function MixedReturnsScenario({ plan }: Props) {
  const [horizon, setHorizon] = useState<'27' | '30'>('30');
  const [preset, setPreset] = useState<PresetKey>('historical');
  const [direction, setDirection] = useState<'forward' | 'reverse'>('forward');
  const [dollarMode, setDollarMode] = useState<'today' | 'nominal'>(
    plan?.use_future_dollars ? 'nominal' : 'today'
  );

  const horizonYears = parseInt(horizon, 10);
  const useFuture = dollarMode === 'nominal';
  const presetCfg = PRESETS[preset];

  const sequence = useMemo(
    () => sequenceForHorizon(presetCfg.cycle, horizonYears, direction === 'reverse'),
    [presetCfg, horizonYears, direction],
  );
  const cagr = useMemo(() => geometricMean(sequence), [sequence]);

  if (!plan || !plan.current_age) return null;

  const goal = plan.target_amount || 4_000_000;
  const p7 = runProjection(buildInputs(plan, horizonYears, useFuture, 7)).projectedBalance;
  const p10 = runProjection(buildInputs(plan, horizonYears, useFuture, 10)).projectedBalance;
  const pMixed = runProjection(buildInputs(plan, horizonYears, useFuture, 7, sequence)).projectedBalance;

  const surplusMixed = pMixed - goal;
  const status = surplusMixed >= goal * 0.5 ? 'Strongly on track' : surplusMixed >= 0 ? 'On track' : 'Below goal';
  const badgeClass = surplusMixed >= 0
    ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
    : 'bg-rose-500/15 text-rose-500 border-rose-500/30';

  const data = [
    { name: 'Goal', value: goal, fill: 'hsl(var(--muted-foreground))' },
    { name: 'Flat 7%', value: p7, fill: 'hsl(var(--primary))' },
    { name: 'Flat 10%', value: p10, fill: 'hsl(var(--prism-amber, var(--primary)))' },
    { name: presetCfg.label, value: pMixed, fill: 'hsl(var(--prism-teal, var(--primary)))' },
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
              {presetCfg.blurb} {horizonYears}-year horizon — effective CAGR ~{cagr.toFixed(2)}%.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Viewing in {useFuture ? 'nominal (future) dollars' : "today's dollars (inflation-adjusted)"} ·{' '}
              {direction === 'forward' ? 'Cycle starts year 1' : 'Reverse order (bad years late)'}.
            </p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Tabs value={preset} onValueChange={(v) => setPreset(v as PresetKey)}>
              <TabsList className="h-8">
                <TabsTrigger value="historical" className="text-xs h-6 px-2">Historical</TabsTrigger>
                <TabsTrigger value="volatile" className="text-xs h-6 px-2">Volatile</TabsTrigger>
                <TabsTrigger value="bull" className="text-xs h-6 px-2">Strong Bull</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={horizon} onValueChange={(v) => setHorizon(v as '27' | '30')}>
              <TabsList className="h-8">
                <TabsTrigger value="27" className="text-xs h-6 px-2">27 yrs</TabsTrigger>
                <TabsTrigger value="30" className="text-xs h-6 px-2">30 yrs</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex gap-2">
              <Tabs value={direction} onValueChange={(v) => setDirection(v as 'forward' | 'reverse')}>
                <TabsList className="h-8">
                  <TabsTrigger value="forward" className="text-xs h-6 px-2">Forward</TabsTrigger>
                  <TabsTrigger value="reverse" className="text-xs h-6 px-2">Reverse</TabsTrigger>
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
                <Shuffle className="h-4 w-4 text-primary" /> {presetCfg.label} ({horizonYears} yr)
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
              Flat 7% → {formatCurrencyFull(p7)} · Flat 10% → {formatCurrencyFull(p10)}.
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
                className={cn(
                  'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium tabular-nums',
                  r < 0
                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-500'
                    : r >= 15
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500'
                    : 'border-border/50 bg-background text-foreground/80',
                )}
                title={`Year ${i + 1}`}
              >
                <span className="opacity-60">{i + 1}</span>
                <span>{r > 0 ? '+' : ''}{r}%</span>
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-muted/40 p-4 text-sm space-y-2">
          <p>
            Real markets don't return a flat rate. These presets are drawn from actual S&P 500 nominal total-return
            history. Use the <strong>Reverse</strong> toggle to see how the same returns in opposite order change the
            outcome — that's sequence-of-returns risk, the single most important concept in retirement math.
          </p>
          <p className="text-xs text-muted-foreground">
            Past performance is not indicative of future results. Historical S&P 500 sequences are educational
            illustrations only — not financial, tax, legal, investment, Social Security, pension, or estate planning advice.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
