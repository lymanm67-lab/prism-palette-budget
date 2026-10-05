import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { softDeleteDuplicates } from '@/lib/duplicate-detector';
import { isDupeGuardExempt, markGroupNotDuplicate, NOT_DUPLICATE_TAG, type RefreshDupeGroup, type RefreshDupeTxn } from '@/lib/refresh-dupe-guard';

const NOISE = /\b(withdrawal|debit|tran|pos|purchase|ach|tac|ref\d*|recurring|payment|online|card|\d{3,})\b/gi;
/** Normalize bank memo text so "TAC - AFFIRM / Ref1…" and "DEBIT TRAN TAC - AFFIRM LENEXA KS" match. */
export function vendorKey(m?: string | null): string {
  const s = String(m || '').toLowerCase().replace(/ref\d*:.*$/i, '').replace(NOISE, ' ').replace(/[^a-z ]/g, ' ').trim();
  const words = s.split(/\s+/).filter((w) => w.length > 2);
  return words[0] || s || '(unknown)';
}

interface MonthGroup extends RefreshDupeGroup { month: string; vendor: string }

const fmt = (n: number) => Math.abs(n).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default function MonthlyDuplicatesDialog({ householdId }: { householdId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<RefreshDupeTxn[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [resolved, setResolved] = useState<Set<string>>(new Set());
  const [cleared, setCleared] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      const all: RefreshDupeTxn[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .from('transactions')
          .select('id, date, amount, merchant, provider_transaction_id, created_at, account_id, needs_review, tags')
          .eq('household_id', householdId).is('deleted_at', null).eq('is_transfer', false)
          .order('date', { ascending: false }).range(from, from + 999);
        if (error || !data) break;
        all.push(...(data as RefreshDupeTxn[]));
        if (data.length < 1000) break;
      }
      setRows(all);
      setLoading(false);
    })();
  }, [open, householdId]);

  const groups = useMemo<MonthGroup[]>(() => {
    const map = new Map<string, RefreshDupeTxn[]>();
    for (const t of rows) {
      if (isDupeGuardExempt(t.merchant) || (t.tags || []).includes(NOT_DUPLICATE_TAG)) continue;
      const k = `${t.date.slice(0, 7)}|${vendorKey(t.merchant)}|${Math.abs(Number(t.amount)).toFixed(2)}`;
      map.set(k, [...(map.get(k) || []), t]);
    }
    return [...map.entries()].filter(([k, l]) => l.length > 1 && !resolved.has(k)).map(([k, l]) => {
      const [month, vendor] = k.split('|');
      const txns = [...l].sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at));
      return { key: k, month, vendor, date: txns[0].date, amount: Number(txns[0].amount), account_id: txns[0].account_id, txns };
    }).sort((a, b) => b.month.localeCompare(a.month) || b.txns.length - a.txns.length);
  }, [rows, resolved]);

  const byMonth = useMemo(() => {
    const m = new Map<string, MonthGroup[]>();
    for (const g of groups) m.set(g.month, [...(m.get(g.month) || []), g]);
    return [...m.entries()];
  }, [groups]);

  const done = (k: string, label = 'Duplicate removed') => {
    setCleared((c) => ({ ...c, [k]: label }));
    setTimeout(() => setResolved((s) => new Set(s).add(k)), 1500);
    qc.invalidateQueries({ queryKey: ['transactions'] });
    qc.invalidateQueries({ queryKey: ['accounts'] });
  };

  const remove = async (g: MonthGroup) => {
    setBusy(g.key);
    const res = await softDeleteDuplicates({ householdId, txns: g.txns.slice(1), ruleKey: 'monthly-dupe-review', ruleName: 'Monthly duplicate review' });
    setBusy(null);
    if (res.error) return toast.error(res.error);
    toast.success(`Removed ${res.deleted} extra — undo anytime from the Categorization Audit`);
    done(g.key);
  };
  const keep = async (g: MonthGroup) => {
    setBusy(g.key);
    try { await markGroupNotDuplicate(g); toast.success('Kept all — won’t be flagged again'); done(g.key); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save'); }
    finally { setBusy(null); }
  };

  const monthLabel = (m: string) => new Date(`${m}-15`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => setOpen(true)}>
        <Copy className="h-4 w-4" /> <span className="hidden sm:inline">Duplicates by month</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Duplicates by month ({groups.length})</DialogTitle>
            <DialogDescription>
              Charges from the same vendor for the same amount in the same month. The oldest is kept. Lovable charges and transfers are left out.
            </DialogDescription>
          </DialogHeader>
          {loading ? (
            <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : byMonth.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No repeated charges found.</p>
          ) : byMonth.map(([month, list]) => (
            <div key={month} className="space-y-2">
              <h3 className="text-sm font-semibold text-primary pt-2">{monthLabel(month)} · {list.length} group{list.length === 1 ? '' : 's'}</h3>
              {list.map((g) => (
                <div key={g.key} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="font-semibold capitalize">{g.vendor} · {fmt(g.amount)} · {g.txns.length} copies</div>
                  <ul className="space-y-1 text-sm">
                    {g.txns.map((t, i) => (
                      <li key={t.id} className="flex items-start justify-between gap-2 rounded bg-muted/40 px-2 py-1">
                        <div className="min-w-0">
                          <div className="truncate">{t.merchant || '(no description)'}</div>
                          <div className="text-xs text-muted-foreground">Posted {t.date} · imported {new Date(t.created_at).toLocaleString()}</div>
                        </div>
                        {i === 0 ? <Badge variant="secondary">Keep</Badge> : <Badge variant="outline">Extra copy?</Badge>}
                      </li>
                    ))}
                  </ul>
                  {cleared[g.key] ? (
                    <div className="flex items-center justify-end gap-2 text-sm font-semibold text-primary">
                      <CheckCircle2 className="h-4 w-4" /> Cleared · {cleared[g.key]}
                    </div>
                  ) : (
                  <div className="flex flex-wrap gap-2 justify-end">
                    <Button size="sm" variant="outline" disabled={busy === g.key} onClick={() => keep(g)}>Extra payment (keep all)</Button>
                    <Button size="sm" variant="destructive" disabled={busy === g.key} onClick={() => remove(g)}>
                      {busy === g.key && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}Duplicate (remove extras)
                    </Button>
                  </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </DialogContent>
      </Dialog>
    </>
  );
}
