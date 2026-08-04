import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, MapPin, AlertTriangle } from 'lucide-react';
import { MhNumberField, MhTextField } from './MhFields';
import { useMhMarkets, useMhUpsert, useMhDelete } from '@/hooks/use-medical-housing';
import { fmt } from '@/lib/legacy/medicalHousing';

const PRIORITY_META: Record<string, { label: string; cls: string }> = {
  primary: { label: 'Primary — Akron pilot', cls: 'bg-prism-teal/15 text-prism-teal border-prism-teal/30' },
  secondary: { label: 'Secondary — Phase 2', cls: 'bg-prism-amber/15 text-prism-amber border-prism-amber/30' },
  later: { label: 'Later expansion', cls: 'bg-prism-orange/15 text-prism-orange border-prism-orange/30' },
};

export default function MarketComparisonTab() {
  const { data: markets, isLoading } = useMhMarkets();
  const upsert = useMhUpsert('mh_markets');
  const remove = useMhDelete('mh_markets');

  const save = (id: string, patch: Record<string, unknown>) => upsert.mutate({ id, ...patch });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Every field is editable. Prices and rents are planning targets, not appraisals.
        </p>
        <Button
          size="sm"
          onClick={() => upsert.mutate({ name: 'New market', region: 'akron', priority: 'primary', sort_order: 99 })}
        >
          <Plus className="h-4 w-4 mr-1" /> Add market
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading markets…</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        {(markets ?? []).map((m) => {
          const meta = PRIORITY_META[m.priority] ?? PRIORITY_META.secondary;
          return (
            <Card key={m.id} className="border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    {m.name}
                  </CardTitle>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={meta.cls}>{meta.label}</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove.mutate(m.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {[m.city, m.zip].filter(Boolean).join(' · ') || 'No city set'} — target {fmt(m.price_low)} to {fmt(m.price_high)}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {!!(m.classification ?? []).length && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                      Classification
                    </p>
                    <ul className="space-y-1 text-sm">
                      {m.classification.map((c: string) => (
                        <li key={c} className="flex gap-2"><span className="text-primary">•</span><span>{c}</span></li>
                      ))}
                    </ul>
                  </div>
                )}

                {!!(m.cautions ?? []).length && (
                  <div className="rounded-lg border border-prism-amber/30 bg-prism-amber/5 p-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-prism-amber mb-1 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" /> Cautions
                    </p>
                    <ul className="space-y-0.5 text-sm text-muted-foreground">
                      {m.cautions.map((c: string) => <li key={c}>• {c}</li>)}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <MhTextField label="City" value={m.city} onCommit={(v) => save(m.id, { city: v })} />
                  <MhTextField label="ZIP" value={m.zip} onCommit={(v) => save(m.id, { zip: v })} />
                  <MhNumberField label="Purchase target — low" value={m.price_low} step={1000} onCommit={(v) => save(m.id, { price_low: v })} />
                  <MhNumberField label="Purchase target — high" value={m.price_high} step={1000} onCommit={(v) => save(m.id, { price_high: v })} />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <MhNumberField label="Rent — low" value={m.rent_low} step={50} onCommit={(v) => save(m.id, { rent_low: v })} />
                  <MhNumberField label="Rent — expected" value={m.rent_expected} step={50} onCommit={(v) => save(m.id, { rent_expected: v })} />
                  <MhNumberField label="Rent — strong" value={m.rent_strong} step={50} onCommit={(v) => save(m.id, { rent_strong: v })} />
                </div>

                {m.recommendation && (
                  <div className="rounded-lg border border-prism-rose/30 bg-prism-rose/5 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-prism-rose mb-1">
                      Default recommendation
                    </p>
                    <p className="text-sm">{m.recommendation}</p>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Notes</Label>
                  <Textarea
                    defaultValue={m.notes ?? ''}
                    key={m.notes ?? ''}
                    rows={2}
                    placeholder="Blocks to watch, listings seen, agent feedback…"
                    onBlur={(e) => e.target.value !== (m.notes ?? '') && save(m.id, { notes: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
