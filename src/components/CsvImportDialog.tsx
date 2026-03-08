import { useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAccounts, useCategories } from '@/hooks/use-finance-data';
import { useHousehold } from '@/contexts/HouseholdContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  parseCsvText,
  getDefaultMapping,
  applyMapping,
  FORMAT_LABELS,
  type ColumnMapping,
  type ParsedRow,
  type CsvParseResult,
  type DetectedFormat,
} from '@/lib/csv-parser';
import { parseOfxText, detectFinancialFileType, type OfxParseResult, type OfxTransaction } from '@/lib/ofx-parser';
import { formatCurrency } from '@/lib/seed-data';
import { Upload, FileSpreadsheet, ArrowRight, ArrowLeft, Check, AlertCircle, Loader2, Info, AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDuplicateDetection } from '@/hooks/use-duplicate-detection';

type FileMode = 'csv' | 'ofx';
type Step = 'upload' | 'map' | 'preview' | 'importing' | 'done';

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SUPPORTED_FORMATS: { name: string; columns: string }[] = [
  { name: 'OFX / QFX / QBO', columns: 'Open Financial Exchange — Quicken, QuickBooks, most banks' },
  { name: 'Chase Bank', columns: 'Transaction Date, Post Date, Description, Amount, Category' },
  { name: 'Bank of America', columns: 'Date, Description, Amount, Running Bal.' },
  { name: 'Wells Fargo', columns: 'Date, Amount, Description, Check #' },
  { name: 'Capital One', columns: 'Transaction Date, Description, Category, Debit, Credit' },
  { name: 'Citi Bank', columns: 'Status, Date, Description, Debit, Credit' },
  { name: 'QuickBooks', columns: 'Date, Transaction Type, Name, Memo, Amount, Balance' },
  { name: 'YNAB', columns: 'Date, Payee, Category, Memo, Outflow, Inflow' },
  { name: 'Mint', columns: 'Date, Description, Amount, Transaction Type, Category' },
  { name: 'Monarch Money', columns: 'Date, Merchant, Category, Account, Amount, Notes' },
  { name: 'Generic CSV', columns: 'Any CSV with date, amount, and description columns' },
];

const CsvImportDialog = ({ open, onOpenChange }: CsvImportDialogProps) => {
  const { toast } = useToast();
  const { household } = useHousehold();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const qc = useQueryClient();
  const { findDuplicates } = useDuplicateDetection();

  const [step, setStep] = useState<Step>('upload');
  const [fileMode, setFileMode] = useState<FileMode>('csv');
  const [csvResult, setCsvResult] = useState<CsvParseResult | null>(null);
  const [ofxResult, setOfxResult] = useState<OfxParseResult | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({ date: '', merchant: '', amount: '', category: '', notes: '' });
  const [targetAccountId, setTargetAccountId] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState({ success: 0, failed: 0, skippedDupes: 0 });
  const [ruleMatchCount, setRuleMatchCount] = useState(0);
  const [duplicateRows, setDuplicateRows] = useState<Set<number>>(new Set());
  const [dragging, setDragging] = useState(false);
  const [showFormats, setShowFormats] = useState(false);
  const [previewRuleMatches, setPreviewRuleMatches] = useState<Map<number, { categoryId: string; categoryName: string }>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('upload');
    setFileMode('csv');
    setCsvResult(null);
    setOfxResult(null);
    setMapping({ date: '', merchant: '', amount: '', category: '', notes: '' });
    setTargetAccountId('');
    setParsedRows([]);
    setSelectedRows(new Set());
    setImporting(false);
    setImportResult({ success: 0, failed: 0, skippedDupes: 0 });
    setRuleMatchCount(0);
    setDragging(false);
    setShowFormats(false);
    setPreviewRuleMatches(new Map());
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const processFile = useCallback((file: File) => {
    const fileType = detectFinancialFileType(file.name);
    if (!fileType) {
      toast({ title: 'Unsupported file type', description: 'Please upload a .csv, .ofx, .qbo, or .qfx file.', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        if (fileType === 'csv') {
          setFileMode('csv');
          const result = parseCsvText(text);
          setCsvResult(result);
          const defaultMap = getDefaultMapping(result.headers, result.detectedFormat);
          setMapping(defaultMap);
          setStep('map');
          const label = FORMAT_LABELS[result.detectedFormat];
          toast({ title: `Detected: ${label}`, description: `${result.rows.length} rows found. Verify column mapping.` });
        } else {
          // OFX/QBO/QFX
          setFileMode('ofx');
          const result = parseOfxText(text, fileType);
          setOfxResult(result);
          // Convert OFX transactions directly to ParsedRows for preview
          const rows: ParsedRow[] = result.transactions.map(t => ({
            date: t.date,
            merchant: t.merchant,
            amount: t.amount,
            category: '',
            notes: t.memo,
            originalRow: { date: t.date, merchant: t.merchant, amount: String(t.amount), memo: t.memo, fitId: t.fitId, type: t.type },
          }));
          setParsedRows(rows);
          // Detect duplicates
          const dupes = findDuplicates(rows.map(r => ({ date: r.date, amount: r.amount, merchant: r.merchant })));
          setDuplicateRows(dupes);
          const selected = new Set(rows.map((_, i) => i).filter(i => !dupes.has(i)));
          setSelectedRows(selected);
          // Skip mapping step — go straight to preview, but need account selection
          setStep('map');
          const typeLabel = fileType.toUpperCase();
          toast({ 
            title: `${typeLabel} file loaded`, 
            description: `${result.transactions.length} transactions found${result.accountId ? ` from account ${result.accountId}` : ''}. Select target account.` 
          });
          if (dupes.size > 0) {
            toast({ title: `${dupes.size} potential duplicate(s) found`, description: 'Duplicates are deselected by default.' });
          }
        }
      } catch (err: any) {
        toast({ title: 'Parse error', description: err.message, variant: 'destructive' });
      }
    };
    reader.readAsText(file);
  }, [toast, findDuplicates]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragging(false), []);

  const hasDebitCredit = !!(mapping.debit || mapping.credit);

  const handleProceedToPreview = () => {
    if (!csvResult) return;
    const rows = applyMapping(csvResult.rows, mapping, csvResult.detectedFormat);
    setParsedRows(rows);

    // Detect duplicates
    const dupes = findDuplicates(rows.map(r => ({ date: r.date, amount: r.amount, merchant: r.merchant })));
    setDuplicateRows(dupes);

    // Select all non-duplicate rows by default
    const selected = new Set(rows.map((_, i) => i).filter(i => !dupes.has(i)));
    setSelectedRows(selected);

    if (dupes.size > 0) {
      toast({ title: `${dupes.size} potential duplicate(s) found`, description: 'Duplicates are deselected by default. You can re-select them if needed.' });
    }

    computePreviewRuleMatches(rows);
    setStep('preview');
  };

  const handleToggleRow = (idx: number) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const handleToggleAll = () => {
    if (selectedRows.size === parsedRows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(parsedRows.map((_, i) => i)));
    }
  };

  // Match CSV category names to DB categories
  const categoryLookup = useMemo(() => {
    if (!categories) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const c of categories) {
      map.set(c.name.toLowerCase(), c.id);
    }
    return map;
  }, [categories]);

  // Fetch categorization rules and pre-compute matches for preview
  const computePreviewRuleMatches = useCallback(async (rows: ParsedRow[]) => {
    if (!household) return;
    const { data: rules } = await supabase
      .from('categorization_rules')
      .select('merchant_pattern, category_id')
      .eq('household_id', household.id);

    if (!rules || rules.length === 0) {
      setPreviewRuleMatches(new Map());
      return;
    }

    const ruleMap = new Map<string, string>();
    for (const r of rules) {
      ruleMap.set(r.merchant_pattern.toLowerCase(), r.category_id);
    }

    const matches = new Map<number, { categoryId: string; categoryName: string }>();
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Only match if no CSV category already assigned
      if (!row.category && row.merchant) {
        const ruleMatch = ruleMap.get(row.merchant.toLowerCase().trim());
        if (ruleMatch) {
          const catName = categories?.find(c => c.id === ruleMatch)?.name || 'Matched';
          matches.set(i, { categoryId: ruleMatch, categoryName: catName });
        }
      }
    }
    setPreviewRuleMatches(matches);
  }, [household, categories]);

  const handleImport = async () => {
    if (!household || !targetAccountId) return;
    setImporting(true);
    setStep('importing');

    const toImport = parsedRows.filter((_, i) => selectedRows.has(i));
    let success = 0;
    let failed = 0;

    // Fetch saved categorization rules for auto-matching
    const { data: rules } = await supabase
      .from('categorization_rules')
      .select('merchant_pattern, category_id')
      .eq('household_id', household.id);

    const ruleMap = new Map<string, string>();
    for (const r of (rules || [])) {
      ruleMap.set(r.merchant_pattern.toLowerCase(), r.category_id);
    }

    let ruleApplied = 0;

    // Batch insert in chunks of 50
    const chunkSize = 50;
    for (let i = 0; i < toImport.length; i += chunkSize) {
      const chunk = toImport.slice(i, i + chunkSize).map(row => {
        // Priority: 1) CSV category name match, 2) merchant rule match
        let categoryId = categoryLookup.get(row.category.toLowerCase()) || null;
        if (!categoryId && row.merchant) {
          const ruleMatch = ruleMap.get(row.merchant.toLowerCase().trim());
          if (ruleMatch) {
            categoryId = ruleMatch;
            ruleApplied++;
          }
        }
        return {
          household_id: household.id,
          account_id: targetAccountId,
          date: row.date,
          merchant: row.merchant || null,
          amount: row.amount,
          category_id: categoryId,
          notes: row.notes || null,
        };
      });

      const { error } = await supabase.from('transactions').insert(chunk);
      if (error) {
        failed += chunk.length;
      } else {
        success += chunk.length;
      }
    }

    setImportResult({ success, failed, skippedDupes: 0 });
    setRuleMatchCount(ruleApplied);
    setImporting(false);
    setStep('done');
    qc.invalidateQueries({ queryKey: ['transactions'] });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import Bank Transactions
          </DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          {['Upload', fileMode === 'ofx' ? 'Select Account' : 'Map Columns', 'Preview & Import'].map((label, i) => {
            const stepIdx = ['upload', 'map', 'preview', 'importing', 'done'].indexOf(step);
            const thisIdx = i;
            const isActive = (thisIdx === 0 && stepIdx === 0) || (thisIdx === 1 && stepIdx === 1) || (thisIdx === 2 && stepIdx >= 2);
            const isDone = stepIdx > thisIdx || (thisIdx === 2 && step === 'done');
            return (
              <div key={label} className="flex items-center gap-1.5">
                {i > 0 && <div className="w-6 h-px bg-border" />}
                <div className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                  isDone ? 'bg-prism-teal text-white' : isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}>
                  {isDone ? <Check className="h-3 w-3" /> : i + 1}
                </div>
                <span className={isActive || isDone ? 'text-foreground font-medium' : ''}>{label}</span>
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div
                className={cn(
                  'rounded-xl border-2 border-dashed p-10 text-center transition-colors cursor-pointer',
                  dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className={cn('mx-auto h-10 w-10 mb-3', dragging ? 'text-primary' : 'text-muted-foreground')} />
                <p className="font-medium mb-1">
                  {dragging ? 'Drop your file here' : 'Drag & drop your file or click to browse'}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Supports CSV, OFX, QBO, and QFX files from banks and financial software
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.CSV,.ofx,.OFX,.qbo,.QBO,.qfx,.QFX"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                >
                  Choose File
                </Button>
              </div>

              {/* Supported formats */}
              <div>
                <button
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowFormats(!showFormats)}
                >
                  <Info className="h-3.5 w-3.5" />
                  {showFormats ? 'Hide' : 'Show'} supported formats ({SUPPORTED_FORMATS.length})
                </button>
                <AnimatePresence>
                  {showFormats && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 grid gap-1.5">
                        {SUPPORTED_FORMATS.map(f => (
                          <div key={f.name} className="flex items-start gap-2 text-xs">
                            <Badge variant="secondary" className="text-[10px] shrink-0 mt-0.5">{f.name}</Badge>
                            <span className="text-muted-foreground font-mono">{f.columns}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">💡 How to export from your bank:</p>
                <p>Most banks offer CSV or OFX/QFX download under "Download Transactions" or "Export Statements".</p>
                <p>Quicken/QuickBooks: File → Export → QFX/QBO. Many banks also support direct QFX download.</p>
                <p className="pt-1">
                  <a
                    href="/samples/sample-transactions.ofx"
                    download="sample-transactions.ofx"
                    className="text-primary underline hover:text-primary/80 font-medium"
                  >
                    ↓ Download sample OFX file
                  </a>
                  {' '}to test the import flow (10 transactions, checking account).
                </p>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Column Mapping (CSV) or Account Selection (OFX) */}
          {step === 'map' && fileMode === 'ofx' && ofxResult && (
            <motion.div key="map-ofx" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  {ofxResult.fileType.toUpperCase()} File
                </Badge>
                <span className="text-sm text-muted-foreground">{ofxResult.transactions.length} transactions found</span>
                {ofxResult.accountId && (
                  <Badge variant="outline" className="text-xs">Account: {ofxResult.accountId}</Badge>
                )}
                {duplicateRows.size > 0 && (
                  <Badge variant="outline" className="gap-1 text-prism-amber border-prism-amber/30">
                    <AlertTriangle className="h-3 w-3" /> {duplicateRows.size} duplicate{duplicateRows.size > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Import into Account <span className="text-destructive">*</span></Label>
                <Select value={targetAccountId} onValueChange={setTargetAccountId}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {(accounts || []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Sample data preview */}
              {parsedRows.length > 0 && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs font-medium mb-2 text-muted-foreground">Sample transaction:</p>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span><span className="font-medium text-foreground">Date:</span> {parsedRows[0].date}</span>
                    <span><span className="font-medium text-foreground">Merchant:</span> {parsedRows[0].merchant || '—'}</span>
                    <span><span className="font-medium text-foreground">Amount:</span> {formatCurrency(parsedRows[0].amount)}</span>
                    {parsedRows[0].notes && <span><span className="font-medium text-foreground">Memo:</span> {parsedRows[0].notes}</span>}
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => { reset(); setStep('upload'); }} className="gap-1.5"><ArrowLeft className="h-4 w-4" /> Back</Button>
                <Button
                  onClick={() => { computePreviewRuleMatches(parsedRows); setStep('preview'); }}
                  disabled={!targetAccountId}
                  className="gap-1.5"
                >
                  Preview <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'map' && fileMode === 'csv' && csvResult && (
            <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  {FORMAT_LABELS[csvResult.detectedFormat]}
                </Badge>
                <span className="text-sm text-muted-foreground">{csvResult.rows.length} rows detected</span>
                {hasDebitCredit && (
                  <Badge variant="outline" className="text-xs">Debit/Credit columns detected</Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Date & Merchant — always shown */}
                <div className="space-y-1.5">
                  <Label>Date Column <span className="text-destructive">*</span></Label>
                  <Select value={mapping.date} onValueChange={v => setMapping(m => ({ ...m, date: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {csvResult.headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Merchant / Description Column</Label>
                  <Select value={mapping.merchant} onValueChange={v => setMapping(m => ({ ...m, merchant: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {csvResult.headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount or Debit/Credit */}
                {hasDebitCredit ? (
                  <>
                    <div className="space-y-1.5">
                      <Label>Debit / Withdrawal Column</Label>
                      <Select value={mapping.debit || ''} onValueChange={v => setMapping(m => ({ ...m, debit: v === '__none__' ? '' : v }))}>
                        <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— None —</SelectItem>
                          {csvResult.headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Credit / Deposit Column</Label>
                      <Select value={mapping.credit || ''} onValueChange={v => setMapping(m => ({ ...m, credit: v === '__none__' ? '' : v }))}>
                        <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— None —</SelectItem>
                          {csvResult.headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <div className="space-y-1.5">
                    <Label>Amount Column <span className="text-destructive">*</span></Label>
                    <Select value={mapping.amount} onValueChange={v => setMapping(m => ({ ...m, amount: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— None —</SelectItem>
                        {csvResult.headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Category */}
                <div className="space-y-1.5">
                  <Label>Category Column <span className="text-xs text-muted-foreground">(optional)</span></Label>
                  <Select value={mapping.category || '__none__'} onValueChange={v => setMapping(m => ({ ...m, category: v === '__none__' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {csvResult.headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label>Notes / Memo Column <span className="text-xs text-muted-foreground">(optional)</span></Label>
                  <Select value={mapping.notes || '__none__'} onValueChange={v => setMapping(m => ({ ...m, notes: v === '__none__' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {csvResult.headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Target Account */}
                <div className="space-y-1.5">
                  <Label>Import into Account <span className="text-destructive">*</span></Label>
                  <Select value={targetAccountId} onValueChange={setTargetAccountId}>
                    <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                    <SelectContent>
                      {(accounts || []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Toggle: switch to single amount or debit/credit */}
                {!hasDebitCredit && (
                  <div className="col-span-2">
                    <button
                      className="text-xs text-primary hover:underline"
                      onClick={() => setMapping(m => ({ ...m, amount: '', debit: '__detect__', credit: '__detect__' }))}
                    >
                      My CSV uses separate Debit/Credit columns instead of a single Amount →
                    </button>
                  </div>
                )}
                {hasDebitCredit && (
                  <div className="col-span-2">
                    <button
                      className="text-xs text-primary hover:underline"
                      onClick={() => setMapping(m => ({ ...m, debit: undefined, credit: undefined, amount: '' }))}
                    >
                      ← My CSV uses a single Amount column instead
                    </button>
                  </div>
                )}
              </div>

              {/* Sample data preview */}
              {csvResult.rows.length > 0 && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs font-medium mb-2 text-muted-foreground">Sample row (first record):</p>
                  <div className="flex flex-wrap gap-2">
                    {csvResult.headers.map(h => (
                      <div key={h} className="text-xs">
                        <span className="font-medium text-foreground">{h}:</span>{' '}
                        <span className="text-muted-foreground font-mono">{csvResult.rows[0][h] || '(empty)'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('upload')} className="gap-1.5"><ArrowLeft className="h-4 w-4" /> Back</Button>
                <Button
                  onClick={handleProceedToPreview}
                  disabled={!mapping.date || (!mapping.amount && !hasDebitCredit) || !targetAccountId}
                  className="gap-1.5"
                >
                  Preview <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Preview */}
          {step === 'preview' && (
            <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 flex-1 min-h-0">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-sm text-muted-foreground">{selectedRows.size} of {parsedRows.length} selected</p>
                  {duplicateRows.size > 0 && (
                    <Badge variant="outline" className="gap-1 text-prism-amber border-prism-amber/30">
                      <AlertTriangle className="h-3 w-3" /> {duplicateRows.size} duplicate{duplicateRows.size > 1 ? 's' : ''} found
                    </Badge>
                  )}
                  {previewRuleMatches.size > 0 && (
                    <Badge variant="outline" className="gap-1 text-primary border-primary/30 bg-primary/5">
                      <Sparkles className="h-3 w-3" /> {previewRuleMatches.size} auto-categorized by rules
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={selectedRows.size === parsedRows.length} onCheckedChange={handleToggleAll} />
                  <span className="text-sm">Select all</span>
                </div>
              </div>

              <ScrollArea className="h-[340px] rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>Date</TableHead>
                      <TableHead>Merchant</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Category</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.map((row, i) => {
                      const matched = categoryLookup.has(row.category.toLowerCase());
                      const isDupe = duplicateRows.has(i);
                      const ruleMatch = previewRuleMatches.get(i);
                      return (
                        <TableRow key={i} className={cn(!selectedRows.has(i) && 'opacity-40', isDupe && 'bg-prism-amber/5')}>
                          <TableCell><Checkbox checked={selectedRows.has(i)} onCheckedChange={() => handleToggleRow(i)} /></TableCell>
                          <TableCell className="text-sm">{row.date}</TableCell>
                          <TableCell className="text-sm font-medium max-w-[200px] truncate">
                            <span className="flex items-center gap-1.5">
                              {row.merchant || '—'}
                              {isDupe && <span title="Potential duplicate"><AlertTriangle className="h-3 w-3 text-prism-amber shrink-0" /></span>}
                            </span>
                          </TableCell>
                          <TableCell className={cn('text-sm text-right font-medium', row.amount > 0 && 'text-prism-teal')}>{formatCurrency(row.amount)}</TableCell>
                          <TableCell>
                            {row.category ? (
                              <Badge variant={matched ? 'secondary' : 'outline'} className="text-xs">
                                {row.category}
                                {!matched && <AlertCircle className="ml-1 h-3 w-3 text-prism-amber" />}
                              </Badge>
                            ) : ruleMatch ? (
                              <Badge variant="secondary" className="text-xs gap-1 bg-primary/10 text-primary border-primary/20">
                                <Sparkles className="h-2.5 w-2.5" /> {ruleMatch.categoryName}
                              </Badge>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('map')} className="gap-1.5"><ArrowLeft className="h-4 w-4" /> Back</Button>
                <Button onClick={handleImport} disabled={selectedRows.size === 0} className="gap-1.5">
                  Import {selectedRows.size} Transactions <Check className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Importing */}
          {step === 'importing' && (
            <motion.div key="importing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="font-medium">Importing transactions...</p>
            </motion.div>
          )}

          {/* Done */}
          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-prism-teal/10">
                <Check className="h-8 w-8 text-prism-teal" />
              </div>
              <p className="font-display text-xl font-bold">Import Complete</p>
              <p className="text-muted-foreground text-center">
                {importResult.success} transactions imported successfully
                {ruleMatchCount > 0 && <><br /><span className="text-primary">{ruleMatchCount} auto-categorized by saved rules</span></>}
                {importResult.failed > 0 && <><br /><span className="text-prism-rose">{importResult.failed} failed</span></>}
              </p>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default CsvImportDialog;
