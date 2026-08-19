import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { LineChart, ArrowRight, Link2, Check } from 'lucide-react';
import {
  projectPortfolio, budgetSurplus, budgetSurplusMonthly, type AssumptionState,
} from '@/lib/blueprint/model';
import { NumField, StatCard, SectionNote, money } from '@/components/blueprint/shared';

const finalBalance = (s: AssumptionState) => {
  const path = projectPortfolio(s, s.primaryReturnPct);
  return path.length ? path[path.length - 1].balance : s.portfolioBalance;
};

/**
 * Shows what the month being edited does to the Blueprint projection.
 *
 * The planner is the single source of truth for spending, so the panel compares
 * the saved (linked) budget against the month on screen and prices the difference
 * in retirement dollars at the planning return.
 */
export function BlueprintImpactPanel({
  state, patch, plannedSpend, month, saving, onLink,
}: {
  state: AssumptionState;
  patch: (p: Partial<AssumptionState>) => void;
  plannedSpend: number;
  month: string;
  saving?: boolean;
  onLink: () => void;
}) {
  const linked = state.budget.sourceMonth === month;
  const budget = state.budget;

  const impact = useMemo(() => {
    const withLinked = finalBalance(state);
    const candidate: AssumptionState = {
      ...state,
      budget: { ...budget, sourceMonth: month, plannedSpendMonthly: plannedSpend },
    };
    const withThisMonth = finalBalance(candidate);
    const per100: AssumptionState = {
      ...candidate,
      budget: { ...candidate.budget, plannedSpendMonthly: plannedSpend - 100 },
    };
    return {
      withLinked,
      withThisMonth,
      delta: withThisMonth - withLinked,
      per100: finalBalance(per100) - withThisMonth,
      surplus: budgetSurplus(candidate),
      invested: budgetSurplusMonthly(candidate),
    };
  }, [state, budget, month, plannedSpend]);

  const years = Math.max(1, state.retirementAge - state.currentAge);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <LineChart className="h-4 w-4 text-prism-teal" /> Effect on Blueprint projections
          {linked
            ? <Badge variant="outline" className="ml-1 border-prism-teal/40 text-prism-teal text-[10px]">Linked month</Badge>
            : <Badge variant="outline" className="ml-1 text-[10px]">Not linked</Badge>}
        </CardTitle>
        <SectionNote>
          Spending that you don't commit becomes investable surplus. Only the redirect share below
          reaches the portfolio, compounded at {state.primaryReturnPct}% for {years} years to age {state.retirementAge}.
        </SectionNote>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Planned spend (this month)" value={money(plannedSpend)} sub={`Net income ${money(budget.netIncomeMonthly)}`} />
          <StatCard
            label="Monthly surplus"
            value={money(impact.surplus)}
            sub={impact.surplus < 0 ? 'Budget exceeds take-home' : `${money(impact.invested)}/mo invested`}
          />
          <StatCard
            label={`Portfolio at ${state.retirementAge}`}
            value={money(impact.withThisMonth)}
            sub={`${impact.delta >= 0 ? '+' : ''}${money(impact.delta)} vs. linked budget`}
          />
          <StatCard
            label="Each $100 you cut"
            value={`${money(impact.per100)}`}
            sub="Added to the portfolio by retirement"
          />
        </div>

        <div className="rounded-lg border border-border/60 p-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Surplus redirected to investing</p>
              <SectionNote>Set to 0% to keep the surplus in cash — nothing is invested silently.</SectionNote>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-20">
                <NumField value={budget.surplusRedirectPct} onChange={(n) => patch({ budget: { ...budget, surplusRedirectPct: Math.max(0, Math.min(100, n)) } })} />
              </div>
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>
          <Slider
            value={[budget.surplusRedirectPct]}
            max={100}
            step={5}
            onValueChange={([v]) => patch({ budget: { ...budget, surplusRedirectPct: v } })}
          />
          <div className="flex items-center justify-between gap-2">
            <div className="w-40">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Net income / mo</p>
              <NumField value={budget.netIncomeMonthly} onChange={(n) => patch({ budget: { ...budget, netIncomeMonthly: n } })} />
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant={linked ? 'outline' : 'default'} onClick={onLink} disabled={saving}>
                {linked ? <Check className="h-4 w-4 mr-1" /> : <Link2 className="h-4 w-4 mr-1" />}
                {linked ? 'Re-sync to Blueprint' : 'Use this month in Blueprint'}
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <Link to="/money-blueprint">Blueprint <ArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
            </div>
          </div>
        </div>

        {!linked && (
          <SectionNote>
            The Blueprint is currently reading {state.budget.sourceMonth.slice(0, 7)} at{' '}
            {money(state.budget.plannedSpendMonthly)}/mo. Link this month to make the numbers above the plan of record.
          </SectionNote>
        )}
      </CardContent>
    </Card>
  );
}

export default BlueprintImpactPanel;
