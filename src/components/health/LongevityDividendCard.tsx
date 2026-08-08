// Longevity Dividend™ — what your daily habits are worth in dollars and years.
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  Activity, ArrowRight, Clock, HeartPulse, PiggyBank, ShieldAlert, TrendingUp,
} from 'lucide-react';
import { useLongevityDividend } from '@/hooks/use-longevity';
import { fmtMoney } from '@/lib/health/healthEngine';

export default function LongevityDividendCard() {
  const navigate = useNavigate();
  const { horizon, dividend, isLoading, hasFinancialData } = useLongevityDividend();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-48 animate-pulse rounded-lg bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-0 prism-gradient">
        <CardContent className="p-6 text-prism-on-dark">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-prism-on-dark-muted">
                Longevity Dividend™
              </p>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-4xl font-bold tabular-nums">
                  {dividend ? fmtMoney(dividend.totalDividend) : '—'}
                </span>
                <span className="text-sm text-prism-on-dark-muted">lifetime value of your habits</span>
              </div>
              <p className="mt-3 max-w-2xl text-sm text-prism-on-dark-muted">
                {dividend
                  ? dividend.headline
                  : 'Connect accounts and a retirement plan to price your health in dollars.'}
              </p>
            </div>
            <div className="rounded-xl bg-prism-on-dark/10 p-4 text-center">
              <p className="text-[10px] uppercase tracking-wide text-prism-on-dark-muted">
                Plan to age
              </p>
              <p className="text-3xl font-bold tabular-nums">{Math.round(horizon.planningAge)}</p>
              <p className="text-[11px] text-prism-on-dark-muted">
                healthspan {Math.round(horizon.healthspanAge)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* horizon drivers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-prism-teal" /> Health-adjusted planning horizon
            </span>
            <Badge variant={horizon.confidence === 'high' ? 'default' : 'secondary'}>
              {horizon.confidence} confidence · {horizon.loggedDays} days logged
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {horizon.drivers.map((d, idx) => (
            <div key={d.label} className="flex items-start justify-between gap-4 text-sm">
              <div>
                <p className="font-medium">{d.label}</p>
                <p className="text-xs text-muted-foreground">{d.note}</p>
              </div>
              <span
                className={`shrink-0 tabular-nums font-semibold ${
                  idx === 0
                    ? ''
                    : d.years > 0
                      ? 'text-prism-teal'
                      : d.years < 0
                        ? 'text-prism-rose'
                        : 'text-muted-foreground'
                }`}
              >
                {idx === 0
                  ? `age ${d.years}`
                  : `${d.years > 0 ? '+' : ''}${d.years.toFixed(1)} yr`}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t pt-3 text-sm font-semibold">
            <span>Planning age used by retirement projections</span>
            <span className="tabular-nums">{horizon.planningAge.toFixed(1)}</span>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Health factor</span>
              <span>{Math.round(horizon.healthFactor * 100)}%</span>
            </div>
            <Progress value={horizon.healthFactor * 100} />
          </div>
        </CardContent>
      </Card>

      {/* dollarised components */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            [
              PiggyBank,
              'Healthcare avoided',
              dividend ? fmtMoney(dividend.healthcareLifetimeSaved) : '—',
              dividend
                ? `${fmtMoney(dividend.healthcareAnnualSaved)}/yr vs the ${fmtMoney(dividend.healthcareBaselineAnnual)} retiree baseline`
                : 'Needs financial data',
            ],
            [
              ShieldAlert,
              'Long-term care risk',
              dividend ? `${Math.round(dividend.ltcRiskAdjustedPct)}%` : '—',
              dividend
                ? `Down from ${Math.round(dividend.ltcRiskBaselinePct)}% — ${fmtMoney(dividend.ltcSaved)} expected cost avoided`
                : 'Needs financial data',
            ],
            [
              Activity,
              'Extra earning years',
              dividend ? `${dividend.extraWorkingYears.toFixed(1)} yr` : '—',
              dividend
                ? `${fmtMoney(dividend.extraWorkingValue)} of additional compounded contributions`
                : 'Needs financial data',
            ],
            [
              TrendingUp,
              'Legacy at horizon',
              dividend ? fmtMoney(dividend.legacyAtHealthHorizon) : '—',
              dividend
                ? dividend.legacyDelta >= 0
                  ? `${fmtMoney(dividend.legacyDelta)} more than the baseline horizon`
                  : `${fmtMoney(Math.abs(dividend.legacyDelta))} less — extra years cost money`
                : 'Needs financial data',
            ],
          ] as const
        ).map(([Icon, label, value, caption]) => (
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

      {/* funding check */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <HeartPulse className="h-4 w-4 text-prism-rose" /> Does the money last as long as you do?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!hasFinancialData ? (
            <p className="text-muted-foreground">
              Add accounts, debts and an active investment plan to run this check.
            </p>
          ) : dividend?.moneyOutlivesYou ? (
            <p>
              At current contributions the portfolio funds spending past age{' '}
              <strong>{Math.round(horizon.planningAge)}</strong>. Every point of habit consistency
              extends that surplus into legacy.
            </p>
          ) : (
            <p>
              The portfolio is projected to run dry at age{' '}
              <strong className="text-prism-rose">{dividend?.fundedThroughAge}</strong> while your
              health-adjusted horizon is <strong>{Math.round(horizon.planningAge)}</strong>. Close
              the gap with contributions, later retirement or lower retirement spending.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate('/legacy/sequence-risk')}>
              Stress-test the horizon <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate('/legacy/preservation')}>
              Retirement preservation
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Educational estimates built from your logged data and published population averages —
            not medical or investment advice.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
