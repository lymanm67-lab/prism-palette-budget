import { useEffect, useState } from 'react';
import { Gavel, Plus, ExternalLink, Copy, Trash2, FileText } from 'lucide-react';
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
import { toast } from 'sonner';
import { format } from 'date-fns';

const PRODUCTS = [
  'Credit reporting, credit repair services, or other personal consumer reports',
  'Debt collection',
  'Credit card or prepaid card',
  'Mortgage',
  'Checking or savings account',
  'Student loan',
  'Vehicle loan or lease',
  'Personal loan',
];

const ISSUES: Record<string, string[]> = {
  'Credit reporting, credit repair services, or other personal consumer reports': [
    'Incorrect information on your report',
    "Problem with a credit reporting company's investigation into an existing problem",
    'Improper use of your report',
    'Unable to get your credit report or credit score',
    'Credit monitoring or identity theft protection services',
  ],
  'Debt collection': [
    'Attempts to collect debt not owed',
    'Written notification about debt',
    'Communication tactics',
    'Took or threatened to take negative or legal action',
    "False statements or representation",
  ],
};

interface CFPB {
  id: string;
  company_name: string;
  product: string;
  issue: string;
  narrative: string;
  desired_resolution: string | null;
  cfpb_case_number: string | null;
  submitted_date: string | null;
  status: string;
  company_response: string | null;
  company_response_date: string | null;
  related_dispute_id: string | null;
}

const generateNarrative = (c: Partial<CFPB>) => `On multiple occasions I have attempted to resolve the following issue directly with ${c.company_name || '[Company]'} without success.

Issue: ${c.issue || '[Issue]'}
Product: ${c.product || '[Product]'}

Details:
${c.narrative || '[Explain what happened, including specific dates, amounts, and the harm caused.]'}

Desired resolution:
${c.desired_resolution || '[State what outcome you are seeking — deletion, correction, refund, etc.]'}

I am filing this complaint because ${c.company_name || 'the company'} has failed to fulfill its obligations under applicable federal consumer protection law, including the Fair Credit Reporting Act (15 U.S.C. § 1681) and the Fair Debt Collection Practices Act (15 U.S.C. § 1692). I request that the CFPB investigate and require the company to respond.
`;

export default function CFPBComplaintFiler() {
  const { household } = useHousehold();
  const [rows, setRows] = useState<CFPB[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [viewing, setViewing] = useState<CFPB | null>(null);
  const [form, setForm] = useState<Partial<CFPB>>({
    company_name: '',
    product: '',
    issue: '',
    narrative: '',
    desired_resolution: '',
  });

  const load = async () => {
    if (!household?.id) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('cfpb_complaints')
      .select('*')
      .eq('household_id', household.id)
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    else setRows((data as CFPB[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [household?.id]);

  const create = async () => {
    if (!household?.id || !form.company_name || !form.product || !form.issue) {
      return toast.error('Company, product, and issue are required');
    }
    const { error } = await (supabase as any).from('cfpb_complaints').insert({
      household_id: household.id,
      company_name: form.company_name,
      product: form.product,
      issue: form.issue,
      narrative: form.narrative || generateNarrative(form),
      desired_resolution: form.desired_resolution || null,
      status: 'draft',
    });
    if (error) return toast.error(error.message);
    toast.success('CFPB complaint drafted');
    setShowAdd(false);
    setForm({ company_name: '', product: '', issue: '', narrative: '', desired_resolution: '' });
    load();
  };

  const markSubmitted = async (r: CFPB, caseNum: string) => {
    const { error } = await (supabase as any).from('cfpb_complaints').update({
      status: 'submitted',
      cfpb_case_number: caseNum || null,
      submitted_date: format(new Date(), 'yyyy-MM-dd'),
    }).eq('id', r.id);
    if (error) return toast.error(error.message);
    toast.success('Marked as submitted');
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete complaint?')) return;
    await (supabase as any).from('cfpb_complaints').delete().eq('id', id);
    load();
  };

  const availableIssues = form.product ? ISSUES[form.product] || [] : [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <Gavel className="h-4 w-4 text-primary" />
          CFPB Complaint Filer
        </CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild>
            <a href="https://www.consumerfinance.gov/complaint/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1" />CFPB Portal
            </a>
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-1" />New Complaint</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Companies must respond to CFPB complaints within 15 days — a strong lever when disputes stall. Draft the narrative here, then submit through the CFPB portal.
        </p>
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && rows.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No CFPB complaints yet. File one when a bureau or collector fails to properly investigate or validate.
          </p>
        )}
        {rows.map(r => (
          <div key={r.id} className="rounded-lg border p-3 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium">{r.company_name}</div>
                <div className="text-xs text-muted-foreground">{r.product}</div>
                <div className="text-xs text-muted-foreground">{r.issue}</div>
              </div>
              <Badge className={r.status === 'submitted' ? 'bg-primary/15 text-primary' : r.status === 'closed' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground'}>
                {r.status}
              </Badge>
            </div>
            {r.cfpb_case_number && (
              <div className="text-xs">Case #: <span className="font-mono">{r.cfpb_case_number}</span> · Submitted {r.submitted_date}</div>
            )}
            <div className="flex flex-wrap gap-1 pt-1">
              <Button size="sm" variant="outline" onClick={() => setViewing(r)}>
                <FileText className="h-3.5 w-3.5 mr-1" />View / Copy
              </Button>
              {r.status === 'draft' && (
                <Button size="sm" variant="outline" onClick={() => {
                  const c = prompt('Enter CFPB case number (or leave blank):') || '';
                  markSubmitted(r, c);
                }}>Mark Submitted</Button>
              )}
              <Button size="sm" variant="destructive" onClick={() => remove(r.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New CFPB Complaint</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Company *</Label><Input value={form.company_name || ''} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} placeholder="e.g. Equifax" /></div>
            <div>
              <Label>Product *</Label>
              <Select value={form.product} onValueChange={v => setForm(p => ({ ...p, product: v, issue: '' }))}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>{PRODUCTS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Issue *</Label>
              {availableIssues.length > 0 ? (
                <Select value={form.issue} onValueChange={v => setForm(p => ({ ...p, issue: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select issue" /></SelectTrigger>
                  <SelectContent>{availableIssues.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Input value={form.issue || ''} onChange={e => setForm(p => ({ ...p, issue: e.target.value }))} placeholder="Describe the issue" />
              )}
            </div>
            <div>
              <Label>Narrative (facts, dates, harm)</Label>
              <Textarea rows={5} value={form.narrative || ''} onChange={e => setForm(p => ({ ...p, narrative: e.target.value }))} placeholder="Leave blank to auto-generate a template" />
            </div>
            <div>
              <Label>Desired Resolution</Label>
              <Input value={form.desired_resolution || ''} onChange={e => setForm(p => ({ ...p, desired_resolution: e.target.value }))} placeholder="Delete the account, refund $X, etc." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={create}>Save Draft</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={o => { if (!o) setViewing(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{viewing?.company_name} — CFPB Complaint</DialogTitle></DialogHeader>
          {viewing && (
            <>
              <div className="text-xs text-muted-foreground">Product: {viewing.product}</div>
              <div className="text-xs text-muted-foreground mb-2">Issue: {viewing.issue}</div>
              <Textarea readOnly value={viewing.narrative} rows={16} className="font-mono text-xs" />
              <DialogFooter className="flex-wrap gap-2">
                <Button variant="outline" onClick={() => { navigator.clipboard.writeText(viewing.narrative); toast.success('Copied — paste into CFPB portal'); }}>
                  <Copy className="h-3.5 w-3.5 mr-1" />Copy Narrative
                </Button>
                <Button asChild>
                  <a href="https://www.consumerfinance.gov/complaint/" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />Open CFPB Portal
                  </a>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
