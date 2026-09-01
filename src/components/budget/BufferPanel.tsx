import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useCurrency } from '@/hooks/use-currency';
import { ShieldAlert, PiggyBank, Plus, Trash2 } from 'lucide-react';
import {
  useBufferMonths,
  useBufferOneTime,
  useBufferSettings,
  DEFAULT_BUFFER_SETTINGS,
} from '@/hooks/use-zero-based';
import { rollBuffer, BUFFER_STATUS_LABEL, type BufferStatus } from '@/lib/budgeting/bufferLedger';
import { monthLabel } from '@/lib/budgeting/forecastEngine';

const STATUS_TONE: Record<BufferStatus, string> = {
  healthy: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  caution: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  tight: 'bg-orange-500/15 text-orange-500 border-orange-500/30',
  critical: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
};

const thisMonth = () => new Date().toISOString().slice(0, 7);

export default function BufferPanel() {
  const { formatCurrency } = useCurrency();
  const months = useBufferMonths();
  const oneTimes = useBufferOneTime();
  const { settings, save } = useBufferSettings() as any;

  const thresholds = settings || DEFAULT_BUFFER_SETTINGS;

  const [newMonth, setNewMonth] = useState(thisMonth());
  const [otLabel, setOtLabel] = useState('');
  const [otAmount, setOtAmount] = useState('');
  const [otDate, setOtDate] = useState('');

  const oneTimeInputs = useMemo(
    () =>
      (oneTimes.rows || []).map((o) => ({
        id: o.id,
        label: o.label,
        amount: Number(o.amount || 0),
        dueDate: o.due_date,
      })),
    [oneTimes.rows],
  );

  const rolled = useMemo(
    () =>
      rollBuffer(
        (months.rows || []).map((m) => ({
          month: m.month,
          startingBalance: Number(m.starting_balance || 0),
          additions: Number(m.additions || 0),
          withdrawals: Number(m.withdrawals || 0),
          oneTimes: oneTimeInputs,
        })),
        thresholds,
      ),
    [months.rows, oneTimeInputs, thresholds],
  );

  const current = rolled.find((r) => r.month === thisMonth()) || rolled[rolled.length - 1];
  const upcomingOneTimes = (oneTimes.rows || []).filter((o) => !o.is_paid);
  const upcomingTotal = upcomingOneTimes.reduce((s, o) => s + Number(o.amount || 0), 0);

  const addMonth = async () => {
    const prior = rolled[rolled.length - 1];
    await months.create.mutateAsync({
      month: newMonth,
      starting_balance: prior ? prior.endingBalance : 0,
      additions: 0,
      withdrawals: 0,
    } as any);
    toast.success(`Added ${monthLabel(newMonth)} to the buffer ledger`);
  };

  const addOneTime = async () => {
    if (!otLabel || !otDate || !Number(otAmount)) {
      toast.error('Give the one-time expense a label, date and amount');
      return;
    }
    await oneTimes.create.mutateAsync({
      label: otLabel,
      amount: Number(otAmount),
      due_date: otDate,
      source: 'buffer',
      is_paid: false,
    } as any);
    setOtLabel('');
    setOtAmount('');
    setOtDate('');
    toast.success('One-time expense drawn from the buffer');
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ending buffer balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(current?.endingBalance ?? 0)}</div>
            <Badge variant="outline" className={`mt-2 ${STATUS_TONE[current?.status ?? 'critical']}`}>
              {BUFFER_STATUS_LABEL[current?.status ?? 'critical']}
            </Badge>
            <p className="mt-2 text-xs text-muted-foreground">
              Only the ending balance counts toward a month's allocation.
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">One-time expenses ahead</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(upcomingTotal)}</div>
            <p className="mt-2 text-xs text-muted-foreground">
              {upcomingOneTimes.length} unpaid draw{upcomingOneTimes.length === 1 ? '' : 's'} — never counted as monthly
              debt payments.
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Thresholds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(['healthy_min', 'caution_min', 'tight_min'] as const).map((k) => (
              <div key={k} className="flex items-center gap-2">
                <Label className="w-20 text-xs capitalize">{k.replace('_min', '')}</Label>
                <Input
                  type="number"
                  className="h-8"
                  defaultValue={thresholds[k]}
                  onBlur={(e) => save.mutate({ [k]: Number(e.target.value) } as any)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-prism-teal" />
            Buffer ledger
          </CardTitle>
          <CardDescription>Each month's ending balance carries into the next as the starting balance.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Starting</TableHead>
                  <TableHead className="text-right">Additions</TableHead>
                  <TableHead className="text-right">Withdrawals</TableHead>
                  <TableHead className="text-right">One-time draws</TableHead>
                  <TableHead className="text-right">Ending</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rolled.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                      No buffer months yet — add one below.
                    </TableCell>
                  </TableRow>
                )}
                {rolled.map((r) => {
                  const row = (months.rows || []).find((m) => m.month === r.month);
                  return (
                    <TableRow key={r.month}>
                      <TableCell className="font-medium">{monthLabel(r.month)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.startingBalance)}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          className="h-8 w-24 text-right"
                          defaultValue={r.additions}
                          onBlur={(e) =>
                            row && months.update.mutate({ id: row.id, additions: Number(e.target.value) } as any)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          className="h-8 w-24 text-right"
                          defaultValue={r.withdrawals}
                          onBlur={(e) =>
                            row && months.update.mutate({ id: row.id, withdrawals: Number(e.target.value) } as any)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(r.oneTimeTotal)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(r.endingBalance)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_TONE[r.status]}>
                          {BUFFER_STATUS_LABEL[r.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {row && (
                          <Button variant="ghost" size="icon" onClick={() => months.remove.mutate(row.id)}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Label className="text-xs">Add month</Label>
              <Input type="month" value={newMonth} onChange={(e) => setNewMonth(e.target.value)} className="h-9" />
            </div>
            <Button onClick={addMonth} className="gap-2">
              <Plus className="h-4 w-4" /> Add buffer month
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-prism-amber" />
            One-time expenses paid from the buffer
          </CardTitle>
          <CardDescription>Settlement fees and annual bills draw down the buffer, not the monthly plan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Due</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(oneTimes.rows || []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                      No one-time draws scheduled.
                    </TableCell>
                  </TableRow>
                )}
                {(oneTimes.rows || []).map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>{o.due_date}</TableCell>
                    <TableCell className="font-medium">{o.label}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(o.amount || 0))}</TableCell>
                    <TableCell>
                      <Switch
                        checked={!!o.is_paid}
                        onCheckedChange={(v) => oneTimes.update.mutate({ id: o.id, is_paid: v } as any)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => oneTimes.remove.mutate(o.id)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[160px]">
              <Label className="text-xs">Label</Label>
              <Input value={otLabel} onChange={(e) => setOtLabel(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Amount</Label>
              <Input type="number" value={otAmount} onChange={(e) => setOtAmount(e.target.value)} className="h-9 w-28" />
            </div>
            <div>
              <Label className="text-xs">Due date</Label>
              <Input type="date" value={otDate} onChange={(e) => setOtDate(e.target.value)} className="h-9" />
            </div>
            <Button onClick={addOneTime} className="gap-2">
              <Plus className="h-4 w-4" /> Add draw
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
