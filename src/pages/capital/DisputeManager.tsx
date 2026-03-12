import { useState, useRef } from 'react';
import { FileText, Plus, Clock, CheckCircle2, XCircle, AlertTriangle, Send, Trash2, Download, ChevronDown, ChevronUp, Sparkles, FileEdit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import PageOverview from '@/components/PageOverview';
import { useDisputes, type DisputeInsert, type CreditDispute } from '@/hooks/use-disputes';
import { useCreditAccounts } from '@/hooks/use-credit-accounts';
import { useMetro2Findings } from '@/hooks/use-metro2-findings';
import { useHousehold } from '@/contexts/HouseholdContext';
import { format, differenceInDays, addDays, isPast } from 'date-fns';
import { exportToPdf } from '@/lib/export-utils';
import DisputeLetterGenerator from '@/components/capital/DisputeLetterGenerator';
import { OSCAR_REASON_CODES } from '@/components/capital/DisputeLetterGenerator';
import { toast } from 'sonner';

/* ── helpers ─────────────────────────────────────────── */

const statusColor: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-primary/15 text-primary',
  in_progress: 'bg-amber-500/15 text-amber-600',
  resolved: 'bg-emerald-500/15 text-emerald-600',
  denied: 'bg-destructive/15 text-destructive',
};

function FcraTimer({ submittedDate }: { submittedDate: string | null }) {
  if (!submittedDate) return <span className="text-xs text-muted-foreground">—</span>;
  const due = addDays(new Date(submittedDate), 30);
  const remaining = differenceInDays(due, new Date());
  const overdue = isPast(due);

  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium ${overdue ? 'text-destructive' : remaining <= 7 ? 'text-amber-600' : 'text-emerald-600'}`}>
      <Clock className="h-3.5 w-3.5" />
      {overdue ? `${Math.abs(remaining)}d overdue` : `${remaining}d left`}
    </div>
  );
}

/* ── main component ─────────────────────────────────── */

const DisputeManager = () => {
  const { household } = useHousehold();
  const householdId = household?.id;
  const { disputes, active, pending, resolved, createDispute, updateDispute, deleteDispute, isCreating, isLoading } = useDisputes();
  const { accounts } = useCreditAccounts();
  const { findings } = useMetro2Findings();
  const unresolvedFindings = findings.filter(f => !f.is_resolved);

  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const letterRef = useRef<HTMLDivElement>(null);
  const [letterDispute, setLetterDispute] = useState<CreditDispute | null>(null);

  // form state
  const [form, setForm] = useState({ bureau: '', dispute_reason: '', explanation: '', credit_account_id: '', metro2_violation: '' });
  const resetForm = () => setForm({ bureau: '', dispute_reason: '', explanation: '', credit_account_id: '', metro2_violation: '' });

  const handleCreate = () => {
    if (!householdId || !form.bureau || !form.dispute_reason) { toast.error('Bureau and reason are required'); return; }
    const payload: DisputeInsert = {
      household_id: householdId,
      bureau: form.bureau,
      dispute_reason: form.dispute_reason,
      explanation: form.explanation || null,
      credit_account_id: form.credit_account_id || null,
      metro2_violation: form.metro2_violation || null,
      status: 'draft',
    };
    createDispute(payload);
    setShowCreate(false);
    resetForm();
  };

  const handleAutoPopulate = (findingId: string) => {
    const f = findings.find(x => x.id === findingId);
    if (!f) return;
    const acct = accounts.find(a => a.id === f.credit_account_id);
    setForm({
      bureau: acct?.bureau || 'Equifax',
      dispute_reason: f.title,
      explanation: `${f.explanation}\n\nMetro2 Principle: ${f.metro2_principle || 'N/A'}\nRecommended: ${f.recommended_action || 'N/A'}`,
      credit_account_id: f.credit_account_id,
      metro2_violation: f.violation_type,
    });
    setShowCreate(true);
  };

  const handleSubmit = (d: CreditDispute) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    updateDispute({ id: d.id, status: 'submitted', submitted_date: today, response_due_date: format(addDays(new Date(), 30), 'yyyy-MM-dd') });
  };

  const handleResolve = (id: string, outcome: 'resolved' | 'denied') => {
    updateDispute({ id, status: outcome, outcome, response_received_date: format(new Date(), 'yyyy-MM-dd') });
  };

  const handleExportPdf = async (d: CreditDispute) => {
    setExpandedId(d.id);
    await new Promise(r => setTimeout(r, 300));
    if (letterRef.current) {
      try {
        await exportToPdf(letterRef.current, `dispute-letter-${d.bureau}-${format(new Date(), 'yyyyMMdd')}`);
        toast.success('PDF exported');
      } catch { toast.error('PDF export failed'); }
    }
  };

  const stats = {
    active: active.length,
    pending: pending.length,
    resolved: resolved.filter(d => d.outcome === 'resolved').length,
    denied: resolved.filter(d => d.outcome === 'denied').length,
  };

  const renderRow = (d: CreditDispute) => {
    const acct = accounts.find(a => a.id === d.credit_account_id);
    const isExpanded = expandedId === d.id;

    return (
      <div key={d.id}>
        <TableRow className="cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : d.id)}>
          <TableCell>
            <Badge className={`${statusColor[d.status] || statusColor.draft} border-0`}>{d.status}</Badge>
          </TableCell>
          <TableCell className="font-medium">{d.bureau}</TableCell>
          <TableCell className="max-w-[200px] truncate">{d.dispute_reason}</TableCell>
          <TableCell className="text-xs text-muted-foreground">{acct?.account_name || '—'}</TableCell>
          <TableCell><FcraTimer submittedDate={d.submitted_date} /></TableCell>
          <TableCell>{isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</TableCell>
        </TableRow>
        {isExpanded && (
          <TableRow>
            <TableCell colSpan={6} className="bg-muted/30 p-0">
              <div className="p-4 space-y-3">
                {/* Letter preview */}
                <div ref={d.id === expandedId ? letterRef : undefined} className="bg-background border rounded-lg p-6 space-y-4 text-sm">
                  <div className="text-center space-y-1">
                    <h3 className="text-lg font-bold">CREDIT REPORT DISPUTE LETTER</h3>
                    <p className="text-muted-foreground">FCRA § 611 — Fair Credit Reporting Act</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div><strong>Bureau:</strong> {d.bureau}</div>
                    <div><strong>Date:</strong> {d.submitted_date ? format(new Date(d.submitted_date), 'MMM d, yyyy') : format(new Date(), 'MMM d, yyyy')}</div>
                    {acct && <div><strong>Account:</strong> {acct.account_name} {acct.account_number ? `(****${acct.account_number.slice(-4)})` : ''}</div>}
                    {d.metro2_violation && <div><strong>Violation:</strong> {d.metro2_violation.replace(/_/g, ' ')}</div>}
                  </div>
                  <div>
                    <strong>Dispute Reason:</strong>
                    <p className="mt-1">{d.dispute_reason}</p>
                  </div>
                  {d.explanation && (
                    <div>
                      <strong>Detailed Explanation:</strong>
                      <p className="mt-1 whitespace-pre-wrap">{d.explanation}</p>
                    </div>
                  )}
                  <div className="border-t pt-3 text-xs text-muted-foreground">
                    <p>Under FCRA § 611, you are required to conduct a reasonable investigation within 30 days of receipt of this dispute. If the information cannot be verified, it must be deleted or modified.</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {d.status === 'draft' && (
                    <Button size="sm" onClick={() => handleSubmit(d)}><Send className="h-3.5 w-3.5 mr-1" />Mark Submitted</Button>
                  )}
                  {(d.status === 'submitted' || d.status === 'in_progress') && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleResolve(d.id, 'resolved')}><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Resolved</Button>
                      <Button size="sm" variant="outline" onClick={() => handleResolve(d.id, 'denied')}><XCircle className="h-3.5 w-3.5 mr-1" />Denied</Button>
                    </>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleExportPdf(d)}><Download className="h-3.5 w-3.5 mr-1" />Export PDF</Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteDispute(d.id)}><Trash2 className="h-3.5 w-3.5 mr-1" />Delete</Button>
                </div>
              </div>
            </TableCell>
          </TableRow>
        )}
      </div>
    );
  };

  const renderTable = (list: CreditDispute[]) => {
    if (!list.length) return (
      <Card className="p-12 text-center">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
        <h3 className="font-semibold text-lg mb-2">No Disputes</h3>
        <p className="text-sm text-muted-foreground mb-4">Create a dispute manually or from Metro2 scanner findings</p>
        <Button variant="outline" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />Create Dispute</Button>
      </Card>
    );
    return (
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Bureau</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>FCRA Timer</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>{list.map(renderRow)}</TableBody>
        </Table>
      </Card>
    );
  };

  return (
    <div className="space-y-6 pb-8">
      <PageOverview title="Dispute Manager" description="Prepare eOSCAR-compatible disputes with FCRA compliance tracking" icon={FileText} ttsScript="Prepare eOSCAR-compatible disputes with FCRA compliance tracking." features={['Generate dispute letters with PDF export', 'Track 30-day FCRA investigation timer', 'Auto-populate from Metro2 scanner findings']} />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Active Disputes</p><p className="text-2xl font-bold text-primary">{stats.active}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Drafts</p><p className="text-2xl font-bold text-muted-foreground">{stats.pending}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Resolved</p><p className="text-2xl font-bold text-emerald-600">{stats.resolved}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Denied</p><p className="text-2xl font-bold text-destructive">{stats.denied}</p></Card>
      </div>

      {/* Metro2 Quick-Import */}
      {unresolvedFindings.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Auto-populate from Metro2 Findings ({unresolvedFindings.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {unresolvedFindings.slice(0, 6).map(f => (
              <Button key={f.id} size="sm" variant="outline" onClick={() => handleAutoPopulate(f.id)} className="text-xs">
                <AlertTriangle className={`h-3 w-3 mr-1 ${f.severity === 'high' ? 'text-destructive' : f.severity === 'medium' ? 'text-amber-500' : 'text-muted-foreground'}`} />
                {f.title.slice(0, 40)}{f.title.length > 40 ? '…' : ''}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={() => { resetForm(); setShowCreate(true); }}><Plus className="h-4 w-4 mr-2" />New Dispute</Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({disputes.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
          <TabsTrigger value="drafts">Drafts ({pending.length})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({resolved.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">{renderTable(disputes)}</TabsContent>
        <TabsContent value="active" className="mt-4">{renderTable(active)}</TabsContent>
        <TabsContent value="drafts" className="mt-4">{renderTable(pending)}</TabsContent>
        <TabsContent value="resolved" className="mt-4">{renderTable(resolved)}</TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Dispute</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Bureau *</Label>
              <Select value={form.bureau} onValueChange={v => setForm(p => ({ ...p, bureau: v }))}>
                <SelectTrigger><SelectValue placeholder="Select bureau" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Equifax">Equifax</SelectItem>
                  <SelectItem value="Experian">Experian</SelectItem>
                  <SelectItem value="TransUnion">TransUnion</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Credit Account (optional)</Label>
              <Select value={form.credit_account_id} onValueChange={v => setForm(p => ({ ...p, credit_account_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Link to account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_name} — {a.bureau}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Dispute Reason *</Label>
              <Input value={form.dispute_reason} onChange={e => setForm(p => ({ ...p, dispute_reason: e.target.value }))} placeholder="e.g. Incorrect balance reported" />
            </div>
            {form.metro2_violation && (
              <div>
                <Label>Metro2 Violation</Label>
                <Input value={form.metro2_violation.replace(/_/g, ' ')} readOnly className="bg-muted" />
              </div>
            )}
            <div>
              <Label>Explanation / Supporting Details</Label>
              <Textarea value={form.explanation} onChange={e => setForm(p => ({ ...p, explanation: e.target.value }))} rows={5} placeholder="Detailed explanation for the bureau..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isCreating}>Create Dispute</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DisputeManager;
