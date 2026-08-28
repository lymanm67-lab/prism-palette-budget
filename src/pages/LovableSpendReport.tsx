import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useCurrency } from '@/hooks/use-currency';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, AlertTriangle, CheckCircle2, Trash2, ScanSearch, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import PageOverview from '@/components/PageOverview';
import { clusterDuplicates, confirmedDuplicateIds } from '@/lib/duplicate-detector';
import { ScoreBreakdownTooltip } from '@/components/cleanup/ScoreBreakdownTooltip';

const MONTHLY_CAP = 400; // Matches the Money Leaks entry cap for Lovable/AI services
const MERCHANT_MATCH = '%lovable%';

interface Txn {
  id: string;
  date: string;
  amount: number;
  merchant: string | null;
  normalized_merchant: string | null;
  account_id: string;
  provider_transaction_id: string | null;
  created_at: string;
}

interface Cluster {
  key: string;
  date: string;
  amount: number;
  txns: Txn[];
  confirmed: boolean; // same provider_transaction_id across accounts = true double-import
  score: number; // 0-100 duplicate confidence
  scoreLabel: 'Confirmed' | 'High' | 'Review';
}

const monthLabel = (prefix: string) => {
  const [y, m] = prefix.split('-').map(Number);
  return new Date(y, m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

export default function LovableSpendReport() {
  const { household } = useHousehold();
  const { formatCurrency } = useCurrency();
  const qc = useQueryClient();
  const [cleaning, setCleaning] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: txns, isLoading } = useQuery({
    queryKey: ['lovable-spend', household?.id],
    enabled: !!household?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, date, amount, merchant, normalized_merchant, account_id, provider_transaction_id, created_at')
        .eq('household_id', household!.id)
        .is('deleted_at', null)
        .lt('amount', 0)
        .or(`merchant.ilike.${MERCHANT_MATCH},normalized_merchant.ilike.${MERCHANT_MATCH}`)
        .order('date', { ascending: false });
      if (error) throw error;
      return (data || []) as Txn[];
    },
  });

  const { data: accounts } = useQuery({
    queryKey: ['accounts-lookup', household?.id],
    enabled: !!household?.id,
    queryFn: async () => {
      const { data } = await supabase.from('accounts').select('id, name, institution').eq('household_id', household!.id);
      return data || [];
    },
  });
  const accountName = (id: string) => accounts?.find(a => a.id === id)?.name ?? 'Account';

  const stats = useMemo(() => {
    const list = txns || [];
    const total = list.reduce((s, t) => s + Math.abs(t.amount), 0);
    const ytd = list.filter(t => t.date.startsWith('2026')).reduce((s, t) => s + Math.abs(t.amount), 0);

    // Monthly rollup
    const byMonth = new Map<string, { total: number; count: number }>();
    for (const t of list) {
      const prefix = t.date.substring(0, 7);
      const cur = byMonth.get(prefix) || { total: 0, count: 0 };
      cur.total += Math.abs(t.amount);
      cur.count += 1;
      byMonth.set(prefix, cur);
    }
    const months = Array.from(byMonth.entries())
      .map(([prefix, v]) => ({ prefix, ...v, remaining: MONTHLY_CAP - v.total }))
      .sort((a, b) => b.prefix.localeCompare(a.prefix));

    // Charge-size pattern
    const sizes = new Map<string, { count: number; total: number }>();
    for (const t of list) {
      const amt = Math.abs(t.amount);
      const label = [15, 20, 25, 50, 100].includes(Math.round(amt)) ? `$${Math.round(amt)}` : 'Other';
      const cur = sizes.get(label) || { count: 0, total: 0 };
      cur.count += 1;
      cur.total += amt;
      sizes.set(label, cur);
    }
    const sizeOrder = ['$15', '$20', '$25', '$50', '$100', 'Other'];
    const sizeRows = sizeOrder.filter(l => sizes.has(l)).map(l => ({ label: l, ...sizes.get(l)! }));

    // Same-day clusters (shared detector: amount + timing + provider-ID confidence)
    const clusters = clusterDuplicates(list) as Cluster[];

    return { total, ytd, count: list.length, months, sizeRows, clusters };
  }, [txns]);

  const confirmedDupes = useMemo(() => {
    const ids = new Set<string>();
    for (const c of stats.clusters.filter(c => c.confirmed)) {
      for (const id of confirmedDuplicateIds(c)) ids.add(id);
    }
    return (txns || []).filter(t => ids.has(t.id));
  }, [stats.clusters, txns]);

  // One-page color infographic of AI-services spend
  const buildInfographic = useCallback((): InfographicSpec | null => {
    if (!txns?.length) return null;
    const recent = stats.months.slice(0, 12);
    const overCap = recent.filter((m) => m.total > MONTHLY_CAP);
    const avgMonth = recent.length ? recent.reduce((s, m) => s + m.total, 0) / recent.length : 0;
    const trend = stats.months.slice(0, 3).reverse();

    return {
      title: 'AI Services Spend',
      period: 'Lovable — All Time',
      tagline: 'Know the cost. Cut the waste. Keep the leverage.',
      glanceTitle: 'At a Glance',
      glance: [
        { label: 'All-time', value: formatCurrency(stats.total), tone: 'red' },
        { label: '2026 spend', value: formatCurrency(stats.ytd), tone: 'blue' },
        { label: 'Charges', value: String(stats.count), tone: 'navy' },
      ],
      kpis: [
        { title: 'All-Time Spend', value: formatCurrency(stats.total), sub: `${stats.count} charges`, tone: 'red' },
        { title: '2026 Spend', value: formatCurrency(stats.ytd), sub: 'Year to date', tone: 'blue' },
        { title: 'Avg / Month', value: formatCurrency(avgMonth), sub: `last ${recent.length} months`, tone: 'navy' },
        { title: 'Monthly Cap', value: formatCurrency(MONTHLY_CAP), sub: `${overCap.length} months over cap`, tone: overCap.length ? 'orange' : 'green' },
        {
          title: 'Confirmed Duplicates',
          value: String(confirmedDupes.length),
          sub: confirmedDupes.length ? 'Ready to remove' : 'Clean',
          tone: confirmedDupes.length ? 'red' : 'green',
        },
      ],
      donut: {
        title: 'Spend by Charge Size',
        legendHeader: 'Charge Size',
        totalLabel: 'Total Spent',
        slices: stats.sizeRows.map((s) => ({ label: `${s.label} charges (${s.count})`, value: s.total })),
        footerNote: 'Micro top-ups add up fast.',
      },
      tables: [
        {
          title: 'Monthly Cap Tracker',
          tone: 'navy',
          columns: [
            { label: 'Month', align: 'left' },
            { label: 'Spent' },
            { label: 'Charges' },
            { label: 'Cap' },
            { label: 'Remaining' },
          ],
          rows: recent.map((m) => [
            { text: monthLabel(m.prefix), align: 'left' as const, bold: true },
            { text: formatCurrency(m.total), tone: (m.total > MONTHLY_CAP ? 'red' : 'navy') as const, bold: true },
            String(m.count),
            formatCurrency(MONTHLY_CAP),
            {
              text: `${m.remaining < 0 ? '-' : '+'}${formatCurrency(Math.abs(m.remaining))}`,
              tone: (m.remaining < 0 ? 'red' : 'green') as const,
              bold: true,
            },
          ]),
          emptyMessage: 'No AI-services charges recorded.',
          footerNote: overCap.length ? `${overCap.length} month(s) exceeded the ${formatCurrency(MONTHLY_CAP)} cap.` : 'Every month within cap.',
          footerTone: overCap.length ? 'red' : 'green',
        },
        {
          title: 'Duplicate-Charge Clusters',
          tone: 'red',
          columns: [
            { label: 'Date', align: 'left' },
            { label: 'Amount' },
            { label: 'Charges' },
            { label: 'Confidence' },
          ],
          rows: stats.clusters.slice(0, 8).map((c) => [
            { text: c.date, align: 'left' as const, bold: true },
            formatCurrency(Math.abs(c.amount)),
            String(c.txns.length),
            { text: `${c.scoreLabel} (${c.score}%)`, tone: (c.confirmed ? 'red' : 'orange') as const, bold: true },
          ]),
          emptyMessage: 'No same-day identical-charge clusters found.',
        },
      ],
      trend: {
        title: 'Recent Months vs Cap',
        width: '2.9in',
        points: trend.map((m) => ({
          label: monthLabel(m.prefix).slice(0, 3).toUpperCase(),
          primary: MONTHLY_CAP,
          secondary: m.total,
        })),
        primaryLabel: 'Cap',
        secondaryLabel: 'Spent',
        deltaLabel: 'Head-room',
        footerNote: 'Spend with intent, not by default.',
      },
      panels: [
        {
          title: 'Spend Discipline Rules',
          tone: 'purple',
          items: [
            `Stay under ${formatCurrency(MONTHLY_CAP)} per month`,
            'Remove double-imported charges monthly',
            'Batch work instead of micro top-ups',
            'Tie each charge to a shipped feature',
            'Review this report before renewing',
          ],
        },
      ],
      commitment: {
        label: 'MY COMMITMENT:',
        text: 'Every dollar spent on tooling must return more than it costs.',
        steps: ['TRACK\nEVERY CHARGE', 'CUT\nDUPLICATES', 'STAY UNDER\nTHE CAP', 'REINVEST\nTHE SAVINGS'],
      },
      slogan: 'MEASURE THE SPEND. MULTIPLY THE RETURN.',
    };
  }, [txns, stats, confirmedDupes, formatCurrency]);


  const softDelete = async (ids: string[], label: string) => {
    if (!household || ids.length === 0) return;
    const { error } = await supabase.from('transactions').update({ deleted_at: new Date().toISOString() }).in('id', ids);
    if (error) { toast.error(error.message); return; }
    // Audit trail entries
    const auditRows = (txns || []).filter(t => ids.includes(t.id)).map(t => ({
      household_id: household.id,
      transaction_id: t.id,
      rule_key: 'lovable-duplicate-scan',
      rule_name: label,
      source: 'duplicate-detector',
      before_merchant: t.merchant,
      amount: t.amount,
      txn_date: t.date,
      applied_by: 'manual',
    }));
    if (auditRows.length) await supabase.from('categorization_audit').insert(auditRows as any);
    toast.success(`Removed ${ids.length} duplicate${ids.length === 1 ? '' : 's'} — balances auto-corrected`);
    qc.invalidateQueries({ queryKey: ['lovable-spend'] });
    qc.invalidateQueries({ queryKey: ['transactions'] });
  };

  const runCleanup = async () => {
    setCleaning(true);
    await softDelete(confirmedDupes.map(t => t.id), 'Lovable duplicate scan (provider-ID match)');
    setCleaning(false);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-5xl">
      <PageOverview
        title="Lovable / AI Services Spend Report"
        description="Full breakdown of Lovable spending by month, day, and charge size — with duplicate-import detection and a $400/mo Money Leaks cap."
        icon={Sparkles}
        ttsScript="This report breaks down everything you have spent on Lovable A I services. The summary cards show all-time and year-to-date spend plus total charges. The same-day clusters section flags identical charges that may be double imports from your banks — confirmed duplicates can be removed with one click, and account balances correct automatically. The monthly cap tracker shows how each month compares to your four hundred dollar cap, and the charge-size pattern shows how much of your spend comes from fifteen dollar micro top-ups."
        features={[
          'All-time and 2026 spend totals',
          'Same-day duplicate detection with one-click cleanup',
          'Monthly $400 cap tracker with over-cap highlighting',
          'Charge-size pattern analysis ($15 micro top-ups vs larger purchases)',
        ]}
      />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Lovable AI Services — Spend Report</h1>
          <p className="text-sm text-muted-foreground">Duplicate detection · charge-size patterns · monthly cap tracking</p>
        </div>
        <Button onClick={runCleanup} disabled={cleaning || confirmedDupes.length === 0} variant={confirmedDupes.length ? 'destructive' : 'outline'} className="gap-2">
          {cleaning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
          {confirmedDupes.length ? `Remove ${confirmedDupes.length} confirmed duplicate${confirmedDupes.length === 1 ? '' : 's'}` : 'No confirmed duplicates'}
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">All-time spend</p><p className="text-xl font-bold">{formatCurrency(stats.total)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">2026 spend</p><p className="text-xl font-bold">{formatCurrency(stats.ytd)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total charges</p><p className="text-xl font-bold">{stats.count}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Monthly cap (Money Leaks)</p><p className="text-xl font-bold">{formatCurrency(MONTHLY_CAP)}</p></CardContent></Card>
      </div>

      {/* Same-day clusters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /> Same-Day Charge Clusters</CardTitle>
          <CardDescription>
            Clusters sharing the same bank provider ID across accounts are confirmed double-imports. Others are likely real repeat purchases — review before deleting.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stats.clusters.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> No same-day identical-charge clusters found.</div>
          )}
          {stats.clusters.map(c => (
            <div key={c.key} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-sm font-medium">
                  {new Date(c.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — {c.txns.length}× {formatCurrency(c.amount)}
                </div>
                <div className="flex items-center gap-2">
                  <ScoreBreakdownTooltip cluster={c}>
                    <Badge variant="outline" className="font-mono cursor-help">
                      {c.score}% confidence
                    </Badge>
                  </ScoreBreakdownTooltip>
                  <Badge variant={c.confirmed ? 'destructive' : 'secondary'}>
                    {c.confirmed ? 'Confirmed double-import' : 'Likely real purchases'}
                  </Badge>
                </div>
              </div>
              <div className="divide-y">
                {c.txns.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-1.5 text-sm gap-2">
                    <span className="text-muted-foreground truncate">{accountName(t.account_id)} · {t.merchant}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span>{formatCurrency(Math.abs(t.amount))}</span>
                      {!c.confirmed && (
                        <Button
                          variant="ghost" size="icon" className="h-6 w-6 text-destructive"
                          disabled={deletingId === t.id}
                          onClick={async () => { setDeletingId(t.id); await softDelete([t.id], 'Lovable duplicate review (manual)'); setDeletingId(null); }}
                        >
                          {deletingId === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Monthly cap tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Monthly Cap Tracker</CardTitle>
          <CardDescription>Spent vs. the {formatCurrency(MONTHLY_CAP)}/mo Money Leaks cap. Over-cap months are highlighted.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Charges</TableHead>
                <TableHead className="text-right">Spent</TableHead>
                <TableHead className="w-40">Cap usage</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.months.map(m => {
                const pct = Math.min(100, (m.total / MONTHLY_CAP) * 100);
                const over = m.remaining < 0;
                return (
                  <TableRow key={m.prefix} className={over ? 'bg-destructive/5' : ''}>
                    <TableCell className="font-medium">{monthLabel(m.prefix)}</TableCell>
                    <TableCell className="text-right">{m.count}</TableCell>
                    <TableCell className="text-right">{formatCurrency(m.total)}</TableCell>
                    <TableCell><Progress value={pct} className={over ? '[&>div]:bg-destructive' : ''} /></TableCell>
                    <TableCell className={`text-right font-medium ${over ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {over ? `−${formatCurrency(Math.abs(m.remaining))}` : formatCurrency(m.remaining)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Charge-size pattern */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Charge-Size Pattern</CardTitle>
          <CardDescription>How the spend breaks down by charge amount — $15 micro top-ups vs. larger purchases.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Charge size</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">% of spend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.sizeRows.map(s => (
                <TableRow key={s.label}>
                  <TableCell className="font-medium">{s.label}{s.label === '$15' && <span className="ml-2 text-xs text-muted-foreground">micro top-up</span>}</TableCell>
                  <TableCell className="text-right">{s.count}</TableCell>
                  <TableCell className="text-right">{formatCurrency(s.total)}</TableCell>
                  <TableCell className="text-right">{stats.total > 0 ? Math.round((s.total / stats.total) * 100) : 0}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
