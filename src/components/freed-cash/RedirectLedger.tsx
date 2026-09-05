import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import {
  FreedCashRedirect,
  FreedCashSource,
  REDIRECT_DESTINATIONS,
  REDIRECT_STATUSES,
  destinationLabel,
  monthlySavings,
  redirectCapacity,
  useDeleteRedirect,
  useSaveRedirect,
} from '@/hooks/use-freed-cash';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

const emptyRedirect = (): Partial<FreedCashRedirect> => ({
  source_id: null,
  destination_type: 'emergency_fund',
  destination_label: '',
  monthly_amount: 0,
  start_date: new Date().toISOString().slice(0, 10),
  status: 'planned',
  confirmed_moved: false,
  executed_monthly: 0,
  notes: '',
});


interface Props {
  sources: FreedCashSource[];
  redirects: FreedCashRedirect[];
}

export function RedirectLedger({ sources, redirects }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<FreedCashRedirect>>(emptyRedirect());
  const save = useSaveRedirect();
  const remove = useDeleteRedirect();

  const capacity = useMemo(() => redirectCapacity(sources, redirects), [sources, redirects]);
  const verifiedSources = useMemo(() => sources.filter((s) => s.status === 'verified'), [sources]);

  const openNew = () => {
    setDraft({ ...emptyRedirect(), monthly_amount: Number(capacity.unassignedMonthly.toFixed(2)) });
    setOpen(true);
  };

  const openEdit = (r: FreedCashRedirect) => {
    setDraft({ ...r });
    setOpen(true);
  };

  const submit = async () => {
    await save.mutateAsync({
      ...draft,
      monthly_amount: Number(draft.monthly_amount) || 0,
      executed_monthly: Number(draft.executed_monthly) || 0,
      source_id: draft.source_id || null,
    });
    setOpen(false);
  };


  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Verified freed cash" value={money(capacity.verifiedMonthly)} hint="per month" />
        <Stat label="Given a new job" value={money(capacity.assignedMonthly)} hint="assigned to redirects" />
        <Stat
          label="Still unassigned"
          value={money(capacity.unassignedMonthly)}
          hint="needs a job"
          tone={capacity.unassignedMonthly > 0 ? 'warn' : 'ok'}
        />
        <Stat label="Confirmed moved" value={money(capacity.confirmedMonthly)} hint="actually transferred" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">Redirect ledger</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Each freed dollar gets a destination. Nothing counts as built wealth until it is confirmed moved.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openNew}>
                <Plus className="mr-1 h-4 w-4" /> Add redirect
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{draft.id ? 'Edit redirect' : 'New redirect'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Freed cash source</Label>
                  <Select
                    value={draft.source_id ?? 'none'}
                    onValueChange={(v) => setDraft((d) => ({ ...d, source_id: v === 'none' ? null : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unlinked / pooled savings</SelectItem>
                      {verifiedSources.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} — {money(monthlySavings(s))}/mo
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Destination</Label>
                    <Select
                      value={draft.destination_type}
                      onValueChange={(v) => setDraft((d) => ({ ...d, destination_type: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REDIRECT_DESTINATIONS.map((d) => (
                          <SelectItem key={d.value} value={d.value}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Specific account or goal</Label>
                    <Input
                      value={draft.destination_label ?? ''}
                      placeholder="e.g. SoFi Savings, Vacation loan"
                      onChange={(e) => setDraft((d) => ({ ...d, destination_label: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Monthly amount assigned</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={draft.monthly_amount ?? 0}
                      onChange={(e) => setDraft((d) => ({ ...d, monthly_amount: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Actually moved each month</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={draft.executed_monthly ?? 0}
                      onChange={(e) => setDraft((d) => ({ ...d, executed_monthly: Number(e.target.value) }))}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Leave at 0 until the transfer or contribution actually happens.
                    </p>
                  </div>
                  <div className="space-y-1.5">

                    <Label>Start date</Label>
                    <Input
                      type="date"
                      value={draft.start_date ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, start_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={draft.status} onValueChange={(v) => setDraft((d) => ({ ...d, status: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REDIRECT_STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea
                    rows={2}
                    value={draft.notes ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={submit} disabled={save.isPending}>
                  Save redirect
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-2">
          {redirects.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No redirects yet. Verified freed cash with no job usually gets spent.
            </p>
          )}
          {redirects.map((r) => {
            const source = sources.find((s) => s.id === r.source_id);
            return (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/40 p-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{destinationLabel(r.destination_type)}</span>
                    {r.destination_label && (
                      <span className="text-xs text-muted-foreground">{r.destination_label}</span>
                    )}
                    <Badge variant={r.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                      {REDIRECT_STATUSES.find((s) => s.value === r.status)?.label ?? r.status}
                    </Badge>
                    {r.confirmed_moved && (
                      <Badge variant="outline" className="text-[10px]">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Confirmed
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {source ? `From ${source.name}` : 'From pooled freed cash'} · starts {r.start_date}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{money(Number(r.monthly_amount))}/mo</span>
                  {!r.confirmed_moved && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        save.mutate({
                          id: r.id,
                          confirmed_moved: true,
                          status: 'active',
                          last_confirmed_on: new Date().toISOString().slice(0, 10),
                        })
                      }
                    >
                      Mark moved
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove.mutate(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'ok' | 'warn';
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={`mt-1 text-lg font-semibold ${
            tone === 'warn' ? 'text-destructive' : tone === 'ok' ? 'text-primary' : ''
          }`}
        >
          {value}
        </p>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
