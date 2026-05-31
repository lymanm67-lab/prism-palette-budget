import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Trophy } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Cell } from 'recharts';
import { InvestmentPlan } from '@/hooks/use-investment-plan';
import { runProjection, formatCurrencyFull } from '@/lib/investment/projection';

interface Props { plan: InvestmentPlan | null }

const SCENARIOS = [
  { rate: 6, label: 'Conservative', expected: 994_000 },
  { rate: 7, label: 'Average', expected: 1_054_000 },
  { rate: 8, label: 'Growth', expected: 1_119_000 },
  { rate: 9, label: 'Aggressive', expected: 1_188_000 },
  { rate: 10, label: 'Highly aggressive', expected: 1_261_000 },
];

// First Million target = $1M by ~June 2036, 10-year mark from June 2026 baseline
const FIRST_MILLION_TARGET = 1_000_000;
const FIRST_MILLION_YEARS = 10;

export function FirstMillionCard({ plan }: Props) {
  const [includeAccelerator, setIncludeAccelerator] = useState(true);
  const [includeLumpSum, setIncludeLumpSum] = useState(true);

  const results = useMemo(() => {
    if (!plan || !plan.current_age) return null;
    return SCENARIOS.map((s) => {
      const r = runProjection({
        currentAge: plan.current_age!,
        retirementAge: plan.current_age! + FIRST_MILLION_YEARS,
        currentBalance: plan.current_balance,
        targetAmount: FIRST_MILLION_TARGET,
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
        ssClaimingAge: plan.ss_claiming_age ?? undefined,
        ssInvestWhileWorking: plan.ss_invest_while_working,
        ssInvestPct: plan.ss_invest_pct,
        useFutureDollars: true,
        datedStepUps: includeAccelerator
          ? [
              { amount: 100, startDate: '2026-07-01' },
              { amount: 225, startDate: '2027-01-01' },
              { amount: 208, startDate: '2027-01-01' }, // First Million Accelerator
              { amount: 500, startDate: '2028-06-01' },
              { amount: 200, startDate: '2029-01-01' },
              { amount: 500, startDate: '2030-01-01' },
            ]
          : [],
        annualLumpSum: includeLumpSum ? { amount: 3000, startYear: 2028 } : undefined,
      });
      return { ...s, projected: r.projectedBalance };
    });
  }, [plan, includeAccelerator, includeLumpSum]);

  if (!plan || !results) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Complete the setup wizard to see your First Million projection.
        </CardContent>
      </Card>
    );
  }

  const sevenPct = results.find((r) => r.rate === 7)!;
  const eightPct = results.find((r) => r.rate === 8)!;
  const hits = results.filter((r) => r.projected >= FIRST_MILLION_TARGET).length;

  return (
    <Card className="bg-gradient-to-br from-card to-muted/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg">First Million by the 10-Year Mark</CardTitle>
          </div>
          <Badge variant="outline" className="bg-amber-500/15 text-amber-500 border-amber-500/30">
            {hits} of 5 scenarios hit $1M
          </Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-xs">
          <Stat label="Target" value="$1,000,000" />
          <Stat label="Target date" value="Jun 2036" />
          <Stat label="Accelerator" value="$208/mo from Jan 2027" />
          <Stat label="Annual lump" value="$3,000 from 2028" />
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Switch id="acc" checked={includeAccelerator} onCheckedChange={setIncludeAccelerator} />
            <Label htmlFor="acc" className="text-xs cursor-pointer">Include accelerator + step-ups</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="lump" checked={includeLumpSum} onCheckedChange={setIncludeLumpSum} />
            <Label htmlFor="lump" className="text-xs cursor-pointer">Include $3,000 annual lump</Label>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={results}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis
                dataKey="rate"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`}
              />
              <Tooltip
                formatter={(v: number) => formatCurrencyFull(v)}
                labelFormatter={(v) => `${v}% return`}
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              />
              <ReferenceLine
                y={FIRST_MILLION_TARGET}
                stroke="hsl(var(--primary))"
                strokeDasharray="4 4"
                label={{ value: '$1M target', position: 'insideTopRight', fontSize: 10, fill: 'hsl(var(--primary))' }}
              />
              <Bar dataKey="projected" radius={[4, 4, 0, 0]}>
                {results.map((r) => (
                  <Cell
                    key={r.rate}
                    fill={r.projected >= FIRST_MILLION_TARGET ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border/50">
                <th className="text-left py-2 font-medium">Scenario</th>
                <th className="text-right py-2 font-medium">Projected (Jun 2036)</th>
                <th className="text-right py-2 font-medium">Expected reference</th>
                <th className="text-right py-2 font-medium">Δ</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const delta = r.projected - r.expected;
                const pct = (delta / r.expected) * 100;
                return (
                  <tr key={r.rate} className="border-b border-border/30">
                    <td className="py-2">
                      <span className="font-medium">{r.rate}%</span>{' '}
                      <span className="text-muted-foreground">{r.label}</span>
                    </td>
                    <td className="text-right py-2 tabular-nums font-medium">{formatCurrencyFull(r.projected)}</td>
                    <td className="text-right py-2 tabular-nums text-muted-foreground">{formatCurrencyFull(r.expected)}</td>
                    <td className={`text-right py-2 tabular-nums ${Math.abs(pct) < 5 ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Your First Million target is set for the 10-year mark, around June 2036. With the $208 monthly
          accelerator beginning January 2027 and the $3,000 annual tax refund lump sum beginning in 2028,
          the <strong className="text-foreground">7% Average case projects ≈ {formatCurrencyFull(sevenPct.projected)}</strong>{' '}
          by the 10-year mark. The 8% Growth case projects ≈ {formatCurrencyFull(eightPct.projected)}.
        </p>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/40 p-2">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium tabular-nums text-foreground mt-0.5">{value}</p>
    </div>
  );
}
