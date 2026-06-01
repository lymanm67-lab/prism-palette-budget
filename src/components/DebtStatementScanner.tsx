import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, Camera, Upload, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/use-currency';
import { toast } from 'sonner';
import { CameraCapture } from '@/components/CameraCapture';

export interface ParsedDebtStatement {
  creditor: string;
  balance: number;
  apr: number;
  minimum_payment: number;
  statement_date: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult?: (debt: ParsedDebtStatement) => void;
}

export function DebtStatementScanner({ open, onOpenChange, onResult }: Props) {
  const { formatCurrency } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParsedDebtStatement | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image of your statement');
      return;
    }
    setLoading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await supabase.functions.invoke('scan-debt-statement', {
        body: { image: base64 },
      });
      if (res.error) throw new Error(res.error.message || 'Failed to scan statement');
      if (res.data?.error) throw new Error(res.data.error);

      const data = res.data as ParsedDebtStatement;
      setResult(data);
      toast.success(`Scanned: ${data.creditor} — APR ${data.apr}%`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to scan statement');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (result && onResult) onResult(result);
    handleClose();
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => { setResult(null); setShowCamera(false); }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-prism-rose" />
            Scan Debt Statement
          </DialogTitle>
          <DialogDescription>
            Upload or photograph a credit card / loan statement. Coach extracts creditor, balance, APR, and minimum payment.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
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
                      <p className="text-sm text-muted-foreground">Reading statement…</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <p className="font-medium text-sm">Click to upload or drag & drop</p>
                      <p className="text-xs text-muted-foreground">JPG or PNG of your credit card / loan statement</p>
                    </div>
                  )}
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
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
                  <Camera className="h-4 w-4" /> Use Camera
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-lg">{result.creditor}</p>
                <Badge variant="secondary">APR {result.apr}%</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Balance</p>
                  <p className="font-mono font-bold">{formatCurrency(result.balance)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Min payment</p>
                  <p className="font-mono font-bold">{formatCurrency(result.minimum_payment)}</p>
                </div>
              </div>
              {result.statement_date && (
                <p className="text-xs text-muted-foreground">Statement: {result.statement_date}</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setResult(null)}>
                Scan Another
              </Button>
              <Button className="flex-1 gap-2" onClick={handleApply}>
                <Check className="h-4 w-4" /> Use This
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
