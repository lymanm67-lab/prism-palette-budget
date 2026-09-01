import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { ArrowRight, Plus, Trash2, Zap, AlertTriangle } from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';
import { useMoneyRedirects } from '@/hooks/use-zero-based';
import { useHouseholdDebts } from '@/hooks/use-household-debts';
import {
  buildRedirectFlows, redirectTotals, REDIRECT_STATUS_LABEL, TRIGGER_LABEL,
  REDIRECT_TARGET_PURPOSES, type RedirectStatus,
} from '@/lib/budgeting/redirects';
import { monthLabel } from '@/lib/budgeting/forecastEngine';
import { PURPOSE_META } from '@/lib/budgeting/moneyPurpose';

const STATUS_TONE: Record<RedirectStatus, string> = {
  active: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  scheduled: 'bg-sky-500/15 text-sky-500 border-sky-500/30',
  pending_trigger: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  needs_job: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
  paused: 'bg-muted text-muted-foreground border-border',
};

const currentMonth = () => new Date().toISOString().slice(0, 7);

export default function MoneyRedirectsPanel() {
  const { formatCurrency } = useCurrency();
  const { rows, create, update, remove } = useMoneyRedirects();
  const { data: debts } = useHouseholdDebts();

  const vacationBalance = useMemo(
    () =>
      (debts || [])
        .filter((d: any) => /vacation/i.test(d.name || ''))
        .reduce((s: number, d: any) => s + Number(d.balance || 0), 0),
    [debts],
  );

  const flows = useMemo(
    () => buildRedirectFlows((rows || []) as any, { currentMonth: currentMonth(), vacationBalance }),
    [rows, vacationBalance],
  );
  const totals = useMemo(() => redirectTotals(flows), [flows]);

  const [target, setTarget] = useState({ group: '', label: '', amount: '', purpose: 'build_wealth' });

  const addLeg = async (groupKey: string) => {
    const flow = flows.find((f) => f.groupKey === groupKey);
    if (!flow) return;
    if (!target.label || !Number(target.amount)) {
      toast.error('Name the target and the amount');
      return;
    }
    if (Number(target.amount) > flow.unassigned + 0.01) {
      toast.error(`Only ${formatCurrency(flow.unassigned)} of that pool is unassigned`);
      return;
    }
    await create.mutateAsync({
      source_label: flow.sourceLabel,
      source_amount: flow.sourceAmount,
      target_label: target.label,
      target_amount: Number(target.amount),
      target_purpose: target.purpose || null,
      start_month: flow.startMonth,
      status: target.purpose ? 'scheduled' : 'needs_job',
      trigger_type: flow.trigger,
      group_key: flow.groupKey,
      sort_order: flow.legs.length + 1,
    } as any);
    setTarget({ group: '', label: '', amount: '', purpose: 'build_wealth' });
    toast.success('Freed cash assigned a job');
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Total cash freed', value: totals.totalFreed, tone: 'text-prism-teal' },
          { label: 'To Eliminate Debt', value: totals.toDebt, tone: 'text-prism-rose' },
          { label: 'To Build Wealth', value: totals.toWealth, tone: 'text-prism-lime' },
          { label: 'To Enjoy / Travel', value: totals.toEnjoy, tone: 'text-prism-sky' },
        ].map((k) => (
          <Card key={k.label} className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{k.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${k.tone}`}>{formatCurrency(k.value)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {totals.needsJob > 0.01 && (
        <Card className="glass-card border-amber-500/40">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <div className="text-sm">
              <span className="font-semibold">{formatCurrency(totals.needsJob)}</span> of freed cash still needs a job.
              Assign it to PSLF, the vacation snowball, the Travel Fund or Build Wealth — the Buffer is not a default
              destination.
            </div>
          </CardContent>
        </Card>
      )}

      {flows.map((flow) => (
        <Card key={flow.groupKey} className="glass-card">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-prism-amber" />
                  {flow.sourceLabel}
                </CardTitle>
                <CardDescription>
                  {formatCurrency(flow.sourceAmount)} freed · {TRIGGER_LABEL[flow.trigger]} · starts{' '}
                  {monthLabel(flow.startMonth)}
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className={
                  flow.started
                    ? STATUS_TONE.active
                    : flow.awaitingTrigger
                      ? STATUS_TONE.pending_trigger
                      : STATUS_TONE.scheduled
                }
              >
                {flow.started ? 'Flowing now' : flow.awaitingTrigger ? 'Waiting on trigger' : 'Scheduled'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Assigned {formatCurrency(flow.assigned)}</span>
                <span>{flow.unassigned > 0.01 ? `${formatCurrency(flow.unassigned)} unassigned` : 'Fully assigned'}</span>
              </div>
              <Progress
                value={flow.sourceAmount > 0 ? (flow.assigned / flow.sourceAmount) * 100 : 0}
                className="h-2"
              />
            </div>

            <div className="space-y-2">
              {flow.legs.map((leg) => (
                <div
                  key={leg.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-3"
                >
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <div className="min-w-[160px] flex-1">
                    <div className="text-sm font-medium">{leg.targetLabel}</div>
                    <div className="text-xs text-muted-foreground">
                      {leg.purpose ? PURPOSE_META[leg.purpose]?.label ?? leg.purpose : 'No purpose yet'} · from{' '}
                      {monthLabel(leg.startMonth)}
                    </div>
                  </div>
                  <Input
                    type="number"
                    className="h-8 w-24 text-right"
                    defaultValue={leg.amount}
                    onBlur={(e) => update.mutate({ id: leg.id, target_amount: Number(e.target.value) } as any)}
                  />
                  <Select
                    value={leg.purpose ?? ''}
                    onValueChange={(v) =>
                      update.mutate({
                        id: leg.id,
                        target_purpose: v || null,
                        status: v ? 'scheduled' : 'needs_job',
                      } as any)
                    }
                  >
                    <SelectTrigger className="h-8 w-44"><SelectValue placeholder="Needs a job" /></SelectTrigger>
                    <SelectContent>
                      {REDIRECT_TARGET_PURPOSES.filter((p) => p.value).map((p) => (
                        <SelectItem key={p.value} value={p.value as string}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Badge variant="outline" className={STATUS_TONE[leg.status]}>
                    {REDIRECT_STATUS_LABEL[leg.status]}
                  </Badge>
                  <span className="w-28 text-right text-xs text-muted-foreground">
                    pool left {formatCurrency(Math.max(0, leg.remainingAfter))}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(leg.id)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>

            {flow.unassigned > 0.01 && (
              <div className="flex flex-wrap items-end gap-2 border-t border-border/60 pt-3">
                <div className="min-w-[160px] flex-1">
                  <Label className="text-xs">New target</Label>
                  <Input
                    value={target.group === flow.groupKey ? target.label : ''}
                    onChange={(e) => setTarget({ ...target, group: flow.groupKey, label: e.target.value })}
                    className="h-9"
                    placeholder="e.g. Vacation snowball extra"
                  />
                </div>
                <div>
                  <Label className="text-xs">Amount</Label>
                  <Input
                    type="number"
                    value={target.group === flow.groupKey ? target.amount : ''}
                    onChange={(e) => setTarget({ ...target, group: flow.groupKey, amount: e.target.value })}
                    className="h-9 w-28"
                  />
                </div>
                <div>
                  <Label className="text-xs">Purpose</Label>
                  <Select
                    value={target.purpose}
                    onValueChange={(v) => setTarget({ ...target, group: flow.groupKey, purpose: v })}
                  >
                    <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REDIRECT_TARGET_PURPOSES.filter((p) => p.value).map((p) => (
                        <SelectItem key={p.value} value={p.value as string}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => addLeg(flow.groupKey)} className="gap-2">
                  <Plus className="h-4 w-4" /> Give it a job
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {flows.length === 0 && (
        <Card className="glass-card">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No redirects yet. They appear here as debts settle, subscriptions end and raises land.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
