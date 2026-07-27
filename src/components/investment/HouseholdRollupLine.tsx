import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { formatCurrencyFull, runProjection } from '@/lib/investment/projection';
import type { InvestmentPlan } from '@/hooks/use-investment-plan';
import { useInvestmentSpouse } from '@/hooks/use-investment-v2';

interface Props {
  plan: InvestmentPlan;
  /** Lyman-only projected balance at the horizon age (already computed by the snapshot). */
  individualAtHorizon: number;
  horizonAge: number;
  returnPct: number;
}

const GOAL = 4_000_000;

/** Simple compounding of a balance + monthly contribution over `years`. */
function grow(balance: number, monthly: number, ratePct: number, years: number) {
  const r = ratePct / 100 / 12;
  const nMonths = Math.max(0, Math.round(years * 12));
  if (r === 0) return balance + monthly * nMonths;
  const fvBal = balance * Math.pow(1 + r, nMonths);
  const fvCon = monthly * ((Math.pow(1 + r, nMonths) - 1) / r);
  return fvBal + fvCon;
}

export function HouseholdRollupLine({ plan, individualAtHorizon, horizonAge, returnPct }: Props) {
  const { data: spouse } = useInvestmentSpouse(plan.id);

  const rollup = useMemo(() => {
    const years = Math.max(0, horizonAge - (plan.current_age ?? 59));
    const spouseBalance = Number(spouse?.current_balance ?? 0);
    const spouseMonthly =
      Number(spouse?.monthly_employee_contribution ?? 0) + Number(spouse?.monthly_employer_contribution ?? 0);
    const spouseRate = Number(spouse?.expected_return_pct ?? returnPct);
    const spouseAtHorizon = grow(spouseBalance, spouseMonthly, spouseRate, years);
    return {
      years,
      spouseBalance,
      spouseMonthly,
      spouseRate,
      spouseAtHorizon,
      combined: individualAtHorizon + spouseAtHorizon,
    };
  }, [spouse, plan.current_age, horizonAge, returnPct, individualAtHorizon]);

  const lymanNow = plan.current_balance;
  const combinedNow = lymanNow + rollup.spouseBalance;
  const hitsGoal = rollup.combined >= GOAL;

  const rows = [
    {
      label: plan.name || 'Lyman (this plan)',
      now: lymanNow,
      monthly:
        (plan.monthly_employee_contribution ?? 0) + (plan.monthly_employer_contribution ?? 0),
      at: individualAtHorizon,
    },
    {
      label: spouse?.name || 'Spouse',
      now: rollup.spouseBalance,
      monthly: rollup.spouseMonthly,
      at: rollup.spouseAtHorizon,
    },
  ];

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Household roll-up (combined vs individual)
          </CardTitle>
          <Badge
            variant="outline"
            className={
              hitsGoal
                ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
            }
          >
            {hitsGoal ? `$4M goal met at age ${horizonAge}` : `Short of $4M at age ${horizonAge}`}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          This plan's projection covers one person only. The line below adds the spouse's retirement
          balances and contributions so the household number is visible in one place.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50 text-muted-foreground">
                <th className="text-left py-2 font-medium">Who</th>
                <th className="text-right py-2 font-medium">Balance today</th>
                <th className="text-right py-2 font-medium">Contributions /mo</th>
                <th className="text-right py-2 font-medium">At age {horizonAge}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b border-border/30">
                  <td className="py-2 font-medium">{r.label}</td>
                  <td className="text-right py-2 tabular-nums">{formatCurrencyFull(r.now)}</td>
                  <td className="text-right py-2 tabular-nums">{formatCurrencyFull(r.monthly)}</td>
                  <td className="text-right py-2 tabular-nums">{formatCurrencyFull(r.at)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-primary/40">
                <td className="py-2 font-semibold">Household combined</td>
                <td className="text-right py-2 tabular-nums font-semibold">{formatCurrencyFull(combinedNow)}</td>
                <td className="text-right py-2 tabular-nums font-semibold">
                  {formatCurrencyFull(rows.reduce((s, r) => s + r.monthly, 0))}
                </td>
                <td
                  className={`text-right py-2 tabular-nums font-semibold ${
                    hitsGoal ? 'text-emerald-500' : 'text-amber-500'
                  }`}
                >
                  {formatCurrencyFull(rollup.combined)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {!spouse && (
          <p className="text-xs text-muted-foreground mt-3">
            No spouse details saved yet — add them in the Spouse &amp; Household section to populate this line.
          </p>
        )}
        {spouse && (
          <p className="text-xs text-muted-foreground mt-3">
            Spouse figures grown at {rollup.spouseRate}% for {rollup.years} years; this plan grown at{' '}
            {returnPct}% with all step-ups and accelerators.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
