import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useCurrency } from '@/hooks/use-currency';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Upload, FileText, Loader2, CheckCircle2, AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp, X } from 'lucide-react';
import { toast } from 'sonner';

interface ReconciliationResult {
  parsed: {
    account_name: string;
    period: { start: string; end: string };
    opening_balance: number;
    closing_balance: number;
    transaction_count: number;
  };
  reconciliation: {
    matched_count: number;
    missing_from_app: number;
    extra_in_app: number;
    high_confidence: number;
    medium_confidence: number;
    low_confidence: number;
  };
  balance: { appBalance: number; statementBalance: number; difference: number } | null;
  discrepancies: Array<{ type: string; severity: string; title: string; details: any }>;
  missing_transactions: Array<{ date: string; description: string; amount: number; type: string }>;
}

const SEVERITY_CONFIG = {
  error: { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10', badge: 'destructive' as const },
  warning: { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', badge: 'secondary' as const },
  info: { icon: Info, color: 'text-primary', bg: 'bg-primary/10', badge: 'outline' as const },
};

const StatementReconciliation = () => {
  const { household } = useHousehold();
  const { formatCurrency } = useCurrency();
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ReconciliationResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<Set<number>>(new Set());

  const { data: accounts } = useQuery({
    queryKey: ['accounts', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name, institution, balance')
        .eq('household_id', household!.id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const handleFile = async (file: File) => {
    if (!household) return;
    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.csv') && !ext.endsWith('.pdf')) {
      toast.error('Please upload a CSV or PDF bank statement');
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('household_id', household.id);
      if (selectedAccount) formData.append('account_id', selectedAccount);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/parse-bank-statement`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        }
      );

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to parse statement');

      setResult(data);
      toast.success(`Parsed ${data.parsed.transaction_count} transactions from statement`);
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const toggleIdx = (idx: number) => {
    setExpandedIdx(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const matchRate = result
    ? Math.round((result.reconciliation.matched_count / (result.parsed.transaction_count || 1)) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Bank Statement Reconciliation
      </h3>

      {/* Account selector + upload */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select account (optional)" />
          </SelectTrigger>
          <SelectContent>
            {(accounts || []).map(a => (
              <SelectItem key={a.id} value={a.id}>
                {a.institution ? `${a.institution} – ` : ''}{a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,.pdf"
          className="hidden"
          onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
        />

        <Button
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
          Upload Statement
        </Button>

        {result && (
          <Button variant="ghost" size="sm" onClick={() => setResult(null)}>
            <X className="h-4 w-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Drop zone */}
      {!result && !uploading && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }`}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Drop a bank statement (CSV or PDF) or click to browse
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Transactions will be matched against your records and discrepancies flagged
          </p>
        </div>
      )}

      {uploading && (
        <Card>
          <CardContent className="flex items-center justify-center gap-3 py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Parsing and reconciling statement...</span>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="py-3 px-4">
                <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wider">Statement Txns</p>
                <p className="text-lg font-bold tabular-nums mt-1">{result.parsed.transaction_count}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3 px-4">
                <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wider">Matched</p>
                <p className="text-lg font-bold tabular-nums mt-1 text-emerald-600">{result.reconciliation.matched_count}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3 px-4">
                <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wider">Match Rate</p>
                <p className={`text-lg font-bold tabular-nums mt-1 ${matchRate >= 90 ? 'text-emerald-600' : matchRate >= 70 ? 'text-amber-600' : 'text-destructive'}`}>
                  {matchRate}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3 px-4">
                <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-wider">Discrepancies</p>
                <p className={`text-lg font-bold tabular-nums mt-1 ${result.discrepancies.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {result.discrepancies.length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Balance check */}
          {result.balance && (
            <Card className={`border-l-4 ${Math.abs(result.balance.difference) < 0.02 ? 'border-l-emerald-500' : 'border-l-destructive'}`}>
              <CardContent className="flex items-center gap-4 py-3 px-4">
                {Math.abs(result.balance.difference) < 0.02 ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                )}
                <div className="flex-1 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">App Balance</span>
                    <p className="font-mono font-semibold tabular-nums">{formatCurrency(result.balance.appBalance)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Statement Balance</span>
                    <p className="font-mono font-semibold tabular-nums">{formatCurrency(result.balance.statementBalance)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Difference</span>
                    <p className={`font-mono font-semibold tabular-nums ${Math.abs(result.balance.difference) < 0.02 ? 'text-emerald-600' : 'text-destructive'}`}>
                      {result.balance.difference >= 0 ? '+' : ''}{formatCurrency(result.balance.difference)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Match confidence breakdown */}
          <Card>
            <CardContent className="py-3 px-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Match Confidence Breakdown</p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>High: {result.reconciliation.high_confidence}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Medium: {result.reconciliation.medium_confidence}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  <span>Low: {result.reconciliation.low_confidence}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
                  <span>Missing: {result.reconciliation.missing_from_app}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Discrepancies */}
          {result.discrepancies.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Discrepancies Found</h4>
              {result.discrepancies.map((d, idx) => {
                const sev = SEVERITY_CONFIG[d.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.info;
                const SevIcon = sev.icon;
                const isOpen = expandedIdx.has(idx);
                return (
                  <Collapsible key={idx} open={isOpen} onOpenChange={() => toggleIdx(idx)}>
                    <CollapsibleTrigger asChild>
                      <Card className={`cursor-pointer hover:bg-muted/30 transition-colors ${sev.bg}`}>
                        <CardContent className="flex items-center gap-3 py-3 px-4">
                          <SevIcon className={`h-5 w-5 flex-shrink-0 ${sev.color}`} />
                          <span className="flex-1 text-sm font-medium">{d.title}</span>
                          <Badge variant={sev.badge} className="text-[10px]">{d.severity}</Badge>
                          {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </CardContent>
                      </Card>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <Card className="mt-1 border-l-2 ml-4" style={{ borderLeftColor: 'hsl(var(--muted-foreground) / 0.3)' }}>
                        <CardContent className="py-3 px-4">
                          <ScrollArea className="max-h-[300px]">
                            {Array.isArray(d.details) ? (
                              <div className="space-y-1">
                                {d.details.map((item: any, i: number) => (
                                  <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                                    <span className="truncate max-w-[200px]">
                                      {item.date} · {item.description || item.merchant || 'Unknown'}
                                    </span>
                                    <span className="font-mono tabular-nums">
                                      {formatCurrency(Math.abs(item.amount))}
                                    </span>
                                    {item.type && (
                                      <Badge variant="outline" className="text-[9px]">{item.type}</Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : d.type === 'balance_mismatch' ? (
                              <div className="text-xs space-y-1">
                                <p>App Balance: <span className="font-mono font-semibold">{formatCurrency(d.details.appBalance)}</span></p>
                                <p>Statement Balance: <span className="font-mono font-semibold">{formatCurrency(d.details.statementBalance)}</span></p>
                                <p>Difference: <span className="font-mono font-semibold text-destructive">{formatCurrency(d.details.difference)}</span></p>
                              </div>
                            ) : (
                              <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(d.details, null, 2)}</pre>
                            )}
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}

          {result.discrepancies.length === 0 && (
            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="flex items-center gap-3 py-4">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                <div>
                  <p className="font-semibold text-emerald-600">Fully Reconciled</p>
                  <p className="text-xs text-muted-foreground">All statement transactions matched and balance verified</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default StatementReconciliation;
