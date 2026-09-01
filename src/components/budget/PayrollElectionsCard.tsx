import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useCurrency } from '@/hooks/use-currency';
import { useHousehold } from '@/contexts/HouseholdContext';
import { electionsForMonth, usePayrollElections, type PayrollElection } from '@/hooks/use-money-purpose';
import { cn } from '@/lib/utils';
import { CalendarClock, Lock, Plus, Trash2 } from 'lucide-react';

const TREATMENTS = [
  { value: 'pre_tax', label: 'Pre-Tax' },
  { value: 'roth', label: 'Roth' },
  { value: 'hsa', label: 'HSA' },
  { value: 'tax', label: 'Tax / Benefit' },
  { value: 'employer', label: 'Employer-Paid' },
];

interface Props {
  month: string;
  /** true when the month has closed — imported paystub actuals win over forecasts */
  isCompletedMonth?: boolean;
}

export default function PayrollElectionsCard({ month, isCompletedMonth }: Props) {
  const { formatCurrency } = useCurrency();
  const { household } = useHousehold();
  const qc = useQueryClient();
  const { data: elections } = usePayrollElections();
  const [open, setOpen] = useState(false);
  /** `month` may arrive as `YYYY-MM` or `YYYY-MM-01`; normalise both forms. */
  const ym = month.slice(0, 7);
  const monthStart = `${ym}-01`;
  const [form, setForm] = useState({
    label: '',
    amount: '',
    tax_treatment: 'pre_tax',
    counts_as_wealth: true,
    is_employer: false,
    effective_start: monthStart,
    effective_end: '',
  });

  const active = useMemo(() => electionsForMonth(elections, ym), [elections, ym]);
  const future = useMemo(
    () => (elections || []).filter((e) => e.effective_start > monthStart),
    [elections, monthStart],
  );


  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('payroll_elections' as any).insert({
        household_id: household!.id,
        label: form.label.trim(),
        owner: 'lyman',
        amount: Number(form.amount) || 0,
        tax_treatment: form.tax_treatment,
        counts_as_wealth: form.is_employer ? true : form.counts_as_wealth,
        is_employer: form.is_employer,
        effective_start: form.effective_start,
        effective_end: form.effective_end || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-elections'] });
      toast.success('Election saved');
      setOpen(false);
      setForm((f) => ({ ...f, label: '', amount: '' }));
    },
    onError: (e: any) => toast.error(e.message),
  });

  const endNow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payroll_elections' as any)
        .update({ effective_end: `${month}-01` } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-elections'] });
      toast.success('Election ended');
    },
  });

  const employeeWealth = active.filter((e) => e.counts_as_wealth && !e.is_employer);
  const employer = active.filter((e) => e.is_employer);
  const deductions = active.filter((e) => !e.counts_as_wealth && !e.is_employer);

  const sum = (rows: PayrollElection[]) => rows.reduce((s, r) => s + Number(r.amount || 0), 0);

  const Row = ({ e }: { e: PayrollElection }) => (
    <div className="flex items-center justify-between gap-2 rounded bg-muted/30 px-2 py-1.5 text-xs">
      <div className="min-w-0">
        <p className="truncate font-medium">{e.label}</p>
        <p className="text-[10px] text-muted-foreground">
          {TREATMENTS.find((t) => t.value === e.tax_treatment)?.label} · from {e.effective_start}
          {e.effective_end ? ` to ${e.effective_end}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <span className="font-medium tabular-nums">{formatCurrency(Number(e.amount))}</span>
        {!e.effective_end && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-muted-foreground"
            onClick={() => endNow.mutate(e.id)}
            title="End this election"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="font-display flex items-center gap-2 text-sm">
              <CalendarClock className="h-4 w-4 text-primary" />
              Payroll Elections
            </CardTitle>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Effective-dated contributions. Future elections never rewrite past months.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isCompletedMonth && (
              <Badge variant="outline" className="gap-1 text-[10px]">
                <Lock className="h-3 w-3" /> Actuals locked
              </Badge>
            )}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 text-[11px]">
                  <Plus className="mr-1 h-3 w-3" /> Add
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add payroll election</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Label</Label>
                    <Input
                      value={form.label}
                      onChange={(e) => setForm({ ...form, label: e.target.value })}
                      placeholder="Roth - 457(b)"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Amount / month</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.amount}
                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Tax treatment</Label>
                      <Select
                        value={form.tax_treatment}
                        onValueChange={(v) =>
                          setForm({ ...form, tax_treatment: v, is_employer: v === 'employer' })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TREATMENTS.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Effective start</Label>
                      <Input
                        type="date"
                        value={form.effective_start}
                        onChange={(e) => setForm({ ...form, effective_start: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Effective end (optional)</Label>
                      <Input
                        type="date"
                        value={form.effective_end}
                        onChange={(e) => setForm({ ...form, effective_end: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded border p-2">
                    <div>
                      <p className="text-xs font-medium">Counts toward Build Wealth</p>
                      <p className="text-[10px] text-muted-foreground">
                        Off for taxes and benefit premiums.
                      </p>
                    </div>
                    <Switch
                      checked={form.is_employer ? true : form.counts_as_wealth}
                      disabled={form.is_employer}
                      onCheckedChange={(v) => setForm({ ...form, counts_as_wealth: v })}
                    />
                  </div>
                  <Button
                    className="w-full"
                    disabled={!form.label.trim() || !form.amount || save.isPending}
                    onClick={() => save.mutate()}
                  >
                    Save election
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Employee wealth contributions · {formatCurrency(sum(employeeWealth))}
          </p>
          {employeeWealth.length === 0 && <p className="text-muted-foreground">None in force for {month}.</p>}
          {employeeWealth.map((e) => (
            <Row key={e.id} e={e} />
          ))}
        </div>

        {employer.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Employer wealth boost · {formatCurrency(sum(employer))}
            </p>
            {employer.map((e) => (
              <Row key={e.id} e={e} />
            ))}
          </div>
        )}

        {deductions.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Taxes & benefits · {formatCurrency(sum(deductions))}
            </p>
            {deductions.map((e) => (
              <Row key={e.id} e={e} />
            ))}
          </div>
        )}

        {future.length > 0 && (
          <div className={cn('rounded border border-dashed p-2')}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Scheduled changes
            </p>
            {future.map((e) => (
              <p key={e.id} className="text-[11px] text-muted-foreground">
                {e.label} → {formatCurrency(Number(e.amount))} starting {e.effective_start}
              </p>
            ))}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground">
          {isCompletedMonth
            ? 'This month has closed — imported paystub actuals are authoritative and forecast assumptions are ignored.'
            : 'Forecast assumptions apply to this open month until a paystub is imported.'}
        </p>
      </CardContent>
    </Card>
  );
}
