import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, RotateCcw, TrendingUp } from 'lucide-react';
import { useTravelSettings, useTravelTrips } from '@/hooks/use-travel-fund';
import {
  SCENARIO_BUDGETS, TravelSettings, TravelTrip, costTrend, inflationPlan, money,
  monthName, monthsUntil, rolloverPlan, scenarioTable, tripFunding,
} from '@/lib/travel/travelFund';

interface Props { trips: TravelTrip[]; settings: TravelSettings }

export function TrendPlannerTab({ trips, settings }: Props) {
  const { save } = useTravelSettings();
  const { create, update } = useTravelTrips();
  const [history, setHistory] = useState(settings.cost_history);
  const [newTrip, setNewTrip] = useState({
    destination: '', travel_month: '1', travel_year: String(new Date().getFullYear() + 2),
    budget_target: String(settings.target_budget), saved_amount: '0',
  });
  const [reset, setReset] = useState({ fundBalance: '6000', actualCost: '5200' });

  const trend = useMemo(() => costTrend(history), [history]);

  const focus = trips.filter((t) => t.status !== 'completed' && !t.is_prepaid)[0] ?? null;
  const focusFunding = focus ? tripFunding(focus, settings) : null;
  const months = focusFunding?.monthsRemaining ?? 12;

  const scenarios = useMemo(
    () => scenarioTable(months || 12, focusFunding?.saved ?? 0, SCENARIO_BUDGETS),
    [months, focusFunding],
  );

  const infl = inflationPlan(
    trend.latest?.amount ?? settings.target_budget,
    focusFunding?.saved ?? 0,
    settings.inflation_pct,
    12,
  );

  const roll = rolloverPlan(
    Number(reset.fundBalance) || 0,
    Number(reset.actualCost) || 0,
    settings.target_budget,
    12,
  );

  return (
    <div className="space-y-4">
      {/* Cost trend */}
      <Card className="prism-card-shine border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-prism-sky" /> Annual travel cost trend
          </CardTitle>
          <p className="text-xs text-muted-foreground">Enter actual spend per year. Averages use entered data only.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {history.map((h, i) => (
              <div key={h.year} className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {h.year}{h.label ? ` · ${h.label}` : ''}
                </Label>
                <Input
                  className="h-9" type="number" placeholder="Actual"
                  value={h.amount ?? ''}
                  onChange={(e) => {
                    const v = e.target.value === '' ? null : Number(e.target.value);
                    setHistory((list) => list.map((x, xi) => (xi === i ? { ...x, amount: v } : x)));
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Button size="sm" variant="outline" onClick={() => save.mutate({ cost_history: history } as any)}>
              Save history
            </Button>
            <Button
              size="sm" variant="ghost"
              onClick={() => setHistory((l) => [...l, { year: (l[l.length - 1]?.year ?? 2027) + 1, amount: null }])}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add year
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <Mini label="Average annual cost" value={trend.count ? money(trend.average) : '—'} />
            <Mini label="3-year average" value={trend.count ? money(trend.threeYear) : '—'} />
            <Mini label="5-year average" value={trend.count ? money(trend.fiveYear) : '—'} />
            <Mini
              label="Year-over-year change"
              value={trend.yoyPct == null ? '—' : `${trend.yoyPct > 0 ? '+' : ''}${trend.yoyPct.toFixed(1)}%`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Inflation planner */}
      <Card className="prism-card-shine border-border/50">
        <CardHeader className="pb-2"><CardTitle className="text-base">Travel inflation planner</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1 w-[160px]">
              <Label className="text-xs text-muted-foreground">Travel inflation %</Label>
              <Input
                className="h-9" type="number" defaultValue={settings.inflation_pct}
                onBlur={(e) => save.mutate({ inflation_pct: Number(e.target.value) || 0 } as any)}
              />
            </div>
            <Mini label="Previous trip cost" value={money(trend.latest?.amount ?? settings.target_budget)} />
            <Mini label="Current travel fund" value={money(focusFunding?.saved ?? 0)} />
            <Mini label="Estimated next trip cost" value={money(infl.estimatedNext)} />
            <Mini label="Recommended monthly savings" value={money(infl.recommendedMonthly)} />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => save.mutate({ monthly_target: infl.recommendedMonthly, target_budget: infl.estimatedNext } as any)}
            >
              Approve updated target
            </Button>
            <p className="text-[11px] text-muted-foreground self-center">
              $6,000 is not assumed to stay sufficient — approve a new target each year.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Scenarios */}
      <Card className="prism-card-shine border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Travel goal scenarios</CardTitle>
          <p className="text-xs text-muted-foreground">
            Required monthly savings over {months || 12} months, starting from {money(focusFunding?.saved ?? 0)} saved.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Trip budget</TableHead>
                <TableHead className="text-xs text-right">Remaining</TableHead>
                <TableHead className="text-xs text-right">Months</TableHead>
                <TableHead className="text-xs text-right">Required monthly</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scenarios.map((s) => (
                <TableRow key={s.budget}>
                  <TableCell className="text-xs font-medium">{money(s.budget)}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{money(s.remaining)}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{s.months}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums font-semibold">
                    {money(s.requiredMonthly)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Rollover / annual reset */}
      <Card className="prism-card-shine border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-prism-teal" /> Annual reset & rollover
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            After each January trip: mark it completed, record the final cost, roll unused funds forward and start
            the new cycle February 1.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1 w-[150px]">
              <Label className="text-xs text-muted-foreground">Travel fund balance</Label>
              <Input className="h-9" type="number" value={reset.fundBalance}
                onChange={(e) => setReset((r) => ({ ...r, fundBalance: e.target.value }))} />
            </div>
            <div className="space-y-1 w-[150px]">
              <Label className="text-xs text-muted-foreground">Actual trip cost</Label>
              <Input className="h-9" type="number" value={reset.actualCost}
                onChange={(e) => setReset((r) => ({ ...r, actualCost: e.target.value }))} />
            </div>
            <Mini label="Rolls forward" value={money(roll.rollover)} />
            <Mini label="Additional savings needed" value={money(roll.additionalNeeded)} />
            <Mini label="Reduced monthly option" value={money(roll.reducedMonthly)} />
            <Mini label="Keep $500/mo → reserve" value={money(roll.reserveIfUnchanged)} />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Either lower the monthly amount to {money(roll.reducedMonthly)} or keep {money(500)}/month to build a
            larger travel reserve.
          </p>
          {trips.filter((t) => t.status !== 'completed').map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 text-xs border-t border-border/40 pt-2">
              <span>
                <span className="font-medium">{t.destination}</span> — {monthName(t.travel_month)} {t.travel_year}
                <Badge variant="outline" className="ml-2 text-[10px]">{t.status}</Badge>
              </span>
              <Button
                size="sm" variant="outline" className="h-7 text-[11px]"
                onClick={() =>
                  update.mutate({
                    id: t.id, status: 'completed',
                    completed_at: new Date().toISOString().slice(0, 10),
                    actual_cost: Number(reset.actualCost) || t.budget_target,
                  })
                }
              >
                Mark completed
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Future trip planner */}
      <Card className="prism-card-shine border-border/50">
        <CardHeader className="pb-2"><CardTitle className="text-base">Future trip planner</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <Label className="text-xs text-muted-foreground">Destination</Label>
              <Input className="h-9" value={newTrip.destination}
                onChange={(e) => setNewTrip((t) => ({ ...t, destination: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Travel month</Label>
              <Input className="h-9" type="number" min={1} max={12} value={newTrip.travel_month}
                onChange={(e) => setNewTrip((t) => ({ ...t, travel_month: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Travel year</Label>
              <Input className="h-9" type="number" value={newTrip.travel_year}
                onChange={(e) => setNewTrip((t) => ({ ...t, travel_year: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Estimated cost</Label>
              <Input className="h-9" type="number" value={newTrip.budget_target}
                onChange={(e) => setNewTrip((t) => ({ ...t, budget_target: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Current savings</Label>
              <Input className="h-9" type="number" value={newTrip.saved_amount}
                onChange={(e) => setNewTrip((t) => ({ ...t, saved_amount: e.target.value }))} />
            </div>
          </div>

          {(() => {
            const m = monthsUntil(Number(newTrip.travel_year), Number(newTrip.travel_month));
            const remaining = Math.max(0, Number(newTrip.budget_target) - Number(newTrip.saved_amount));
            const pct = Number(newTrip.budget_target) > 0
              ? (Number(newTrip.saved_amount) / Number(newTrip.budget_target)) * 100 : 0;
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Mini label="Months until trip" value={String(m)} />
                <Mini label="Amount remaining" value={money(remaining)} />
                <Mini label="Monthly funding requirement" value={money(m > 0 ? remaining / m : remaining)} />
                <Mini label="Funding percentage" value={`${pct.toFixed(0)}%`} />
              </div>
            );
          })()}

          <Button
            size="sm"
            disabled={!newTrip.destination}
            onClick={() =>
              create.mutate({
                destination: newTrip.destination,
                travel_month: Number(newTrip.travel_month) || 1,
                travel_year: Number(newTrip.travel_year),
                budget_target: Number(newTrip.budget_target) || settings.target_budget,
                saved_amount: Number(newTrip.saved_amount) || 0,
                monthly_contribution: settings.monthly_target,
                trip_type: 'personal',
                status: 'planning',
              })
            }
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add future trip
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 p-3 space-y-0.5 min-w-[130px]">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
