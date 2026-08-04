import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Wallet, CheckCircle2 } from 'lucide-react';
import { MhNumberField, MhTextField, MhStat } from './MhFields';
import { useMhStartupScenarios, useMhUpsert, useMhDelete } from '@/hooks/use-medical-housing';
import { computeStartup, fmt, AKRON_TARGETS, type StartupInputs } from '@/lib/legacy/medicalHousing';

const LINE_GROUPS: { title: string; fields: { key: keyof StartupInputs; label: string; step?: number; suffix?: string }[] }[] = [
  {
    title: 'Acquisition',
    fields: [
      { key: 'purchase_price', label: 'Purchase price', step: 1000 },
      { key: 'down_payment_pct', label: 'Down payment', step: 1, suffix: '%' },
      { key: 'closing_costs', label: 'Closing costs', step: 100 },
      { key: 'inspection_cost', label: 'Inspection cost', step: 50 },
      { key: 'appraisal_cost', label: 'Appraisal cost', step: 50 },
    ],
  },
  {
    title: 'Property preparation',
    fields: [
      { key: 'initial_repairs', label: 'Initial repairs', step: 250 },
      { key: 'paint_cosmetic', label: 'Paint & cosmetic updates', step: 250 },
      { key: 'initial_cleaning', label: 'Initial cleaning', step: 50 },
      { key: 'security_system', label: 'Security system', step: 50 },
      { key: 'internet_setup', label: 'Internet setup', step: 50 },
      { key: 'utility_deposits', label: 'Utility deposits', step: 50 },
      { key: 'insurance_deposit', label: 'Insurance deposit', step: 50 },
      { key: 'licensing_permits', label: 'Licensing / permits', step: 50 },
      { key: 'marketing', label: 'Marketing', step: 50 },
    ],
  },
  {
    title: 'Furnishing',
    fields: [
      { key: 'furniture', label: 'Furniture', step: 250 },
      { key: 'appliances', label: 'Appliances', step: 250 },
      { key: 'kitchen_supplies', label: 'Kitchen supplies', step: 50 },
      { key: 'linens', label: 'Linens', step: 50 },
    ],
  },
  {
    title: 'Reserves',
    fields: [
      { key: 'vacancy_reserve', label: 'Vacancy reserve', step: 250 },
      { key: 'maintenance_reserve', label: 'Maintenance reserve', step: 250 },
      { key: 'emergency_reserve', label: 'Emergency reserve', step: 250 },
    ],
  },
];

export default function StartupCalculatorTab() {
  const { data: scenarios, isLoading } = useMhStartupScenarios();
  const upsert = useMhUpsert('mh_startup_scenarios');
  const remove = useMhDelete('mh_startup_scenarios');
  const save = (id: string, patch: Record<string, unknown>) => upsert.mutate({ id, ...patch });

  const makeActive = (id: string) => {
    (scenarios ?? []).forEach((s) => {
      if (s.is_active && s.id !== id) upsert.mutate({ id: s.id, is_active: false });
    });
    save(id, { is_active: true });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Every assumption is editable. The active scenario feeds the dashboard and guardrails.
        </p>
        <Button size="sm" onClick={() => upsert.mutate({ name: 'New scenario', purchase_price: 150000, down_payment_pct: 20, sort_order: 99 })}>
          <Plus className="h-4 w-4 mr-1" /> Add scenario
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading scenarios…</p>}

      <div className="space-y-4">
        {(scenarios ?? []).map((s) => {
          const t = computeStartup(s as StartupInputs);
          const overCeiling = t.totalStartup > AKRON_TARGETS.startupMax;
          return (
            <Card key={s.id} className={s.is_active ? 'border-prism-teal/50' : 'border-border/60'}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    {s.name}
                    {s.is_active && (
                      <Badge className="bg-prism-teal/15 text-prism-teal border-prism-teal/30">Active</Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2 shrink-0">
                    {!s.is_active && (
                      <Button variant="outline" size="sm" onClick={() => makeActive(s.id)}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Set active
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove.mutate(s.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                {(s.range_low || s.range_high) && (
                  <p className="text-xs text-muted-foreground">
                    Planning band: {fmt(s.range_low)} – {fmt(s.range_high)} total startup investment
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <MhStat label="Down payment" value={fmt(t.downPayment)} />
                  <MhStat label="Closing expenses" value={fmt(t.closingTotal)} />
                  <MhStat label="Preparation" value={fmt(t.preparationTotal)} />
                  <MhStat label="Furnishing" value={fmt(t.furnishingTotal)} />
                  <MhStat label="Reserves" value={fmt(t.reserveTotal)} />
                  <MhStat
                    label="Total startup"
                    value={fmt(t.totalStartup)}
                    tone={overCeiling ? 'warn' : 'good'}
                    hint={overCeiling ? `Above ${fmt(AKRON_TARGETS.startupMax)} pilot ceiling` : 'Within pilot ceiling'}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <MhTextField label="Scenario name" value={s.name} onCommit={(v) => save(s.id, { name: v })} />
                  <div className="grid grid-cols-2 gap-3">
                    <MhNumberField label="Planning band low" value={s.range_low} step={500} onCommit={(v) => save(s.id, { range_low: v })} />
                    <MhNumberField label="Planning band high" value={s.range_high} step={500} onCommit={(v) => save(s.id, { range_high: v })} />
                  </div>
                </div>

                {LINE_GROUPS.map((g) => (
                  <div key={g.title}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{g.title}</p>
                    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                      {g.fields.map((f) => (
                        <MhNumberField
                          key={f.key as string}
                          label={f.label}
                          value={s[f.key as string]}
                          step={f.step}
                          suffix={f.suffix}
                          onCommit={(v) => save(s.id, { [f.key]: v })}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
