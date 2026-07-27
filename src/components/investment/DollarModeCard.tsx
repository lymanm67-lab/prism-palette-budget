import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Info } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { InvestmentPlan } from '@/hooks/use-investment-plan';
import { useUpsertInvestmentPlan } from '@/hooks/use-investment-plan';
import { runProjection, formatCurrencyFull } from '@/lib/investment/projection';

type Mode = 'future' | 'today' | 'both';

interface Props { plan: InvestmentPlan | null }

export function DollarModeCard({ plan }: Props) {
  const upsert = useUpsertInvestmentPlan();
  const initialMode: Mode = plan?.use_future_dollars === false ? 'today' : 'future';
  const [mode, setMode] = useState<Mode>(initialMode);

  if (!plan || !plan.current_age || !plan.retirement_age) return null;

  const years = Math.max(0, plan.retirement_age - plan.current_age);
  const inflationPct = plan.inflation_pct ?? 2.5;
  const inflationFactor = Math.pow(1 + inflationPct / 100, years);

  // Always run projection in nominal/future dollars for clean separation
  const nominal = runProjection({
    currentAge: plan.current_age,
    retirementAge: plan.retirement_age,
    currentBalance: plan.current_balance,
    targetAmount: plan.target_amount,
    monthlyEmployeeContribution: plan.monthly_employee_contribution,
    monthlyEmployerContribution: plan.monthly_employer_contribution,
    employerMatchPct: plan.employer_match_pct ?? undefined,
    currentMonthlyIncome: plan.current_monthly_income ?? undefined,
    expectedReturnPct: plan.expected_return_pct,
    annualRaisePct: plan.annual_raise_pct,
    raiseRedirectPct: plan.raise_redirect_pct,
    debtPaymentAmount: plan.debt_payment_amount ?? undefined,
    debtPayoffDate: plan.debt_payoff_date,
    additionalMonthlyAmount: plan.additional_monthly_amount ?? undefined,
    additionalStartDate: plan.additional_start_date,
    ssMonthlyEstimate: plan.ss_monthly_estimate ?? undefined,
    incomeFromSsPensionOnly: plan.income_strategy === 'ss_pension_only',
    spousePensionMonthly: plan.spouse_pension_monthly ?? 0,
    ssClaimingAge: plan.ss_claiming_age ?? undefined,
    ssInvestWhileWorking: plan.ss_invest_while_working,
    ssInvestPct: plan.ss_invest_pct,
    useFutureDollars: true,
    inflationPct,
  });

  // Also build a 7% and 8% nominal for chart
  const at = (rate: number) => runProjection({
    currentAge: plan.current_age!,
    retirementAge: plan.retirement_age!,
    currentBalance: plan.current_balance,
    targetAmount: plan.target_amount,
    monthlyEmployeeContribution: plan.monthly_employee_contribution,
    monthlyEmployerContribution: plan.monthly_employer_contribution,
    employerMatchPct: plan.employer_match_pct ?? undefined,
    currentMonthlyIncome: plan.current_monthly_income ?? undefined,
    expectedReturnPct: rate,
    annualRaisePct: plan.annual_raise_pct,
    raiseRedirectPct: plan.raise_redirect_pct,
    debtPaymentAmount: plan.debt_payment_amount ?? undefined,
    debtPayoffDate: plan.debt_payoff_date,
    additionalMonthlyAmount: plan.additional_monthly_amount ?? undefined,
    additionalStartDate: plan.additional_start_date,
    ssMonthlyEstimate: plan.ss_monthly_estimate ?? undefined,
    incomeFromSsPensionOnly: plan.income_strategy === 'ss_pension_only',
    spousePensionMonthly: plan.spouse_pension_monthly ?? 0,
    ssClaimingAge: plan.ss_claiming_age ?? undefined,
    ssInvestWhileWorking: plan.ss_invest_while_working,
    ssInvestPct: plan.ss_invest_pct,
    useFutureDollars: true,
    inflationPct,
  }).projectedBalance;

  const proj7 = at(7);
  const proj8 = at(8);

  const goal = plan.target_amount || 4_000_000;
  const inflationAdjustedGoal = goal * inflationFactor;
  const todayDollarsProjection = nominal.projectedBalance / inflationFactor;

  const handleModeChange = async (next: Mode) => {
    setMode(next);
    if (next === 'future' && plan.use_future_dollars !== true) {
      await upsert.mutateAsync({ id: plan.id, use_future_dollars: true });
    } else if (next === 'today' && plan.use_future_dollars !== false) {
      await upsert.mutateAsync({ id: plan.id, use_future_dollars: false });
    }
  };

  const handleInflationChange = async (val: string) => {
    const n = parseFloat(val);
    if (!isNaN(n)) await upsert.mutateAsync({ id: plan.id, inflation_pct: n });
  };

  const chartData = [
    { name: `$${(goal / 1_000_000).toFixed(1)}M Future-$ Goal`, value: goal, fill: 'hsl(var(--primary))' },
    { name: `Inflation-Adj Equiv (${inflationPct}%)`, value: inflationAdjustedGoal, fill: 'hsl(var(--muted-foreground))' },
    { name: 'Projected @ 7%', value: proj7, fill: proj7 >= goal ? 'hsl(var(--chart-2, 142 71% 45%))' : 'hsl(var(--destructive))' },
    { name: 'Projected @ 8%', value: proj8, fill: proj8 >= goal ? 'hsl(var(--chart-2, 142 71% 45%))' : 'hsl(var(--destructive))' },
  ];

  const ModeButton = ({ value, label }: { value: Mode; label: string }) => (
    <button
      type="button"
      onClick={() => handleModeChange(value)}
      className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
        mode === value ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70 text-muted-foreground'
      }`}
    >
      {label}
    </button>
  );

  const showFuture = mode === 'future' || mode === 'both';
  const showToday = mode === 'today' || mode === 'both';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Future Dollars vs Today's Dollars</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Future dollars show your actual projected account balance at retirement. Today's dollars show what that balance may feel like after adjusting for inflation.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode toggle */}
        <div>
          <Label className="text-xs text-muted-foreground">Projection Dollar Mode</Label>
          <div className="flex gap-2 mt-1.5">
            <ModeButton value="future" label="Future dollars" />
            <ModeButton value="today" label="Today's dollars" />
            <ModeButton value="both" label="Show both" />
          </div>
        </div>

        {/* Inflation control */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Label htmlFor="inflation" className="text-xs text-muted-foreground">Inflation assumption (%)</Label>
            <Input
              id="inflation"
              type="number"
              step="0.1"
              defaultValue={inflationPct}
              onBlur={(e) => handleInflationChange(e.target.value)}
              className="mt-1 h-9 w-28"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            <div>Target age: <span className="font-mono text-foreground">{plan.retirement_age}</span></div>
            <div>Years until target: <span className="font-mono text-foreground">{years}</span></div>
          </div>
        </div>

        {/* Comparison rows */}
        <div className="grid gap-3">
          {showFuture && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-medium">{formatCurrencyFull(goal)} future-dollar goal by age {plan.retirement_age}</span>
                <Badge variant="outline" className={nominal.projectedBalance >= goal ? 'border-emerald-500/40 text-emerald-500' : 'border-rose-500/40 text-rose-500'}>
                  {nominal.projectedBalance >= goal ? 'On track' : 'Short'}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">Projected future account value at age {plan.retirement_age}</div>
              <div className="text-lg font-semibold tabular-nums mt-1">{formatCurrencyFull(nominal.projectedBalance)}</div>
            </div>
          )}
          {showToday && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-medium">{formatCurrencyFull(goal)} in today's purchasing power</span>
                <Badge variant="outline" className={todayDollarsProjection >= goal ? 'border-emerald-500/40 text-emerald-500' : 'border-amber-500/40 text-amber-500'}>
                  Educational
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                To preserve {formatCurrencyFull(goal)} of purchasing power, you'd need ~{formatCurrencyFull(inflationAdjustedGoal)} in future dollars.
              </div>
              <div className="text-lg font-semibold tabular-nums mt-1">{formatCurrencyFull(todayDollarsProjection)} <span className="text-xs font-normal text-muted-foreground">in today's purchasing power</span></div>
            </div>
          )}
        </div>

        {/* Chart */}
        <div>
          <div className="text-xs font-medium mb-2">Future Dollars vs Inflation-Adjusted Goal</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} interval={0} />
                <YAxis tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  formatter={(v: number) => formatCurrencyFull(v)}
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Use this chart to avoid confusing future-dollar projections with today's-dollar purchasing power.
          </p>
        </div>

        {/* Warning + insights */}
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-muted-foreground">
            Your projection may look short if the app is comparing your future account value against an inflation-adjusted goal. Confirm whether your goal is future dollars or today's dollars.
          </p>
        </div>

        <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-xs">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="space-y-2 text-muted-foreground">
            <p>
              Your {formatCurrencyFull(goal)} target is currently set as a <span className="font-medium text-foreground">{mode === 'today' ? "today's-dollar" : 'future-dollar'} goal</span>. {mode === 'today'
                ? `Prism inflates the goal to ~${formatCurrencyFull(inflationAdjustedGoal)} to preserve purchasing power.`
                : `Prism compares your projected account value at age ${plan.retirement_age} directly against ${formatCurrencyFull(goal)}.`}
            </p>
            <p>
              At {inflationPct}% inflation over {years} years, {formatCurrencyFull(goal)} in today's purchasing power may require approximately {formatCurrencyFull(inflationAdjustedGoal)} in future dollars. This is why inflation-adjusted projections may look lower or appear to fall short.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
