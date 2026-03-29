import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileUp, Loader2, Check, DollarSign, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useCategoryGroups, useCategories, useCreateCategoryGroup, useCreateCategory, useUpsertBudget } from '@/hooks/use-finance-data';
import { useCurrency } from '@/hooks/use-currency';
import { toast } from 'sonner';
import { CameraCapture } from '@/components/CameraCapture';

interface Deduction {
  name: string;
  amount: number;
  monthly_amount: number;
  category: string;
  is_pretax?: boolean;
  selected?: boolean;
}

interface ParsedPaystub {
  employer_name?: string;
  pay_frequency?: string;
  gross_pay: number;
  net_pay: number;
  monthly_gross_pay: number;
  monthly_net_pay: number;
  deductions: Deduction[];
}

interface PaystubUploaderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaystubUploader({ open, onOpenChange }: PaystubUploaderProps) {
  const { household } = useHousehold();
  const { formatCurrency } = useCurrency();
  const { data: categoryGroups } = useCategoryGroups();
  const { data: categories } = useCategories();
  const createGroup = useCreateCategoryGroup();
  const createCategory = useCreateCategory();
  const upsertBudget = useUpsertBudget();

  const [step, setStep] = useState<'upload' | 'review' | 'done'>('upload');
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [paystub, setPaystub] = useState<ParsedPaystub | null>(null);
  const [selectedDeductions, setSelectedDeductions] = useState<Set<number>>(new Set());
  const [showCamera, setShowCamera] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Please upload an image or PDF of your paycheck stub');
      return;
    }

    setLoading(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await supabase.functions.invoke('parse-paystub', {
        body: { image: base64 },
      });

      if (res.error) throw new Error(res.error.message || 'Failed to parse paystub');
      if (res.data?.error) throw new Error(res.data.error);

      const data = res.data as ParsedPaystub;
      setPaystub(data);
      setSelectedDeductions(new Set(data.deductions.map((_, i) => i)));
      setStep('review');
    } catch (e: any) {
      toast.error(e.message || 'Failed to parse paycheck stub');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!paystub || !household) return;
    setApplying(true);

    try {
      // Find or create the Payroll & Pre-Tax Deductions group
      let payrollGroup = (categoryGroups as any[])?.find(
        (g: any) => g.expense_type === 'payroll_deduction' && g.budget_type === 'personal'
      );

      if (!payrollGroup) {
        payrollGroup = await createGroup.mutateAsync({
          name: 'Payroll & Pre-Tax Deductions',
          budget_type: 'personal',
          expense_type: 'payroll_deduction',
          color: '#0ea5e9',
          sort_order: 1,
        });
      }

      const groupId = payrollGroup.id;
      const existingCats = (categories || []).filter(c => c.group_id === groupId);
      const month = new Date();
      const monthStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-01`;

      let created = 0;

      for (const idx of selectedDeductions) {
        const ded = paystub.deductions[idx];
        if (!ded) continue;

        // Check if category already exists
        let cat = existingCats.find(c => c.name.toLowerCase() === ded.name.toLowerCase());
        if (!cat) {
          cat = await createCategory.mutateAsync({
            name: ded.name,
            group_id: groupId,
            color: '#0ea5e9',
          });
        }

        // Create budget for current month
        await upsertBudget.mutateAsync({
          category_id: cat.id,
          month: monthStr,
          planned_amount: ded.monthly_amount,
          rollover: false,
        });

        created++;
      }

      toast.success(`Created ${created} payroll deduction categories with monthly budgets`);
      setStep('done');
    } catch (e: any) {
      toast.error(e.message || 'Failed to apply payroll data');
    } finally {
      setApplying(false);
    }
  };

  const toggleDeduction = (idx: number) => {
    setSelectedDeductions(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep('upload');
      setPaystub(null);
      setSelectedDeductions(new Set());
      setShowCamera(false);
    }, 300);
  };

  const FREQ_LABELS: Record<string, string> = {
    weekly: 'Weekly',
    biweekly: 'Bi-Weekly',
    semi_monthly: 'Semi-Monthly',
    monthly: 'Monthly',
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5 text-sky-500" />
            {step === 'upload' && 'Upload Paycheck Stub'}
            {step === 'review' && 'Review Payroll Deductions'}
            {step === 'done' && 'Setup Complete'}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload a photo of your paycheck stub to auto-fill your payroll deductions and budget categories.'}
            {step === 'review' && 'Review the extracted deductions below. Uncheck any you don\'t want to add.'}
            {step === 'done' && 'Your payroll deductions have been added as budget categories.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            {showCamera ? (
              <CameraCapture
                onCapture={(file) => { setShowCamera(false); handleFile(file); }}
                onClose={() => setShowCamera(false)}
                loading={loading}
              />
            ) : (
              <div className="space-y-3">
                <div
                  className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-8 text-center cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-all"
                  onClick={() => fileRef.current?.click()}
                >
                  {loading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-accent" />
                      <p className="text-sm text-muted-foreground">Analyzing paycheck stub...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <p className="font-medium text-sm">Click to upload or drag & drop</p>
                      <p className="text-xs text-muted-foreground">JPG, PNG, or PDF of your paycheck stub</p>
                    </div>
                  )}
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = '';
                  }}
                />

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <Button variant="outline" className="w-full gap-2" onClick={() => setShowCamera(true)} disabled={loading}>
                  📷 Take a Photo
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 'review' && paystub && (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 pb-4">
              {/* Summary card */}
              <Card className="bg-muted/50">
                <CardContent className="pt-4 space-y-2">
                  {paystub.employer_name && (
                    <p className="text-sm"><span className="text-muted-foreground">Employer:</span> <span className="font-medium">{paystub.employer_name}</span></p>
                  )}
                  {paystub.pay_frequency && (
                    <p className="text-sm"><span className="text-muted-foreground">Pay Frequency:</span> <Badge variant="secondary">{FREQ_LABELS[paystub.pay_frequency] || paystub.pay_frequency}</Badge></p>
                  )}
                  <div className="flex gap-4 pt-1">
                    <div>
                      <p className="text-xs text-muted-foreground">Monthly Gross</p>
                      <p className="font-bold text-base">{formatCurrency(paystub.monthly_gross_pay)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Monthly Net</p>
                      <p className="font-bold text-base text-emerald-600">{formatCurrency(paystub.monthly_net_pay)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Deductions</p>
                      <p className="font-bold text-base text-sky-600">
                        {formatCurrency(paystub.deductions.reduce((s, d) => s + d.monthly_amount, 0))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Deductions list */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Deductions ({paystub.deductions.length})</p>
                  <Button variant="ghost" size="sm" className="text-xs h-7"
                    onClick={() => {
                      if (selectedDeductions.size === paystub.deductions.length) {
                        setSelectedDeductions(new Set());
                      } else {
                        setSelectedDeductions(new Set(paystub.deductions.map((_, i) => i)));
                      }
                    }}
                  >
                    {selectedDeductions.size === paystub.deductions.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>

                {paystub.deductions.map((ded, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors cursor-pointer ${
                      selectedDeductions.has(i) ? 'border-accent/40 bg-accent/5' : 'border-border'
                    }`}
                    onClick={() => toggleDeduction(i)}
                  >
                    <Checkbox checked={selectedDeductions.has(i)} className="pointer-events-none" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ded.name}</p>
                      <div className="flex items-center gap-2">
                        {ded.is_pretax && <Badge variant="outline" className="text-[10px] h-4 px-1">Pre-tax</Badge>}
                        <span className="text-xs text-muted-foreground">{ded.category.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold">{formatCurrency(ded.monthly_amount)}<span className="text-[10px] text-muted-foreground font-normal">/mo</span></p>
                      <p className="text-[10px] text-muted-foreground">{formatCurrency(ded.amount)}/pay</p>
                    </div>
                  </div>
                ))}
              </div>

              <Button className="w-full gap-2" onClick={handleApply} disabled={applying || selectedDeductions.size === 0}>
                {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Apply {selectedDeductions.size} Deductions to Budget
              </Button>
            </div>
          </ScrollArea>
        )}

        {step === 'done' && (
          <div className="text-center py-6 space-y-4">
            <div className="flex items-center justify-center">
              <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Check className="h-8 w-8 text-emerald-600" />
              </div>
            </div>
            <div>
              <p className="font-semibold text-lg">Payroll Setup Complete!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your payroll deductions have been added as budget categories. Head to the Budgets page to review.
              </p>
            </div>
            <Button onClick={handleClose} className="gap-2">
              <DollarSign className="h-4 w-4" />
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
