import { useEffect, useState } from 'react';
import { Heart, Plus, Trash2, Copy, Mail, Phone, FileText } from 'lucide-react';
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
import { useCreditAccounts } from '@/hooks/use-credit-accounts';
import { toast } from 'sonner';
import { addDays, format, isPast } from 'date-fns';

interface Row {
  id: string;
  credit_account_id: string | null;
  campaign_type: string;
  creditor_name: string;
  executive_name: string | null;
  executive_title: string | null;
  contact_method: string | null;
  contact_email: string | null;
  attempt_number: number;
  sent_date: string | null;
  followup_due_date: string | null;
  response_date: string | null;
  response_type: string | null;
  offer_amount: number | null;
  status: string;
  notes: string | null;
}

const GOODWILL_BODY = (r: Row) => `Dear ${r.executive_name || '[Name]'}${r.executive_title ? `, ${r.executive_title}` : ''},

I have been a customer of ${r.creditor_name} and I am writing to respectfully request a goodwill adjustment on my account.

I acknowledge the late payment(s) reported. At the time, I was facing an unexpected hardship that I have since resolved. My account is now current and my long-term history reflects a genuine commitment to meeting my obligations.

I am asking, as a one-time courtesy, that you request deletion of the late-payment notation(s) from all three credit bureaus (Equifax, Experian, TransUnion). This adjustment would materially help me qualify for a home loan I am working toward.

I appreciate your consideration and the time you have taken to read this letter.

Sincerely,
[Your Name]
[Your Address]
[Your Phone]
`;

const PFD_BODY = (r: Row) => `${r.creditor_name}
[Address]

Re: Account [Account #] — Pay-for-Delete Offer

To Whom It May Concern:

Without admitting the debt is valid, I am willing to settle the above account for ${r.offer_amount ? `$${r.offer_amount.toFixed(2)}` : '$[amount]'} in exchange for the FULL DELETION of all references to this account from Equifax, Experian, and TransUnion.

Terms:
1. Payment is contingent on your written agreement to delete the tradeline within 30 days of receipt of payment.
2. This is not an acknowledgement of the debt.
3. This offer expires 30 days from the date of this letter.

Please respond in writing before any payment is exchanged.

Sincerely,
[Your Name]
[Your Address]
`;

export default function GoodwillCampaignTracker() {
  const { household } = useHousehold();
  const { accounts } = useCreditAccounts();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [viewing, setViewing] = useState<Row | null>(null);
  const [form, setForm] = useState({
    campaign_type: 'goodwill',
    creditor_name: '',
    credit_account_id: '',
    executive_name: '',
    executive_title: '',
    contact_method: 'email',
    contact_email: '',
    sent_date: '',
    offer_amount: '',
    notes: '',
  });

  const load = async () => {
    if (!household?.id) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('goodwill_campaigns').select('*')
      .eq('household_id', household.id)
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    else setRows((data as Row[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [household?.id]);

  const create = async () => {
    if (!household?.id || !form.creditor_name) return toast.error('Creditor required');
    // Compute attempt # for this (creditor, account) pair
    const prior = rows.filter(r =>
      r.creditor_name.toLowerCase() === form.creditor_name.toLowerCase() &&
      (r.credit_account_id || null) === (form.credit_account_id || null),
    ).length;
    const followup = form.sent_date
      ? format(addDays(new Date(form.sent_date), 21), 'yyyy-MM-dd') : null;
    const { error } = await (supabase as any).from('goodwill_campaigns').insert({
      household_id: household.id,
      credit_account_id: form.credit_account_id || null,
      campaign_type: form.campaign_type,
      creditor_name: form.creditor_name,
      executive_name: form.executive_name || null,
      executive_title: form.executive_title || null,
      contact_method: form.contact_method,
      contact_email: form.contact_email || null,
      attempt_number: prior + 1,
      sent_date: form.sent_date || null,
      followup_due_date: followup,
      offer_amount: form.offer_amount ? Number(form.offer_amount) : null,
      status: form.sent_date ? 'sent' : 'draft',
      notes: form.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success('Attempt logged');
    setShowAdd(false);
    setForm({ campaign_type: 'goodwill', creditor_name: '', credit_account_id: '', executive_name: '', executive_title: '', contact_method: 'email', contact_email: '', sent_date: '', offer_amount: '', notes: '' });
    load();
  };

  const setResponse = async (r: Row, type: string) => {
    const { error } = await (supabase as any).from('goodwill_campaigns').update({
      response_type: type,
      response_date: format(new Date(), 'yyyy-MM-dd'),
      status: type === 'deleted' ? 'succeeded' : type === 'denied' ? 'denied' : 'partial',
    }).eq('id', r.id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this attempt?')) return;
    await (supabase as any).from('goodwill_campaigns').delete().eq('id', id);
    load();
  };

  // Group by creditor+account for campaign view
  const groups = rows.reduce<Record<string, Row[]>>((acc, r) => {
    const key = `${r.creditor_name}::${r.credit_account_id || 'no-acct'}`;
    (acc[key] = acc[key] || []).push(r);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <Heart className="h-4 w-4 text-primary" />
          Goodwill & Pay-for-Delete Campaigns
        </CardTitle>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-1" />Log Attempt</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Goodwill letters often need 3–5 attempts to different executives. Track each try, response, and follow-up date.
          Success rates: goodwill ~10–30% per attempt · PFD ~25–40% for older collections.
        </p>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && rows.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No attempts yet. Log your first outreach — pick a creditor and (optionally) the executive you're contacting.
          </p>
        )}

        {Object.entries(groups).map(([key, attempts]) => {
          const first = attempts[0];
          const succeeded = attempts.some(a => a.status === 'succeeded');
          return (
            <div key={key} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{first.creditor_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {first.campaign_type === 'goodwill' ? 'Goodwill campaign' : 'Pay-for-Delete'} · {attempts.length} attempt{attempts.length > 1 ? 's' : ''}
                  </div>
                </div>
                {succeeded && <Badge className="bg-emerald-500/15 text-emerald-600">Deleted</Badge>}
              </div>
              <div className="space-y-1">
                {attempts.sort((a, b) => a.attempt_number - b.attempt_number).map(r => {
                  const overdue = r.followup_due_date && !r.response_date && isPast(new Date(r.followup_due_date));
                  return (
                    <div key={r.id} className="flex flex-wrap items-center gap-2 text-xs border-t pt-2">
                      <span className="font-mono text-muted-foreground">#{r.attempt_number}</span>
                      <span>{r.executive_name || 'Unknown recipient'}</span>
                      {r.executive_title && <span className="text-muted-foreground">({r.executive_title})</span>}
                      {r.contact_method === 'email' && <Mail className="h-3 w-3 text-muted-foreground" />}
                      {r.contact_method === 'phone' && <Phone className="h-3 w-3 text-muted-foreground" />}
                      {r.contact_method === 'mail' && <FileText className="h-3 w-3 text-muted-foreground" />}
                      <span className="text-muted-foreground">{r.sent_date || 'not sent'}</span>
                      {r.response_type && (
                        <Badge className={r.response_type === 'deleted' ? 'bg-emerald-500/15 text-emerald-600' : r.response_type === 'denied' ? 'bg-destructive/15 text-destructive' : 'bg-amber-500/15 text-amber-600'}>
                          {r.response_type}
                        </Badge>
                      )}
                      {overdue && !r.response_type && <Badge className="bg-amber-500/15 text-amber-600">Follow up</Badge>}
                      <div className="ml-auto flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setViewing(r)}><FileText className="h-3 w-3" /></Button>
                        {!r.response_type && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => setResponse(r, 'deleted')} title="Mark deleted">✅</Button>
                            <Button size="sm" variant="ghost" onClick={() => setResponse(r, 'denied')} title="Mark denied">❌</Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Log Goodwill / PFD Attempt</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Type</Label>
              <Select value={form.campaign_type} onValueChange={v => setForm(p => ({ ...p, campaign_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="goodwill">Goodwill (paid, remove late)</SelectItem>
                  <SelectItem value="pfd">Pay-for-Delete (offer to settle)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Creditor *</Label><Input value={form.creditor_name} onChange={e => setForm(p => ({ ...p, creditor_name: e.target.value }))} /></div>
            {accounts.length > 0 && (
              <div>
                <Label>Link to Account</Label>
                <Select value={form.credit_account_id} onValueChange={v => setForm(p => ({ ...p, credit_account_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Executive Name</Label><Input value={form.executive_name} onChange={e => setForm(p => ({ ...p, executive_name: e.target.value }))} placeholder="e.g. Jane Doe" /></div>
              <div><Label>Title</Label><Input value={form.executive_title} onChange={e => setForm(p => ({ ...p, executive_title: e.target.value }))} placeholder="e.g. Exec Resolutions" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Method</Label>
                <Select value={form.contact_method} onValueChange={v => setForm(p => ({ ...p, contact_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="mail">Certified mail</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="portal">Online portal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Sent Date</Label><Input type="date" value={form.sent_date} onChange={e => setForm(p => ({ ...p, sent_date: e.target.value }))} /></div>
            </div>
            {form.contact_method === 'email' && (
              <div><Label>Email</Label><Input type="email" value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} placeholder="exec@bank.com" /></div>
            )}
            {form.campaign_type === 'pfd' && (
              <div><Label>Offer Amount ($)</Label><Input type="number" value={form.offer_amount} onChange={e => setForm(p => ({ ...p, offer_amount: e.target.value }))} placeholder="e.g. 300" /></div>
            )}
            <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={create}>Log Attempt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={o => { if (!o) setViewing(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{viewing?.campaign_type === 'pfd' ? 'Pay-for-Delete' : 'Goodwill'} Letter — {viewing?.creditor_name}</DialogTitle></DialogHeader>
          {viewing && (
            <>
              <Textarea readOnly value={viewing.campaign_type === 'pfd' ? PFD_BODY(viewing) : GOODWILL_BODY(viewing)} rows={16} className="font-mono text-xs" />
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  navigator.clipboard.writeText(viewing.campaign_type === 'pfd' ? PFD_BODY(viewing) : GOODWILL_BODY(viewing));
                  toast.success('Copied');
                }}>
                  <Copy className="h-3.5 w-3.5 mr-1" />Copy
                </Button>
                <Button onClick={() => setViewing(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
