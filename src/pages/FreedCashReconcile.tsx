import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Trash2, TriangleAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  confidenceLabel,
  statementMatches,
  useDeleteFreedCashStatement,
  useFreedCashSources,
  useFreedCashStatements,
  useSaveFreedCashStatement,
  type FreedCashSource,
  type FreedCashStatement,
} from '@/hooks/use-freed-cash';
import { filterSources, type EntityScope } from '@/lib/freed-cash/netRecurring';

const currency = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

const monthLabel = (iso: string) =>
  new Date(`${iso.slice(0, 7)}-01T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

const thisMonth = () => `${new Date().toISOString().slice(0, 7)}-01`;

const SCOPES: { value: EntityScope; label: string }[] = [
  { value: 'all', label: 'Everything' },
  { value: 'personal', label: 'Personal' },
  { value: 'business', label: 'Business' },
];

function confidenceTone(c: string) {
  if (c === 'reconciled') return 'default' as const;
  if (c === 'verified') return 'secondary' as const;
  return 'outline' as const;
}

export default function FreedCashReconcile() {
  const [scope, setScope] = useState<EntityScope>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [period, setPeriod] = useState(thisMonth());
  const [statementDate, setStatementDate] = useState('');
  const [expected, setExpected] = useState('');
  const [actual, setActual] = useState('');
  const [notes, setNotes] = useState('');

  const { data: sources, isLoading } = useFreedCashSources();
  const { data: statements } = useFreedCashStatements();
  const save = useSaveFreedCashStatement();
  const remove = useDeleteFreedCashStatement();

  useEffect(() => {
    document.title = 'Reconcile Savings | PrismMoney';
  }, []);

  const rows = useMemo(
    () => filterSources(sources ?? [], scope).filter((s) => s.status !== 'historical'),
    [sources, scope],
  );

  const bySource = useMemo(() => {
    const map = new Map<string, FreedCashStatement[]>();
    for (const st of statements ?? []) {
      const arr = map.get(st.source_id) ?? [];
      arr.push(st);
      map.set(st.source_id, arr);
    }
    return map;
  }, [statements]);

  const counts = useMemo(() => {
    let reconciled = 0;
    let verified = 0;
    let estimated = 0;
    for (const s of rows) {
      if (s.confidence === 'reconciled') reconciled += 1;
      else if (s.confidence === 'verified') verified += 1;
      else estimated += 1;
    }
    return { reconciled, verified, estimated };
  }, [rows]);

  function openFor(s: FreedCashSource) {
    setOpenId(s.id);
    setPeriod(thisMonth());
    setStatementDate('');
    setExpected(String(Number(s.new_amount ?? 0)));
    setActual('');
    setNotes('');
  }

  function submit(sourceId: string) {
    save.mutate(
      {
        source_id: sourceId,
        period_month: period,
        statement_date: statementDate || null,
        expected_amount: Number(expected || 0),
        actual_amount: Number(actual || 0),
        notes: notes || null,
      },
      { onSuccess: () => setOpenId(null) },
    );
  }

  return (
    <div className="container max-w-5xl space-y-6 py-6">
      <header className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/planning/freed-cash">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Freed Cash
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Reconcile savings</h1>
        <p className="text-sm text-muted-foreground">
          Enter what the real bill or statement actually charged. One month that matches marks the saving
          Verified. Two or more matching months mark it Reconciled, so the numbers you rely on are backed by
          real money, not estimates.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Showing:</span>
        {SCOPES.map((s) => (
          <Button
            key={s.value}
            size="sm"
            variant={s.value === scope ? 'default' : 'outline'}
            onClick={() => setScope(s.value)}
          >
            {s.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Reconciled', value: counts.reconciled, hint: 'Two or more matching bills' },
          { label: 'Verified', value: counts.verified, hint: 'One matching bill' },
          { label: 'Still estimated', value: counts.estimated, hint: 'No matching bill yet' },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-2xl font-bold">{c.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nothing to reconcile yet. Log a cancellation or reduction first.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((s) => {
            const list = (bySource.get(s.id) ?? []).slice().sort((a, b) =>
              b.period_month.localeCompare(a.period_month),
            );
            const matched = list.filter(statementMatches).length;
            const open = openId === s.id;
            return (
              <Card key={s.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{s.name}</CardTitle>
                      <CardDescription>
                        {s.vendor ? `${s.vendor} · ` : ''}Should now be billed {currency(Number(s.new_amount))} (
                        {s.billing_frequency}), was {currency(Number(s.original_amount))}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={confidenceTone(s.confidence)}>{confidenceLabel(s.confidence)}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {matched} matching {matched === 1 ? 'month' : 'months'}
                      </span>
                      <Button size="sm" variant={open ? 'secondary' : 'outline'} onClick={() => (open ? setOpenId(null) : openFor(s))}>
                        {open ? 'Cancel' : 'Enter a bill'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {(open || list.length > 0) && (
                  <CardContent className="space-y-4">
                    {open && (
                      <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label htmlFor={`period-${s.id}`}>Month this bill covers</Label>
                          <Input
                            id={`period-${s.id}`}
                            type="month"
                            value={period.slice(0, 7)}
                            onChange={(e) => setPeriod(`${e.target.value}-01`)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`stmt-${s.id}`}>Statement date (optional)</Label>
                          <Input
                            id={`stmt-${s.id}`}
                            type="date"
                            value={statementDate}
                            onChange={(e) => setStatementDate(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`exp-${s.id}`}>Amount you expected</Label>
                          <Input
                            id={`exp-${s.id}`}
                            type="number"
                            step="0.01"
                            value={expected}
                            onChange={(e) => setExpected(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`act-${s.id}`}>Amount actually charged</Label>
                          <Input
                            id={`act-${s.id}`}
                            type="number"
                            step="0.01"
                            value={actual}
                            onChange={(e) => setActual(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label htmlFor={`notes-${s.id}`}>Notes (optional)</Label>
                          <Textarea
                            id={`notes-${s.id}`}
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Where you saw it — statement line, portal, receipt"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Button onClick={() => submit(s.id)} disabled={save.isPending || !actual}>
                            Save bill
                          </Button>
                        </div>
                      </div>
                    )}

                    {list.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left text-xs text-muted-foreground">
                              <th className="py-2">Month</th>
                              <th className="py-2 text-right">Expected</th>
                              <th className="py-2 text-right">Charged</th>
                              <th className="py-2 text-right">Difference</th>
                              <th className="py-2">Result</th>
                              <th className="py-2" />
                            </tr>
                          </thead>
                          <tbody>
                            {list.map((st) => {
                              const diff = Number(st.actual_amount) - Number(st.expected_amount);
                              const ok = statementMatches(st);
                              return (
                                <tr key={st.id} className="border-b last:border-0">
                                  <td className="py-2">{monthLabel(st.period_month)}</td>
                                  <td className="py-2 text-right">{currency(Number(st.expected_amount))}</td>
                                  <td className="py-2 text-right">{currency(Number(st.actual_amount))}</td>
                                  <td className="py-2 text-right">
                                    {diff === 0 ? '—' : `${diff > 0 ? '+' : ''}${currency(diff)}`}
                                  </td>
                                  <td className="py-2">
                                    {ok ? (
                                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                        <Check className="h-3.5 w-3.5" /> Matches
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-xs text-destructive">
                                        <TriangleAlert className="h-3.5 w-3.5" /> Off by {currency(Math.abs(diff))}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 text-right">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      aria-label="Remove bill entry"
                                      onClick={() => remove.mutate(st.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
