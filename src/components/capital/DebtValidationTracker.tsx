import { useEffect, useState } from 'react';
import { Shield, Plus, Trash2, Clock, AlertTriangle, CheckCircle2, FileText, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { SOL_BY_STATE, solYears, solExpiryDate } from '@/lib/credit-repair/sol-by-state';
import { toast } from 'sonner';
import { addDays, differenceInDays, format, isPast } from 'date-fns';

interface DVR {
  id: string;
  collector_name: string;
  original_creditor: string | null;
  account_reference: string | null;
  amount_claimed: number | null;
  first_contact_date: string | null;
  dv_letter_sent_date: string | null;
  dv_response_deadline: string | null;
  response_received_date: string | null;
  response_type: string | null;
  validated: boolean;
  statute_of_limitations_date: string | null;
  sol_state: string | null;
  sol_years: number | null;
  status: string;
  notes: string | null;
}

const DV_LETTER_TEMPLATE = (row: DVR) => `${format(new Date(), 'MMMM d, yyyy')}

${row.collector_name}
[Collector Address]

Re: Debt Validation Request
Account Reference: ${row.account_reference || '[Account #]'}
Original Creditor: ${row.original_creditor || '[Original Creditor]'}
Amount Claimed: ${row.amount_claimed ? `$${row.amount_claimed.toFixed(2)}` : '[Amount]'}

To Whom It May Concern:

This letter is a formal request pursuant to the Fair Debt Collection Practices Act, 15 U.S.C. § 1692g, that you provide validation of the alleged debt referenced above. I dispute this debt and request that you cease all collection activity until validation is provided.

Please provide the following:

1. The name and address of the original creditor.
2. Verification of the exact amount of the debt, including an itemized accounting of all charges, interest, and fees.
3. A copy of the original signed contract or agreement establishing the debt.
4. Proof that your company is licensed to collect debts in my state.
5. The chain of assignment from the original creditor to your company.

Until such time as you provide proper validation, you may not:
- Report this debt to any credit reporting agency,
- Continue collection efforts, or
- Contact me by phone.

Please respond in writing only. This letter is being sent via certified mail with return receipt requested.

Sincerely,

[Your Name]
[Your Address]
`;

export default function DebtValidationTracker() {
  const { household } = useHousehold();
  const [rows, setRows] = useState<DVR[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [letterFor, setLetterFor] = useState<DVR | null>(null);
  const [form, setForm] = useState({
    collector_name: '',
    original_creditor: '',
    account_reference: '',
    amount_claimed: '',
    first_contact_date: '',
    dv_letter_sent_date: '',
    sol_state: '',
    notes: '',
  });

  const load = async () => {
    if (!household?.id) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('debt_validation_requests')
      .select('*')
      .eq('household_id', household.id)
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    else setRows((data as DVR[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [household?.id]);

  const create = async () => {
    if (!household?.id || !form.collector_name) return toast.error('Collector required');
    const years = form.sol_state ? solYears(form.sol_state) : null;
    const solDate = form.first_contact_date && years
      ? solExpiryDate(form.first_contact_date, years) : null;
    const deadline = form.dv_letter_sent_date
      ? format(addDays(new Date(form.dv_letter_sent_date), 30), 'yyyy-MM-dd')
      : null;
    const { error } = await (supabase as any).from('debt_validation_requests').insert({
      household_id: household.id,
      collector_name: form.collector_name,
      original_creditor: form.original_creditor || null,
      account_reference: form.account_reference || null,
      amount_claimed: form.amount_claimed ? Number(form.amount_claimed) : null,
      first_contact_date: form.first_contact_date || null,
      dv_letter_sent_date: form.dv_letter_sent_date || null,
      dv_response_deadline: deadline,
      sol_state: form.sol_state || null,
      sol_years: years,
      statute_of_limitations_date: solDate,
      status: form.dv_letter_sent_date ? 'awaiting_response' : 'pending',
      notes: form.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success('Debt validation record added');
    setShowAdd(false);
    setForm({ collector_name: '', original_creditor: '', account_reference: '', amount_claimed: '', first_contact_date: '', dv_letter_sent_date: '', sol_state: '', notes: '' });
    load();
  };

  const markValidated = async (row: DVR, validated: boolean) => {
    const { error } = await (supabase as any).from('debt_validation_requests').update({
      validated, response_received_date: format(new Date(), 'yyyy-MM-dd'),
      status: validated ? 'validated' : 'not_validated',
    }).eq('id', row.id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this DV record?')) return;
    await (supabase as any).from('debt_validation_requests').delete().eq('id', id);
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Debt Validation & Statute of Limitations
        </CardTitle>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-1" />Add Collector</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && rows.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No collectors tracked yet. Add one to send an FDCPA § 1692g validation letter and track SOL.
          </p>
        )}
        {rows.map((r) => {
          const solPast = r.statute_of_limitations_date && isPast(new Date(r.statute_of_limitations_date));
          const daysToSol = r.statute_of_limitations_date
            ? differenceInDays(new Date(r.statute_of_limitations_date), new Date()) : null;
          const dvOverdue = r.dv_response_deadline && !r.response_received_date && isPast(new Date(r.dv_response_deadline));
          return (
            <div key={r.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{r.collector_name}</div>
                  {r.original_creditor && <div className="text-xs text-muted-foreground">Original: {r.original_creditor}</div>}
                  <div className="text-xs text-muted-foreground">
                    {r.amount_claimed ? `$${r.amount_claimed.toFixed(2)}` : '—'} · {r.account_reference || 'no ref'}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Badge className={
                    r.validated ? 'bg-emerald-500/15 text-emerald-600' :
                    r.status === 'not_validated' ? 'bg-destructive/15 text-destructive' :
                    'bg-muted text-muted-foreground'
                  }>{r.status.replace(/_/g, ' ')}</Badge>
                  {solPast && <Badge className="bg-emerald-500/15 text-emerald-600">SOL expired</Badge>}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div><span className="text-muted-foreground">DV Sent:</span> {r.dv_letter_sent_date || '—'}</div>
                <div className={dvOverdue ? 'text-destructive font-medium' : ''}>
                  <span className="text-muted-foreground">Response Due:</span> {r.dv_response_deadline || '—'}
                  {dvOverdue && ' ⚠︎'}
                </div>
                <div><span className="text-muted-foreground">SOL State:</span> {r.sol_state || '—'} ({r.sol_years || '?'}y)</div>
                <div className={solPast ? 'text-emerald-600 font-medium' : daysToSol !== null && daysToSol < 180 ? 'text-amber-600' : ''}>
                  <span className="text-muted-foreground">SOL Expires:</span> {r.statute_of_limitations_date || '—'}
                  {daysToSol !== null && !solPast && ` (${daysToSol}d)`}
                </div>
              </div>
              {daysToSol !== null && daysToSol < 180 && daysToSol > 0 && (
                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-500/10 rounded p-2">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Warning: making a payment or written acknowledgement can reset the SOL clock. Consult an attorney before responding.
                </div>
              )}
              <div className="flex flex-wrap gap-1">
                <Button size="sm" variant="outline" onClick={() => setLetterFor(r)}>
                  <FileText className="h-3.5 w-3.5 mr-1" />DV Letter
                </Button>
                {!r.validated && r.status !== 'not_validated' && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => markValidated(r, true)}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Validated
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => markValidated(r, false)}>
                      <Clock className="h-3.5 w-3.5 mr-1" />Not Validated
                    </Button>
                  </>
                )}
                <Button size="sm" variant="destructive" onClick={() => remove(r.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Debt Collector</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Collector Name *</Label><Input value={form.collector_name} onChange={e => setForm(p => ({ ...p, collector_name: e.target.value }))} /></div>
            <div><Label>Original Creditor</Label><Input value={form.original_creditor} onChange={e => setForm(p => ({ ...p, original_creditor: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Account Ref</Label><Input value={form.account_reference} onChange={e => setForm(p => ({ ...p, account_reference: e.target.value }))} /></div>
              <div><Label>Amount ($)</Label><Input type="number" value={form.amount_claimed} onChange={e => setForm(p => ({ ...p, amount_claimed: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>First Contact / Delinquency</Label><Input type="date" value={form.first_contact_date} onChange={e => setForm(p => ({ ...p, first_contact_date: e.target.value }))} /></div>
              <div><Label>DV Letter Sent</Label><Input type="date" value={form.dv_letter_sent_date} onChange={e => setForm(p => ({ ...p, dv_letter_sent_date: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Your State (for SOL)</Label>
              <Select value={form.sol_state} onValueChange={v => setForm(p => ({ ...p, sol_state: v }))}>
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {SOL_BY_STATE.map(s => (
                    <SelectItem key={s.code} value={s.code}>{s.state} ({s.open}y open)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={create}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!letterFor} onOpenChange={o => { if (!o) setLetterFor(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>FDCPA § 1692g Validation Letter</DialogTitle></DialogHeader>
          {letterFor && (
            <>
              <Textarea readOnly value={DV_LETTER_TEMPLATE(letterFor)} rows={22} className="font-mono text-xs" />
              <DialogFooter>
                <Button variant="outline" onClick={() => { navigator.clipboard.writeText(DV_LETTER_TEMPLATE(letterFor)); toast.success('Copied'); }}>
                  <Copy className="h-3.5 w-3.5 mr-1" />Copy Letter
                </Button>
                <Button onClick={() => setLetterFor(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
