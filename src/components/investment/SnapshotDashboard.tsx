import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Target, PiggyBank, Wallet, Heart, Sparkles } from 'lucide-react';
import { InvestmentPlan } from '@/hooks/use-investment-plan';
import { formatCurrencyFull } from '@/lib/investment/projection';
import { projectSnapshot } from '@/lib/investment/snapshotProjection';
import { GoalProgressRing } from './GoalProgressRing';
import { HouseholdRollupLine } from './HouseholdRollupLine';

interface Props {
  plan: InvestmentPlan | null;
  /** Live overrides from the snapshot control bar. */
  returnPct?: number;
  horizonAge?: number;
  futureDollars?: boolean;
  /** Clicking an age KPI moves the horizon slider. */
  onHorizonChange?: (age: number) => void;
}

const MILESTONE_AGES = [75, 80, 85];

export function SnapshotDashboard({ plan, returnPct, horizonAge, futureDollars, onHorizonChange }: Props) {
  const rate = returnPct ?? plan?.expected_return_pct ?? 8;
  const age = horizonAge ?? plan?.retirement_age ?? 75;
  const future = futureDollars ?? plan?.use_future_dollars ?? true;

  const computed = useMemo(() => {
    if (!plan || !plan.current_age) return null;
    const base = projectSnapshot(plan, rate, age, future);
    const byAge: Record<number, number> = {};
    for (const a of MILESTONE_AGES) {
      byAge[a] = projectSnapshot(plan, rate, a, future).projectedBalance;
    }
    return { base, byAge };
  }, [plan, rate, age, future]);

  if (!plan || !plan.current_age || !plan.retirement_age || !computed) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Complete the setup wizard to see your investment snapshot.
        </CardContent>
      </Card>
    );
  }

  const { base, byAge } = computed;
  const projected = base.projectedBalance;
  const progress = plan.target_amount > 0 ? projected / plan.target_amount : 0;

  const statusLabel =
    progress >= 1.25 ? 'Strongly on track' : progress >= 1 ? 'On track' : 'Needs an accelerator or a later horizon';
  const statusColor =
    progress >= 1
      ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
      : 'bg-amber-500/15 text-amber-500 border-amber-500/30';

  const ageCards = MILESTONE_AGES.map((a) => ({
    icon: TrendingUp,
    label: `Projected @ age ${a}`,
    value: formatCurrencyFull(byAge[a]),
    onClick: onHorizonChange ? () => onHorizonChange(a) : undefined,
    active: a === age,
  }));

  const cards = [
    { icon: Wallet, label: 'Current balance', value: formatCurrencyFull(plan.current_balance) },
    ...ageCards,
    { icon: Target, label: 'Goal', value: formatCurrencyFull(plan.target_amount) },
    {
      icon: PiggyBank,
      label: base.surplus >= 0 ? `Surplus @ ${age}` : `Gap @ ${age}`,
      value: formatCurrencyFull(Math.abs(base.surplus)),
    },
    { icon: Sparkles, label: 'Est. monthly income', value: formatCurrencyFull(base.estimatedMonthlyIncome) },
    { icon: Heart, label: 'Legacy projection', value: formatCurrencyFull(base.legacyProjection) },
  ];

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-card to-muted/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg">Montgomery Retirement &amp; Legacy Snapshot</CardTitle>
            <Badge variant="outline" className={statusColor}>{statusLabel}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-6">
            <GoalProgressRing
              value={progress}
              label={`${formatCurrencyFull(projected)} at age ${age}`}
              caption={`${rate}% return · goal ${formatCurrencyFull(plan.target_amount)}`}
            />
            <div className="text-xs text-muted-foreground space-y-1 max-w-sm">
              <p>
                Confidence score: <strong className="text-foreground">{base.confidenceScore}%</strong>
              </p>
              <p>
                Showing in {future ? 'future dollars' : "today's dollars"}. Move the sliders above to
                re-run every number on this page instantly.
              </p>
              {plan.income_strategy === 'ss_pension_only' && (
                <p className="border-t border-border/40 pt-2">
                  <strong className="text-foreground">Income strategy:</strong> lifestyle is covered by Social Security
                  {plan.spouse_pension_monthly > 0
                    ? ` (${formatCurrencyFull(plan.ss_monthly_estimate ?? 0)}/mo) plus spouse pension (${formatCurrencyFull(plan.spouse_pension_monthly)}/mo)`
                    : ''}{' '}
                  — no 4% withdrawal is taken, so the portfolio stays invested as legacy capital.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map(({ icon: Icon, label, value, onClick, active }: any) => (
          <Card
            key={label}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={
              onClick
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onClick();
                    }
                  }
                : undefined
            }
            className={`transition-all ${onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none' : ''} ${
              active ? 'border-primary ring-1 ring-primary/40' : ''
            }`}
          >
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </div>
              <p className="text-lg font-semibold tabular-nums">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <HouseholdRollupLine
        plan={plan}
        individualAtHorizon={projected}
        horizonAge={age}
        returnPct={rate}
        individualByAge={byAge}
      />
    </div>
  );
}
