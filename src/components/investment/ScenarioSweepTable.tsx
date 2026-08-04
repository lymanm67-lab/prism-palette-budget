import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target } from 'lucide-react';
import { formatCurrencyFull } from '@/lib/investment/projection';
import { projectSnapshot } from '@/lib/investment/snapshotProjection';
import type { InvestmentPlan } from '@/hooks/use-investment-plan';

const SCENARIOS = [
  { rate: 6, label: 'Conservative' },
  { rate: 7, label: 'Average' },
  { rate: 8, label: 'Growth' },
  { rate: 9, label: 'Aggressive' },
  { rate: 10, label: 'Aggressive+' },
];

interface Props {
  plan: InvestmentPlan | null;
  horizonAge?: number;
  backupAge?: number;
  futureDollars?: boolean;
}

export function ScenarioSweepTable({ plan, horizonAge = 75, backupAge = 78, futureDollars = true }: Props) {
  const rows = useMemo(() => {
    if (!plan || !plan.current_age) return [];
    return SCENARIOS.map((s) => ({
      ...s,
      primary: projectSnapshot(plan, s.rate, horizonAge, futureDollars).projectedBalance,
      backup: projectSnapshot(plan, s.rate, backupAge, futureDollars).projectedBalance,
    }));
  }, [plan, horizonAge, backupAge, futureDollars]);

  // Longevity view: grow the age-85 balance forward to 95 and 100, with and
  // without a 2.5% annual withdrawal starting the year after retirement.
  const longevity = useMemo(() => {
    if (!plan || !plan.current_age) return [];
    const grow = (start: number, rate: number, years: number, withdraw: boolean) => {
      let bal = start;
      for (let i = 0; i < years; i++) {
        bal *= 1 + rate / 100;
        if (withdraw) bal -= bal * 0.025;
      }
      return bal;
    };
    return SCENARIOS.map((s) => {
      const at85 = projectSnapshot(plan, s.rate, 85, futureDollars).projectedBalance;
      return {
        ...s,
        a95: grow(at85, s.rate, 10, false),
        a95w: grow(at85, s.rate, 10, true),
        a100: grow(at85, s.rate, 15, false),
        a100w: grow(at85, s.rate, 15, true),
      };
    });
  }, [plan, futureDollars]);

  if (!plan || !plan.current_age) return null;


  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Age {horizonAge} &amp; Age {backupAge} projection by return scenario
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Computed with all step-ups, the $208 accelerator, and the $3K annual lump sum.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50 text-muted-foreground">
                <th className="text-left py-2 font-medium">Scenario</th>
                <th className="text-right py-2 font-medium">Age {horizonAge}</th>
                <th className="text-right py-2 font-medium">Age {backupAge}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const hit = s.primary >= plan.target_amount;
                return (
                  <tr
                    key={s.rate}
                    className={`border-b border-border/30 transition-colors hover:bg-accent/40 ${
                      s.rate === plan.expected_return_pct ? 'bg-primary/5' : ''
                    }`}
                  >
                    <td className="py-2">
                      <span className="font-medium">{s.rate}%</span>{' '}
                      <span className="text-muted-foreground">{s.label}</span>
                      {s.rate === plan.expected_return_pct && (
                        <span className="ml-2 text-[10px] text-primary">your case</span>
                      )}
                    </td>
                    <td className={`text-right py-2 tabular-nums font-medium ${hit ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {formatCurrencyFull(s.primary)}
                    </td>
                    <td className="text-right py-2 tabular-nums font-medium">{formatCurrencyFull(s.backup)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-6">
          <h4 className="text-sm font-semibold mb-1">Longevity: age 95 &amp; 100</h4>
          <p className="text-xs text-muted-foreground mb-2">
            Starts from the age-85 balance, then grows forward — shown with no withdrawals and
            with a 2.5% annual withdrawal beginning at 86.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground">
                  <th className="text-left py-2 font-medium">Scenario</th>
                  <th className="text-right py-2 font-medium">95 — no draw</th>
                  <th className="text-right py-2 font-medium">95 — 2.5% draw</th>
                  <th className="text-right py-2 font-medium">100 — no draw</th>
                  <th className="text-right py-2 font-medium">100 — 2.5% draw</th>
                </tr>
              </thead>
              <tbody>
                {longevity.map((s) => (
                  <tr
                    key={s.rate}
                    className={`border-b border-border/30 transition-colors hover:bg-accent/40 ${
                      s.rate === plan.expected_return_pct ? 'bg-primary/5' : ''
                    }`}
                  >
                    <td className="py-2">
                      <span className="font-medium">{s.rate}%</span>{' '}
                      <span className="text-muted-foreground">{s.label}</span>
                    </td>
                    <td className="text-right py-2 tabular-nums font-medium">{formatCurrencyFull(s.a95)}</td>
                    <td className="text-right py-2 tabular-nums text-muted-foreground">{formatCurrencyFull(s.a95w)}</td>
                    <td className="text-right py-2 tabular-nums font-medium">{formatCurrencyFull(s.a100)}</td>
                    <td className="text-right py-2 tabular-nums text-muted-foreground">{formatCurrencyFull(s.a100w)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          <strong className="text-foreground">Interpretation:</strong> age {horizonAge} is the plan horizon;
          age {backupAge} is the backup scenario. 9% and 10% are upside cases — not lifestyle-spending assumptions.
        </p>

      </CardContent>
    </Card>
  );
}
