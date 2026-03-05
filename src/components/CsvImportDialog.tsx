import { useState, useCallback, useMemo } from 'react';
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
import { parseCsvText, getDefaultMapping, applyMapping, type ColumnMapping, type ParsedRow, type CsvParseResult } from '@/lib/csv-parser';
import { formatCurrency } from '@/lib/seed-data';
import { Upload, FileSpreadsheet, ArrowRight, ArrowLeft, Check, AlertCircle, Loader2 } from 'lucide-react';

type Step = 'upload' | 'map' | 'preview' | 'importing' | 'done';

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CsvImportDialog = ({ open, onOpenChange }: CsvImportDialogProps) => {
  const { toast } = useToast();
  const { household } = useHousehold();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const qc = useQueryClient();

  const [step, setStep] = useState<Step>('upload');
  const [csvResult, setCsvResult] = useState<CsvParseResult | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({ date: '', merchant: '', amount: '', category: '', notes: '' });
  const [targetAccountId, setTargetAccountId] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState({ success: 0, failed: 0 });

  const reset = () => {
    setStep('upload');
    setCsvResult(null);
    setMapping({ date: '', merchant: '', amount: '', category: '', notes: '' });
    setTargetAccountId('');
    setParsedRows([]);
    setSelectedRows(new Set());
    setImporting(false);
    setImportResult({ success: 0, failed: 0 });
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      toast({ title: 'Invalid file', description: 'Please upload a .csv file.', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const result = parseCsvText(text);
        setCsvResult(result);
        const defaultMap = getDefaultMapping(result.headers, result.detectedFormat);
        setMapping(defaultMap);
        setStep('map');
        toast({ title: `Detected ${result.detectedFormat} format`, description: `${result.rows.length} rows found.` });
      } catch (err: any) {
        toast({ title: 'Parse error', description: err.message, variant: 'destructive' });
      }
    };
    reader.readAsText(file);
  }, [toast]);

  const handleProceedToPreview = () => {
    if (!csvResult) return;
    const isMint = csvResult.detectedFormat === 'mint';
    const rows = applyMapping(csvResult.rows, mapping, isMint);
    setParsedRows(rows);
    setSelectedRows(new Set(rows.map((_, i) => i)));
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

  const handleImport = async () => {
    if (!household || !targetAccountId) return;
    setImporting(true);
    setStep('importing');

    const toImport = parsedRows.filter((_, i) => selectedRows.has(i));
    let success = 0;
    let failed = 0;

    // Batch insert in chunks of 50
    const chunkSize = 50;
    for (let i = 0; i < toImport.length; i += chunkSize) {
      const chunk = toImport.slice(i, i + chunkSize).map(row => ({
        household_id: household.id,
        account_id: targetAccountId,
        date: row.date,
        merchant: row.merchant || null,
        amount: row.amount,
        category_id: categoryLookup.get(row.category.toLowerCase()) || null,
        notes: row.notes || null,
      }));

      const { error } = await supabase.from('transactions').insert(chunk);
      if (error) {
        failed += chunk.length;
      } else {
        success += chunk.length;
      }
    }

    setImportResult({ success, failed });
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
            Import Transactions from CSV
          </DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          {['Upload', 'Map Columns', 'Preview & Import'].map((label, i) => {
            const stepIdx = ['upload', 'map', 'preview', 'importing', 'done'].indexOf(step);
            const thisIdx = i;
            const isActive = (thisIdx === 0 && stepIdx === 0) || (thisIdx === 1 && stepIdx === 1) || (thisIdx === 2 && stepIdx >= 2);
            const isDone = stepIdx > thisIdx || (thisIdx === 2 && step === 'done');
            return (
              <div key={label} className="flex items-center gap-1.5">
                {i > 0 && <div className="w-6 h-px bg-border" />}
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${isDone ? 'bg-prism-teal text-white' : isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
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
              <div className="rounded-xl border-2 border-dashed border-border p-10 text-center hover:border-primary/50 transition-colors">
                <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                <p className="font-medium mb-1">Drop your CSV file here or click to browse</p>
                <p className="text-sm text-muted-foreground mb-4">Supports Mint, Monarch Money, and generic CSV formats</p>
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="csv-upload" />
                <Button asChild variant="outline"><label htmlFor="csv-upload" className="cursor-pointer">Choose File</label></Button>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Mint:</strong> Date, Description, Amount, Transaction Type, Category, Account Name...</p>
                <p><strong>Monarch:</strong> Date, Merchant, Category, Account, Amount, Tags, Notes...</p>
                <p><strong>Generic:</strong> Any CSV with date, amount, and description/merchant columns</p>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Column Mapping */}
          {step === 'map' && csvResult && (
            <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{csvResult.detectedFormat}</Badge>
                <span className="text-sm text-muted-foreground">{csvResult.rows.length} rows detected</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {(['date', 'merchant', 'amount', 'category', 'notes'] as const).map(field => (
                  <div key={field} className="space-y-1.5">
                    <Label className="capitalize">{field} Column</Label>
                    <Select value={mapping[field]} onValueChange={v => setMapping(m => ({ ...m, [field]: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— None —</SelectItem>
                        {csvResult.headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                <div className="space-y-1.5">
                  <Label>Import into Account</Label>
                  <Select value={targetAccountId} onValueChange={setTargetAccountId}>
                    <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                    <SelectContent>
                      {(accounts || []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('upload')} className="gap-1.5"><ArrowLeft className="h-4 w-4" /> Back</Button>
                <Button onClick={handleProceedToPreview} disabled={!mapping.date || !mapping.amount || !targetAccountId} className="gap-1.5">
                  Preview <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Preview */}
          {step === 'preview' && (
            <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 flex-1 min-h-0">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{selectedRows.size} of {parsedRows.length} transactions selected</p>
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
                      return (
                        <TableRow key={i} className={!selectedRows.has(i) ? 'opacity-40' : ''}>
                          <TableCell><Checkbox checked={selectedRows.has(i)} onCheckedChange={() => handleToggleRow(i)} /></TableCell>
                          <TableCell className="text-sm">{row.date}</TableCell>
                          <TableCell className="text-sm font-medium max-w-[200px] truncate">{row.merchant}</TableCell>
                          <TableCell className={`text-sm text-right font-medium ${row.amount > 0 ? 'text-prism-teal' : ''}`}>{formatCurrency(row.amount)}</TableCell>
                          <TableCell>
                            {row.category ? (
                              <Badge variant={matched ? 'secondary' : 'outline'} className="text-xs">
                                {row.category}
                                {!matched && <AlertCircle className="ml-1 h-3 w-3 text-prism-amber" />}
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
              <p className="text-muted-foreground">
                {importResult.success} transactions imported successfully
                {importResult.failed > 0 && <>, <span className="text-prism-rose">{importResult.failed} failed</span></>}
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
