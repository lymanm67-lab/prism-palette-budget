import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import {
  FREED_CASH_STATUSES,
  REACTIVATION_RISKS,
  VERIFICATION_METHODS,
  monthlySavings,
  useSaveFreedCashSource,
  type FreedCashSource,
} from '@/hooks/use-freed-cash';

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

export function VerificationQueue({ sources }: { sources: FreedCashSource[] }) {
  const save = useSaveFreedCashSource();
  const [openId, setOpenId] = useState<string | null>(null);
  const [method, setMethod] = useState('bank_statement');
  const [evidence, setEvidence] = useState('');
  const [checked, setChecked] = useState(new Date().toISOString().slice(0, 10));
  const [risk, setRisk] = useState('low');

  const pending = sources.filter((s) => s.status !== 'verified' && s.status !== 'reversed');
  const verified = sources.filter((s) => s.status === 'verified');

  const startVerify = (s: FreedCashSource) => {
    setOpenId(s.id);
    setMethod(s.verification_method ?? 'bank_statement');
    setEvidence(s.verification_evidence ?? '');
    setChecked(s.statement_checked_date ?? new Date().toISOString().slice(0, 10));
    setRisk(s.reactivation_risk ?? 'low');
  };

  const confirm = async (s: FreedCashSource) => {
    await save.mutateAsync({
      id: s.id,
      status: 'verified',
      verification_method: method,
      verification_evidence: evidence || null,
      statement_checked_date: checked,
      reactivation_risk: risk,
    });
    setOpenId(null);
  };

  const markReversed = (s: FreedCashSource) =>
    save.mutate({ id: s.id, status: 'reversed', reactivation_risk: 'high' });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Awaiting verification</CardTitle>
          <p className="text-xs text-muted-foreground">
            A saving only counts once the charge is gone or reduced on a real statement.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending.length === 0 && (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nothing waiting — every logged saving is verified or reversed.
            </p>
          )}
          {pending.map((s) => (
            <div key={s.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{s.name}</span>
                    <Badge variant="secondary">
                      {FREED_CASH_STATUSES.find((x) => x.value === s.status)?.label ?? s.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {fmt(monthlySavings(s))}/mo claimed · effective {s.effective_date}
                    {s.vendor ? ` · ${s.vendor}` : ''}
                  </p>
                </div>
                {openId === s.id ? (
                  <Button size="sm" variant="ghost" onClick={() => setOpenId(null)}>
                    Cancel
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => startVerify(s)}>
                    <CheckCircle2 className="mr-1 h-4 w-4" /> Verify
                  </Button>
                )}
              </div>

              {openId === s.id && (
                <div className="mt-3 grid gap-3 border-t pt-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="grid gap-1.5">
                      <Label>How verified</Label>
                      <Select value={method} onValueChange={setMethod}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VERIFICATION_METHODS.map((m) => (
                            <SelectItem key={m.value} value={m.value}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor={`chk-${s.id}`}>Statement checked</Label>
                      <Input
                        id={`chk-${s.id}`}
                        type="date"
                        value={checked}
                        onChange={(e) => setChecked(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Reactivation risk</Label>
                      <Select value={risk} onValueChange={setRisk}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {REACTIVATION_RISKS.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor={`ev-${s.id}`}>Evidence note</Label>
                    <Textarea
                      id={`ev-${s.id}`}
                      rows={2}
                      value={evidence}
                      onChange={(e) => setEvidence(e.target.value)}
                      placeholder="Sept statement shows no Adobe charge; confirmation #12345"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => confirm(s)} disabled={save.isPending}>
                      Confirm verified
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => markReversed(s)}>
                      Charge came back
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Verified savings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {verified.length === 0 && (
            <p className="text-sm text-muted-foreground">No verified savings yet.</p>
          )}
          {verified.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{s.name}</span>
                  <Badge variant="outline">
                    {VERIFICATION_METHODS.find((m) => m.value === s.verification_method)?.label ?? 'Verified'}
                  </Badge>
                  <Badge variant="outline">Risk: {s.reactivation_risk}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {s.statement_checked_date ? `Checked ${s.statement_checked_date}` : 'No check date'}
                  {s.verification_evidence ? ` · ${s.verification_evidence}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">{fmt(monthlySavings(s))}/mo</span>
                <Button size="sm" variant="ghost" onClick={() => markReversed(s)}>
                  <RotateCcw className="mr-1 h-4 w-4" /> Reversed
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
