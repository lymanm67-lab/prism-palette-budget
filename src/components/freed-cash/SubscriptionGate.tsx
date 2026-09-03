import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import {
  FREED_CASH_FREQUENCIES,
  GATE_DECISIONS,
  toMonthly,
  useDeleteGateRequest,
  useGateRequests,
  useSaveGateRequest,
  type FreedCashSource,
  type GateRequest,
} from '@/hooks/use-freed-cash';

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

const decisionTone: Record<string, string> = {
  approved: 'bg-primary/15 text-primary',
  declined: 'bg-destructive/15 text-destructive',
  deferred: 'bg-muted text-muted-foreground',
};

const emptyForm = {
  name: '',
  vendor: '',
  amount: '',
  billing_frequency: 'monthly',
  entity_scope: 'personal',
  reason: '',
  expected_value: '',
  replaces_source_id: '',
  replaces_note: '',
};

export function SubscriptionGate({ sources }: { sources: FreedCashSource[] }) {
  const { data: requests } = useGateRequests();
  const save = useSaveGateRequest();
  const remove = useDeleteGateRequest();
  const [form, setForm] = useState({ ...emptyForm });

  const list = requests ?? [];
  const set = (k: keyof typeof emptyForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) return;
    await save.mutateAsync({
      name: form.name.trim(),
      vendor: form.vendor || null,
      amount: Number(form.amount) || 0,
      billing_frequency: form.billing_frequency,
      entity_scope: form.entity_scope,
      reason: form.reason || null,
      expected_value: form.expected_value || null,
      replaces_source_id: form.replaces_source_id || null,
      replaces_note: form.replaces_note || null,
      decision: 'pending',
    });
    setForm({ ...emptyForm });
  };

  const decide = (r: GateRequest, decision: string) =>
    save.mutate({ id: r.id, decision, decision_date: new Date().toISOString().slice(0, 10) });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Subscription Gate</CardTitle>
          <p className="text-xs text-muted-foreground">
            No new recurring expense enters without a decision. One in, one out: name what it replaces.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="sg-name">Proposed expense</Label>
              <Input id="sg-name" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sg-vendor">Vendor</Label>
              <Input id="sg-vendor" value={form.vendor} onChange={(e) => set('vendor', e.target.value)} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="sg-amt">Amount</Label>
              <Input
                id="sg-amt"
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Billing frequency</Label>
              <Select value={form.billing_frequency} onValueChange={(v) => set('billing_frequency', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREED_CASH_FREQUENCIES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Scope</Label>
              <Select value={form.entity_scope} onValueChange={(v) => set('entity_scope', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Replaces (one in, one out)</Label>
              <Select value={form.replaces_source_id} onValueChange={(v) => set('replaces_source_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional — pick a logged expense" />
                </SelectTrigger>
                <SelectContent>
                  {sources.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sg-repnote">Or describe what it replaces</Label>
              <Input
                id="sg-repnote"
                value={form.replaces_note}
                onChange={(e) => set('replaces_note', e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="sg-reason">Why is this needed?</Label>
              <Textarea id="sg-reason" rows={2} value={form.reason} onChange={(e) => set('reason', e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sg-value">Expected value / ROI</Label>
              <Textarea
                id="sg-value"
                rows={2}
                value={form.expected_value}
                onChange={(e) => set('expected_value', e.target.value)}
              />
            </div>
          </div>

          <p className="text-sm">
            Monthly cost of this request:{' '}
            <span className="font-semibold">{fmt(toMonthly(Number(form.amount) || 0, form.billing_frequency))}</span>
          </p>

          <div>
            <Button size="sm" onClick={submit} disabled={!form.name.trim() || save.isPending}>
              Submit to gate
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Gate decisions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {list.length === 0 && (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No requests yet. Every new recurring expense should pass through here first.
            </p>
          )}
          {list.map((r) => (
            <div key={r.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{r.name}</span>
                  <Badge variant="secondary" className={decisionTone[r.decision] ?? ''}>
                    {GATE_DECISIONS.find((d) => d.value === r.decision)?.label ?? r.decision}
                  </Badge>
                  <Badge variant="outline">{r.entity_scope === 'business' ? 'Business' : 'Personal'}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {fmt(toMonthly(Number(r.amount), r.billing_frequency))}/mo
                  {r.vendor ? ` · ${r.vendor}` : ''}
                  {r.replaces_source_id
                    ? ` · replaces ${sources.find((s) => s.id === r.replaces_source_id)?.name ?? 'a logged expense'}`
                    : r.replaces_note
                      ? ` · replaces ${r.replaces_note}`
                      : ' · replaces nothing'}
                  {r.decision_date ? ` · decided ${r.decision_date}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => decide(r, 'approved')}>
                  Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => decide(r, 'declined')}>
                  Decline
                </Button>
                <Button size="sm" variant="ghost" onClick={() => decide(r, 'deferred')}>
                  Defer
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove.mutate(r.id)} aria-label="Remove request">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
