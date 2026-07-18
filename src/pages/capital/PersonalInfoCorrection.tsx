import { useState } from 'react';
import { Download, FileEdit, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import PageOverview from '@/components/PageOverview';
import { toast } from 'sonner';

type Bureau = 'Equifax' | 'Experian' | 'TransUnion' | 'LexisNexis' | 'Innovis' | 'ChexSystems' | 'SageStream';

const BUREAU_ADDRESSES: Record<Bureau, string> = {
  Equifax: 'Equifax Information Services LLC\nP.O. Box 105069\nAtlanta, GA 30348-5069',
  Experian: 'Experian\nP.O. Box 4500\nAllen, TX 75013',
  TransUnion: 'TransUnion Consumer Solutions\nP.O. Box 2000\nChester, PA 19016-2000',
  LexisNexis: 'LexisNexis Consumer Center\nP.O. Box 105108\nAtlanta, GA 30348-5108',
  Innovis: 'Innovis Consumer Assistance\nP.O. Box 26\nPittsburgh, PA 15230-0026',
  ChexSystems: 'Chex Systems, Inc.\nAttn: Consumer Relations\n7805 Hudson Rd, Suite 100\nWoodbury, MN 55125',
  SageStream: 'SageStream, LLC\nConsumer Services\nP.O. Box 503793\nSan Diego, CA 92150',
};

const CORRECTION_TYPES = [
  { id: 'name', label: 'Incorrect or misspelled name / alias I never used' },
  { id: 'address', label: 'Old or incorrect address' },
  { id: 'dob', label: 'Wrong date of birth' },
  { id: 'ssn', label: 'Wrong Social Security Number / partial SSN' },
  { id: 'employer', label: 'Incorrect or outdated employer' },
  { id: 'phone', label: 'Wrong phone number' },
];

const PersonalInfoCorrection = () => {
  const [bureau, setBureau] = useState<Bureau>('Equifax');
  const [fullName, setFullName] = useState('');
  const [currentAddress, setCurrentAddress] = useState('');
  const [dob, setDob] = useState('');
  const [ssnLast4, setSsnLast4] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [incorrectDetails, setIncorrectDetails] = useState('');
  const [correctDetails, setCorrectDetails] = useState('');
  const [copied, setCopied] = useState(false);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const errorList = selected
    .map((id) => `  • ${CORRECTION_TYPES.find((c) => c.id === id)?.label}`)
    .join('\n');

  const letter = `${today}

${fullName || '[Your Full Legal Name]'}
${currentAddress || '[Your Current Address]'}
DOB: ${dob || '[MM/DD/YYYY]'}
SSN (last 4): XXX-XX-${ssnLast4 || 'XXXX'}

${BUREAU_ADDRESSES[bureau]}

Re: Request to Correct Inaccurate Personal Information

To Whom It May Concern:

I am writing under my rights granted by the Fair Credit Reporting Act (15 U.S.C. § 1681 et seq.), specifically Section 611, to request the correction and removal of inaccurate personal information on my consumer file.

The following personal identifiers on my report are inaccurate and must be corrected or deleted:

${errorList || '  • [Select at least one correction type above]'}

Details of the inaccuracy:
${incorrectDetails || '[Describe exactly what appears incorrectly on the report — old addresses, misspelled names, wrong employers, aliases you never used, etc.]'}

Correct information that should replace it:
${correctDetails || '[Provide the correct information, or state that the item should be deleted entirely because it has never been associated with you.]'}

Inaccurate personal information — especially old addresses, aliases, and wrong SSNs — is frequently used by identity thieves and by furnishers to mix files (a "mixed file"). Under the FCRA, you have 30 days from receipt of this letter to investigate and correct or delete the inaccurate information, and to notify me in writing of the results.

I have enclosed:
  • A copy of my government-issued photo ID
  • A copy of a utility bill or bank statement confirming my current address
  • A copy of my Social Security card (or W-2 showing full SSN)

Please send written confirmation of the corrections to the address above, along with an updated copy of my consumer report reflecting the changes.

Sincerely,



_____________________________
${fullName || '[Your Signature]'}
${fullName || '[Your Printed Name]'}
`;

  const download = () => {
    const blob = new Blob([letter], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `personal-info-correction-${bureau}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Letter downloaded');
  };

  const copy = async () => {
    await navigator.clipboard.writeText(letter);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-8">
      <PageOverview
        title="Personal Info Correction Letter"
        description="Generate FCRA § 611 letters to fix wrong names, addresses, DOB, SSN, or aliases on your credit file"
        icon={FileEdit}
        ttsScript="Use this tool to generate letters that correct inaccurate personal information on your credit reports — wrong addresses, misspelled names, aliases you never used, or incorrect date of birth or Social Security Number. Under the Fair Credit Reporting Act, bureaus have 30 days to correct or delete inaccurate personal identifiers. Cleaning this up prevents mixed files and identity theft."
        features={[
          'Covers Big 3 plus LexisNexis, Innovis, ChexSystems, and SageStream',
          'FCRA § 611 citations included',
          'Auto-fills your identifying info once entered',
          'Download as text or copy to clipboard',
        ]}
      />

      <Alert>
        <AlertTitle>Send certified mail with return receipt</AlertTitle>
        <AlertDescription>
          Always mail these letters via USPS Certified Mail with return receipt. Keep the green card as proof of the 30-day
          clock. Include the enclosures listed at the bottom of the letter.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Letter Details</CardTitle>
            <CardDescription>Fill in your info and select what needs to be corrected.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Send to bureau</Label>
              <Select value={bureau} onValueChange={(v) => setBureau(v as Bureau)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(BUREAU_ADDRESSES).map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Your full legal name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane A. Doe" />
            </div>

            <div>
              <Label>Current mailing address</Label>
              <Textarea
                rows={2}
                value={currentAddress}
                onChange={(e) => setCurrentAddress(e.target.value)}
                placeholder="123 Main St&#10;Akron, OH 44301"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date of birth</Label>
                <Input value={dob} onChange={(e) => setDob(e.target.value)} placeholder="MM/DD/YYYY" />
              </div>
              <div>
                <Label>SSN (last 4)</Label>
                <Input maxLength={4} value={ssnLast4} onChange={(e) => setSsnLast4(e.target.value.replace(/\D/g, ''))} placeholder="1234" />
              </div>
            </div>

            <div>
              <Label className="mb-2 block">What needs correcting?</Label>
              <div className="space-y-2">
                {CORRECTION_TYPES.map((c) => (
                  <label key={c.id} className="flex items-start gap-2 text-sm cursor-pointer">
                    <Checkbox checked={selected.includes(c.id)} onCheckedChange={() => toggle(c.id)} />
                    <span>{c.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>What appears incorrectly?</Label>
              <Textarea
                rows={3}
                value={incorrectDetails}
                onChange={(e) => setIncorrectDetails(e.target.value)}
                placeholder='e.g., "Old address at 456 Oak Ave, Cleveland OH is listed. Also lists alias JANE A DOE-SMITH which I have never used."'
              />
            </div>

            <div>
              <Label>Correct information (or "delete entirely")</Label>
              <Textarea
                rows={3}
                value={correctDetails}
                onChange={(e) => setCorrectDetails(e.target.value)}
                placeholder='e.g., "Please delete the old Cleveland address and the alias entirely. My only correct address is the one on this letter."'
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Preview</CardTitle>
              <CardDescription>Review, copy, or download.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={copy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button size="sm" onClick={download}>
                <Download className="h-4 w-4 mr-1" /> Download
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/40 p-4 rounded-md max-h-[600px] overflow-auto">
{letter}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PersonalInfoCorrection;
