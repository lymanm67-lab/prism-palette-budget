import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target } from 'lucide-react';
import { InvestmentPlan } from '@/hooks/use-investment-plan';
import { runProjection } from '@/lib/investment/projection';

interface Props { plan: InvestmentPlan | null }

const SCENARIOS = [
  { rate: 6, label: 'Conservative' },
  { rate: 7, label: 'Average' },
  { rate: 8, label: 'Growth' },
  { rate: 9, label: 'Aggressive' },
  { rate: 10, label: 'Aggressive+' },
];

const TARGETS = [1, 2, 3, 4, 5, 6].map((m) => m * 1_000_000);

// Expected reference dates from the Montgomery spec, keyed by `${target}-${rate}`
const EXPECTED: Record<string, string> = {
  '1000000-6': 'Aug 2036', '1000000-7': 'Jun 2036', '1000000-8': 'Mar 2036', '1000000-9': 'Dec 2035', '1000000-10': 'Aug 2035',
  '2000000-6': 'Mar 2044', '2000000-7': 'Jan 2043', '2000000-8': 'Mar 2042', '2000000-9': 'Aug 2041', '2000000-10': 'Dec 2040',
  '3000000-6': 'Mar 2049', '3000000-7': 'Dec 2047', '3000000-8': 'Aug 2046', '3000000-9': 'Apr 2045', '3000000-10': 'Jan 2044',
  '4000000-6': 'Aug 2053', '4000000-7': 'Feb 2051', '4000000-8': 'Aug 2049', '4000000-9': 'Mar 2048', '4000000-10': 'Nov 2046',
  '5000000-6': 'Not by 88', '5000000-7': '2054', '5000000-8': 'Apr 2052', '5000000-9': 'Aug 2050', '5000000-10': 'Jan 2049',
  '6000000-6': 'Not by 88', '6000000-7': 'Not by 88', '6000000-8': '2054', '6000000-9': 'Jan 2052', '6000000-10': 'Jun 2050',
};

function formatMonth(d: Date): string {
  return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

export function MillionMilestonesTable({ plan }: Props) {
  const grid = useMemo(() => {
    if (!plan || !plan.current_age) return null;
    // Project to age 88 max so we can detect 5M/6M crossings
    return SCENARIOS.map((s) => {
      const r = runProjection({
        currentAge: plan.current_age!,
        retirementAge: 88,
        currentBalance: plan.current_balance,
        targetAmount: plan.target_amount,
        monthlyEmployeeContribution: plan.monthly_employee_contribution,
        monthlyEmployerContribution: plan.monthly_employer_contribution,
        employerMatchPct: plan.employer_match_pct ?? undefined,
        expectedReturnPct: s.rate,
        annualRaisePct: plan.annual_raise_pct,
        raiseRedirectPct: plan.raise_redirect_pct,
        currentMonthlyIncome: plan.current_monthly_income ?? undefined,
        debtPaymentAmount: plan.debt_payment_amount ?? undefined,
        debtPayoffDate: plan.debt_payoff_date,
        ssMonthlyEstimate: plan.ss_monthly_estimate ?? undefined,
        incomeFromSsPensionOnly: plan.income_strategy === 'ss_pension_only',
        spousePensionMonthly: plan.spouse_pension_monthly ?? 0,
        ssClaimingAge: plan.ss_claiming_age ?? undefined,
        ssInvestWhileWorking: plan.ss_invest_while_working,
        ssInvestPct: plan.ss_invest_pct,
        useFutureDollars: true,
        includeMonthly: true,
        datedStepUps: [
          { amount: 100, startDate: '2026-07-01' },
          { amount: 225, startDate: '2027-01-01' },
          { amount: 208, startDate: '2027-01-01' },
          { amount: 500, startDate: '2028-06-01' },
          { amount: 200, startDate: '2029-01-01' },
          { amount: 500, startDate: '2030-01-01' },
        ],
        annualLumpSum: { amount: 3000, startYear: 2028 },
      });

      const crossings: Record<number, Date | null> = {};
      for (const t of TARGETS) {
        const hit = r.monthly?.find((p) => p.balance >= t);
        crossings[t] = hit ? hit.date : null;
      }
      return { ...s, crossings };
    });
  }, [plan]);

  if (!plan || !grid) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Complete the setup wizard to see your million-dollar milestones.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Million-Dollar Milestones
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          When each scenario first crosses $1M through $6M. "Expected" column shows the Montgomery reference dates.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50 text-muted-foreground">
                <th className="text-left py-2 font-medium">Milestone</th>
                {SCENARIOS.map((s) => (
                  <th key={s.rate} className="text-center py-2 font-medium px-2">
                    {s.rate}%
                    <div className="text-[10px] font-normal opacity-70">{s.label}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TARGETS.map((t) => (
                <tr key={t} className="border-b border-border/30">
                  <td className="py-2 font-medium tabular-nums">${(t / 1_000_000).toFixed(0)}M</td>
                  {grid.map((s) => {
                    const d = s.crossings[t];
                    const computed = d ? formatMonth(d) : 'Not by 88';
                    const expected = EXPECTED[`${t}-${s.rate}`] ?? '—';
                    const matches = expected !== '—' && expected !== 'Not by 88' && d
                      ? Math.abs(d.getFullYear() - parseInt(expected.slice(-4))) <= 1
                      : computed === expected;
                    return (
                      <td key={s.rate} className="text-center py-2 px-2">
                        <div className={`tabular-nums ${d ? 'font-medium' : 'text-muted-foreground italic'}`}>
                          {computed}
                        </div>
                        <div className={`text-[10px] mt-0.5 ${matches ? 'text-emerald-500/70' : 'text-amber-500/70'}`}>
                          ref: {expected}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
