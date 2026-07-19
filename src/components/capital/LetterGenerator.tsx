import { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, Printer, Save, Scale, Loader2 } from 'lucide-react';
import { extractVariables, mergeTemplate, type LetterTemplate } from '@/lib/credit-repair/letter-templates';
import { useHousehold } from '@/contexts/HouseholdContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import jsPDF from 'jspdf';

interface Props {
  template: LetterTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialVars?: Record<string, string>;
  disputeId?: string;
}

const FIELD_LABELS: Record<string, string> = {
  fullName: 'Your full name',
  streetAddress: 'Your street address',
  cityStateZip: 'City, State ZIP',
  ssnLast4: 'SSN — last 4',
  dob: 'Date of birth (MM/DD/YYYY)',
  bureau: 'Bureau (Equifax / Experian / TransUnion)',
  bureauAddress: 'Bureau mailing address',
  creditorName: 'Creditor / furnisher name',
  creditorAddress: 'Creditor mailing address',
  collectorName: 'Collector name',
  collectorAddress: 'Collector mailing address',
  accountLast4: 'Account — last 4 digits',
  referenceNumber: 'Reference / collector account #',
  disputeReason: 'Detailed dispute reason',
  lateDate: 'Date of late payment',
  hardshipReason: 'Reason for the hardship',
  goal: 'What you\'re working toward (e.g. mortgage)',
  paidDate: 'Date paid/settled',
  originalBalance: 'Original balance ($)',
  offerAmount: 'Settlement offer ($)',
  priorDisputeDate: 'Date of prior dispute',
  stateName: 'Your state name',
  inquirerName: 'Inquirer / lender name',
  inquiryDate: 'Inquiry date',
  ftcReportNumber: 'FTC IdentityTheft.gov report #',
  duplicateCreditor: 'Duplicate creditor name',
  originalDelinquencyDate: 'Original delinquency date',
  reportedDelinquencyDate: 'Currently reported delinquency date',
  today: 'Today\'s date (auto-filled)',
};

export default function LetterGenerator({ template, open, onOpenChange, initialVars, disputeId }: Props) {
  const { household } = useHousehold();
  const requiredVars = useMemo(() => extractVariables(template.body), [template]);
  const [vars, setVars] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setVars({
      today: format(new Date(), 'MMMM d, yyyy'),
      ...(initialVars || {}),
    });
  }, [template.id, initialVars]);

  const merged = useMemo(() => mergeTemplate(template.body, vars), [template.body, vars]);
  const mergedSubject = useMemo(
    () => template.subject ? mergeTemplate(template.subject, vars) : template.name,
    [template.subject, template.name, vars]
  );

  const missing = requiredVars.filter(v => v !== 'today' && (!vars[v] || !vars[v].trim()));

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(merged);
    toast.success('Letter copied to clipboard');
  };

  const printLetter = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<pre style="font-family: Georgia, serif; font-size: 12pt; white-space: pre-wrap; padding: 1in; max-width: 8.5in;">${merged.replace(/</g, '&lt;')}</pre>`);
    w.document.title = mergedSubject;
    w.print();
  };

  const downloadPdf = () => {
    const pdf = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 54;
    const maxWidth = 612 - margin * 2;
    pdf.setFont('times', 'normal');
    pdf.setFontSize(11);
    const lines = pdf.splitTextToSize(merged, maxWidth);
    let y = margin;
    lines.forEach((line: string) => {
      if (y > 720) { pdf.addPage(); y = margin; }
      pdf.text(line, margin, y);
      y += 14;
    });
    pdf.save(`${template.id}-${format(new Date(), 'yyyyMMdd')}.pdf`);
    toast.success('PDF downloaded');
  };

  const saveToVault = async () => {
    if (!household) return;
    setSaving(true);
    try {
      const pdf = new jsPDF({ unit: 'pt', format: 'letter' });
      const margin = 54;
      const maxWidth = 612 - margin * 2;
      pdf.setFont('times', 'normal');
      pdf.setFontSize(11);
      const lines = pdf.splitTextToSize(merged, maxWidth);
      let y = margin;
      lines.forEach((line: string) => {
        if (y > 720) { pdf.addPage(); y = margin; }
        pdf.text(line, margin, y);
        y += 14;
      });
      const blob = pdf.output('blob');
      const fileName = `${template.id}-${format(new Date(), 'yyyyMMdd-HHmmss')}.pdf`;
      const storagePath = `${household.id}/letters/${fileName}`;
      const { error: upErr } = await supabase.storage.from('credit-documents').upload(storagePath, blob, { contentType: 'application/pdf' });
      if (upErr) throw upErr;
      await (supabase as any).from('credit_documents').insert({
        household_id: household.id,
        document_type: 'dispute_letter',
        bureau: vars.bureau || null,
        file_name: fileName,
        storage_path: storagePath,
        file_size: blob.size,
        dispute_id: disputeId || null,
        notes: `${template.name} — ${mergedSubject}`,
      });
      toast.success('Letter saved to document vault');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {template.name}
            <Badge variant="outline" className="text-[10px]">{template.category}</Badge>
          </DialogTitle>
          <div className="flex items-start gap-2 text-xs text-muted-foreground pt-2">
            <Scale className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span className="italic">{template.legalBasis}</span>
          </div>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Fill in the details</h4>
            {requiredVars.filter(v => v !== 'today').map(v => (
              <div key={v}>
                <Label className="text-xs">{FIELD_LABELS[v] || v}</Label>
                {(v === 'disputeReason' || v === 'hardshipReason') ? (
                  <Textarea
                    value={vars[v] || ''}
                    onChange={e => setVars(p => ({ ...p, [v]: e.target.value }))}
                    rows={3}
                    className="text-sm"
                  />
                ) : (
                  <Input
                    value={vars[v] || ''}
                    onChange={e => setVars(p => ({ ...p, [v]: e.target.value }))}
                    className="text-sm h-8"
                  />
                )}
              </div>
            ))}
            {missing.length > 0 && (
              <p className="text-xs text-amber-600">Missing: {missing.length} field(s)</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Preview</h4>
              <span className="text-[10px] text-muted-foreground">{merged.length} chars</span>
            </div>
            <div className="border rounded-lg p-4 bg-background max-h-[500px] overflow-y-auto">
              <pre className="text-[11px] font-serif whitespace-pre-wrap leading-relaxed">{merged}</pre>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={copyToClipboard}>
            <Copy className="h-3.5 w-3.5 mr-1" />Copy
          </Button>
          <Button variant="outline" size="sm" onClick={printLetter}>
            <Printer className="h-3.5 w-3.5 mr-1" />Print
          </Button>
          <Button variant="outline" size="sm" onClick={downloadPdf}>
            <Download className="h-3.5 w-3.5 mr-1" />PDF
          </Button>
          <Button size="sm" onClick={saveToVault} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            Save to Vault
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
