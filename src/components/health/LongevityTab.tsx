import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { HeartPulse, PiggyBank, Clock, ShieldCheck } from 'lucide-react';
import {
  bmiBand,
  fmtMoney,
  longevityEstimate,
  walkTotals,
  weeklyHealthScore,
  weightStatus,
} from '@/lib/health/healthEngine';
import { useHealthLogs, useHealthProfile } from '@/hooks/use-health';

export default function LongevityTab() {
  const { data: profile } = useHealthProfile();
  const { data: logs = [] } = useHealthLogs();

  const status = weightStatus(profile ?? null, logs);
  const score = weeklyHealthScore(logs, profile ?? null);
  const est = longevityEstimate(profile ?? null, status, score);
  const totals = walkTotals(logs, profile ?? null);

  return (
    <div className="space-y-6">
      <Card className="border-0 prism-gradient">
        <CardContent className="p-6 text-prism-on-dark">
          <p className="text-xs uppercase tracking-wide text-prism-on-dark-muted">
            Healthy aging score
          </p>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-5xl font-bold tabular-nums">{est.healthyAgingScore}</span>
            <span className="text-prism-on-dark-muted">/ 100</span>
          </div>
          <p className="mt-3 max-w-2xl text-sm text-prism-on-dark-muted">
            Blends progress toward your goal weight with your weekly habit score. Lifetime walking:{' '}
            {totals.lifetime.toFixed(0)} miles.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {([
          [Clock, 'Healthy life expectancy', `${est.healthyLifeExpectancy.toFixed(1)} yrs`, 'Estimated healthy years'],
          [ShieldCheck, 'Independent living ahead', `${est.yearsIndependentLiving.toFixed(1)} yrs`, 'From today forward'],
          [PiggyBank, 'Annual medical savings', fmtMoney(est.annualMedicalSavings), 'Obesity-attributable spend avoided'],
          [PiggyBank, 'Lifetime medical savings', fmtMoney(est.lifetimeMedicalSavings), 'Projected through age 100+'],
        ] as const).map(([Icon, label, value, caption]) => (
          <Card key={label}>
            <CardContent className="p-5">
              <Icon className="h-5 w-5 text-prism-teal" />
              <p className="mt-3 text-2xl font-bold tabular-nums">{value}</p>
              <p className="text-sm font-medium">{label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <HeartPulse className="h-4 w-4 text-prism-rose" /> BMI trajectory
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Today</span>
                <span className="tabular-nums">
                  {est.bmiNow ? est.bmiNow.toFixed(1) : '—'} · {bmiBand(est.bmiNow).label}
                </span>
              </div>
              <Progress value={Math.min(100, ((est.bmiNow ?? 0) / 40) * 100)} className="mt-1 h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">At goal weight</span>
                <span className="tabular-nums">
                  {est.bmiAtGoal ? est.bmiAtGoal.toFixed(1) : '—'} · {bmiBand(est.bmiAtGoal).label}
                </span>
              </div>
              <Progress value={Math.min(100, ((est.bmiAtGoal ?? 0) / 40) * 100)} className="mt-1 h-2" />
            </div>
            <p className="text-xs text-muted-foreground">
              Add your height in the Profile tab if BMI shows as unavailable.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Retirement &amp; wealth impact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Health savings of <strong>{fmtMoney(est.annualMedicalSavings)}</strong> a year is capital
              that stays invested rather than going to healthcare cost.
            </p>
            <p>
              Potential insurance premium reduction: <strong>{fmtMoney(est.premiumSavings)}</strong> per
              year.
            </p>
            <p>
              More healthy years means a longer window for the portfolio to compound before withdrawals
              start — the same logic as the Compounding Crossover™ dashboard.
            </p>
            <p className="text-xs text-muted-foreground">
              Educational estimates only, based on published population averages. Not medical, insurance
              or investment advice.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
