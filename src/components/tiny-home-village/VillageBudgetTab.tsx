import { useState } from 'react';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MhStat, MhNumberField, MhTextField } from '@/components/medical-housing/MhFields';
import { useThvBudgets, useThvUpsert, useThvDelete, useThvSettings } from '@/hooks/use-tiny-home-village';
import {
  BUDGET_GROUPS,
  BUDGET_SCENARIOS,
  PRELIMINARY_SCENARIOS,
  PRELIMINARY_COST_WARNING,
  computeBudget,
  money,
  moneyRange,
  pct,
} from '@/lib/legacy/tinyHomeVillage';

export default function VillageBudgetTab() {
  const { data: budgets = [] } = useThvBudgets();
  const { data: settings } = useThvSettings();
  const upsert = useThvUpsert('thv_budgets');
  const del = useThvDelete('thv_budgets');
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = budgets.find((b) => b.id === activeId) ?? budgets[0];

  const totals = active
    ? computeBudget(
        {
          homes_count: active.homes_count,
          cost_per_home: active.cost_per_home,
          contingency_pct: active.contingency_pct,
          funding_secured: active.funding_secured,
          line_items: active.line_items ?? {},
        },
        settings?.residents_served,
      )
    : null;

  const save = (patch: Record<string, unknown>) => active && upsert.mutate({ id: active.id, ...patch });
  const setLine = (key: string, v: number) =>
    save({ line_items: { ...(active?.line_items ?? {}), [key]: v } });

  return (
    <div className="space-y-5">
      {/* Preliminary scenarios */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Preliminary planning scenarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-3">
            {PRELIMINARY_SCENARIOS.map((sc) => (
              <div key={sc.name} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{sc.name}</p>
                  <Badge variant="secondary" className="text-[10px]">{sc.homes} homes</Badge>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">{sc.center}</p>
                <dl className="space-y-1.5 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Land and site</dt>
                    <dd className="tabular-nums">{moneyRange(sc.landLow, sc.landHigh)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Homes and installation</dt>
                    <dd className="tabular-nums">{moneyRange(sc.homesLow, sc.homesHigh)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Shared and professional</dt>
                    <dd className="tabular-nums">{moneyRange(sc.sharedLow, sc.sharedHigh)}</dd>
                  </div>
                  <div className="mt-2 flex justify-between gap-2 border-t border-border/50 pt-2 font-semibold">
                    <dt>Preliminary total</dt>
                    <dd className="tabular-nums">{moneyRange(sc.totalLow, sc.totalHigh)}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-prism-amber/40 bg-prism-amber/10 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-prism-amber" />
            <p className="text-xs">{PRELIMINARY_COST_WARNING}</p>
          </div>
        </CardContent>
      </Card>

      {/* Budget selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Development budget</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {budgets.map((b) => (
              <Button
                key={b.id}
                size="sm"
                variant={active?.id === b.id ? 'default' : 'outline'}
                onClick={() => setActiveId(b.id)}
              >
                {b.name}
              </Button>
            ))}
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                upsert.mutate({ name: 'New budget', scenario: 'expected', homes_count: 6, cost_per_home: 85000 } as any)
              }
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New budget
            </Button>
            {active && budgets.length > 1 && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-prism-rose"
                onClick={() => {
                  del.mutate(active.id);
                  setActiveId(null);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {!active && <p className="text-sm text-muted-foreground">Create a budget to begin.</p>}

          {active && totals && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MhTextField label="Budget name" value={active.name} onCommit={(v) => save({ name: v })} />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Cost scenario</p>
                  <Select value={active.scenario} onValueChange={(v) => save({ scenario: v })}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BUDGET_SCENARIOS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)} cost
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <MhNumberField label="Number of tiny homes" value={active.homes_count} onCommit={(v) => save({ homes_count: v })} />
                <MhNumberField label="Cost per tiny home" value={active.cost_per_home} onCommit={(v) => save({ cost_per_home: v })} suffix="$" step={1000} />
                <MhNumberField label="Contingency reserve" value={active.contingency_pct} onCommit={(v) => save({ contingency_pct: v })} suffix="%" />
                <MhNumberField label="Funding secured" value={active.funding_secured} onCommit={(v) => save({ funding_secured: v })} suffix="$" step={1000} />
              </div>

              {/* Totals */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MhStat label="Total land and site cost" value={money(totals.land)} />
                <MhStat label="Total utility cost" value={money(totals.utility)} />
                <MhStat label="Total housing cost" value={money(totals.housing)} />
                <MhStat label="Total shared-facility cost" value={money(totals.shared)} />
                <MhStat label="Total professional cost" value={money(totals.professional)} />
                <MhStat label="Contingency amount" value={money(totals.contingency)} />
                <MhStat label="Total project cost" value={money(totals.total)} tone="warn" />
                <MhStat label="Average cost per tiny home" value={money(totals.perHome)} />
                <MhStat label="Development cost per resident" value={money(totals.perResident)} />
                <MhStat label="Funding secured" value={money(Number(active.funding_secured) || 0)} tone="good" />
                <MhStat label="Funding gap" value={money(totals.fundingGap)} tone={totals.fundingGap ? 'bad' : 'good'} />
                <MhStat label="Percentage funded" value={pct(totals.pctFunded)} />
              </div>

              {/* Line items */}
              {BUDGET_GROUPS.map((g) => (
                <div key={g.key} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</p>
                  {g.key === 'housing' && (
                    <p className="text-xs text-muted-foreground">
                      Per-home entries are multiplied by {active.homes_count} homes. Base home cost:{' '}
                      {money(totals.homesBase)}.
                    </p>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {g.fields.map((f) => (
                      <MhNumberField
                        key={f.key}
                        label={f.label}
                        value={(active.line_items ?? {})[f.key] ?? 0}
                        onCommit={(v) => setLine(f.key, v)}
                        suffix="$"
                        step={500}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
