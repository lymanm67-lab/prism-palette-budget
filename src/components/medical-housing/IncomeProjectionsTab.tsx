import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, TrendingUp, CheckCircle2, AlertTriangle } from 'lucide-react';
import { MhNumberField, MhTextField, MhStat } from './MhFields';
import { useMhIncomeScenarios, useMhUpsert, useMhDelete } from '@/hooks/use-medical-housing';
import {
  computeIncome, fmt, fmtPct, AKRON_TARGETS, ROOM_MODEL_WARNINGS, type IncomeInputs,
} from '@/lib/legacy/medicalHousing';

const MODEL_OPTIONS = [
  { value: 'whole_property', label: 'Whole property lease' },
  { value: 'room_by_room', label: 'Room by room' },
];

const EXPENSE_FIELDS: { key: keyof IncomeInputs; label: string }[] = [
  { key: 'mortgage', label: 'Mortgage (P&I)' },
  { key: 'property_taxes', label: 'Property taxes' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'utilities', label: 'Utilities' },
  { key: 'internet', label: 'Internet' },
  { key: 'maintenance_reserve', label: 'Maintenance reserve' },
  { key: 'furniture_reserve', label: 'Furniture replacement reserve' },
  { key: 'cleaning', label: 'Cleaning / turnover' },
  { key: 'lawn_care', label: 'Lawn care' },
  { key: 'snow_removal', label: 'Snow removal' },
  { key: 'property_management', label: 'Property management' },
  { key: 'platform_fees', label: 'Platform fees' },
  { key: 'advertising', label: 'Advertising' },
  { key: 'other_expenses', label: 'Other expenses' },
];

export default function IncomeProjectionsTab() {
  const { data: scenarios, isLoading } = useMhIncomeScenarios();
  const upsert = useMhUpsert('mh_income_scenarios');
  const remove = useMhDelete('mh_income_scenarios');
  const save = (id: string, patch: Record<string, unknown>) => upsert.mutate({ id, ...patch });

  const makeActive = (id: string) => {
    (scenarios ?? []).forEach((s) => {
      if (s.is_active && s.id !== id) upsert.mutate({ id: s.id, is_active: false });
    });
    save(id, { is_active: true });
  };

  const hasRoomModel = (scenarios ?? []).some((s) => s.model_type === 'room_by_room');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Conservative, expected, and strong cases side by side. Break-even occupancy should stay
          under {AKRON_TARGETS.breakEvenMaxPct}%.
        </p>
        <Button
          size="sm"
          onClick={() => upsert.mutate({ name: 'New scenario', model_type: 'whole_property', monthly_rent: 2100, occupancy_pct: 90, sort_order: 99 })}
        >
          <Plus className="h-4 w-4 mr-1" /> Add scenario
        </Button>
      </div>

      {hasRoomModel && (
        <Alert className="border-prism-amber/40 bg-prism-amber/5">
          <AlertTriangle className="h-4 w-4 text-prism-amber" />
          <AlertDescription>
            <p className="font-medium mb-1">Room-by-room model considerations</p>
            <ul className="list-disc pl-5 space-y-0.5 text-xs">
              {ROOM_MODEL_WARNINGS.map((w) => <li key={w}>{w}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Loading scenarios…</p>}

      <div className="space-y-4">
        {(scenarios ?? []).map((s) => {
          const t = computeIncome(s as IncomeInputs);
          const beOver = (t.breakEvenOccupancyPct ?? 0) > AKRON_TARGETS.breakEvenMaxPct;
          return (
            <Card key={s.id} className={s.is_active ? 'border-prism-teal/50' : 'border-border/60'}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    {s.name}
                    {s.market_label && <Badge variant="outline">{s.market_label}</Badge>}
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
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <MhStat label="Gross rent /mo" value={fmt(t.monthlyGross)} />
                  <MhStat label="Effective gross /mo" value={fmt(t.monthlyEffectiveGross)} hint="After occupancy & vacancy" />
                  <MhStat label="Operating costs /mo" value={fmt(t.monthlyOpEx)} hint={`${fmt(t.monthlyOpExNoDebt)} excluding debt`} />
                  <MhStat
                    label="Net cash flow /mo"
                    value={fmt(t.netMonthlyCashFlow)}
                    tone={t.netMonthlyCashFlow >= 0 ? 'good' : 'bad'}
                    hint={`${fmt(t.netAnnualCashFlow)} per year`}
                  />
                  <MhStat
                    label="Cash on cash"
                    value={t.cashOnCashPct === null ? '—' : fmtPct(t.cashOnCashPct)}
                    tone={t.cashOnCashPct !== null && t.cashOnCashPct >= 8 ? 'good' : 'warn'}
                  />
                  <MhStat
                    label="Break-even occupancy"
                    value={t.breakEvenOccupancyPct === null ? '—' : fmtPct(t.breakEvenOccupancyPct, 0)}
                    tone={beOver ? 'warn' : 'good'}
                    hint={`Target under ${AKRON_TARGETS.breakEvenMaxPct}%`}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <MhStat label="Annual gross revenue" value={fmt(t.annualEffectiveGross)} />
                  <MhStat label="Annual NOI" value={fmt(t.noiAnnual)} />
                  <MhStat
                    label="DSCR"
                    value={t.dscr === null ? '—' : t.dscr.toFixed(2)}
                    tone={t.dscr !== null && t.dscr >= 1.25 ? 'good' : 'warn'}
                    hint="Lenders prefer 1.25 or higher"
                  />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Revenue assumptions
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    <MhTextField label="Scenario name" value={s.name} onCommit={(v) => save(s.id, { name: v })} />
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Rental model</Label>
                      <Select value={s.model_type ?? 'whole_property'} onValueChange={(v) => save(s.id, { model_type: v })}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MODEL_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <MhTextField label="Market label" value={s.market_label} onCommit={(v) => save(s.id, { market_label: v })} />
                    {s.model_type === 'room_by_room' ? (
                      <>
                        <MhNumberField label="Rent per room /mo" value={s.rent_per_room} step={25} onCommit={(v) => save(s.id, { rent_per_room: v })} />
                        <MhNumberField label="Bedrooms rented" value={s.bedrooms} step={1} onCommit={(v) => save(s.id, { bedrooms: v })} />
                      </>
                    ) : (
                      <MhNumberField label="Monthly rent" value={s.monthly_rent} step={50} onCommit={(v) => save(s.id, { monthly_rent: v })} />
                    )}
                    <MhNumberField label="Occupancy" value={s.occupancy_pct} suffix="%" onCommit={(v) => save(s.id, { occupancy_pct: v })} />
                    <MhNumberField label="Annual vacancy allowance" value={s.annual_vacancy_pct} suffix="%" onCommit={(v) => save(s.id, { annual_vacancy_pct: v })} />
                    <MhNumberField label="Cash invested" value={s.cash_invested} step={500} onCommit={(v) => save(s.id, { cash_invested: v })} />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Monthly operating expenses
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {EXPENSE_FIELDS.map((f) => (
                      <MhNumberField
                        key={f.key as string}
                        label={f.label}
                        value={s[f.key as string]}
                        step={10}
                        onCommit={(v) => save(s.id, { [f.key]: v })}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
