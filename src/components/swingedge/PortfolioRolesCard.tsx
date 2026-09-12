import { Link } from 'react-router-dom';
import CollapsibleSection from '@/components/swingedge/CollapsibleSection';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useSymbolRoles } from '@/hooks/use-swingedge-roles';
import { pipelineBreakdown, roleBreakdown, statusMeta } from '@/lib/swingedge/roles';
import { RoleBadge, StatusBadge } from '@/components/swingedge/SymbolRoleControls';

/** Dashboard widget pair: what job each name plays, and where it sits in the process. */
export default function PortfolioRolesCard() {
  const { roles, isLoading } = useSymbolRoles();
  const byRole = roleBreakdown(roles);
  const pipeline = pipelineBreakdown(roles);

  return (
    <CollapsibleSection
      id="dash-dual-watchlist"
      title="Roles and pipeline"
      description="Two separate questions: what job a name plays, and where it is in the trading process."
      headerRight={
        <span onClick={(e) => e.stopPropagation()}>
          <Button asChild variant="outline" size="sm">
            <Link to="/swingedge/watchlists">Manage</Link>
          </Button>
        </span>
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : roles.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No roles set yet. Open{' '}
          <Link to="/swingedge/watchlists" className="underline">
            Watchlists
          </Link>{' '}
          and give each name a portfolio role.
        </p>
      ) : (
        <div className="grid gap-6 pt-1 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Portfolio roles
            </p>
            {byRole.map((r) => (
              <div key={r.value} className="flex items-center justify-between gap-2">
                <RoleBadge role={r.value} />
                <span className="text-sm tabular-nums text-muted-foreground">{r.count}</span>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Trading pipeline
            </p>
            {pipeline
              .filter((p) => p.symbols.length)
              .map((p) => (
                <div key={p.stage} className="space-y-1">
                  <p className="text-xs font-medium">{p.stage}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.symbols.map((s) => {
                      const status = roles.find((r) => r.symbol === s)?.trading_status ?? '';
                      return (
                        <Link key={s} to={`/swingedge/analyzer?symbol=${s}`}>
                          <Badge
                            variant="outline"
                            className={cn('font-semibold', statusMeta(status).tone)}
                          >
                            {s}
                          </Badge>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            {roles.some((r) => r.trading_status === 'QUALIFIED_TRADE') ? (
              <p className="text-xs text-muted-foreground">
                Qualified names are the only ones worth planning today.{' '}
                <Link to="/swingedge/planner" className="underline">
                  Open Trade Planner
                </Link>
                .
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
              <span>Legend:</span>
              <StatusBadge status="QUALIFIED_TRADE" />
              <StatusBadge status="PULLBACK_WATCH" />
              <StatusBadge status="REJECTED" />
            </div>
          </div>
        </div>
      )}
    </CollapsibleSection>
  );
}
