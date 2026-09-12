import { Link } from 'react-router-dom';
import CollapsibleSection from '@/components/swingedge/CollapsibleSection';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { usePortfolioHeat } from '@/hooks/use-swingedge-heat';
import { cn } from '@/lib/utils';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

/**
 * Heat is measured as risk, not money invested. Sector money exposure and
 * sector risk are shown as two separate readings.
 */
export default function PortfolioHeatCard() {
  const { summary, isLoading } = usePortfolioHeat();
  const pctOfCeiling =
    summary.maxHeatDollars > 0
      ? Math.min(100, (summary.openRisk / summary.maxHeatDollars) * 100)
      : 0;

  return (
    <CollapsibleSection
      id="dash-portfolio-heat"
      title="Portfolio heat"
      description="How much of your account is actually at risk across every open trade right now."
      headerRight={
        <span onClick={(e) => e.stopPropagation()}>
          <Button asChild variant="outline" size="sm">
            <Link to="/swingedge/settings">Limits</Link>
          </Button>
        </span>
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-5 pt-1">
          <div className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <span className="text-2xl font-semibold tabular-nums">
                  {money(summary.openRisk)}
                </span>
                <span className="ml-2 text-sm text-muted-foreground">
                  at risk of {money(summary.maxHeatDollars)} allowed
                </span>
              </div>
              <Badge variant={summary.overHeatLimit ? 'destructive' : 'secondary'}>
                {summary.heatPct.toFixed(2)}% of capital
                {summary.overHeatLimit ? ' — over limit' : ''}
              </Badge>
            </div>
            <Progress
              value={pctOfCeiling}
              className={cn(summary.overHeatLimit && '[&>div]:bg-destructive')}
            />
            <p className="text-xs text-muted-foreground">
              {money(summary.riskAvailable)} of risk available for the next trade. Your ceiling is{' '}
              {summary.limits.maxPortfolioHeatPct}% of {money(summary.tradingCapital)}.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Risked at the outset" value={money(summary.originalRisk)} />
            <Stat label="Profit protected by stops" value={money(summary.lockedProfit)} />
            <Stat label="Money invested" value={money(summary.investedCapital)} />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              By sector — money exposure and risk are separate
            </p>
            {summary.sectors.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open trades.</p>
            ) : (
              <div className="space-y-2">
                {summary.sectors.map((s) => (
                  <div key={s.sector} className="rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium">{s.sector}</span>
                      <span className="text-xs text-muted-foreground">
                        {s.symbols.join(', ')}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <div className="text-xs">
                        <span className="text-muted-foreground">Money exposure </span>
                        <span
                          className={cn(
                            'font-medium tabular-nums',
                            s.overCapitalLimit && 'text-destructive',
                          )}
                        >
                          {money(s.capital)} ({s.capitalExposurePct.toFixed(2)}%)
                        </span>
                        {s.overCapitalLimit && (
                          <span className="ml-1 text-destructive">over limit</span>
                        )}
                      </div>
                      <div className="text-xs">
                        <span className="text-muted-foreground">At risk </span>
                        <span
                          className={cn(
                            'font-medium tabular-nums',
                            s.overHeatLimit && 'text-destructive',
                          )}
                        >
                          {money(s.risk)} ({s.heatPct.toFixed(2)}%)
                        </span>
                        {s.overHeatLimit && <span className="ml-1 text-destructive">over limit</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            A stop moved into profit lowers the risk on that trade to zero — it never turns heat
            negative.
          </p>
        </div>
      )}
    </CollapsibleSection>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
