import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useCategorizationAudit, useRevertAuditRows, type AuditRuleGroup } from '@/hooks/use-categorization-audit';
import { ArrowRight, ChevronDown, History, Loader2, RotateCcw, Search, Sparkles, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useQueryClient } from '@tanstack/react-query';
import { extraCopyIds } from '@/lib/duplicate-detector';

const SOURCE_LABELS: Record<string, string> = {
  merchant_alias: 'Merchant alias rule',
  manual: 'Manual edit',
  auto_categorize: 'Auto-categorize',
  normalize_merchant: 'Merchant normalization',
  transfer_rule: 'Transfer rule',
  'duplicate-detector': 'Duplicate detector',
  'duplicate-scheduler': 'Scheduled duplicate scan',
};

const currency = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

export default function CategorizationAudit() {
  const [days, setDays] = useState(180);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const { data, isLoading } = useCategorizationAudit(days);
  const revert = useRevertAuditRows();
  const { toast } = useToast();
  const { household } = useHousehold();
  const qc = useQueryClient();
  const [removingFlags, setRemovingFlags] = useState(false);

  // Soft-delete ONLY the extra copies inside each flagged cluster (earliest row is always kept),
  // then convert/dismiss the review flags.
  const resolveFlaggedRows = async (
    rows: AuditRuleGroup['rows'],
    allRowIds: string[],
    ruleName: string,
    successTitle: string,
  ) => {
    if (!household) return;
    const pending = rows.filter((r) => !r.reverted_at && r.transaction_id);
    if (!pending.length) return;
    setRemovingFlags(true);
    try {
      const { data: txns, error: fetchErr } = await supabase
        .from('transactions')
        .select('id, date, amount, merchant, provider_transaction_id, created_at')
        .in('id', pending.map((r) => r.transaction_id!))
        .is('deleted_at', null);
      if (fetchErr) throw fetchErr;

      const removeIds = extraCopyIds((txns || []) as never as Parameters<typeof extraCopyIds>[0]);
      if (removeIds.length) {
        const { error } = await supabase
          .from('transactions')
          .update({ deleted_at: new Date().toISOString() })
          .in('id', removeIds);
        if (error) throw error;
      }

      const removedSet = new Set(removeIds);
      const removedRowIds = pending.filter((r) => removedSet.has(r.transaction_id!)).map((r) => r.id);
      const keptRowIds = allRowIds.filter((id) => !removedRowIds.includes(id));

      if (removedRowIds.length) {
        // Converted rows become duplicate-detector removals so "Undo this rule" restores them.
        await supabase
          .from('categorization_audit')
          .update({ source: 'duplicate-detector', rule_name: ruleName })
          .in('id', removedRowIds);
      }
      if (keptRowIds.length) {
        // Kept originals: dismiss the review-only flag so the cluster stops re-appearing.
        await supabase
          .from('categorization_audit')
          .update({ reverted_at: new Date().toISOString() })
          .in('id', keptRowIds);
      }

      toast({
        title: successTitle,
        description: removeIds.length
          ? `${removeIds.length} extra copy(ies) soft-deleted — one original kept in every cluster. Use "Undo this rule" to restore them.`
          : 'No extra copies found — every flagged charge looks like a separate real transaction, so the flags were dismissed.',
      });
      qc.invalidateQueries({ queryKey: ['categorization-audit'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    } catch (e: unknown) {
      toast({ title: 'Removal failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setRemovingFlags(false);
    }
  };

  const removeFlaggedDupes = (g: AuditRuleGroup) =>
    resolveFlaggedRows(g.rows, g.rows.map((r) => r.id), `${g.ruleName} — removed after review`, 'Duplicates removed');

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data || [];
    return (data || [])
      .map((g) => ({
        ...g,
        rows: g.rows.filter(
          (r) =>
            (r.before_merchant || '').toLowerCase().includes(q) ||
            (r.after_merchant || '').toLowerCase().includes(q) ||
            (r.before_category_name || '').toLowerCase().includes(q) ||
            (r.after_category_name || '').toLowerCase().includes(q) ||
            g.ruleName.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.rows.length);
  }, [data, search]);

  const totals = useMemo(() => {
    const all = groups.flatMap((g) => g.rows);
    return {
      rules: groups.length,
      changed: all.filter((r) => !r.reverted_at).length,
      reverted: all.filter((r) => r.reverted_at).length,
    };
  }, [groups]);

  const undoGroup = async (g: AuditRuleGroup) => {
    try {
      const n = await revert.mutateAsync(g.rows);
      toast({ title: 'Reverted', description: `${n} transaction(s) restored to their previous values.` });
    } catch (e: unknown) {
      toast({
        title: 'Revert failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  // Bulk-resolve every scheduler-flagged cluster in one action; the converted rows keep the
  // same rule_key, so the existing group "Undo this rule" restores everything at once.
  const schedulerGroups = (data || []).filter((g) => g.source === 'duplicate-scheduler' && g.changed > 0);
  const pendingFlagCount = schedulerGroups.reduce((n, g) => n + g.changed, 0);

  const resolveAllFlagged = () =>
    resolveFlaggedRows(
      schedulerGroups.flatMap((g) => g.rows),
      schedulerGroups.flatMap((g) => g.rows.map((r) => r.id)),
      'Scheduled duplicate scan — bulk resolved',
      'All flagged duplicates resolved',
    );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6 text-prism-amber" />
            Categorization Audit
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every rule-driven change to a transaction's merchant or category, with before/after values and one-click undo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingFlagCount > 0 && (
            <Button variant="destructive" size="sm" disabled={removingFlags} onClick={resolveAllFlagged}>
              {removingFlags ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Resolve all flagged ({pendingFlagCount})
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link to="/cleanup">
              <Sparkles className="mr-2 h-4 w-4" />
              Data Cleanup
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <TabsList>
            <TabsTrigger value="30">30 days</TabsTrigger>
            <TabsTrigger value="90">90 days</TabsTrigger>
            <TabsTrigger value="180">6 months</TabsTrigger>
            <TabsTrigger value="730">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search merchant, category, or rule"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Rules applied', value: totals.rules },
          { label: 'Changes in effect', value: totals.changed },
          { label: 'Reverted', value: totals.reverted },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-semibold mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {!groups.length && (
        <Card>
          <CardContent className="py-12 text-center">
            <History className="h-10 w-10 mx-auto text-prism-teal mb-3" />
            <p className="font-medium">No rule changes recorded yet.</p>
            <p className="text-sm text-muted-foreground">
              Run a fix from Data Cleanup and it will appear here with a full before/after trail.
            </p>
          </CardContent>
        </Card>
      )}

      {groups.map((g) => (
        <Collapsible key={g.ruleKey} open={open === g.ruleKey} onOpenChange={(v) => setOpen(v ? g.ruleKey : null)}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{g.ruleName}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {SOURCE_LABELS[g.source] || g.source} · last run {new Date(g.lastRunAt).toLocaleString()} ·{' '}
                      {currency(g.totalAmount)} affected
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{g.changed} changed</Badge>
                    {g.reverted > 0 && <Badge variant="secondary">{g.reverted} reverted</Badge>}
                    <ChevronDown className={`h-4 w-4 transition-transform ${open === g.ruleKey ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-3">
                {g.source === 'duplicate-scheduler' && (
                  <p className="text-xs text-muted-foreground rounded-md border border-dashed p-2">
                    Review-only flags from the scheduled detector — nothing was changed yet. Remove the duplicates, or use Undo to dismiss these flags (dismissed clusters are never re-flagged).
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  {g.source === 'duplicate-scheduler' && (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={removingFlags || g.changed === 0}
                      onClick={() => removeFlaggedDupes(g)}
                    >
                      {removingFlags ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Remove flagged duplicates ({g.changed})
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={revert.isPending || g.changed === 0}
                    onClick={() => undoGroup(g)}
                  >
                    {revert.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="mr-2 h-4 w-4" />
                    )}
                    {g.source === 'duplicate-scheduler' ? `Dismiss flags (${g.changed})` : `Undo this rule (${g.changed})`}
                  </Button>
                </div>
                <div className="max-h-96 overflow-auto rounded-md border border-border/50">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs text-muted-foreground">
                      <tr>
                        <th className="p-2 text-left">Date</th>
                        <th className="p-2 text-left">Before</th>
                        <th className="p-2 text-left">After</th>
                        <th className="p-2 text-right">Amount</th>
                        <th className="p-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.rows.map((r) => (
                        <tr key={r.id} className="border-t border-border/40 align-top">
                          <td className="p-2 text-muted-foreground whitespace-nowrap">{r.txn_date || '—'}</td>
                          <td className="p-2">
                            <span className="block">{r.before_merchant || '—'}</span>
                            <span className="block text-xs text-muted-foreground">
                              {r.before_category_name || 'Uncategorized'}
                            </span>
                          </td>
                          <td className="p-2">
                            <span className="flex items-center gap-1">
                              <ArrowRight className="h-3 w-3 text-prism-teal" />
                              {r.after_merchant || '—'}
                            </span>
                            <span className="block text-xs text-muted-foreground pl-4">
                              {r.after_category_name || 'Uncategorized'}
                            </span>
                          </td>
                          <td className="p-2 text-right font-mono whitespace-nowrap">
                            {Number(r.amount || 0).toFixed(2)}
                          </td>
                          <td className="p-2 text-right">
                            {r.reverted_at ? (
                              <Badge variant="secondary">Reverted</Badge>
                            ) : (
                              <Badge variant="outline">Applied</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}
    </div>
  );
}
