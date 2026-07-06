import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2,
  RefreshCcw,
  FileText,
  Printer,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Wallet,
  Split,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

interface ReportRow {
  id: string;
  message: string;
  metadata: any;
  created_at: string;
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const monthLabel = (m?: string) => {
  if (!m) return '';
  const [y, mo] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

type EntityView = 'combined' | 'personal' | 'business';

export default function MonthlyReport() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [entity, setEntity] = useState<EntityView>('combined');

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['monthly_reports', household?.id],
    enabled: !!household?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_insights')
        .select('id, message, metadata, created_at')
        .eq('household_id', household!.id)
        .eq('insight_type', 'monthly_report')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = (data || []) as ReportRow[];
      // Sort by month desc when metadata.month exists
      return rows.sort((a, b) => (b.metadata?.month || '').localeCompare(a.metadata?.month || ''));
    },
  });

  useEffect(() => {
    if (!selectedId && reports.length) setSelectedId(reports[0].id);
  }, [reports, selectedId]);

  const active = reports.find((r) => r.id === selectedId) || reports[0];

  const runReport = async (months?: string[]) => {
    if (!household?.id) return;
    setRunning(true);
    try {
      const body: any = { household_id: household.id };
      if (months?.length) body.months = months;
      const { data, error } = await supabase.functions.invoke('monthly-spending-report', { body });
      if (error) throw error;
      const count = data?.results?.length ?? 0;
      toast.success(`Generated ${count} report${count === 1 ? '' : 's'}`);
      await qc.invalidateQueries({ queryKey: ['monthly_reports', household.id] });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to run report');
    } finally {
      setRunning(false);
    }
  };

  const runH1 = () =>
    runReport(['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06']);

  const meta = active?.metadata ?? {};
  const rawByCategory: any[] = meta.by_category || [];
  const rawOverages: any[] = meta.overages || [];
  const newCharges: any[] = meta.new_charges || [];
  const wrongAcct: any[] = meta.wrong_account_sample || [];
  const unsplit: any[] = meta.unsplit_multi_entity_sample || [];

  const matchesEntity = (e?: string) => entity === 'combined' || e === entity;
  const byCategory = rawByCategory.filter((c) => matchesEntity(c.entity));
  const overages = rawOverages.filter((o) => matchesEntity(o.entity));
  const totalSpend = byCategory.reduce((s, c) => s + (c.spent || 0), 0);
  const totalBudget = byCategory.reduce((s, c) => s + (c.budget || 0), 0);
  const overBudget = totalSpend - totalBudget;

  const printPDF = () => window.print();

  const stripFirstHeading = useMemo(() => {
    // The message repeats the "Monthly Report — YYYY-MM" heading; strip it for cleaner render
    if (!active?.message) return '';
    return active.message.replace(/^Monthly Report[^\n]*\n+/i, '');
  }, [active?.message]);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Toolbar (hidden on print) */}
      <div className="flex items-start justify-between gap-4 flex-wrap print:hidden">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <FileText className="h-6 w-6 text-prism-orange" />
            Monthly Spending Report
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Auto-generated on the 1st of each month. Overages, wrong-account charges,
            unsplit multi-entity charges, and AI-written next-month steps.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {reports.length > 0 && (
            <Select value={selectedId ?? undefined} onValueChange={setSelectedId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select report" />
              </SelectTrigger>
              <SelectContent>
                {reports.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {monthLabel(r.metadata?.month) || new Date(r.created_at).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="inline-flex rounded-md border overflow-hidden text-xs">
            {(['combined','personal','business'] as EntityView[]).map((k) => (
              <button
                key={k}
                onClick={() => setEntity(k)}
                className={`px-3 py-2 capitalize ${entity===k ? 'bg-prism-orange text-white' : 'bg-transparent hover:bg-muted'}`}
              >{k}</button>
            ))}
          </div>
          <Button variant="outline" onClick={runH1} disabled={running || !household?.id}>
            {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Generate Jan–Jun 2026
          </Button>
          <Button variant="outline" onClick={() => runReport()} disabled={running || !household?.id}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Run last month
          </Button>
          <Button onClick={printPDF} disabled={!active}>
            <Printer className="h-4 w-4 mr-2" />
            Print / Save PDF
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : !active ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No monthly report yet. Click <strong>Generate Jan–Jun 2026</strong> to backfill.
          </CardContent>
        </Card>
      ) : (
        <div id="report-print" className="space-y-6">
          {/* Hero header */}
          <div className="rounded-2xl overflow-hidden border bg-gradient-to-br from-prism-orange/10 via-background to-background print:border-black">
            <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  Monthly Spending Report
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mt-1">{monthLabel(meta.month)}</h2>
                <div className="text-xs text-muted-foreground mt-2">
                  Generated {new Date(active.created_at).toLocaleString()}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center md:text-right">
                <Stat label="Spent" value={fmtMoney(meta.total_spend)} />
                <Stat label="Budgeted" value={fmtMoney(meta.total_budget)} />
                <Stat
                  label={overBudget > 0 ? 'Over' : 'Under'}
                  value={fmtMoney(Math.abs(overBudget))}
                  tone={overBudget > 0 ? 'danger' : 'success'}
                  icon={overBudget > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                />
              </div>
            </div>
          </div>

          {/* Overages */}
          {overages.length > 0 && (
            <Card className="print:shadow-none print:border-black">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-5 w-5 text-prism-orange" />
                  Overage Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {overages.map((o, i) => (
                  <div
                    key={i}
                    className="rounded-lg border p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-card/50"
                  >
                    <div>
                      <div className="font-semibold">{o.category}</div>
                      {o.group && (
                        <div className="text-xs text-muted-foreground">{o.group}</div>
                      )}
                      {o.top_merchants?.[0] && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Driver: <span className="font-medium">{o.top_merchants[0].merchant}</span>{' '}
                          ({fmtMoney(o.top_merchants[0].amount)})
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Spent / Budget</div>
                        <div className="font-mono text-sm">
                          {fmtMoney(o.spent)} / {fmtMoney(o.budget)}
                        </div>
                      </div>
                      <Badge variant="destructive" className="whitespace-nowrap">
                        +{fmtMoney(o.overage)} ({o.overage_pct}%)
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Two-col grid: Flags + New charges */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="print:shadow-none print:border-black">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wallet className="h-5 w-5 text-prism-orange" />
                  Account & Split Issues
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Wrong account</span>
                    <Badge variant={meta.wrong_account_count ? 'destructive' : 'secondary'}>
                      {meta.wrong_account_count ?? 0}
                    </Badge>
                  </div>
                  {wrongAcct.length ? (
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {wrongAcct.map((w, i) => (
                        <li key={i}>
                          {w.date} · {w.merchant} · {fmtMoney(w.amount)} ({w.category})
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-xs text-muted-foreground">Clean.</div>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium flex items-center gap-1">
                      <Split className="h-4 w-4" /> Unsplit multi-entity
                    </span>
                    <Badge variant={meta.unsplit_multi_entity_count ? 'destructive' : 'secondary'}>
                      {meta.unsplit_multi_entity_count ?? 0}
                    </Badge>
                  </div>
                  {unsplit.length ? (
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {unsplit.map((u, i) => (
                        <li key={i}>
                          {u.date} · {u.merchant} · {fmtMoney(u.amount)} — {u.rule}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-xs text-muted-foreground">Clean.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="print:shadow-none print:border-black">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-prism-orange" />
                  New Charges This Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                {newCharges.length ? (
                  <ul className="text-sm divide-y">
                    {newCharges.map((c, i) => (
                      <li key={i} className="flex items-center justify-between py-2">
                        <span className="capitalize">{c.merchant}</span>
                        <span className="font-mono text-xs">{fmtMoney(c.amount)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-xs text-muted-foreground">No new merchants this month.</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI narrative */}
          <Card className="print:shadow-none print:border-black">
            <CardHeader>
              <CardTitle className="text-lg">Analysis & Next Steps</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none prose-headings:mt-4 prose-headings:mb-2 print:prose-neutral">
              <ReactMarkdown>{stripFirstHeading}</ReactMarkdown>
            </CardContent>
          </Card>

          <div className="text-xs text-muted-foreground text-center print:block hidden">
            PrismMoney™ · Monthly Spending Report
          </div>
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          @page { size: letter; margin: 0.5in; }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          #report-print { max-width: 100% !important; }
        }
      `}</style>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone?: 'danger' | 'success';
  icon?: React.ReactNode;
}) {
  const color =
    tone === 'danger' ? 'text-destructive' : tone === 'success' ? 'text-emerald-500' : '';
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-xl md:text-2xl font-bold flex items-center gap-1 justify-center md:justify-end ${color}`}>
        {icon}
        {value}
      </div>
    </div>
  );
}
