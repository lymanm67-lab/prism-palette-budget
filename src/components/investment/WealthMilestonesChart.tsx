import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Trophy } from 'lucide-react';
import { useInvestmentPlan } from '@/hooks/use-investment-plan';
import { runProjection, formatCurrencyFull } from '@/lib/investment/projection';

const THRESHOLDS = [1, 2, 3, 4, 5, 6].map((m) => m * 1_000_000);
const SENSITIVITY_RATES = [6, 8, 10];

interface Crossing {
  threshold: number;
  yearsFromNow: number | null; // null = not reached
  age: number | null;
  calendarYear: number | null;
  achieved: boolean;
}

function buildInputs(plan: any, returnPct: number, useFuture: boolean) {
  const horizon = 60; // long horizon so we can spot crossings
  return {
    currentAge: plan.current_age,
    retirementAge: plan.current_age + horizon,
    currentBalance: plan.current_balance,
    targetAmount: 0,
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
    useFutureDollars: useFuture,
    inflationPct: plan.inflation_pct,
    __skipSolve: true,
  } as any;
}

function findCrossings(plan: any, returnPct: number, useFuture: boolean): Crossing[] {
  const result = runProjection(buildInputs(plan, returnPct, useFuture));
  const startBalance = plan.current_balance || 0;
  const yearly = result.yearly;
  const inflationFactor = (yearsOut: number) =>
    !useFuture && plan.inflation_pct
      ? Math.pow(1 + plan.inflation_pct / 100, yearsOut)
      : 1;

  return THRESHOLDS.map((threshold) => {
    if (startBalance >= threshold) {
      return { threshold, yearsFromNow: 0, age: plan.current_age, calendarYear: new Date().getFullYear(), achieved: true };
    }
    for (const pt of yearly) {
      const yearsOut = pt.age - plan.current_age;
      const adjBalance = useFuture ? pt.balance : pt.balance / inflationFactor(yearsOut);
      if (adjBalance >= threshold) {
        return {
          threshold,
          yearsFromNow: yearsOut,
          age: Math.round(pt.age),
          calendarYear: Math.round(pt.year),
          achieved: false,
        };
      }
    }
    return { threshold, yearsFromNow: null, age: null, calendarYear: null, achieved: false };
  });
}

export function WealthMilestonesChart() {
  const { data: plan } = useInvestmentPlan();
  const [dollarMode, setDollarMode] = useState<'today' | 'nominal'>('today');

  const useFuture = dollarMode === 'nominal';
  const baseReturn = plan?.expected_return_pct || 8;

  const crossings = useMemo(() => {
    if (!plan || !plan.current_age) return [];
    return findCrossings(plan, baseReturn, useFuture);
  }, [plan, baseReturn, useFuture]);

  const sensitivity = useMemo(() => {
    if (!plan || !plan.current_age) return null;
    return SENSITIVITY_RATES.map((r) => ({
      rate: r,
      crossings: findCrossings(plan, r, useFuture),
    }));
  }, [plan, useFuture]);

  if (!plan || !plan.current_age) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Save your plan first to project wealth milestones.
        </CardContent>
      </Card>
    );
  }

  const maxYears = Math.max(
    ...crossings.map((c) => c.yearsFromNow ?? 60),
    10,
  );

  return (
    <Card className="bg-gradient-to-br from-card to-muted/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              Wealth Milestones
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              When you'd cross each $1M mark at {baseReturn}% return ·{' '}
              {useFuture ? 'nominal (future) dollars' : "today's dollars (inflation-adjusted)"}.
            </p>
          </div>
          <Tabs value={dollarMode} onValueChange={(v) => setDollarMode(v as 'today' | 'nominal')}>
            <TabsList className="h-8">
              <TabsTrigger value="today" className="text-xs h-6 px-2">Today's $</TabsTrigger>
              <TabsTrigger value="nominal" className="text-xs h-6 px-2">Nominal $</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          {crossings.map((c) => {
            const widthPct = c.yearsFromNow != null
              ? Math.max(4, (c.yearsFromNow / maxYears) * 100)
              : 100;
            return (
              <div key={c.threshold} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-semibold tabular-nums">
                    ${(c.threshold / 1_000_000).toFixed(0)}M
                  </span>
                  <span className="text-muted-foreground">
                    {c.achieved ? (
                      <Badge variant="outline" className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 h-5 text-[10px]">
                        Already there
                      </Badge>
                    ) : c.yearsFromNow != null ? (
                      <span className="tabular-nums">
                        Age <strong className="text-foreground">{c.age}</strong> · Year{' '}
                        <strong className="text-foreground">{c.calendarYear}</strong>{' '}
                        <span className="opacity-60">(+{c.yearsFromNow.toFixed(0)} yrs)</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground/80">Not reached in 60 yrs</span>
                    )}
                  </span>
                </div>
                <div className="relative h-2 rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className={
                      c.achieved
                        ? 'absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500/70 to-emerald-500'
                        : c.yearsFromNow != null
                        ? 'absolute inset-y-0 left-0 bg-gradient-to-r from-primary/70 to-primary'
                        : 'absolute inset-y-0 left-0 bg-muted/60'
                    }
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {sensitivity && (
          <div className="rounded-lg border bg-card/40 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Return-rate sensitivity (years to each milestone)
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs tabular-nums">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-left font-medium pb-1">Return</th>
                    {THRESHOLDS.map((t) => (
                      <th key={t} className="text-right font-medium pb-1 px-2">
                        ${(t / 1_000_000).toFixed(0)}M
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sensitivity.map((row) => (
                    <tr key={row.rate} className="border-t border-border/30">
                      <td className="py-1.5 font-mono">{row.rate}%</td>
                      {row.crossings.map((c) => (
                        <td key={c.threshold} className="text-right px-2 py-1.5">
                          {c.achieved ? (
                            <span className="text-emerald-500">✓</span>
                          ) : c.yearsFromNow != null ? (
                            <span>{c.yearsFromNow.toFixed(0)}y</span>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">
          Projections use your current contribution plan and a flat assumed return. Real returns vary year-to-year —
          see the Mixed Market Returns scenario for sequence-of-returns risk. Educational only, not financial advice.
        </p>
      </CardContent>
    </Card>
  );
}
