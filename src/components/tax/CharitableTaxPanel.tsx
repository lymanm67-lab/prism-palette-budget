import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, HeartHandshake } from 'lucide-react';
import type { CharitablePlan, TaxAccount } from '@/hooks/use-retirement-tax';
import { charitableVehicleCompare, qcdSavings } from '@/lib/tax/legacyTax';
import { money } from './TaxExecutiveDashboard';

const VEHICLES = [
  { value: 'qcd', label: 'QCD from IRA (age 70½+)' },
  { value: 'daf', label: 'Donor-advised fund' },
  { value: 'foundation', label: 'Private family foundation' },
  { value: 'appreciated_stock', label: 'Appreciated stock' },
  { value: 'cash', label: 'Cash gift' },
];

interface Props {
  plans: CharitablePlan[];
  accounts: TaxAccount[];
  marginalRate: number;
  firstRmd: number;
  onAdd: (row: Omit<CharitablePlan, 'id'>) => void;
  onRemove: (id: string) => void;
}

export function CharitableTaxPanel({ plans, accounts, marginalRate, firstRmd, onAdd, onRemove }: Props) {
  const year = new Date().getFullYear();
  const [form, setForm] = useState({
    tax_year: year,
    vehicle: 'qcd',
    amount: 0,
    source_account_id: '' as string,
    recipient: '',
    counts_toward_rmd: true,
    status: 'planned',
  });

  const plannedQcd = plans
    .filter((p) => p.vehicle === 'qcd' && p.counts_toward_rmd)
    .reduce((s, p) => s + Number(p.amount), 0);
  const savings = qcdSavings(plannedQcd, marginalRate);
  const compare = charitableVehicleCompare(Math.max(plannedQcd, 10_000), marginalRate);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Planned QCDs</p>
            <p className="font-display text-xl font-bold">{money(plannedQcd)}</p>
            <p className="text-xs text-muted-foreground">Satisfies RMD without adding taxable income</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Federal tax avoided</p>
            <p className="font-display text-xl font-bold text-primary">{money(savings.federal)}</p>
            <p className="text-xs text-muted-foreground">At a {marginalRate}% marginal rate</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Share of first RMD covered</p>
            <p className="font-display text-xl font-bold">
              {firstRmd > 0 ? `${Math.min(100, (plannedQcd / firstRmd) * 100).toFixed(0)}%` : '—'}
            </p>
            <p className="text-xs text-muted-foreground">First RMD {money(firstRmd)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardContent className="p-4">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <HeartHandshake className="h-4 w-4" /> Giving vehicle comparison
          </h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  {['Vehicle', 'Deduction', 'Tax saved', 'Capital gain avoided'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compare.map((c) => (
                  <tr key={c.vehicle} className="border-t border-border/50">
                    <td className="px-3 py-2">{c.vehicle}</td>
                    <td className="px-3 py-2">{money(c.deduction)}</td>
                    <td className="px-3 py-2">{money(c.taxSaved)}</td>
                    <td className="px-3 py-2">{money(c.capitalGainAvoided)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <Label className="text-xs">Tax year</Label>
              <Input type="number" value={form.tax_year} onChange={(e) => setForm({ ...form, tax_year: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Vehicle</Label>
              <Select value={form.vehicle} onValueChange={(v) => setForm({ ...form, vehicle: v, counts_toward_rmd: v === 'qcd' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VEHICLES.map((v) => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Amount</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Recipient</Label>
              <Input value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} placeholder="Foundation, church, charity" />
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-56">
              <Label className="text-xs">Source account</Label>
              <Select value={form.source_account_id} onValueChange={(v) => setForm({ ...form, source_account_id: v })}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch checked={form.counts_toward_rmd} onCheckedChange={(v) => setForm({ ...form, counts_toward_rmd: v })} />
              <span className="text-sm">Counts toward RMD</span>
            </div>
            <Button
              className="gap-1.5"
              disabled={form.amount <= 0}
              onClick={() => {
                onAdd({
                  tax_year: form.tax_year,
                  vehicle: form.vehicle,
                  amount: form.amount,
                  source_account_id: form.source_account_id || null,
                  recipient: form.recipient || null,
                  counts_toward_rmd: form.counts_toward_rmd,
                  status: form.status,
                  notes: null,
                });
                setForm({ ...form, amount: 0, recipient: '' });
              }}
            >
              <Plus className="h-4 w-4" /> Add giving plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {plans.length > 0 && (
        <Card className="glass-card">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  {['Year', 'Vehicle', 'Amount', 'Recipient', 'Counts to RMD', ''].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id} className="border-t border-border/50">
                    <td className="px-3 py-2">{p.tax_year}</td>
                    <td className="px-3 py-2">{VEHICLES.find((v) => v.value === p.vehicle)?.label ?? p.vehicle}</td>
                    <td className="px-3 py-2">{money(Number(p.amount))}</td>
                    <td className="px-3 py-2">{p.recipient ?? '—'}</td>
                    <td className="px-3 py-2">{p.counts_toward_rmd ? 'Yes' : 'No'}</td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemove(p.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
