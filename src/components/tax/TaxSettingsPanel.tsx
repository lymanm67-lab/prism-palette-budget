import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';
import { FILING_LABELS, type FilingStatus } from '@/lib/tax/brackets';
import type { TaxAccount, TaxSettings } from '@/hooks/use-retirement-tax';

const BUCKETS = [
  { value: 'pretax', label: 'Pre-tax' },
  { value: 'roth', label: 'Roth' },
  { value: 'taxable', label: 'Taxable' },
  { value: 'hsa', label: 'HSA' },
];

interface Props {
  settings: TaxSettings;
  accounts: TaxAccount[];
  otherIncome: number;
  heirCount: number;
  onOtherIncome: (v: number) => void;
  onHeirCount: (v: number) => void;
  onSave: (patch: Partial<TaxSettings>) => void;
  onSaveAccount: (patch: { id: string } & Partial<TaxAccount>) => void;
}

export function TaxSettingsPanel({
  settings, accounts, otherIncome, heirCount, onOtherIncome, onHeirCount, onSave, onSaveAccount,
}: Props) {
  const [form, setForm] = useState<TaxSettings>(settings);

  const num = (k: keyof TaxSettings) => ({
    type: 'number' as const,
    value: (form[k] as number) ?? 0,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: Number(e.target.value) }),
  });

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardContent className="p-4 space-y-3">
          <h3 className="font-display font-semibold">Tax law &amp; planning assumptions</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs">Filing status</Label>
              <Select
                value={form.filing_status}
                onValueChange={(v) => setForm({ ...form, filing_status: v as FilingStatus })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FILING_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
            <div><Label className="text-xs">Birth year</Label><Input {...num('birth_year')} /></div>
            <div><Label className="text-xs">Required-withdrawal start age</Label><Input {...num('rmd_start_age')} /></div>
            <div><Label className="text-xs">Planning end age</Label><Input {...num('planning_end_age')} /></div>
            <div><Label className="text-xs">Assumed return %</Label><Input {...num('assumed_return')} /></div>
            <div><Label className="text-xs">Inflation %</Label><Input {...num('inflation')} /></div>
            <div><Label className="text-xs">Target bracket %</Label><Input {...num('target_bracket')} /></div>
            <div>
              <Label className="text-xs">Other ordinary income (today's $)</Label>
              <Input type="number" value={otherIncome} onChange={(e) => onOtherIncome(Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs">Beneficiaries</Label>
              <Input type="number" value={heirCount} onChange={(e) => onHeirCount(Number(e.target.value))} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.irmaa_guard} onCheckedChange={(v) => setForm({ ...form, irmaa_guard: v })} />
            <span className="text-sm">Keep conversions below the next Medicare premium surcharge threshold</span>
          </div>
          <Button className="gap-1.5" onClick={() => onSave(form)}>
            <Save className="h-4 w-4" /> Save assumptions
          </Button>
          <p className="text-xs text-muted-foreground">
            The required-withdrawal age is configuration — update it here if the law or your birth year changes, no code
            edit needed.
          </p>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="p-0">
          <div className="p-4 pb-2">
            <h3 className="font-display font-semibold">Account tax treatment</h3>
            <p className="text-xs text-muted-foreground">Classify each account so bucket totals and RMDs are correct.</p>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                {['Account', 'Balance', 'Tax bucket', 'RMDs apply', 'Inherited'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="border-t border-border/50">
                  <td className="px-3 py-2">{a.name}</td>
                  <td className="px-3 py-2">
                    {Number(a.current_balance).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-3 py-2">
                    <Select value={a.tax_bucket} onValueChange={(v) => onSaveAccount({ id: a.id, tax_bucket: v })}>
                      <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BUCKETS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Switch checked={a.rmd_applicable} onCheckedChange={(v) => onSaveAccount({ id: a.id, rmd_applicable: v })} />
                  </td>
                  <td className="px-3 py-2">
                    <Switch checked={a.is_inherited} onCheckedChange={(v) => onSaveAccount({ id: a.id, is_inherited: v })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
