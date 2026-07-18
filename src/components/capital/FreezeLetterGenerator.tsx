import { useState } from 'react';
import { FileText, Printer, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Bureau {
  name: string;
  mail?: string;
}

interface Props {
  bureau: Bureau;
}

const STORAGE_KEY = 'freeze-letter-consumer-info';

type Info = {
  fullName: string;
  formerNames: string;
  address: string;
  prevAddress: string;
  dob: string;
  ssnLast4: string;
  phone: string;
  email: string;
};

const empty: Info = {
  fullName: '', formerNames: '', address: '', prevAddress: '',
  dob: '', ssnLast4: '', phone: '', email: '',
};

const loadInfo = (): Info => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...empty, ...JSON.parse(raw) } : empty;
  } catch { return empty; }
};

const buildLetter = (bureau: Bureau, info: Info) => {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return `${info.fullName || '[Your Full Name]'}
${info.address || '[Your Current Address]'}
${info.phone ? `Phone: ${info.phone}` : ''}
${info.email ? `Email: ${info.email}` : ''}

${today}

${bureau.name}
${bureau.mail || '[Bureau Mailing Address]'}

RE: REQUEST FOR SECURITY FREEZE ON MY CONSUMER FILE

Dear ${bureau.name} Consumer Office,

Under the Fair Credit Reporting Act (15 U.S.C. § 1681c-1) and applicable state law, I am requesting that you place a SECURITY FREEZE on my consumer file maintained by your agency. This freeze must remain in place until I formally request its removal in writing.

Please verify my identity using the information below and confirm the freeze in writing to the address above within the timeframe required by law.

CONSUMER INFORMATION:
  Full legal name:        ${info.fullName || '[Full Name]'}
  Former names / aliases: ${info.formerNames || 'None'}
  Date of birth:          ${info.dob || '[MM/DD/YYYY]'}
  SSN (last 4 digits):    XXX-XX-${info.ssnLast4 || 'XXXX'}
  Current address:        ${info.address || '[Current Address]'}
  Previous address (2 yr):${info.prevAddress ? ' ' + info.prevAddress : ' N/A'}
  Phone:                  ${info.phone || '[Phone]'}
  Email:                  ${info.email || '[Email]'}

ENCLOSED (send copies, NOT originals):
  [ ] Copy of government-issued photo ID (driver's license or passport)
  [ ] Copy of proof of current address (utility bill, bank statement, or lease dated within 90 days)
  [ ] Copy of Social Security card OR W-2 showing full SSN (optional but speeds verification)

Please also send me:
  1. Written confirmation that the freeze has been placed on my file.
  2. My freeze PIN or password required to lift the freeze in the future.
  3. A free copy of my full consumer file disclosure (I am entitled to this once every 12 months under the FCRA).

Send all correspondence via U.S. Mail to the address at the top of this letter. Do NOT send responses by email.

I am sending this letter via CERTIFIED MAIL with return receipt requested. Please respond within the statutory timeframe (typically 3 business days for online/phone requests and 5 business days for mailed requests).

Thank you for your prompt attention to this matter.

Sincerely,



_______________________________
${info.fullName || '[Sign and Print Your Name]'}


---
CERTIFIED MAIL # ______________________________
DATE SENT:      ______________________________
`;
};

export default function FreezeLetterGenerator({ bureau }: Props) {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<Info>(empty);
  const [letter, setLetter] = useState('');

  const handleOpen = (v: boolean) => {
    if (v) {
      const loaded = loadInfo();
      setInfo(loaded);
      setLetter(buildLetter(bureau, loaded));
    }
    setOpen(v);
  };

  const update = (k: keyof Info, v: string) => {
    const next = { ...info, [k]: v };
    setInfo(next);
    setLetter(buildLetter(bureau, next));
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  const download = () => {
    const blob = new Blob([letter], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `freeze-request-${bureau.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Letter downloaded');
  };

  const print = () => {
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) { toast.error('Popup blocked — allow popups to print'); return; }
    w.document.write(`<!doctype html><html><head><title>Freeze Request — ${bureau.name}</title>
      <style>
        body{font-family:'Courier New',monospace;font-size:12pt;line-height:1.5;padding:1in;color:#000;background:#fff;white-space:pre-wrap;}
        @media print{body{padding:0.75in;}}
      </style></head><body>${letter.replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]!))}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 200);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(letter);
    toast.success('Letter copied to clipboard');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full mt-2">
          <FileText className="h-3.5 w-3.5 mr-1.5" />
          Generate Freeze Letter
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Freeze Request Letter — {bureau.name}</DialogTitle>
          <DialogDescription>
            Fill in your info once — it's saved locally and reused across all bureau letters. Send via <strong>certified mail with return receipt</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-2 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full legal name</Label>
            <Input id="fullName" value={info.fullName} onChange={e => update('fullName', e.target.value)} placeholder="Jane Q. Smith" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="formerNames">Former names / aliases</Label>
            <Input id="formerNames" value={info.formerNames} onChange={e => update('formerNames', e.target.value)} placeholder="Maiden or prior names" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="address">Current address</Label>
            <Input id="address" value={info.address} onChange={e => update('address', e.target.value)} placeholder="123 Main St, Akron, OH 44301" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="prevAddress">Previous address (within last 2 years)</Label>
            <Input id="prevAddress" value={info.prevAddress} onChange={e => update('prevAddress', e.target.value)} placeholder="Optional" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dob">Date of birth</Label>
            <Input id="dob" value={info.dob} onChange={e => update('dob', e.target.value)} placeholder="MM/DD/YYYY" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ssn">SSN (last 4 only)</Label>
            <Input id="ssn" value={info.ssnLast4} onChange={e => update('ssnLast4', e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="1234" maxLength={4} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={info.phone} onChange={e => update('phone', e.target.value)} placeholder="(330) 555-0123" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={info.email} onChange={e => update('email', e.target.value)} placeholder="you@example.com" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Letter preview</Label>
          <pre className="text-[11px] font-mono bg-muted/40 border rounded-lg p-4 whitespace-pre-wrap max-h-96 overflow-y-auto">{letter}</pre>
        </div>

        <DialogFooter className="gap-2 sm:gap-2 flex-wrap">
          <Button variant="outline" onClick={copy}>Copy</Button>
          <Button variant="outline" onClick={download}><Download className="h-4 w-4 mr-1.5" />Download .txt</Button>
          <Button onClick={print}><Printer className="h-4 w-4 mr-1.5" />Print / Save PDF</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
