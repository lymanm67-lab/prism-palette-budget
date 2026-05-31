import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AllocationSettings } from '@/lib/retirement/allocationEngine';

interface Props {
  settings: AllocationSettings;
  onChange: (patch: Partial<AllocationSettings>) => void;
}

export function AllocationSettingsPanel({ settings, onChange }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="flex items-center justify-between rounded-lg border border-border bg-card/40 p-3">
        <div>
          <Label className="text-sm font-medium">HSA eligible</Label>
          <p className="text-xs text-muted-foreground">Enables HSA-first routing</p>
        </div>
        <Switch
          checked={settings.hsa_eligible}
          onCheckedChange={(v) => onChange({ hsa_eligible: v })}
        />
      </div>

      <div className="rounded-lg border border-border bg-card/40 p-3 space-y-1">
        <Label className="text-xs">HSA coverage</Label>
        <Select
          value={settings.hsa_coverage}
          onValueChange={(v) => onChange({ hsa_coverage: v as 'self' | 'family' })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="self">Self-only</SelectItem>
            <SelectItem value="family">Family</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <NumberField label="HSA max target ($/yr)" value={settings.hsa_max_target}
        onChange={(v) => onChange({ hsa_max_target: v })} />
      <NumberField label="Roth % default" value={settings.roth_pct_default}
        onChange={(v) => onChange({ roth_pct_default: v })} suffix="%" />
      <NumberField label="Employer contribution rate" value={settings.employer_contribution_rate}
        onChange={(v) => onChange({ employer_contribution_rate: v })} suffix="%" />
      <NumberField label="Annual raise %" value={settings.annual_raise_pct}
        onChange={(v) => onChange({ annual_raise_pct: v })} suffix="%" />

      <div className="rounded-lg border border-border bg-card/40 p-3 space-y-1">
        <Label className="text-xs">Inflation mode</Label>
        <Select
          value={settings.inflation_mode}
          onValueChange={(v) => onChange({ inflation_mode: v as 'today' | 'future' })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="future">Future dollars</SelectItem>
            <SelectItem value="today">Today's dollars</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function NumberField({
  label, value, onChange, suffix,
}: { label: string; value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-3 space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="h-9"
        />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}
