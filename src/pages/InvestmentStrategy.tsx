import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RolesBoard } from '@/components/investing/RolesBoard';
import { AllocationTargets } from '@/components/investing/AllocationTargets';
import { CapitalPriorityPanel } from '@/components/investing/CapitalPriorityPanel';
import { RiskPanel } from '@/components/investing/RiskPanel';
import { DisciplinePanel } from '@/components/investing/DisciplinePanel';
import { TaxAndAccountsPanel } from '@/components/investing/TaxAndAccountsPanel';
import { WatchlistPanel } from '@/components/investing/WatchlistPanel';
import { ScenarioPanel } from '@/components/investing/ScenarioPanel';
import { ReviewsPanel } from '@/components/investing/ReviewsPanel';
import { useInvestingMetrics } from '@/hooks/use-investing-metrics';
import { ROLE_META, ROLES, money, pct } from '@/lib/investing/roles';

export default function InvestmentStrategy() {
  const { loading, totals, allocation, positions, tacticalPct, tacticalWarn, fit, priority } = useInvestingMetrics();

  useEffect(() => {
    document.title = 'Investment Strategy — Five Investment Roles | Prism';
  }, []);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Strategy Control Center</h1>
        <p className="text-muted-foreground">
          The Prism Five Investment Roles. Every investment must have a job — and that job has to serve the rest of your plan.
        </p>
      </header>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: 'Role portfolio value', value: money(totals.value), sub: `${positions.length} positions across ${allocation.rows.filter((r) => r.value > 0).length} roles` },
            { label: 'Strategy Fit Score', value: `${Math.round(fit.score)}/100`, sub: 'How closely today matches your plan' },
            { label: 'Higher-risk share', value: pct(tacticalPct), sub: `Warning line ${pct(tacticalWarn, 0)}` },
            { label: 'Capital priority', value: priority.clearedToInvest ? 'Clear to invest' : 'Earlier claims first', sub: priority.clearedToInvest ? 'Reserve floor and debt checks pass' : 'See Capital Priority tab' },
          ].map((s) => (
            <Card key={s.label} className="border-border/60 bg-card/60 backdrop-blur">
              <CardHeader className="pb-1">
                <CardDescription>{s.label}</CardDescription>
                <CardTitle className="text-xl">{s.value}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">{s.sub}</CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">The five roles</CardTitle>
          <CardDescription>Each role has one job. A holding that cannot answer "what job does this do?" does not belong in the portfolio.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          {ROLES.map((r) => (
            <div key={r} className="rounded-lg border border-border/60 bg-background/40 p-3">
              <Badge variant="outline" className={ROLE_META[r].accent}>{r}</Badge>
              <div className="mt-2 text-sm font-medium">{ROLE_META[r].purpose}</div>
              <p className="mt-1 text-xs text-muted-foreground">{ROLE_META[r].job}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Tabs defaultValue="roles">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="roles">Roles &amp; holdings</TabsTrigger>
          <TabsTrigger value="targets">Targets &amp; drift</TabsTrigger>
          <TabsTrigger value="priority">Capital priority</TabsTrigger>
          <TabsTrigger value="risk">Risk &amp; overlap</TabsTrigger>
          <TabsTrigger value="discipline">Buy / sell discipline</TabsTrigger>
          <TabsTrigger value="tax">Accounts &amp; tax</TabsTrigger>
          <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          <TabsTrigger value="reviews">Reviews &amp; attribution</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="mt-4"><RolesBoard /></TabsContent>
        <TabsContent value="targets" className="mt-4"><AllocationTargets /></TabsContent>
        <TabsContent value="priority" className="mt-4"><CapitalPriorityPanel /></TabsContent>
        <TabsContent value="risk" className="mt-4"><RiskPanel /></TabsContent>
        <TabsContent value="discipline" className="mt-4"><DisciplinePanel /></TabsContent>
        <TabsContent value="tax" className="mt-4"><TaxAndAccountsPanel /></TabsContent>
        <TabsContent value="watchlist" className="mt-4"><WatchlistPanel /></TabsContent>
        <TabsContent value="scenarios" className="mt-4"><ScenarioPanel /></TabsContent>
        <TabsContent value="reviews" className="mt-4"><ReviewsPanel /></TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">
        Prism never places trades, connects to a brokerage for orders, or moves money. Every projection is an estimate based on the assumptions you
        enter — not a guarantee, and not personalized investment, tax, or legal advice.
      </p>
    </div>
  );
}
