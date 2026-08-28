import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { AlertTriangle, BellRing, ArrowRight } from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';
import type { MoneyPurposeSnapshot } from '@/hooks/use-money-purpose';
import type { CoreKey } from '@/lib/budgeting/blueprint5010';
import { PURPOSE_META } from '@/lib/budgeting/moneyPurpose';

const LS_KEY = 'prism-blueprint-drift-threshold';

interface DriftAlert {
  key: CoreKey;
  message: string;
  driftPts: number;
  action: { label: string; href: string };
}

function computeAlerts(snap: MoneyPurposeSnapshot, threshold: number): DriftAlert[] {
  const alerts: DriftAlert[] = [];
  const debtActive = snap.blueprint.phase !== 3;
  for (const c of snap.blueprint.cards) {
    const drift = c.actualPct - c.targetPct;
    const over = drift > threshold; // above ceiling
    const under = -drift > threshold; // below floor (wealth / debt)
    switch (c.key) {
      case 'live':
        if (over) {
          alerts.push({
            key: 'live',
            driftPts: drift,
            message: `LIVE is ${drift.toFixed(1)} pts above target — audit necessities before treating this as overspending; look for expense optimization, not lifestyle cuts to force a number.`,
            action: { label: 'Review LIVE Categories', href: '/budgets/categories' },
          });
        }
        break;
      case 'enjoy':
        if (over) {
          alerts.push({
            key: 'enjoy',
            driftPts: drift,
            message: `ENJOY exceeded its ceiling by ${drift.toFixed(1)} pts — redirect the excess back to ${debtActive ? 'debt' : 'wealth'}.`,
            action: { label: debtActive ? 'Apply to Debt' : 'Invest It', href: debtActive ? '/debt' : '/planning/investments' },
          });
        }
        break;
      case 'build_wealth':
        if (under) {
          alerts.push({
            key: 'build_wealth',
            driftPts: -drift,
            message: `BUILD WEALTH is ${(-drift).toFixed(1)} pts short of target (payroll credit already included) — close the gap from take-home.`,
            action: { label: 'Invest It', href: '/planning/investments' },
          });
        }
        break;
      case 'eliminate_debt':
        if (debtActive && under) {
          alerts.push({
            key: 'eliminate_debt',
            driftPts: -drift,
            message: `ELIMINATE DEBT is ${(-drift).toFixed(1)} pts below target — move idle cash to the highest-priority debt.`,
            action: { label: 'Apply to Debt', href: '/debt' },
          });
        }
        break;
    }
  }
  return alerts;
}

export default function BlueprintDriftAlerts({ snap }: { snap: MoneyPurposeSnapshot }) {
  const { formatCurrency } = useCurrency();
  const [threshold, setThreshold] = useState<number>(() => {
    const v = Number(localStorage.getItem(LS_KEY));
    return Number.isFinite(v) && v >= 1 && v <= 20 ? v : 5;
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, String(threshold));
  }, [threshold]);

  const alerts = computeAlerts(snap, threshold);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="font-display flex items-center gap-2 text-sm">
            <BellRing className="h-4 w-4 text-primary" />
            Target Drift Alerts
          </CardTitle>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>Alert when off target by</span>
            <Slider
              className="w-28"
              value={[threshold]}
              onValueChange={(v) => setThreshold(v[0])}
              min={1}
              max={20}
              step={1}
            />
            <span className="w-10 font-semibold text-foreground">±{threshold} pts</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.length === 0 ? (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5 text-xs text-emerald-700 dark:text-emerald-400">
            All four purposes are within ±{threshold} points of target. Keep the streak going.
          </p>
        ) : (
          alerts.map((a) => {
            const card = snap.blueprint.cards.find((c) => c.key === a.key)!;
            return (
              <div key={a.key} className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                <div className="min-w-0 flex-1 text-xs">
                  <p className="font-semibold" style={{ color: PURPOSE_META[a.key].color }}>
                    {PURPOSE_META[a.key].short}: {formatCurrency(card.actualAmount)} ({card.actualPct.toFixed(1)}%) vs target {formatCurrency(card.targetAmount)} ({card.targetPct}%)
                  </p>
                  <p className="mt-0.5 text-muted-foreground">{a.message}</p>
                </div>
                <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" asChild>
                  <a href={a.action.href}>
                    {a.action.label} <ArrowRight className="h-3 w-3" />
                  </a>
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
