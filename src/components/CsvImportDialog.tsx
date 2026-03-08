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
import { Upload, FileSpreadsheet, ArrowRight, ArrowLeft, Check, AlertCircle, Loader2, Info, AlertTriangle, Sparkles, File, X, Brain } from 'lucide-react';
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

// Represents a single parsed file awaiting import
interface ParsedFile {
  fileName: string;
  fileMode: FileMode;
  csvResult: CsvParseResult | null;
  ofxResult: OfxParseResult | null;
  mapping: ColumnMapping;
  parsedRows: ParsedRow[];
  selectedRows: Set<number>;
  duplicateRows: Set<number>;
  targetAccountId: string;
  autoDetectedAccountId: string | null; // auto-matched account id
  previewRuleMatches: Map<number, { categoryId: string; categoryName: string }>;
}

const CsvImportDialog = ({ open, onOpenChange }: CsvImportDialogProps) => {
  const { toast } = useToast();
  const { household } = useHousehold();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const qc = useQueryClient();
  const { findDuplicates } = useDuplicateDetection();

  const [step, setStep] = useState<Step>('upload');
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
  const [activeFileIdx, setActiveFileIdx] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState({ success: 0, failed: 0, ruleMatched: 0, aiCategorized: 0 });
  const [dragging, setDragging] = useState(false);
  const [showFormats, setShowFormats] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // For single-CSV mapping step
  const [csvMapping, setCsvMapping] = useState<ColumnMapping>({ date: '', merchant: '', amount: '', category: '', notes: '' });
  const [csvTargetAccountId, setCsvTargetAccountId] = useState('');

  const reset = () => {
    setStep('upload');
    setParsedFiles([]);
    setActiveFileIdx(0);
    setImporting(false);
    setImportResult({ success: 0, failed: 0, ruleMatched: 0, aiCategorized: 0 });
    setDragging(false);
    setShowFormats(false);
    setCsvMapping({ date: '', merchant: '', amount: '', category: '', notes: '' });
    setCsvTargetAccountId('');
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  // Auto-detect account from OFX metadata or filename
  const autoDetectAccount = useCallback((fileName: string, ofxResult: OfxParseResult | null): string | null => {
    if (!accounts?.length) return null;
    
    // Try matching by OFX account ID
    if (ofxResult?.accountId) {
      const match = accounts.find(a => 
        a.name.toLowerCase().includes(ofxResult.accountId.toLowerCase()) ||
        ofxResult.accountId.includes(a.name.replace(/\D/g, ''))
      );
      if (match) return match.id;
    }

    // Try matching by institution name in OFX
    if (ofxResult?.bankId) {
      const match = accounts.find(a => 
        a.institution?.toLowerCase().includes(ofxResult.bankId.toLowerCase())
      );
      if (match) return match.id;
    }

    // Try matching by filename
    const nameLower = fileName.toLowerCase().replace(/\.[^.]+$/, '').replace(/[_\-]/g, ' ');
    for (const acc of accounts) {
      const accWords = acc.name.toLowerCase().split(/\s+/);
      const instWords = (acc.institution || '').toLowerCase().split(/\s+/).filter(Boolean);
      const allWords = [...accWords, ...instWords];
      // If any 2+ char word from account name appears in filename
      if (allWords.some(w => w.length >= 3 && nameLower.includes(w))) {
        return acc.id;
      }
    }
    return null;
  }, [accounts]);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newParsedFiles: ParsedFile[] = [];

    for (const file of fileArray) {
      const fileType = detectFinancialFileType(file.name);
      if (!fileType) {
        toast({ title: `Unsupported: ${file.name}`, description: 'Only .csv, .ofx, .qbo, .qfx files supported.', variant: 'destructive' });
        continue;
      }

      try {
        const text = await file.text();

        if (fileType === 'csv') {
          const result = parseCsvText(text);
          const defaultMap = getDefaultMapping(result.headers, result.detectedFormat);
          const autoAccount = autoDetectAccount(file.name, null);

          newParsedFiles.push({
            fileName: file.name,
            fileMode: 'csv',
            csvResult: result,
            ofxResult: null,
            mapping: defaultMap,
            parsedRows: [],
            selectedRows: new Set(),
            duplicateRows: new Set(),
            targetAccountId: autoAccount || '',
            autoDetectedAccountId: autoAccount,
            previewRuleMatches: new Map(),
          });
        } else {
          const result = parseOfxText(text, fileType);
          const rows: ParsedRow[] = result.transactions.map(t => ({
            date: t.date,
            merchant: t.merchant,
            amount: t.amount,
            category: '',
            notes: t.memo,
            originalRow: { date: t.date, merchant: t.merchant, amount: String(t.amount), memo: t.memo, fitId: t.fitId, type: t.type },
          }));
          const dupes = findDuplicates(rows.map(r => ({ date: r.date, amount: r.amount, merchant: r.merchant })));
          const selected = new Set(rows.map((_, i) => i).filter(i => !dupes.has(i)));
          const autoAccount = autoDetectAccount(file.name, result);

          newParsedFiles.push({
            fileName: file.name,
            fileMode: 'ofx',
            csvResult: null,
            ofxResult: result,
            mapping: { date: '', merchant: '', amount: '', category: '', notes: '' },
            parsedRows: rows,
            selectedRows: selected,
            duplicateRows: dupes,
            targetAccountId: autoAccount || '',
            autoDetectedAccountId: autoAccount,
            previewRuleMatches: new Map(),
          });
        }
      } catch (err: any) {
        toast({ title: `Error: ${file.name}`, description: err.message, variant: 'destructive' });
      }
    }

    if (newParsedFiles.length === 0) return;

    setParsedFiles(newParsedFiles);
    setActiveFileIdx(0);

    // Determine next step
    const hasAnyCsv = newParsedFiles.some(f => f.fileMode === 'csv');
    if (hasAnyCsv && newParsedFiles.length === 1) {
      // Single CSV: go to mapping step
      setCsvMapping(newParsedFiles[0].mapping);
      setCsvTargetAccountId(newParsedFiles[0].targetAccountId);
      setStep('map');
    } else {
      // Multiple files or all OFX: go to account assignment / preview
      // For OFX files, compute rule matches
      for (const pf of newParsedFiles) {
        if (pf.fileMode === 'ofx' && pf.parsedRows.length > 0) {
          await computeRuleMatchesForFile(pf);
        }
      }
      setParsedFiles([...newParsedFiles]);
      setStep('map');
    }

    const totalTxns = newParsedFiles.reduce((sum, f) => sum + (f.parsedRows.length || f.csvResult?.rows.length || 0), 0);
    const totalDupes = newParsedFiles.reduce((sum, f) => sum + f.duplicateRows.size, 0);
    toast({
      title: `${newParsedFiles.length} file${newParsedFiles.length > 1 ? 's' : ''} loaded`,
      description: `${totalTxns} transactions found${totalDupes > 0 ? `, ${totalDupes} potential duplicates` : ''}`,
    });
  }, [toast, findDuplicates, autoDetectAccount]);

  const computeRuleMatchesForFile = async (pf: ParsedFile) => {
    if (!household) return;
    const { data: rules } = await supabase
      .from('categorization_rules')
      .select('merchant_pattern, category_id')
      .eq('household_id', household.id);

    if (!rules || rules.length === 0) return;

    const ruleMap = new Map<string, string>();
    for (const r of rules) ruleMap.set(r.merchant_pattern.toLowerCase(), r.category_id);

    const matches = new Map<number, { categoryId: string; categoryName: string }>();
    for (let i = 0; i < pf.parsedRows.length; i++) {
      const row = pf.parsedRows[i];
      if (!row.category && row.merchant) {
        const ruleMatch = ruleMap.get(row.merchant.toLowerCase().trim());
        if (ruleMatch) {
          const catName = categories?.find(c => c.id === ruleMatch)?.name || 'Matched';
          matches.set(i, { categoryId: ruleMatch, categoryName: catName });
        }
      }
    }
    pf.previewRuleMatches = matches;
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.length) processFiles(files);
  }, [processFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(true); }, []);
  const handleDragLeave = useCallback(() => setDragging(false), []);

  // Category lookup
  const categoryLookup = useMemo(() => {
    if (!categories) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const c of categories) map.set(c.name.toLowerCase(), c.id);
    return map;
  }, [categories]);

  // Handle single-CSV mapping proceed
  const handleCsvProceedToPreview = async () => {
    const pf = parsedFiles[0];
    if (!pf?.csvResult) return;
    const rows = applyMapping(pf.csvResult.rows, csvMapping, pf.csvResult.detectedFormat);
    const dupes = findDuplicates(rows.map(r => ({ date: r.date, amount: r.amount, merchant: r.merchant })));
    const selected = new Set(rows.map((_, i) => i).filter(i => !dupes.has(i)));

    pf.parsedRows = rows;
    pf.duplicateRows = dupes;
    pf.selectedRows = selected;
    pf.mapping = csvMapping;
    pf.targetAccountId = csvTargetAccountId;
    await computeRuleMatchesForFile(pf);
    setParsedFiles([...parsedFiles]);

    if (dupes.size > 0) {
      toast({ title: `${dupes.size} potential duplicate(s) found`, description: 'Duplicates are deselected by default.' });
    }
    setStep('preview');
  };

  const updateFileAccount = (idx: number, accountId: string) => {
    const updated = [...parsedFiles];
    updated[idx] = { ...updated[idx], targetAccountId: accountId };
    setParsedFiles(updated);
  };

  const removeFile = (idx: number) => {
    const updated = parsedFiles.filter((_, i) => i !== idx);
    if (updated.length === 0) {
      reset();
      return;
    }
    setParsedFiles(updated);
    if (activeFileIdx >= updated.length) setActiveFileIdx(updated.length - 1);
  };

  const handleToggleRow = (fileIdx: number, rowIdx: number) => {
    const updated = [...parsedFiles];
    const next = new Set(updated[fileIdx].selectedRows);
    next.has(rowIdx) ? next.delete(rowIdx) : next.add(rowIdx);
    updated[fileIdx] = { ...updated[fileIdx], selectedRows: next };
    setParsedFiles(updated);
  };

  const handleToggleAllForFile = (fileIdx: number) => {
    const updated = [...parsedFiles];
    const pf = updated[fileIdx];
    if (pf.selectedRows.size === pf.parsedRows.length) {
      updated[fileIdx] = { ...pf, selectedRows: new Set() };
    } else {
      updated[fileIdx] = { ...pf, selectedRows: new Set(pf.parsedRows.map((_, i) => i)) };
    }
    setParsedFiles(updated);
  };

  // Check if all files have accounts assigned
  const allFilesReady = parsedFiles.every(f => f.targetAccountId);
  const totalSelected = parsedFiles.reduce((sum, f) => sum + f.selectedRows.size, 0);

  // For multi-file or OFX: can go to preview when all accounts assigned
  const canProceedToPreview = allFilesReady && parsedFiles.every(f => f.parsedRows.length > 0);

  // Multi-file proceed: for CSVs that haven't been mapped yet, apply default mapping
  const handleMultiFileProceed = async () => {
    const updated = [...parsedFiles];
    for (const pf of updated) {
      if (pf.fileMode === 'csv' && pf.parsedRows.length === 0 && pf.csvResult) {
        const rows = applyMapping(pf.csvResult.rows, pf.mapping, pf.csvResult.detectedFormat);
        const dupes = findDuplicates(rows.map(r => ({ date: r.date, amount: r.amount, merchant: r.merchant })));
        const selected = new Set(rows.map((_, i) => i).filter(i => !dupes.has(i)));
        pf.parsedRows = rows;
        pf.duplicateRows = dupes;
        pf.selectedRows = selected;
        await computeRuleMatchesForFile(pf);
      }
    }
    setParsedFiles([...updated]);
    setStep('preview');
  };

  const handleImport = async () => {
    if (!household) return;
    setImporting(true);
    setStep('importing');

    let totalSuccess = 0;
    let totalFailed = 0;
    let totalRuleMatched = 0;
    const allInsertedIds: string[] = [];
    const uncategorizedIds: string[] = [];

    // Fetch saved categorization rules
    const { data: rules } = await supabase
      .from('categorization_rules')
      .select('merchant_pattern, category_id')
      .eq('household_id', household.id);

    const ruleMap = new Map<string, string>();
    for (const r of (rules || [])) ruleMap.set(r.merchant_pattern.toLowerCase(), r.category_id);

    for (const pf of parsedFiles) {
      if (!pf.targetAccountId) continue;
      const toImport = pf.parsedRows.filter((_, i) => pf.selectedRows.has(i));

      const chunkSize = 50;
      for (let i = 0; i < toImport.length; i += chunkSize) {
        const chunk = toImport.slice(i, i + chunkSize).map(row => {
          let categoryId = categoryLookup.get(row.category.toLowerCase()) || null;
          if (!categoryId && row.merchant) {
            const ruleMatch = ruleMap.get(row.merchant.toLowerCase().trim());
            if (ruleMatch) {
              categoryId = ruleMatch;
              totalRuleMatched++;
            }
          }
          return {
            household_id: household.id,
            account_id: pf.targetAccountId,
            date: row.date,
            merchant: row.merchant || null,
            amount: row.amount,
            category_id: categoryId,
            notes: row.notes || null,
          };
        });

        const { data: inserted, error } = await supabase.from('transactions').insert(chunk).select('id, category_id');
        if (error) {
          totalFailed += chunk.length;
        } else {
          totalSuccess += (inserted?.length || 0);
          for (const row of (inserted || [])) {
            allInsertedIds.push(row.id);
            if (!row.category_id) uncategorizedIds.push(row.id);
          }
        }
      }
    }

    // AI categorization for uncategorized transactions
    let aiCategorized = 0;
    if (uncategorizedIds.length > 0) {
      try {
        const { data: aiResult, error: aiError } = await supabase.functions.invoke('auto-categorize', {
          body: { transaction_ids: uncategorizedIds, household_id: household.id },
        });
        if (!aiError && aiResult) {
          aiCategorized = aiResult.ai_categorized || 0;
        }
      } catch (err) {
        console.error('AI categorization failed:', err);
      }
    }

    setImportResult({ success: totalSuccess, failed: totalFailed, ruleMatched: totalRuleMatched, aiCategorized });
    setImporting(false);
    setStep('done');
    qc.invalidateQueries({ queryKey: ['transactions'] });
    qc.invalidateQueries({ queryKey: ['accounts'] });
  };

  const isSingleCsv = parsedFiles.length === 1 && parsedFiles[0]?.fileMode === 'csv';
  const activePf = parsedFiles[activeFileIdx];
  const hasDebitCredit = !!(csvMapping.debit || csvMapping.credit);

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
          {['Upload', isSingleCsv ? 'Map Columns' : 'Assign Accounts', 'Preview & Import'].map((label, i) => {
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
                  {dragging ? 'Drop your files here' : 'Drag & drop files or click to browse'}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Supports <strong>multiple files</strong> — CSV, OFX, QBO, QFX. Accounts auto-detected per file.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.CSV,.ofx,.OFX,.qbo,.QBO,.qfx,.QFX"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                >
                  Choose Files
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

          {/* STEP 2: Map/Assign — Single CSV */}
          {step === 'map' && isSingleCsv && parsedFiles[0]?.csvResult && (
            <motion.div key="map-csv" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  {FORMAT_LABELS[parsedFiles[0].csvResult.detectedFormat]}
                </Badge>
                <span className="text-sm text-muted-foreground">{parsedFiles[0].csvResult.rows.length} rows detected</span>
                {hasDebitCredit && (
                  <Badge variant="outline" className="text-xs">Debit/Credit columns detected</Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Date Column <span className="text-destructive">*</span></Label>
                  <Select value={csvMapping.date} onValueChange={v => setCsvMapping(m => ({ ...m, date: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {parsedFiles[0].csvResult.headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Merchant / Description Column</Label>
                  <Select value={csvMapping.merchant} onValueChange={v => setCsvMapping(m => ({ ...m, merchant: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {parsedFiles[0].csvResult.headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {hasDebitCredit ? (
                  <>
                    <div className="space-y-1.5">
                      <Label>Debit / Withdrawal Column</Label>
                      <Select value={csvMapping.debit || ''} onValueChange={v => setCsvMapping(m => ({ ...m, debit: v === '__none__' ? '' : v }))}>
                        <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— None —</SelectItem>
                          {parsedFiles[0].csvResult.headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Credit / Deposit Column</Label>
                      <Select value={csvMapping.credit || ''} onValueChange={v => setCsvMapping(m => ({ ...m, credit: v === '__none__' ? '' : v }))}>
                        <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— None —</SelectItem>
                          {parsedFiles[0].csvResult.headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <div className="space-y-1.5">
                    <Label>Amount Column <span className="text-destructive">*</span></Label>
                    <Select value={csvMapping.amount} onValueChange={v => setCsvMapping(m => ({ ...m, amount: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— None —</SelectItem>
                        {parsedFiles[0].csvResult.headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Category Column <span className="text-xs text-muted-foreground">(optional)</span></Label>
                  <Select value={csvMapping.category || '__none__'} onValueChange={v => setCsvMapping(m => ({ ...m, category: v === '__none__' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {parsedFiles[0].csvResult.headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Notes / Memo Column <span className="text-xs text-muted-foreground">(optional)</span></Label>
                  <Select value={csvMapping.notes || '__none__'} onValueChange={v => setCsvMapping(m => ({ ...m, notes: v === '__none__' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {parsedFiles[0].csvResult.headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Import into Account <span className="text-destructive">*</span></Label>
                  <Select value={csvTargetAccountId} onValueChange={setCsvTargetAccountId}>
                    <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                    <SelectContent>
                      {(accounts || []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {!hasDebitCredit && (
                  <div className="col-span-2">
                    <button className="text-xs text-primary hover:underline" onClick={() => setCsvMapping(m => ({ ...m, amount: '', debit: '__detect__', credit: '__detect__' }))}>
                      My CSV uses separate Debit/Credit columns instead of a single Amount →
                    </button>
                  </div>
                )}
                {hasDebitCredit && (
                  <div className="col-span-2">
                    <button className="text-xs text-primary hover:underline" onClick={() => setCsvMapping(m => ({ ...m, debit: undefined, credit: undefined, amount: '' }))}>
                      ← My CSV uses a single Amount column instead
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => { reset(); }} className="gap-1.5"><ArrowLeft className="h-4 w-4" /> Back</Button>
                <Button
                  onClick={handleCsvProceedToPreview}
                  disabled={!csvMapping.date || (!csvMapping.amount && !hasDebitCredit) || !csvTargetAccountId}
                  className="gap-1.5"
                >
                  Preview <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Multi-file account assignment */}
          {step === 'map' && !isSingleCsv && parsedFiles.length > 0 && (
            <motion.div key="map-multi" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <p className="text-sm text-muted-foreground">Assign each file to a target account. Auto-detected accounts are pre-selected.</p>

              <ScrollArea className="max-h-[340px]">
                <div className="space-y-3">
                  {parsedFiles.map((pf, idx) => {
                    const txnCount = pf.parsedRows.length || pf.csvResult?.rows.length || 0;
                    const dupeCount = pf.duplicateRows.size;
                    return (
                      <div key={idx} className="rounded-lg border border-border/50 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <File className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm font-medium truncate">{pf.fileName}</span>
                            <Badge variant="secondary" className="text-[10px]">{pf.fileMode.toUpperCase()}</Badge>
                            <span className="text-xs text-muted-foreground">{txnCount} txns</span>
                            {dupeCount > 0 && (
                              <Badge variant="outline" className="text-[10px] text-prism-amber border-prism-amber/30 gap-0.5">
                                <AlertTriangle className="h-2.5 w-2.5" /> {dupeCount}
                              </Badge>
                            )}
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeFile(idx)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs shrink-0">Account:</Label>
                          <Select value={pf.targetAccountId} onValueChange={v => updateFileAccount(idx, v)}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                            <SelectContent>
                              {(accounts || []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          {pf.autoDetectedAccountId && pf.targetAccountId === pf.autoDetectedAccountId && (
                            <Badge className="text-[9px] bg-prism-teal/10 text-prism-teal border-prism-teal/20 shrink-0">Auto</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              <div className="flex justify-between">
                <Button variant="outline" onClick={reset} className="gap-1.5"><ArrowLeft className="h-4 w-4" /> Back</Button>
                <Button
                  onClick={handleMultiFileProceed}
                  disabled={!allFilesReady}
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
              {/* File tabs for multi-file */}
              {parsedFiles.length > 1 && (
                <div className="flex gap-1.5 flex-wrap">
                  {parsedFiles.map((pf, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveFileIdx(idx)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                        idx === activeFileIdx
                          ? 'bg-primary/10 text-primary border-primary/30'
                          : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                      )}
                    >
                      {pf.fileName.length > 20 ? pf.fileName.slice(0, 17) + '…' : pf.fileName}
                      <span className="ml-1 opacity-60">({pf.selectedRows.size})</span>
                    </button>
                  ))}
                </div>
              )}

              {activePf && (
                <>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="text-sm text-muted-foreground">{activePf.selectedRows.size} of {activePf.parsedRows.length} selected</p>
                      {activePf.duplicateRows.size > 0 && (
                        <Badge variant="outline" className="gap-1 text-prism-amber border-prism-amber/30">
                          <AlertTriangle className="h-3 w-3" /> {activePf.duplicateRows.size} duplicate{activePf.duplicateRows.size > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {activePf.previewRuleMatches.size > 0 && (
                        <Badge variant="outline" className="gap-1 text-primary border-primary/30 bg-primary/5">
                          <Sparkles className="h-3 w-3" /> {activePf.previewRuleMatches.size} auto-categorized
                        </Badge>
                      )}
                      <Badge variant="outline" className="gap-1 text-muted-foreground text-[10px]">
                        → {accounts?.find(a => a.id === activePf.targetAccountId)?.name || 'Unknown'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={activePf.selectedRows.size === activePf.parsedRows.length} onCheckedChange={() => handleToggleAllForFile(activeFileIdx)} />
                      <span className="text-sm">Select all</span>
                    </div>
                  </div>

                  <ScrollArea className="h-[300px] rounded-lg border">
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
                        {activePf.parsedRows.map((row, i) => {
                          const matched = categoryLookup.has(row.category.toLowerCase());
                          const isDupe = activePf.duplicateRows.has(i);
                          const ruleMatch = activePf.previewRuleMatches.get(i);
                          return (
                            <TableRow key={i} className={cn(!activePf.selectedRows.has(i) && 'opacity-40', isDupe && 'bg-prism-amber/5')}>
                              <TableCell><Checkbox checked={activePf.selectedRows.has(i)} onCheckedChange={() => handleToggleRow(activeFileIdx, i)} /></TableCell>
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
                                ) : (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Brain className="h-2.5 w-2.5" /> AI will categorize
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('map')} className="gap-1.5"><ArrowLeft className="h-4 w-4" /> Back</Button>
                <Button onClick={handleImport} disabled={totalSelected === 0} className="gap-1.5">
                  Import {totalSelected} Transaction{totalSelected !== 1 ? 's' : ''} <Check className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Importing */}
          {step === 'importing' && (
            <motion.div key="importing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="font-medium">Importing & categorizing transactions...</p>
              <p className="text-xs text-muted-foreground">Applying rules, then AI for unmatched</p>
            </motion.div>
          )}

          {/* Done */}
          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-prism-teal/10">
                <Check className="h-8 w-8 text-prism-teal" />
              </div>
              <p className="font-display text-xl font-bold">Import Complete</p>
              <div className="text-muted-foreground text-center text-sm space-y-1">
                <p>{importResult.success} transactions imported successfully</p>
                {importResult.ruleMatched > 0 && (
                  <p className="text-primary flex items-center justify-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" /> {importResult.ruleMatched} auto-categorized by rules
                  </p>
                )}
                {importResult.aiCategorized > 0 && (
                  <p className="text-prism-sky flex items-center justify-center gap-1">
                    <Brain className="h-3.5 w-3.5" /> {importResult.aiCategorized} categorized by AI
                  </p>
                )}
                {importResult.failed > 0 && (
                  <p className="text-prism-rose">{importResult.failed} failed</p>
                )}
              </div>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default CsvImportDialog;
