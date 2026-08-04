import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Building2 } from 'lucide-react';
import { MhNumberField, MhTextField } from './MhFields';
import { useMhEmployers, useMhUpsert, useMhDelete } from '@/hooks/use-medical-housing';

const DEMAND_OPTIONS = [
  { value: 'unknown', label: 'Unknown' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const REFERRAL_OPTIONS = [
  { value: 'not_contacted', label: 'Not contacted' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'in_discussion', label: 'In discussion' },
  { value: 'referral_active', label: 'Referral active' },
  { value: 'declined', label: 'Declined' },
];

const REFERRAL_TONE: Record<string, string> = {
  not_contacted: 'bg-muted text-muted-foreground border-border',
  contacted: 'bg-prism-sky/15 text-prism-sky border-prism-sky/30',
  in_discussion: 'bg-prism-amber/15 text-prism-amber border-prism-amber/30',
  referral_active: 'bg-prism-teal/15 text-prism-teal border-prism-teal/30',
  declined: 'bg-prism-rose/15 text-prism-rose border-prism-rose/30',
};

function MhSelect({
  label, value, options, onCommit,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onCommit: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onCommit}>
        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function EmployerDirectoryTab() {
  const { data: employers, isLoading } = useMhEmployers();
  const upsert = useMhUpsert('mh_employers');
  const remove = useMhDelete('mh_employers');
  const save = (id: string, patch: Record<string, unknown>) => upsert.mutate({ id, ...patch });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Track every medical employment center and where the referral conversation stands.
        </p>
        <Button size="sm" onClick={() => upsert.mutate({ name: 'New employer', sort_order: 99 })}>
          <Plus className="h-4 w-4 mr-1" /> Add employer
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading directory…</p>}

      <div className="space-y-3">
        {(employers ?? []).map((e) => (
          <Card key={e.id} className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary shrink-0" />
                  {e.name}
                  {e.category && <span className="text-xs font-normal text-muted-foreground">— {e.category}</span>}
                </CardTitle>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={REFERRAL_TONE[e.referral_status] ?? ''}>
                    {REFERRAL_OPTIONS.find((o) => o.value === e.referral_status)?.label ?? e.referral_status}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove.mutate(e.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MhTextField label="Name" value={e.name} onCommit={(v) => save(e.id, { name: v })} />
                <MhTextField label="Address" value={e.address} onCommit={(v) => save(e.id, { address: v })} />
                <MhTextField label="City" value={e.city} onCommit={(v) => save(e.id, { city: v })} />
                <MhNumberField label="Employees" value={e.employee_count} step={50} onCommit={(v) => save(e.id, { employee_count: v })} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MhTextField label="Medical school affiliation" value={e.med_school_affiliation} onCommit={(v) => save(e.id, { med_school_affiliation: v })} />
                <MhSelect label="Travel nurse demand" value={e.travel_nurse_demand} options={DEMAND_OPTIONS} onCommit={(v) => save(e.id, { travel_nurse_demand: v })} />
                <MhSelect label="Contract employee demand" value={e.contract_demand} options={DEMAND_OPTIONS} onCommit={(v) => save(e.id, { contract_demand: v })} />
                <MhSelect label="Estimated housing demand" value={e.estimated_housing_demand} options={DEMAND_OPTIONS} onCommit={(v) => save(e.id, { estimated_housing_demand: v })} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MhTextField label="Contact person" value={e.contact_person} onCommit={(v) => save(e.id, { contact_person: v })} />
                <MhTextField label="Contact email" value={e.contact_email} onCommit={(v) => save(e.id, { contact_email: v })} />
                <MhTextField label="Contact phone" value={e.contact_phone} onCommit={(v) => save(e.id, { contact_phone: v })} />
                <MhSelect label="Referral relationship" value={e.referral_status} options={REFERRAL_OPTIONS} onCommit={(v) => save(e.id, { referral_status: v })} />
              </div>

              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={e.has_residency} onCheckedChange={(v) => save(e.id, { has_residency: v })} />
                  <Label className="text-sm">Residency programs</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={e.has_fellowship} onCheckedChange={(v) => save(e.id, { has_fellowship: v })} />
                  <Label className="text-sm">Fellowship programs</Label>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <Textarea
                  defaultValue={e.notes ?? ''}
                  key={e.notes ?? ''}
                  rows={2}
                  placeholder="Who to call, housing coordinator names, next step…"
                  onBlur={(ev) => ev.target.value !== (e.notes ?? '') && save(e.id, { notes: ev.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
