import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Home, Target } from 'lucide-react';
import { MhNumberField, MhTextField } from './MhFields';
import { useMhProperties, useMhMarkets, useMhUpsert, useMhDelete } from '@/hooks/use-medical-housing';
import {
  SCORE_CATEGORIES, computeScores, DECISION_TONE,
  PREFERRED_FIRST_PROPERTY, fmt, fmtPct, type ScoreKey,
} from '@/lib/legacy/medicalHousing';

const STATUS_OPTIONS = [
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'touring', label: 'Touring' },
  { value: 'offer', label: 'Offer submitted' },
  { value: 'under_contract', label: 'Under contract' },
  { value: 'purchased', label: 'Purchased' },
  { value: 'rejected', label: 'Rejected' },
];

export default function PropertyScoringTab() {
  const { data: properties, isLoading } = useMhProperties();
  const { data: markets } = useMhMarkets();
  const upsert = useMhUpsert('mh_properties');
  const remove = useMhDelete('mh_properties');
  const save = (id: string, patch: Record<string, unknown>) => upsert.mutate({ id, ...patch });

  return (
    <div className="space-y-6">
      {/* Preferred first property */}
      <Card className="border-prism-teal/30 bg-prism-teal/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-prism-teal" />
            Preferred First Property
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {PREFERRED_FIRST_PROPERTY.map((c) => (
              <div key={c.label} className="flex justify-between gap-3 border-b border-border/40 pb-1.5">
                <span className="text-xs text-muted-foreground">{c.label}</span>
                <span className="text-xs font-medium text-right">{c.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Score each candidate 1 to 5 per category. Scores drive the recommended decision.
        </p>
        <Button
          size="sm"
          onClick={() => upsert.mutate({ label: 'New candidate', status: 'reviewing', purchase_price: 150000, bedrooms: 3, bathrooms: 1.5 })}
        >
          <Plus className="h-4 w-4 mr-1" /> Add property
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading properties…</p>}
      {!isLoading && !(properties ?? []).length && (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          <Home className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No candidate properties yet. Add one to start scoring.</p>
        </CardContent></Card>
      )}

      <div className="space-y-4">
        {(properties ?? []).map((p) => {
          const s = computeScores(p as Partial<Record<ScoreKey, number>>);
          return (
            <Card key={p.id} className="border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{p.label}</CardTitle>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={DECISION_TONE[s.decision]}>{s.decision}</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove.mutate(p.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {fmt(p.purchase_price)} · {p.bedrooms}BR / {p.bathrooms}BA · furnished {fmt(p.furnished_rent)}/mo
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Score summary */}
                <div className="grid gap-3 sm:grid-cols-4">
                  {[
                    { label: 'Total score', value: `${s.totalScore} / ${s.maxScore}`, pct: s.totalPct },
                    { label: 'Financial score', value: fmtPct(s.financialScore, 0), pct: s.financialScore },
                    { label: 'Market demand score', value: fmtPct(s.marketScore, 0), pct: s.marketScore },
                    { label: 'Risk score', value: fmtPct(s.riskScore, 0), pct: s.riskScore },
                  ].map((x) => (
                    <div key={x.label} className="rounded-lg border border-border/60 bg-background/40 p-3 space-y-1.5">
                      <p className="text-xs text-muted-foreground">{x.label}</p>
                      <p className="text-lg font-bold tabular-nums">{x.value}</p>
                      <Progress value={x.pct} className="h-1.5" />
                    </div>
                  ))}
                </div>

                {/* Basics */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <MhTextField label="Label" value={p.label} onCommit={(v) => save(p.id, { label: v })} />
                  <MhTextField label="Address" value={p.address} onCommit={(v) => save(p.id, { address: v })} />
                  <MhTextField label="City" value={p.city} onCommit={(v) => save(p.id, { city: v })} />
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Select value={p.status} onValueChange={(v) => save(p.id, { status: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Market</Label>
                    <Select value={p.market_id ?? 'none'} onValueChange={(v) => save(p.id, { market_id: v === 'none' ? null : v })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select market" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not set</SelectItem>
                        {(markets ?? []).map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <MhNumberField label="Purchase price" value={p.purchase_price} step={1000} onCommit={(v) => save(p.id, { purchase_price: v })} />
                  <MhNumberField label="Bedrooms" value={p.bedrooms} step={1} onCommit={(v) => save(p.id, { bedrooms: v })} />
                  <MhNumberField label="Bathrooms" value={p.bathrooms} step={0.5} onCommit={(v) => save(p.id, { bathrooms: v })} />
                  <MhNumberField label="Furnished rent /mo" value={p.furnished_rent} step={50} onCommit={(v) => save(p.id, { furnished_rent: v })} />
                  <MhNumberField label="Long-term rent /mo" value={p.longterm_rent} step={50} onCommit={(v) => save(p.id, { longterm_rent: v })} />
                  <MhNumberField label="Minutes to hospital" value={p.minutes_to_hospital} onCommit={(v) => save(p.id, { minutes_to_hospital: v })} />
                  <MhNumberField label="Reserves available" value={p.reserves_available} step={500} onCommit={(v) => save(p.id, { reserves_available: v })} />
                </div>

                {/* Flags */}
                <div className="flex flex-wrap gap-x-6 gap-y-3">
                  {[
                    { key: 'off_street_parking', label: 'Off-street parking' },
                    { key: 'laundry', label: 'Washer & dryer' },
                    { key: 'compliance_verified', label: 'Furnished rental compliance verified' },
                    { key: 'hoa_restrictions', label: 'Restrictive HOA rules' },
                    { key: 'major_repairs_unresolved', label: 'Major repairs unresolved' },
                  ].map((f) => (
                    <div key={f.key} className="flex items-center gap-2">
                      <Switch checked={!!p[f.key]} onCheckedChange={(v) => save(p.id, { [f.key]: v })} />
                      <Label className="text-sm">{f.label}</Label>
                    </div>
                  ))}
                </div>

                {/* Scorecard */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Scorecard — 1 (poor) to 5 (excellent)
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {SCORE_CATEGORIES.map((c) => (
                      <div key={c.key} className="flex items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2">
                        <span className="text-sm">{c.label}</span>
                        <div className="flex gap-1 shrink-0">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              onClick={() => save(p.id, { [c.key]: n })}
                              className={`h-6 w-6 rounded text-xs font-medium transition-colors ${
                                (p[c.key] ?? 0) >= n
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
                              }`}
                              aria-label={`${c.label}: ${n}`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Condition notes</Label>
                    <Textarea
                      defaultValue={p.condition_notes ?? ''} key={`c${p.condition_notes ?? ''}`} rows={2}
                      onBlur={(e) => e.target.value !== (p.condition_notes ?? '') && save(p.id, { condition_notes: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Notes</Label>
                    <Textarea
                      defaultValue={p.notes ?? ''} key={`n${p.notes ?? ''}`} rows={2}
                      onBlur={(e) => e.target.value !== (p.notes ?? '') && save(p.id, { notes: e.target.value })}
                    />
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
