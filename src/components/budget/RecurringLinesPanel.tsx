import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, ArrowRight, Sparkles } from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';
import { useRecurringPurposeLines } from '@/hooks/use-zero-based';
import { PURPOSE_META, PHASE_TARGETS } from '@/lib/budgeting/moneyPurpose';
import { monthLabel } from '@/lib/budgeting/forecastEngine';

const TARGETS = PHASE_TARGETS[1];
const thisMonth = () => new Date().toISOString().slice(0, 7);
const round2 = (n: number) => Math.round(n * 100) / 100;

interface Props {
  /** Household take-home used for the ENJOY headroom math. */
  takeHome?: number;
}

export default function RecurringLinesPanel({ takeHome = 4250.02 }: Props) {
  const { formatCurrency } = useCurrency();
  const { rows, create, update, remove } = useRecurringPurposeLines();

  const [draft, setDraft] = useState({
    label: '',
    purpose: 'live',
    amount: '',
    start_month: thisMonth(),
    end_month: '',
  });

  const active = (purpose: string) =>
    (rows || [])
      .filter((l) => l.purpose === purpose)
      .filter((l) => (!l.start_month || l.start_month <= thisMonth()) && (!l.end_month || l.end_month >= thisMonth()));

  const liveLines = (rows || []).filter((l) => l.purpose === 'live');
  const enjoyLines = (rows || []).filter((l) => l.purpose === 'enjoy');

  const liveNow = useMemo(() => round2(active('live').reduce((s, l) => s + Number(l.amount || 0), 0)), [rows]);
  const enjoyNow = useMemo(() => round2(active('enjoy').reduce((s, l) => s + Number(l.amount || 0), 0)), [rows]);

  const enjoyTarget = round2((takeHome * TARGETS.enjoy) / 100);
  const enjoyHeadroom = round2(Math.max(0, enjoyTarget - enjoyNow));
  const enjoyPct = takeHome > 0 ? round2((enjoyNow / takeHome) * 100) : 0;
  const livePct = takeHome > 0 ? round2((liveNow / takeHome) * 100) : 0;

  const add = async () => {
    if (!draft.label.trim() || !Number(draft.amount)) {
      toast.error('Add a label and an amount');
      return;
    }
    await create.mutateAsync({
      label: draft.label.trim(),
      purpose: draft.purpose,
      amount: Number(draft.amount),
      start_month: draft.start_month || thisMonth(),
      end_month: draft.end_month || null,
      sort_order: (rows || []).filter((r) => r.purpose === draft.purpose).length + 1,
    } as any);
    setDraft({ label: '', purpose: draft.purpose, amount: '', start_month: thisMonth(), end_month: '' });
    toast.success('Line added');
  };

  const renderTable = (purpose: 'live' | 'enjoy', lines: typeof rows) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Line</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Starts</TableHead>
          <TableHead>Ends</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {lines.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
              No {PURPOSE_META[purpose].label} lines yet.
            </TableCell>
          </TableRow>
        )}
        {lines.map((l) => {
          const future = l.start_month > thisMonth();
          const ended = !!l.end_month && l.end_month < thisMonth();
          return (
            <TableRow key={l.id} className={ended ? 'opacity-50' : undefined}>
              <TableCell>
                <Input
                  defaultValue={l.label}
                  className="h-8"
                  onBlur={(e) =>
                    e.target.value !== l.label && update.mutate({ id: l.id, label: e.target.value } as any)
                  }
                />
                <div className="mt-1 flex gap-1">
                  {future && <Badge variant="outline" className="text-xs">Starts {monthLabel(l.start_month)}</Badge>}
                  {ended && <Badge variant="outline" className="text-xs">Ended</Badge>}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Input
                  type="number"
                  step="0.01"
                  defaultValue={Number(l.amount)}
                  className="h-8 w-28 text-right"
                  onBlur={(e) =>
                    Number(e.target.value) !== Number(l.amount) &&
                    update.mutate({ id: l.id, amount: Number(e.target.value) } as any)
                  }
                />
              </TableCell>
              <TableCell>
                <Input
                  type="month"
                  defaultValue={l.start_month}
                  className="h-8 w-36"
                  onBlur={(e) =>
                    e.target.value !== l.start_month &&
                    update.mutate({ id: l.id, start_month: e.target.value } as any)
                  }
                />
              </TableCell>
              <TableCell>
                <Input
                  type="month"
                  defaultValue={l.end_month || ''}
                  className="h-8 w-36"
                  onBlur={(e) =>
                    (e.target.value || null) !== l.end_month &&
                    update.mutate({ id: l.id, end_month: e.target.value || null } as any)
                  }
                />
              </TableCell>
              <TableCell>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => remove.mutate(l.id)}
                  aria-label={`Delete ${l.label}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Live lines (this month)', value: liveNow, sub: `${livePct}% of take-home · target ${TARGETS.live}%` },
          { label: 'Enjoy lines (this month)', value: enjoyNow, sub: `${enjoyPct}% of take-home · target ${TARGETS.enjoy}%` },
          { label: 'Enjoy target', value: enjoyTarget, sub: `${TARGETS.enjoy}% of ${formatCurrency(takeHome)}` },
          { label: 'Unused Enjoy → redirectable', value: enjoyHeadroom, sub: 'Never treated as new spending' },
        ].map((k) => (
          <Card key={k.label} className="glass-card">
            <CardContent className="pt-6">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</p>
              <p className="mt-1 text-2xl font-bold">{formatCurrency(k.value)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {enjoyHeadroom > 0 && (
        <Card className="glass-card border-prism-teal/40">
          <CardContent className="flex flex-wrap items-center gap-3 pt-6">
            <Sparkles className="h-5 w-5 text-prism-teal" />
            <p className="text-sm">
              Enjoy is running at <strong>{enjoyPct}%</strong> against a {TARGETS.enjoy}% target.{' '}
              <strong>{formatCurrency(enjoyHeadroom)}/month</strong> of the allowance is unused — the forecast carries
              it as redirectable cash toward Build Wealth, the Travel Fund or the snowball.
            </p>
            <Badge variant="outline" className="ml-auto gap-1">
              Redirectable <ArrowRight className="h-3 w-3" />
            </Badge>
          </CardContent>
        </Card>
      )}

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Add a recurring line</CardTitle>
          <CardDescription>Dated commitments — a line only counts in months it is active.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <Label className="text-xs">Label</Label>
            <Input
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              placeholder="Streaming, dining out, rent…"
            />
          </div>
          <div>
            <Label className="text-xs">Purpose</Label>
            <Select value={draft.purpose} onValueChange={(v) => setDraft({ ...draft, purpose: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="live">{PURPOSE_META.live.label}</SelectItem>
                <SelectItem value="enjoy">{PURPOSE_META.enjoy.label}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Amount</Label>
            <Input
              type="number"
              step="0.01"
              value={draft.amount}
              onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Starts</Label>
            <Input
              type="month"
              value={draft.start_month}
              onChange={(e) => setDraft({ ...draft, start_month: e.target.value })}
            />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label className="text-xs">Ends</Label>
              <Input
                type="month"
                value={draft.end_month}
                onChange={(e) => setDraft({ ...draft, end_month: e.target.value })}
              />
            </div>
            <Button onClick={add} disabled={create.isPending}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">{PURPOSE_META.live.label} — itemized</CardTitle>
          <CardDescription>{PURPOSE_META.live.tooltip}</CardDescription>
        </CardHeader>
        <CardContent>{renderTable('live', liveLines)}</CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">{PURPOSE_META.enjoy.label} — itemized</CardTitle>
          <CardDescription>
            Enjoy reports its real level. Whatever is left of the {TARGETS.enjoy}% allowance stays redirectable cash.
          </CardDescription>
        </CardHeader>
        <CardContent>{renderTable('enjoy', enjoyLines)}</CardContent>
      </Card>
    </div>
  );
}
