import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Download, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const STORAGE_KEY = 'prism.coSigner.destin.v1';

type State = {
  primaryName: string;
  coSignerName: string;
  lender: string;
  accountLast4: string;
  monthlyPayment: string;
  loanStart: string;
  bankName: string;
  accountHolder: string;
  months: Record<string, { statement: boolean; onTime: boolean; note?: string }>;
};

const DEFAULT: State = {
  primaryName: 'Destin Montgomery',
  coSignerName: '',
  lender: '',
  accountLast4: '',
  monthlyPayment: '640',
  loanStart: '',
  bankName: '',
  accountHolder: 'Destin Montgomery',
  months: {},
};

function lastNMonths(n: number) {
  const out: { key: string; label: string }[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    const label = dt.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    out.push({ key, label });
  }
  return out.reverse();
}

export default function CoSignerDocPacket() {
  const [state, setState] = useState<State>(DEFAULT);
  const months = lastNMonths(12);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...DEFAULT, ...JSON.parse(raw) });
    } catch {}
  }, []);

  const save = (next: State) => {
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const set = <K extends keyof State>(k: K, v: State[K]) => save({ ...state, [k]: v });

  const toggleMonth = (key: string, field: 'statement' | 'onTime') => {
    const prev = state.months[key] ?? { statement: false, onTime: false };
    save({ ...state, months: { ...state.months, [key]: { ...prev, [field]: !prev[field] } } });
  };

  const completed = months.filter((m) => state.months[m.key]?.statement && state.months[m.key]?.onTime).length;

  const generateLetter = () => {
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const letter = `${today}

To Whom It May Concern / Underwriting Department:

RE: Co-signed Auto Loan — Payment Responsibility Documentation
Lender: ${state.lender || '[LENDER NAME]'}
Account (last 4): ${state.accountLast4 || '[####]'}
Monthly Payment: $${state.monthlyPayment}
Loan Origination: ${state.loanStart || '[MM/YYYY]'}

To Whom It May Concern:

I, ${state.coSignerName || '[CO-SIGNER FULL NAME]'}, am a co-signer on the auto loan referenced above. I am writing to formally document that I do NOT make the monthly payments on this loan. The primary borrower, ${state.primaryName}, has made every monthly payment of $${state.monthlyPayment} from his own personal checking account for the past 12+ months.

Per HUD Handbook 4000.1 (FHA), Fannie Mae Selling Guide B3-6-05, and Freddie Mac Guide 5401.2, a contingent liability on a co-signed debt may be excluded from the co-signer's debt-to-income (DTI) ratio when the primary obligor has made timely payments for the most recent 12 months, evidenced by canceled checks or bank statements drawn on the primary obligor's account.

Supporting documentation attached / available upon request:
  • 12 months of bank statements from ${state.bankName || '[BANK NAME]'}, account held by ${state.accountHolder}, showing the monthly $${state.monthlyPayment} payment to ${state.lender || '[LENDER]'}.
  • Loan statements confirming on-time payment status.
  • This signed letter of explanation.

Please exclude this obligation from my debt-to-income calculation for mortgage qualification purposes.

Sincerely,


_____________________________________
${state.coSignerName || '[CO-SIGNER FULL NAME]'} (Co-Signer)
Date: ${today}


_____________________________________
${state.primaryName} (Primary Borrower)
Date: ${today}
`;

    const blob = new Blob([letter], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `co-signer-letter-${state.primaryName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Letter downloaded');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-prism-amber" />
            Co-Signer Documentation Packet — {state.primaryName}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Excludes the co-signed auto loan from your DTI by proving the primary borrower pays it (FHA HUD 4000.1 / Fannie / Freddie).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Primary borrower (pays the loan)</Label>
              <Input value={state.primaryName} onChange={(e) => set('primaryName', e.target.value)} />
            </div>
            <div>
              <Label>Co-signer (you)</Label>
              <Input value={state.coSignerName} onChange={(e) => set('coSignerName', e.target.value)} placeholder="Your full name" />
            </div>
            <div>
              <Label>Lender</Label>
              <Input value={state.lender} onChange={(e) => set('lender', e.target.value)} placeholder="e.g., Ally, Capital One Auto" />
            </div>
            <div>
              <Label>Account last 4</Label>
              <Input value={state.accountLast4} onChange={(e) => set('accountLast4', e.target.value)} placeholder="1234" />
            </div>
            <div>
              <Label>Monthly payment ($)</Label>
              <Input value={state.monthlyPayment} onChange={(e) => set('monthlyPayment', e.target.value)} />
            </div>
            <div>
              <Label>Loan start (MM/YYYY)</Label>
              <Input value={state.loanStart} onChange={(e) => set('loanStart', e.target.value)} placeholder="03/2023" />
            </div>
            <div>
              <Label>Primary borrower's bank</Label>
              <Input value={state.bankName} onChange={(e) => set('bankName', e.target.value)} placeholder="e.g., Chase" />
            </div>
            <div>
              <Label>Account holder name</Label>
              <Input value={state.accountHolder} onChange={(e) => set('accountHolder', e.target.value)} />
            </div>
          </div>

          <Button onClick={generateLetter} className="gap-2">
            <Download className="h-4 w-4" />
            Generate Lender Letter
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            12-Month Payment History Checklist ({completed}/12 complete)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Collect one bank statement per month from {state.primaryName}'s personal checking, highlighting the ${state.monthlyPayment} payment.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {months.map((m) => {
              const rec = state.months[m.key] ?? { statement: false, onTime: false };
              return (
                <div key={m.key} className="flex items-center justify-between rounded-md border border-border/40 bg-card/40 px-3 py-2">
                  <span className="text-sm font-medium">{m.label}</span>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <Checkbox checked={rec.statement} onCheckedChange={() => toggleMonth(m.key, 'statement')} />
                      Statement
                    </label>
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <Checkbox checked={rec.onTime} onCheckedChange={() => toggleMonth(m.key, 'onTime')} />
                      On-time
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
