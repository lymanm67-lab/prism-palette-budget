import { useState } from 'react';
import { Upload, FileText, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useFinancialProfile } from '@/hooks/use-financial-profile';
import { toast } from 'sonner';

type DocType = 'paystub' | 'bank' | 'debt' | 'credit';

const DOC_OPTIONS: { type: DocType; label: string; hint: string }[] = [
  { type: 'paystub', label: 'Pay Stub', hint: 'Auto-fills monthly income' },
  { type: 'bank',    label: 'Bank Statement', hint: 'Auto-fills monthly expenses' },
  { type: 'debt',    label: 'Debt / Loan Statement', hint: 'Auto-fills min monthly debts' },
  { type: 'credit',  label: 'Credit Report', hint: 'Auto-fills credit score' },
];

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = reader.result as string;
      resolve(s.split(',')[1] || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function DocumentUploadCard() {
  const { update } = useFinancialProfile();
  const [busy, setBusy] = useState<DocType | null>(null);
  const [last, setLast] = useState<{ type: DocType; result: any } | null>(null);

  async function handleFile(docType: DocType, file: File) {
    if (file.size > 15 * 1024 * 1024) {
      toast.error('File too large. Max 15 MB.');
      return;
    }
    setBusy(docType);
    try {
      const b64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke('parse-financial-document', {
        body: { doc_type: docType, file_data: b64, mime_type: file.type },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Parse failed');
      const ex = data.extracted || {};

      // Merge into profile
      const patch: any = {};
      if (docType === 'paystub' && ex.monthly_gross_income) patch.primaryIncome = String(Math.round(ex.monthly_gross_income));
      if (docType === 'bank'    && ex.monthly_expenses)     patch.monthlyExpenses = String(Math.round(ex.monthly_expenses));
      if (docType === 'debt'    && ex.total_monthly_debt_payments) patch.monthlyDebts = String(Math.round(ex.total_monthly_debt_payments));
      if (docType === 'credit'  && ex.credit_score)         patch.creditScore = String(ex.credit_score);

      if (Object.keys(patch).length) {
        update(patch);
        toast.success(`Extracted from ${docType} — profile updated`);
      } else {
        toast.warning('Could not extract expected fields. Try a clearer file.');
      }
      setLast({ type: docType, result: ex });
    } catch (e: any) {
      toast.error(e.message || 'Failed to parse document');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="w-4 h-4 text-prism-teal" />
          Upload Documents for Real Results
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Upload a pay stub, bank statement, debt schedule, or credit report. We extract the numbers into your Financial Profile — files never leave the request (nothing stored).
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-2">
          {DOC_OPTIONS.map((opt) => (
            <label
              key={opt.type}
              className="group rounded-xl border border-border/40 bg-muted/20 hover:border-prism-teal/50 hover:bg-prism-teal/5 transition-all p-3 cursor-pointer flex items-start gap-3"
            >
              <FileText className="w-4 h-4 text-prism-teal shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{opt.label}</div>
                <div className="text-[11px] text-muted-foreground">{opt.hint}</div>
              </div>
              {busy === opt.type ? (
                <Loader2 className="w-4 h-4 animate-spin text-prism-teal" />
              ) : last?.type === opt.type ? (
                <CheckCircle2 className="w-4 h-4 text-prism-lime" />
              ) : null}
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                className="hidden"
                disabled={busy !== null}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(opt.type, f);
                  e.currentTarget.value = '';
                }}
              />
            </label>
          ))}
        </div>

        {last && (
          <details className="rounded-lg border border-border/40 bg-muted/20 p-3 text-xs">
            <summary className="cursor-pointer text-muted-foreground">Extracted fields ({last.type})</summary>
            <pre className="mt-2 text-[11px] whitespace-pre-wrap text-foreground/80">{JSON.stringify(last.result, null, 2)}</pre>
          </details>
        )}

        <div className="flex items-start gap-2 text-[11px] text-muted-foreground/80">
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
          <span>Documents are parsed in-memory by AI and are not stored. Review extracted values before relying on them.</span>
        </div>
      </CardContent>
    </Card>
  );
}
