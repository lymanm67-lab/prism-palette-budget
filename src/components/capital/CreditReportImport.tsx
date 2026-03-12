import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Loader2, CheckCircle2, AlertTriangle, FileJson, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';

const BUREAUS = ['Equifax', 'Experian', 'TransUnion'] as const;

interface ParsedAccount {
  account_name: string;
  account_number?: string | null;
  account_type: string;
  account_status: string;
  balance: number;
  credit_limit?: number | null;
  monthly_payment?: number | null;
  high_balance?: number | null;
  date_opened?: string | null;
  date_closed?: string | null;
  date_of_first_delinquency?: string | null;
  payment_history?: string | null;
  responsibility?: string | null;
  remarks_codes?: string | null;
  terms?: string | null;
  notes?: string | null;
  selected?: boolean;
}

const CreditReportImport = ({ onSuccess }: { onSuccess: () => void }) => {
  const { household } = useHousehold();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<'ai' | 'structured'>('ai');
  const [bureau, setBureau] = useState<string>('Equifax');
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parsedAccounts, setParsedAccounts] = useState<ParsedAccount[]>([]);
  const [rawText, setRawText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'json') {
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        const accounts = Array.isArray(data) ? data : data.accounts || [];
        setParsedAccounts(accounts.map((a: any) => ({ ...a, selected: true })));
        setMode('structured');
        toast.success(`Loaded ${accounts.length} accounts from JSON`);
      } catch {
        toast.error('Invalid JSON file');
      }
    } else if (ext === 'csv') {
      const text = await file.text();
      const lines = text.trim().split('\n');
      if (lines.length < 2) { toast.error('CSV file is empty'); return; }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
      const accounts: ParsedAccount[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
        const row: any = {};
        headers.forEach((h, j) => { row[h] = values[j] || ''; });
        accounts.push({
          account_name: row.account_name || row.creditor || row.name || 'Unknown',
          account_number: row.account_number || null,
          account_type: row.account_type || row.type || 'Revolving',
          account_status: row.account_status || row.status || 'Open',
          balance: parseFloat(row.balance) || 0,
          credit_limit: row.credit_limit ? parseFloat(row.credit_limit) : null,
          monthly_payment: row.monthly_payment ? parseFloat(row.monthly_payment) : null,
          high_balance: row.high_balance ? parseFloat(row.high_balance) : null,
          date_opened: row.date_opened || null,
          date_closed: row.date_closed || null,
          payment_history: row.payment_history || null,
          responsibility: row.responsibility || null,
          remarks_codes: row.remarks_codes || null,
          selected: true,
        });
      }
      setParsedAccounts(accounts);
      setMode('structured');
      toast.success(`Loaded ${accounts.length} accounts from CSV`);
    } else {
      // Treat as text (PDF text content pasted, or .txt)
      const text = await file.text();
      setRawText(text);
      setMode('ai');
      toast.info('File loaded. Click "Parse with AI" to extract accounts.');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAIParse = async () => {
    if (!rawText.trim()) { toast.error('Paste or upload credit report text first'); return; }
    setParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-credit-report', {
        body: { report_text: rawText, bureau },
      });
      if (error) throw error;
      const accounts = (data.accounts || []).map((a: any) => ({ ...a, selected: true }));
      setParsedAccounts(accounts);
      toast.success(`AI extracted ${accounts.length} accounts`);
    } catch (e: any) {
      toast.error(`Parse failed: ${e.message}`);
    } finally {
      setParsing(false);
    }
  };

  const toggleAccount = (idx: number) => {
    setParsedAccounts(prev => prev.map((a, i) => i === idx ? { ...a, selected: !a.selected } : a));
  };

  const handleImport = async () => {
    if (!household) return;
    const selected = parsedAccounts.filter(a => a.selected);
    if (selected.length === 0) { toast.error('Select at least one account'); return; }

    setSaving(true);
    try {
      const rows = selected.map(a => ({
        household_id: household.id,
        bureau,
        account_name: a.account_name,
        account_number: a.account_number || null,
        account_type: a.account_type || 'Revolving',
        account_status: a.account_status || 'Open',
        balance: a.balance || 0,
        credit_limit: a.credit_limit || null,
        monthly_payment: a.monthly_payment || null,
        high_balance: a.high_balance || null,
        date_opened: a.date_opened || null,
        date_closed: a.date_closed || null,
        date_of_first_delinquency: a.date_of_first_delinquency || null,
        payment_history: a.payment_history || null,
        responsibility: a.responsibility || null,
        remarks_codes: a.remarks_codes || null,
        terms: a.terms || null,
        notes: a.notes || null,
      }));

      const { error } = await (supabase as any).from('credit_accounts').insert(rows);
      if (error) throw error;

      toast.success(`Imported ${selected.length} accounts`);
      setDialogOpen(false);
      setParsedAccounts([]);
      setRawText('');
      onSuccess();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = parsedAccounts.filter(a => a.selected).length;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Import Credit Report
          </CardTitle>
          <CardDescription>Upload a credit report PDF/text for AI extraction, or import CSV/JSON data directly</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {BUREAUS.map(b => (
              <button
                key={b}
                onClick={() => { setBureau(b); setDialogOpen(true); }}
                className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/20 p-6 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group"
              >
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <span className="font-medium text-sm">{b}</span>
                <Badge variant="outline" className="text-[10px]">PDF · CSV · JSON</Badge>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import {bureau} Credit Report</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Bureau selector */}
            <div>
              <Label>Bureau</Label>
              <Select value={bureau} onValueChange={setBureau}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BUREAUS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* File upload */}
            <div>
              <Label>Upload File</Label>
              <div className="flex gap-2 mt-1">
                <input ref={fileInputRef} type="file" accept=".csv,.json,.txt,.pdf" onChange={handleFileUpload} className="hidden" />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />Choose File
                </Button>
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  <FileSpreadsheet className="h-3 w-3" />CSV
                </Badge>
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  <FileJson className="h-3 w-3" />JSON
                </Badge>
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  <FileText className="h-3 w-3" />TXT
                </Badge>
              </div>
            </div>

            {/* AI Text Input */}
            {parsedAccounts.length === 0 && (
              <div>
                <Label>Or paste credit report text for AI parsing</Label>
                <Textarea
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  rows={8}
                  placeholder="Paste the text content from your credit report here..."
                  className="font-mono text-xs"
                />
                <Button onClick={handleAIParse} disabled={parsing || !rawText.trim()} className="mt-2" size="sm">
                  {parsing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Parsing...</> : <><FileText className="h-4 w-4 mr-2" />Parse with AI</>}
                </Button>
              </div>
            )}

            {/* Parsed Accounts Preview */}
            {parsedAccounts.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accent" />
                    {parsedAccounts.length} accounts found — {selectedCount} selected
                  </Label>
                  <Button variant="ghost" size="sm" onClick={() => { setParsedAccounts([]); setRawText(''); }}>
                    Clear & Retry
                  </Button>
                </div>
                <div className="border rounded-lg overflow-x-auto max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8" />
                        <TableHead>Account</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead className="text-right">Limit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedAccounts.map((acct, i) => (
                        <TableRow key={i} className={acct.selected ? '' : 'opacity-40'}>
                          <TableCell>
                            <Checkbox checked={acct.selected} onCheckedChange={() => toggleAccount(i)} />
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {acct.account_name}
                            {acct.account_number && <span className="text-muted-foreground text-xs ml-1">••{acct.account_number.slice(-4)}</span>}
                          </TableCell>
                          <TableCell className="text-xs">{acct.account_type}</TableCell>
                          <TableCell>
                            <Badge variant={['Collection', 'Charge-Off'].includes(acct.account_status) ? 'destructive' : 'outline'} className="text-xs">
                              {acct.account_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">{fmt(acct.balance)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{acct.credit_limit ? fmt(acct.credit_limit) : '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            {parsedAccounts.length > 0 && (
              <Button onClick={handleImport} disabled={saving || selectedCount === 0}>
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing...</> : <>Import {selectedCount} Accounts</>}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreditReportImport;
