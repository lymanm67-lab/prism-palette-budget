import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';
import type { BusinessLoss } from '@/hooks/use-retirement-tax';
import { money } from './TaxExecutiveDashboard';

interface Props {
  losses: BusinessLoss[];
  onAdd: (row: Omit<BusinessLoss, 'id'>) => void;
  onRemove: (id: string) => void;
  isSaving?: boolean;
}

const LOSS_TYPES = [
  { value: 'operating', label: 'Operating loss' },
  { value: 'nol_carryforward', label: 'NOL carryforward' },
  { value: 'depreciation', label: 'Depreciation / Section 179' },
  { value: 'startup', label: 'Startup costs' },
  { value: 'passive', label: 'Passive activity loss' },
];

export function BusinessLossPanel({ losses, onAdd, onRemove, isSaving }: Props) {
  const year = new Date().getFullYear();
  const [form, setForm] = useState({
    entity_name: '',
    tax_year: year,
    loss_amount: 0,
    used_amount: 0,
    loss_type: 'operating',
  });

  const totalAvailable = losses.reduce(
    (s, l) => s + Math.max(0, Number(l.loss_amount) - Number(l.used_amount)),
    0,
  );

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardContent className="p-4">
          <h3 className="font-display font-semibold">Business losses available to offset conversions</h3>
          <p className="text-xs text-muted-foreground">
            Losses from your entities can absorb Roth conversion income in the same tax year, effectively converting at
            a lower cost. The ladder planner applies them automatically.
          </p>
          <p className="mt-2 font-display text-2xl font-bold">{money(totalAvailable)}</p>
          <p className="text-xs text-muted-foreground">Unused across {losses.length} record(s)</p>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-5">
            <div className="sm:col-span-2">
              <Label className="text-xs">Entity</Label>
              <Input
                value={form.entity_name}
                onChange={(e) => setForm({ ...form, entity_name: e.target.value })}
                placeholder="e.g. Montgomery Holdings LLC"
              />
            </div>
            <div>
              <Label className="text-xs">Tax year</Label>
              <Input
                type="number"
                value={form.tax_year}
                onChange={(e) => setForm({ ...form, tax_year: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs">Loss amount</Label>
              <Input
                type="number"
                value={form.loss_amount}
                onChange={(e) => setForm({ ...form, loss_amount: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs">Already used</Label>
              <Input
                type="number"
                value={form.used_amount}
                onChange={(e) => setForm({ ...form, used_amount: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-48">
              <Label className="text-xs">Loss type</Label>
              <Select value={form.loss_type} onValueChange={(v) => setForm({ ...form, loss_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LOSS_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="gap-1.5"
              disabled={!form.entity_name || form.loss_amount <= 0 || isSaving}
              onClick={() => {
                onAdd({ ...form, is_carryforward: form.loss_type === 'nol_carryforward', notes: null });
                setForm({ ...form, entity_name: '', loss_amount: 0, used_amount: 0 });
              }}
            >
              <Plus className="h-4 w-4" /> Add loss
            </Button>
          </div>
        </CardContent>
      </Card>

      {losses.length > 0 && (
        <Card className="glass-card">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  {['Entity', 'Year', 'Loss', 'Used', 'Available', 'Type', ''].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {losses.map((l) => (
                  <tr key={l.id} className="border-t border-border/50">
                    <td className="px-3 py-2">{l.entity_name}</td>
                    <td className="px-3 py-2">{l.tax_year}</td>
                    <td className="px-3 py-2">{money(Number(l.loss_amount))}</td>
                    <td className="px-3 py-2">{money(Number(l.used_amount))}</td>
                    <td className="px-3 py-2 font-medium">
                      {money(Math.max(0, Number(l.loss_amount) - Number(l.used_amount)))}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {LOSS_TYPES.find((t) => t.value === l.loss_type)?.label ?? l.loss_type}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemove(l.id)}>
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
