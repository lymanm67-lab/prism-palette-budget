import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Repeat, Plus, Trash2, CalendarClock, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAccounts } from '@/hooks/use-finance-data';
import {
  usePaycheckSchedules,
  useCreatePaycheckSchedule,
  useUpdatePaycheckSchedule,
  useDeletePaycheckSchedule,
  PAYCHECK_FREQUENCIES,
  toDeployFrequency,
  type PaycheckSchedule,
} from '@/hooks/use-paycheck-schedule';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);

interface Props {
  /** Called when a payday should be loaded into the deployment builder. */
  onUse: (opts: { pay_date: string; net_amount: number; frequency: string }) => void;
}

export default function PaycheckScheduleCard({ onUse }: Props) {
  const { schedules, primary, upcoming } = usePaycheckSchedules();
  const { data: accounts } = useAccounts();
  const create = useCreatePaycheckSchedule();
  const update = useUpdatePaycheckSchedule();
  const remove = useDeletePaycheckSchedule();

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ merchant: 'Paycheck', amount: '', frequency: 'biweekly', next_due_date: '', account_id: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');

  const submit = () => {
    if (!form.amount || !form.next_due_date || !form.account_id) {
      toast.error('Enter net amount, next payday, and deposit account');
      return;
    }
    create.mutate(
      {
        merchant: form.merchant.trim() || 'Paycheck',
        amount: Math.abs(Number(form.amount)),
        frequency: form.frequency,
        account_id: form.account_id,
        start_date: form.next_due_date,
        next_due_date: form.next_due_date,
        is_active: true,
        notes: 'Recurring paycheck (net deposit)',
      },
      {
        onSuccess: () => {
          toast.success('Recurring paycheck saved — it will roll forward each payday');
          setAdding(false);
          setForm({ merchant: 'Paycheck', amount: '', frequency: 'biweekly', next_due_date: '', account_id: '' });
        },
        onError: (e: any) => toast.error(e?.message || 'Could not save paycheck'),
      }
    );
  };

  const saveAmount = (s: PaycheckSchedule) => {
    update.mutate(
      { id: s.id, amount: Math.abs(Number(editAmount || s.net_amount)) },
      {
        onSuccess: () => {
          toast.success('Paycheck amount updated for all future paydays');
          setEditId(null);
        },
      }
    );
  };

  return (
    <Card className="bg-card/60 backdrop-blur-sm border-border/60">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Repeat className="h-4 w-4 text-prism-teal" /> Recurring paychecks
        </CardTitle>
        <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => setAdding(v => !v)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add paycheck
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Enter your net pay once. Coach rolls it forward to every future payday automatically — override any single
          paycheck below without changing the schedule.
        </p>

        {adding && (
          <div className="grid gap-2 sm:grid-cols-5 rounded-md border border-border/40 bg-background/40 p-2.5">
            <div>
              <Label className="text-[10px]">Label</Label>
              <Input className="h-9" value={form.merchant} onChange={e => setForm({ ...form, merchant: e.target.value })} />
            </div>
            <div>
              <Label className="text-[10px]">Net per pay</Label>
              <Input className="h-9 font-mono" type="number" step="0.01" value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <Label className="text-[10px]">Frequency</Label>
              <Select value={form.frequency} onValueChange={v => setForm({ ...form, frequency: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYCHECK_FREQUENCIES.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px]">Next payday</Label>
              <Input className="h-9" type="date" value={form.next_due_date}
                onChange={e => setForm({ ...form, next_due_date: e.target.value })} />
            </div>
            <div>
              <Label className="text-[10px]">Deposit account</Label>
              <Select value={form.account_id} onValueChange={v => setForm({ ...form, account_id: v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {(accounts || []).map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-5 flex justify-end">
              <Button size="sm" className="h-8" onClick={submit} disabled={create.isPending}>Save paycheck</Button>
            </div>
          </div>
        )}

        {schedules.length === 0 && !adding && (
          <div className="rounded-md border border-dashed border-border/50 p-4 text-center text-xs text-muted-foreground">
            No recurring paycheck yet. Add one so future paydays deploy themselves.
          </div>
        )}

        {schedules.map(s => (
          <div key={s.id} className="rounded-md border border-border/40 bg-background/40 p-2.5 flex flex-wrap items-center gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{s.merchant}</div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <CalendarClock className="h-3 w-3" />
                Next {format(parseISO(s.next_due_date), 'EEE, MMM d')} ·{' '}
                {PAYCHECK_FREQUENCIES.find(f => f.value === s.frequency)?.label || s.frequency}
              </div>
            </div>
            {editId === s.id ? (
              <div className="flex items-center gap-1.5">
                <Input className="h-8 w-28 font-mono" type="number" step="0.01" value={editAmount}
                  onChange={e => setEditAmount(e.target.value)} />
                <Button size="sm" className="h-8" onClick={() => saveAmount(s)} disabled={update.isPending}>
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <button
                className="font-mono text-sm font-bold text-prism-teal hover:underline"
                onClick={() => { setEditId(s.id); setEditAmount(String(s.net_amount)); }}
              >
                {fmt(s.net_amount)}
              </button>
            )}
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Switch checked={s.is_active}
                  onCheckedChange={v => update.mutate({ id: s.id, is_active: v })} />
                <span className="text-[10px] text-muted-foreground">Active</span>
              </div>
              <Button size="sm" className="h-8 text-[11px]"
                onClick={() => onUse({ pay_date: s.next_due_date, net_amount: s.net_amount, frequency: toDeployFrequency(s.frequency) })}>
                Deploy this payday
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8"
                onClick={() => remove.mutate(s.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        ))}

        {primary && upcoming.length > 0 && (
          <div className="rounded-md border border-border/40 bg-background/40 p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">
              Next paydays from {primary.merchant}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {upcoming.map(u => (
                <Badge key={u.date} variant="outline" className="text-[10px] cursor-pointer hover:bg-muted/40"
                  onClick={() => onUse({ pay_date: u.date, net_amount: u.net, frequency: toDeployFrequency(primary.frequency) })}>
                  {format(parseISO(u.date), 'MMM d')} · {fmt(u.net)}
                </Badge>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              Click a payday to load it into the builder. Editing the amount there overrides that paycheck only.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
