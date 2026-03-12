import { useState, useRef } from 'react';
import { FileText, Download, Copy, Send, Printer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { exportToPdf } from '@/lib/export-utils';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { type CreditDispute } from '@/hooks/use-disputes';
import { type CreditAccount } from '@/hooks/use-credit-accounts';

// eOSCAR-compatible reason codes (CDIA Data Reporting Resource Guide)
export const OSCAR_REASON_CODES = [
  { code: '01', label: 'Not his/her account', category: 'Ownership' },
  { code: '02', label: 'Account paid in full/account closed', category: 'Status' },
  { code: '03', label: 'Account balance incorrect', category: 'Balance' },
  { code: '04', label: 'Account status incorrect', category: 'Status' },
  { code: '05', label: 'Dispute dates reported', category: 'Dates' },
  { code: '06', label: 'Payment history incorrect', category: 'Payment' },
  { code: '07', label: 'Account information belongs to another individual', category: 'Ownership' },
  { code: '08', label: 'Dispute account terms', category: 'Terms' },
  { code: '09', label: 'Dispute balance amount', category: 'Balance' },
  { code: '10', label: 'Dispute high credit amount', category: 'Balance' },
  { code: '11', label: 'Dispute credit limit', category: 'Balance' },
  { code: '12', label: 'Dispute past due amount', category: 'Balance' },
  { code: '13', label: 'Dispute date of first delinquency', category: 'Dates' },
  { code: '15', label: 'Dispute account type', category: 'Classification' },
  { code: '16', label: 'Dispute date opened', category: 'Dates' },
  { code: '17', label: 'Dispute date closed', category: 'Dates' },
  { code: '18', label: 'Dispute date of last payment', category: 'Dates' },
  { code: '19', label: 'Dispute payment rating', category: 'Payment' },
  { code: '20', label: 'Consumer was never late', category: 'Payment' },
  { code: '21', label: 'Dispute additional/authorized user', category: 'Ownership' },
  { code: '103', label: 'Result of identity theft', category: 'Fraud' },
];

const BUREAU_ADDRESSES: Record<string, { name: string; address: string }> = {
  Equifax: {
    name: 'Equifax Information Services LLC',
    address: 'P.O. Box 740256\nAtlanta, GA 30374-0256',
  },
  Experian: {
    name: 'Experian',
    address: 'P.O. Box 4500\nAllen, TX 75013',
  },
  TransUnion: {
    name: 'TransUnion LLC Consumer Dispute Center',
    address: 'P.O. Box 2000\nChester, PA 19016',
  },
};

interface Props {
  dispute: CreditDispute;
  account: CreditAccount | undefined;
  onSubmit: (dispute: CreditDispute) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DisputeLetterGenerator = ({ dispute, account, onSubmit, open, onOpenChange }: Props) => {
  const letterRef = useRef<HTMLDivElement>(null);
  const [senderName, setSenderName] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [senderSSN, setSenderSSN] = useState('');
  const [senderDOB, setSenderDOB] = useState('');
  const [reasonCode, setReasonCode] = useState(
    OSCAR_REASON_CODES.find(r => dispute.dispute_reason.toLowerCase().includes(r.label.toLowerCase()))?.code || ''
  );

  const bureauInfo = BUREAU_ADDRESSES[dispute.bureau] || BUREAU_ADDRESSES.Equifax;
  const selectedReason = OSCAR_REASON_CODES.find(r => r.code === reasonCode);
  const today = format(new Date(), 'MMMM d, yyyy');
  const responseDue = format(addDays(new Date(), 30), 'MMMM d, yyyy');

  const handleExportPdf = async () => {
    if (!letterRef.current) return;
    try {
      await exportToPdf(letterRef.current, `dispute-letter-${dispute.bureau}-${format(new Date(), 'yyyyMMdd')}`);
      toast.success('PDF exported');
    } catch {
      toast.error('PDF export failed');
    }
  };

  const handleCopyText = () => {
    if (!letterRef.current) return;
    navigator.clipboard.writeText(letterRef.current.innerText);
    toast.success('Letter copied to clipboard');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !letterRef.current) return;
    printWindow.document.write(`<html><head><title>Dispute Letter</title><style>body{font-family:serif;padding:40px;font-size:12pt;line-height:1.6}h2{text-align:center}table{width:100%;border-collapse:collapse;margin:10px 0}td{padding:4px 8px;border:1px solid #ccc;font-size:11pt}</style></head><body>${letterRef.current.innerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Generate eOSCAR-Compatible Dispute Letter
          </DialogTitle>
        </DialogHeader>

        {/* Sender Details */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Your Full Name</Label>
            <Input value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="John Doe" />
          </div>
          <div>
            <Label className="text-xs">Date of Birth</Label>
            <Input type="date" value={senderDOB} onChange={e => setSenderDOB(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Your Address</Label>
            <Input value={senderAddress} onChange={e => setSenderAddress(e.target.value)} placeholder="123 Main St, City, ST 12345" />
          </div>
          <div>
            <Label className="text-xs">Last 4 of SSN (optional, for identification)</Label>
            <Input value={senderSSN} onChange={e => setSenderSSN(e.target.value)} placeholder="XXXX" maxLength={4} />
          </div>
          <div>
            <Label className="text-xs">eOSCAR Reason Code</Label>
            <Select value={reasonCode} onValueChange={setReasonCode}>
              <SelectTrigger><SelectValue placeholder="Select code" /></SelectTrigger>
              <SelectContent>
                {OSCAR_REASON_CODES.map(r => (
                  <SelectItem key={r.code} value={r.code}>
                    <span className="font-mono text-xs mr-2">{r.code}</span>{r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedReason && (
              <Badge variant="outline" className="mt-1 text-xs">
                Category: {selectedReason.category}
              </Badge>
            )}
          </div>
        </div>

        {/* Letter Preview */}
        <div ref={letterRef} className="bg-background border rounded-lg p-8 space-y-4 text-sm font-serif leading-relaxed">
          <div className="text-right text-xs text-muted-foreground">{today}</div>

          <div>
            <p className="font-bold">{senderName || '[YOUR NAME]'}</p>
            <p>{senderAddress || '[YOUR ADDRESS]'}</p>
            {senderSSN && <p>SSN (last 4): XXX-XX-{senderSSN}</p>}
            {senderDOB && <p>DOB: {format(new Date(senderDOB), 'MM/dd/yyyy')}</p>}
          </div>

          <div className="mt-4">
            <p className="font-bold">{bureauInfo.name}</p>
            <p className="whitespace-pre-line">{bureauInfo.address}</p>
          </div>

          <div className="mt-4">
            <p><strong>RE: Formal Dispute of Inaccurate Credit Reporting</strong></p>
            {selectedReason && <p><strong>eOSCAR Dispute Code: {selectedReason.code} — {selectedReason.label}</strong></p>}
            {dispute.metro2_violation && <p><strong>Metro2 Violation: {dispute.metro2_violation.replace(/_/g, ' ')}</strong></p>}
          </div>

          <p>Dear {bureauInfo.name},</p>

          <p>
            I am writing to formally dispute inaccurate information on my credit report pursuant to the
            Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681i. I am requesting that the following
            account be investigated and corrected or deleted.
          </p>

          {account && (
            <table className="w-full border-collapse text-xs">
              <tbody>
                <tr><td className="border p-2 font-bold bg-muted/30 w-1/3">Creditor/Account Name</td><td className="border p-2">{account.account_name}</td></tr>
                {account.account_number && <tr><td className="border p-2 font-bold bg-muted/30">Account Number</td><td className="border p-2">****{account.account_number.slice(-4)}</td></tr>}
                <tr><td className="border p-2 font-bold bg-muted/30">Account Type</td><td className="border p-2">{account.account_type}</td></tr>
                <tr><td className="border p-2 font-bold bg-muted/30">Reported Status</td><td className="border p-2">{account.account_status}</td></tr>
                <tr><td className="border p-2 font-bold bg-muted/30">Reported Balance</td><td className="border p-2">${Number(account.balance).toLocaleString()}</td></tr>
                {account.date_opened && <tr><td className="border p-2 font-bold bg-muted/30">Date Opened</td><td className="border p-2">{account.date_opened}</td></tr>}
              </tbody>
            </table>
          )}

          <div>
            <p className="font-bold">Reason for Dispute:</p>
            <p>{dispute.dispute_reason}</p>
          </div>

          {dispute.explanation && (
            <div>
              <p className="font-bold">Detailed Explanation:</p>
              <p className="whitespace-pre-wrap">{dispute.explanation}</p>
            </div>
          )}

          <div className="border-t pt-4 space-y-2">
            <p className="font-bold">Legal Compliance Requirements:</p>
            <ul className="list-disc pl-6 space-y-1 text-xs">
              <li>Under FCRA § 611(a)(1), you must conduct a reasonable investigation within <strong>30 days</strong> of receipt of this dispute (by {responseDue}).</li>
              <li>Under FCRA § 611(a)(5), if the information cannot be verified, it must be <strong>promptly deleted or modified</strong>.</li>
              <li>Under FCRA § 611(a)(6), you must provide written notice of the results within 5 business days of completing the investigation.</li>
              <li>Under FCRA § 611(a)(7), you must provide a description of the reinvestigation procedure and a notice of the consumer's right to add a statement.</li>
              {dispute.metro2_violation && (
                <li>The reported data appears to violate <strong>CDIA Metro2 Format</strong> reporting standards ({dispute.metro2_violation.replace(/_/g, ' ')}), which may constitute inaccurate reporting under FCRA § 1681e(b).</li>
              )}
            </ul>
          </div>

          <p>
            Please forward all relevant documentation to the data furnisher and provide the results
            of your investigation in writing. Failure to comply with the FCRA may result in statutory
            damages of $100-$1,000 per violation under 15 U.S.C. § 1681n.
          </p>

          <div className="mt-6">
            <p>Sincerely,</p>
            <p className="mt-4 font-bold">{senderName || '[YOUR NAME]'}</p>
          </div>

          <div className="text-xs text-muted-foreground border-t pt-3 mt-6">
            <p>Enclosures: Copy of government-issued ID, proof of address, copy of credit report with disputed items highlighted.</p>
            <p className="mt-1 italic">This letter was generated for educational and informational purposes. This is not legal advice.</p>
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyText}><Copy className="h-4 w-4 mr-2" />Copy Text</Button>
          <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" />Print</Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf}><Download className="h-4 w-4 mr-2" />Export PDF</Button>
          <Button size="sm" onClick={() => { onSubmit(dispute); onOpenChange(false); }}>
            <Send className="h-4 w-4 mr-2" />Mark as Submitted
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DisputeLetterGenerator;
