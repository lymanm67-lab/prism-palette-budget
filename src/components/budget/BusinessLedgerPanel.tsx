import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Briefcase, Plus, Trash2 } from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';
import { useBusinessExpenses, type BusinessExpenseRow } from '@/hooks/use-zero-based';

const TAX_CLASSES = [
  { value: 'business_expense', label: 'Business expense (deductible)' },
  { value: 'owner_investment', label: 'Owner investment (not an expense)' },
  { value: 'personal', label: 'Personal (not deductible)' },
];

const FREQUENCIES = ['monthly', 'annual', 'quarterly', 'one_time'];

const monthlyEquivalent = (row: BusinessExpenseRow) => {
  const amt = Number(row.amount || 0);
  if (row.frequency === 'monthly') return amt;
  if (row.frequency === 'annual') return amt / 12;
  if (row.frequency === 'quarterly') return amt / 3;
  return 0;
};

export default function BusinessLedgerPanel() {
  const { formatCurrency } = useCurrency();
  const { rows, create, update, remove } = useBusinessExpenses();

  const [draft, setDraft] = useState({
    vendor: '',
    brand: '',
    amount: '',
    frequency: 'monthly',
    tax_class: 'business_expense',
    entity: 'Montgomery Holdings',
  });

  const totals = useMemo(() => {
    const active = (rows || []).filter((r) => r.is_active !== false);
    const recurring = active.filter((r) => !r.is_owner_investment);
    return {
      monthlyRecurring: recurring.reduce((s, r) => s + monthlyEquivalent(r), 0),
      deductible: recurring
        .filter((r) => r.tax_class === 'business_expense')
        .reduce((s, r) => s + monthlyEquivalent(r), 0),
      ownerInvestment: active
        .filter((r) => r.is_owner_investment)
        .reduce((s, r) => s + Number(r.amount || 0), 0),
      count: active.length,
    };
  }, [rows]);

  const add = async () => {
    if (!draft.vendor || !Number(draft.amount)) {
      toast.error('Vendor and amount are required');
      return;
    }
    await create.mutateAsync({
      vendor: draft.vendor,
      brand: draft.brand || draft.vendor,
      amount: Number(draft.amount),
      frequency: draft.frequency,
      tax_class: draft.tax_class,
      entity: draft.entity,
      is_owner_investment: draft.tax_class === 'owner_investment',
      is_active: true,
    } as any);
    setDraft({ ...draft, vendor: '', brand: '', amount: '' });
    toast.success('Business expense logged');
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly business spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(totals.monthlyRecurring)}</div>
            <p className="mt-2 text-xs text-muted-foreground">
              Netted against business income — never charged to personal Live.
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Deductible per month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(totals.deductible)}</div>
            <p className="mt-2 text-xs text-muted-foreground">Tagged as business expenses for tax prep.</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Owner investment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(totals.ownerInvestment)}</div>
            <p className="mt-2 text-xs text-muted-foreground">Capital contributed, not an operating expense.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-prism-indigo" />
            Itemized business expense ledger
          </CardTitle>
          <CardDescription>Every vendor, its tax class and its monthly equivalent.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Tax class</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Monthly</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rows || []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                      No business expenses logged yet.
                    </TableCell>
                  </TableRow>
                )}
                {(rows || []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.brand || r.vendor}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.entity || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {TAX_CLASSES.find((t) => t.value === r.tax_class)?.label.split(' (')[0] || r.tax_class}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs capitalize">{r.frequency.replace('_', ' ')}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        className="h-8 w-24 text-right"
                        defaultValue={Number(r.amount || 0)}
                        onBlur={(e) => update.mutate({ id: r.id, amount: Number(e.target.value) } as any)}
                      />
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(monthlyEquivalent(r))}</TableCell>
                    <TableCell>
                      <Switch
                        checked={r.is_active !== false}
                        onCheckedChange={(v) => update.mutate({ id: r.id, is_active: v } as any)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => remove.mutate(r.id)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[140px] flex-1">
              <Label className="text-xs">Vendor</Label>
              <Input value={draft.vendor} onChange={(e) => setDraft({ ...draft, vendor: e.target.value })} className="h-9" />
            </div>
            <div className="min-w-[120px]">
              <Label className="text-xs">Brand</Label>
              <Input value={draft.brand} onChange={(e) => setDraft({ ...draft, brand: e.target.value })} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Amount</Label>
              <Input
                type="number"
                value={draft.amount}
                onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                className="h-9 w-28"
              />
            </div>
            <div>
              <Label className="text-xs">Frequency</Label>
              <Select value={draft.frequency} onValueChange={(v) => setDraft({ ...draft, frequency: v })}>
                <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f} value={f} className="capitalize">{f.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Tax class</Label>
              <Select value={draft.tax_class} onValueChange={(v) => setDraft({ ...draft, tax_class: v })}>
                <SelectTrigger className="h-9 w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TAX_CLASSES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={add} className="gap-2">
              <Plus className="h-4 w-4" /> Add expense
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
