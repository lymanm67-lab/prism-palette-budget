import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useCurrency } from '@/hooks/use-currency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, Play, ChevronDown, ChevronUp, AlertTriangle, AlertCircle, Info, CheckCircle2, FileDown, Printer, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import PageOverview from '@/components/PageOverview';
import jsPDF from 'jspdf';
import StatementReconciliation from '@/components/StatementReconciliation';

const getMonthOptions = () => {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    });
  }
  return opts;
};

const SEVERITY_CONFIG = {
  error: { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10', badge: 'destructive' as const },
  warning: { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', badge: 'secondary' as const },
  info: { icon: Info, color: 'text-primary', bg: 'bg-primary/10', badge: 'outline' as const },
};

const ReconciliationAudit = () => {
  const { household } = useHousehold();
  const { formatCurrency } = useCurrency();
  const queryClient = useQueryClient();
  const monthOptions = useMemo(getMonthOptions, []);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);
  const [expandedFindings, setExpandedFindings] = useState<Set<number>>(new Set());

  // Fetch existing audit for selected month
  const { data: existingAudit, isLoading: loadingAudit } = useQuery({
    queryKey: ['reconciliation_audit', household?.id, selectedMonth],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reconciliation_audits' as any)
        .select('*')
        .eq('household_id', household!.id)
        .eq('audit_month', `${selectedMonth}-01`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  // Run audit mutation
  const runAudit = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('reconciliation-audit', {
        body: { household_id: household!.id, month: selectedMonth },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Audit completed successfully');
      queryClient.invalidateQueries({ queryKey: ['reconciliation_audit'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Audit failed');
    },
  });

  const audit = runAudit.data || existingAudit;
  const summary = audit?.summary as any;
  const findings = (audit?.findings || []) as any[];
  const narrative = audit?.ai_narrative || '';

  const toggleFinding = (idx: number) => {
    setExpandedFindings(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const overallHealth = useMemo(() => {
    if (!summary) return null;
    const { finding_counts } = summary;
    if (finding_counts?.errors > 0) return { label: 'Needs Attention', color: 'text-destructive', icon: AlertCircle };
    if (finding_counts?.warnings > 2) return { label: 'Review Recommended', color: 'text-amber-600', icon: AlertTriangle };
    return { label: 'Looking Good', color: 'text-emerald-600', icon: CheckCircle2 };
  }, [summary]);

  const exportPdf = () => {
    if (!audit || !summary) return;
    const doc = new jsPDF();
    const monthLabel = monthOptions.find(o => o.value === selectedMonth)?.label || selectedMonth;
    let y = 20;

    doc.setFontSize(18);
    doc.text(`Reconciliation Audit — ${monthLabel}`, 14, y);
    y += 12;

    doc.setFontSize(11);
    doc.text(`Total Transactions: ${summary.total_transactions}`, 14, y); y += 7;
    doc.text(`Total Income: ${formatCurrency(summary.total_income)}`, 14, y); y += 7;
    doc.text(`Total Expenses: ${formatCurrency(summary.total_expenses)}`, 14, y); y += 7;
    doc.text(`Business Income: ${formatCurrency(summary.business_income)}`, 14, y); y += 7;
    doc.text(`Business Expenses: ${formatCurrency(summary.business_expenses)}`, 14, y); y += 7;
    doc.text(`Uncategorized: ${summary.uncategorized_count}`, 14, y); y += 7;
    doc.text(`Duplicate Groups: ${summary.duplicate_groups}`, 14, y); y += 7;
    doc.text(`Tax Gaps: ${summary.tax_gaps}`, 14, y); y += 12;

    doc.setFontSize(14);
    doc.text('Findings', 14, y); y += 8;
    doc.setFontSize(10);
    for (const f of findings) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(`[${f.severity.toUpperCase()}] ${f.title}`, 14, y); y += 6;
    }

    if (narrative) {
      y += 6;
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFontSize(14);
      doc.text('AI Narrative', 14, y); y += 8;
      doc.setFontSize(9);
      const plain = narrative.replace(/[#*_`]/g, '');
      const lines = doc.splitTextToSize(plain, 180);
      for (const line of lines) {
        if (y > 280) { doc.addPage(); y = 20; }
        doc.text(line, 14, y); y += 5;
      }
    }

    doc.save(`audit-${selectedMonth}.pdf`);
    toast.success('PDF downloaded');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-12">
      <PageOverview
        title="Reconciliation Audit"
        description="AI-powered monthly reconciliation to catch errors, duplicates, and tax-readiness gaps."
        icon={RefreshCw}
        iconColor="text-prism-teal"
        ttsScript="This page runs an AI audit of your transactions each month, checking for missing categories, duplicates, balance issues, and tax-readiness gaps."
        features={['Missing categorizations', 'Duplicate detection', 'Balance reconciliation', 'Tax-readiness gaps', 'AI narrative summary', 'PDF export']}
      />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => runAudit.mutate()} disabled={runAudit.isPending}>
          {runAudit.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
          {existingAudit ? 'Re-run Audit' : 'Run Audit'}
        </Button>
        {audit && (
          <>
            <Button variant="outline" size="sm" onClick={exportPdf}>
              <FileDown className="h-4 w-4 mr-1" /> PDF
            </Button>
          </>
        )}
      </div>

      {loadingAudit && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}

      {!audit && !loadingAudit && !runAudit.isPending && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <RefreshCw className="h-10 w-10 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground font-medium">No audit for this month yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Click "Run Audit" to analyze your transactions</p>
          </CardContent>
        </Card>
      )}

      {audit && summary && (
        <>
          {/* Health badge */}
          {overallHealth && (
            <Card className="border-l-4" style={{ borderLeftColor: overallHealth.color === 'text-destructive' ? 'hsl(var(--destructive))' : overallHealth.color === 'text-amber-600' ? '#d97706' : '#059669' }}>
              <CardContent className="flex items-center gap-3 py-4">
                <overallHealth.icon className={`h-6 w-6 ${overallHealth.color}`} />
                <div>
                  <p className={`font-semibold ${overallHealth.color}`}>{overallHealth.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {summary.finding_counts?.errors || 0} errors · {summary.finding_counts?.warnings || 0} warnings · {summary.accounts_reviewed} accounts · {summary.businesses_reviewed} businesses
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Transactions', value: summary.total_transactions },
              { label: 'Total Income', value: formatCurrency(summary.total_income) },
              { label: 'Total Expenses', value: formatCurrency(summary.total_expenses) },
              { label: 'Uncategorized', value: summary.uncategorized_count, warn: summary.uncategorized_count > 0 },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="py-3 px-4">
                  <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wider">{s.label}</p>
                  <p className={`text-lg font-bold tabular-nums mt-1 ${s.warn ? 'text-amber-600 dark:text-amber-400' : ''}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Biz Income', value: formatCurrency(summary.business_income) },
              { label: 'Biz Expenses', value: formatCurrency(summary.business_expenses) },
              { label: 'Duplicates', value: summary.duplicate_groups, warn: summary.duplicate_groups > 0 },
              { label: 'Tax Gaps', value: summary.tax_gaps, warn: summary.tax_gaps > 0 },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="py-3 px-4">
                  <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wider">{s.label}</p>
                  <p className={`text-lg font-bold tabular-nums mt-1 ${s.warn ? 'text-amber-600 dark:text-amber-400' : ''}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Findings */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Findings</h3>
            {findings.map((f, idx) => {
              const sev = SEVERITY_CONFIG[f.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.info;
              const SevIcon = sev.icon;
              const isOpen = expandedFindings.has(idx);
              return (
                <Collapsible key={idx} open={isOpen} onOpenChange={() => toggleFinding(idx)}>
                  <CollapsibleTrigger asChild>
                    <Card className={`cursor-pointer hover:bg-muted/30 transition-colors ${sev.bg}`}>
                      <CardContent className="flex items-center gap-3 py-3 px-4">
                        <SevIcon className={`h-5 w-5 flex-shrink-0 ${sev.color}`} />
                        <span className="flex-1 text-sm font-medium">{f.title}</span>
                        <Badge variant={sev.badge} className="text-[10px]">{f.severity}</Badge>
                        {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </CardContent>
                    </Card>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Card className="mt-1 border-l-2 ml-4" style={{ borderLeftColor: 'hsl(var(--muted-foreground) / 0.3)' }}>
                      <CardContent className="py-3 px-4">
                        <ScrollArea className="max-h-[300px]">
                          {f.type === 'missing_category' && (
                            <div className="space-y-1">
                              {(f.details || []).map((d: any, i: number) => (
                                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                                  <span>{d.date} · {d.merchant}</span>
                                  <span className="font-mono tabular-nums">{formatCurrency(d.amount)}</span>
                                  <span className="text-muted-foreground">{d.account}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {f.type === 'duplicates' && (
                            <div className="space-y-3">
                              {(f.details || []).map((d: any, i: number) => (
                                <div key={i} className="space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground">{d.count} matching transactions:</p>
                                  {d.transactions.map((t: any, j: number) => (
                                    <div key={j} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                                      <span>{t.date} · {t.merchant}</span>
                                      <span className="font-mono tabular-nums">{formatCurrency(t.amount)}</span>
                                      <span className="text-muted-foreground">{t.account}</span>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}
                          {f.type === 'balance_reconciliation' && (
                            <div className="space-y-1">
                              {(f.details || []).map((d: any, i: number) => (
                                <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-border/30 last:border-0">
                                  <span className="font-medium">{d.account}</span>
                                  <span className="text-muted-foreground">{d.transaction_count} txns</span>
                                  <span className="font-mono tabular-nums">Net: {formatCurrency(d.month_net_flow)}</span>
                                  <span className="font-mono tabular-nums">Bal: {formatCurrency(d.recorded_balance)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {f.type === 'tax_readiness' && (
                            <div className="space-y-3">
                              {(f.details || []).map((d: any, i: number) => (
                                <div key={i} className="space-y-1">
                                  <p className="text-xs font-medium">{d.issue}</p>
                                  {d.recommendation && <p className="text-xs text-muted-foreground">💡 {d.recommendation}</p>}
                                  {d.categories && <p className="text-xs text-muted-foreground">Categories: {d.categories.join(', ')}</p>}
                                  {d.transactions && d.transactions.map((t: any, j: number) => (
                                    <div key={j} className="flex items-center justify-between text-xs py-0.5">
                                      <span>{t.date} · {t.merchant}</span>
                                      <span className="font-mono tabular-nums">{formatCurrency(t.amount)}</span>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>

          {/* AI Narrative */}
          {narrative && (
            <Card>
              <CardContent className="py-4 px-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">AI Audit Narrative</h3>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{narrative}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </motion.div>
  );
};

export default ReconciliationAudit;
