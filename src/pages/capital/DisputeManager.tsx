import { useState, useRef } from 'react';
import { FileText, Plus, Clock, CheckCircle2, XCircle, AlertTriangle, Send, Trash2, Download, ChevronDown, ChevronUp, Sparkles, FileEdit, ExternalLink, Building2, Save, Loader2 } from 'lucide-react';
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
import EscalationCadence from '@/components/capital/EscalationCadence';
import LetterLibrary from '@/components/capital/LetterLibrary';
import InquiryDisputes from '@/components/capital/InquiryDisputes';
import ResponseUpload from '@/components/capital/ResponseUpload';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/* ── helpers ─────────────────────────────────────────── */

const statusColor: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-primary/15 text-primary',
  in_progress: 'bg-amber-500/15 text-amber-600',
  resolved: 'bg-emerald-500/15 text-emerald-600',
  denied: 'bg-destructive/15 text-destructive',
};

const BUREAU_DISPUTE_URLS: Record<string, string> = {
  Equifax: 'https://www.equifax.com/personal/credit-report-services/credit-dispute/',
  Experian: 'https://www.experian.com/disputes/main.html',
  TransUnion: 'https://www.transunion.com/credit-disputes/dispute-your-credit',
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
  const [savingId, setSavingId] = useState<string | null>(null);
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

  const handleSaveInlineToVault = async (d: CreditDispute) => {
    if (!letterRef.current || !household) return;
    setSavingId(d.id);
    try {
      const canvas = await html2canvas(letterRef.current, {
        scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', 'a4');
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      const pdfBlob = pdf.output('blob');
      const fileName = `dispute-letter-${d.bureau}-${format(new Date(), 'yyyyMMdd-HHmmss')}.pdf`;
      const storagePath = `${household.id}/letters/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('credit-documents').upload(storagePath, pdfBlob, { contentType: 'application/pdf' });
      if (uploadError) throw uploadError;
      const acct = accounts.find(a => a.id === d.credit_account_id);
      await (supabase as any).from('credit_documents').insert({
        household_id: household.id, document_type: 'dispute_letter', bureau: d.bureau,
        file_name: fileName, storage_path: storagePath, file_size: pdfBlob.size,
        dispute_id: d.id, notes: `Dispute letter for ${acct?.account_name || 'Unknown'} — ${d.dispute_reason}`,
      });
      toast.success('Letter saved to document vault');
    } catch (err: any) {
      toast.error(`Could not save: ${err.message}`);
    } finally {
      setSavingId(null);
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
                    <>
                      <Button size="sm" variant="outline" onClick={() => setLetterDispute(d)}>
                        <FileEdit className="h-3.5 w-3.5 mr-1" />Generate eOSCAR Letter
                      </Button>
                      <Button size="sm" onClick={() => handleSubmit(d)}><Send className="h-3.5 w-3.5 mr-1" />Mark Submitted</Button>
                    </>
                  )}
                  {(d.status === 'submitted' || d.status === 'in_progress') && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setLetterDispute(d)}>
                        <FileEdit className="h-3.5 w-3.5 mr-1" />View Letter
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleResolve(d.id, 'resolved')}><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Resolved</Button>
                      <Button size="sm" variant="outline" onClick={() => handleResolve(d.id, 'denied')}><XCircle className="h-3.5 w-3.5 mr-1" />Denied</Button>
                    </>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleExportPdf(d)}><Download className="h-3.5 w-3.5 mr-1" />Export PDF</Button>
                  <Button size="sm" variant="outline" onClick={() => handleSaveInlineToVault(d)} disabled={savingId === d.id}>
                    {savingId === d.id ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Saving...</> : <><Save className="h-3.5 w-3.5 mr-1" />Save to Vault</>}
                  </Button>
                  {BUREAU_DISPUTE_URLS[d.bureau] && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={BUREAU_DISPUTE_URLS[d.bureau]} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />File at {d.bureau}
                      </a>
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => deleteDispute(d.id)}><Trash2 className="h-3.5 w-3.5 mr-1" />Delete</Button>
                </div>

                {/* Escalation Cadence + Response Upload */}
                <div className="grid gap-3 md:grid-cols-2 pt-3 border-t">
                  <EscalationCadence dispute={d as any} onRefresh={() => setExpandedId(null)} />
                  {(d.status === 'submitted' || d.status === 'in_progress') && (
                    <ResponseUpload
                      disputeId={d.id}
                      currentRound={(d as any).round ?? 1}
                    />
                  )}
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
      <PageOverview title="Dispute Manager" description="Prepare eOSCAR-compatible disputes with FCRA compliance tracking" icon={FileText} ttsScript="Welcome to the Dispute Manager. This is where you prepare, track, and manage credit report disputes using eOSCAR-compatible reason codes — the same electronic system the bureaus use. Each dispute includes a 30-day FCRA investigation countdown timer. You can auto-populate disputes from Metro2 Scanner findings, or create them manually with one of 21 standardized reason codes. Generate formal dispute letters with PDF export, and use the direct links to file disputes online with Equifax, Experian, or TransUnion. Scenario: The Metro2 Scanner finds a charge-off with a conflicting status code. Click the finding to auto-create a dispute, generate an eOSCAR letter citing the specific violation, export it as PDF, then submit it through the bureau's online portal — all tracked with a 30-day response deadline." features={['eOSCAR-compatible reason codes and letter generation', '30-day FCRA investigation timer per dispute', 'Auto-populate from Metro2 Scanner findings', 'Direct links to bureau online dispute portals', 'Export dispute letters as PDF']} />

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

      {/* Bureau Portal Links */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Bureau Online Dispute Portals
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <a
            href="https://www.equifax.com/personal/credit-report-services/credit-dispute/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 rounded-lg border bg-background hover:bg-accent transition-colors group"
          >
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20">
              <ExternalLink className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Equifax</p>
              <p className="text-xs text-muted-foreground truncate">equifax.com/dispute</p>
            </div>
          </a>
          <a
            href="https://www.experian.com/disputes/main.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 rounded-lg border bg-background hover:bg-accent transition-colors group"
          >
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20">
              <ExternalLink className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Experian</p>
              <p className="text-xs text-muted-foreground truncate">experian.com/disputes</p>
            </div>
          </a>
          <a
            href="https://dispute.transunion.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 rounded-lg border bg-background hover:bg-accent transition-colors group"
          >
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20">
              <ExternalLink className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">TransUnion</p>
              <p className="text-xs text-muted-foreground truncate">dispute.transunion.com</p>
            </div>
          </a>
        </CardContent>
      </Card>

      {/* Consumer Rights & FCRA Resources */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-primary" />
            Consumer Rights & FCRA Resources
          </CardTitle>
          <p className="text-xs text-muted-foreground">Know your rights under the Fair Credit Reporting Act</p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[
            { name: 'CFPB Dispute Guide', url: 'https://www.consumerfinance.gov/consumer-tools/credit-reports-and-scores/answers/key-terms/dispute/', desc: 'consumerfinance.gov' },
            { name: 'FCRA Full Text', url: 'https://www.ftc.gov/legal-library/browse/statutes/fair-credit-reporting-act', desc: 'ftc.gov' },
            { name: 'AnnualCreditReport.com', url: 'https://www.annualcreditreport.com/', desc: 'Free credit reports' },
            { name: 'CFPB Complaint Portal', url: 'https://www.consumerfinance.gov/complaint/', desc: 'File a complaint' },
            { name: 'FTC Identity Theft', url: 'https://www.identitytheft.gov/', desc: 'identitytheft.gov' },
            { name: 'Credit Karma', url: 'https://www.creditkarma.com/', desc: 'Free scores & monitoring' },
          ].map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-lg border bg-background hover:bg-accent transition-colors group">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20">
                <ExternalLink className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm">{link.name}</p>
                <p className="text-xs text-muted-foreground truncate">{link.desc}</p>
              </div>
            </a>
          ))}
        </CardContent>
      </Card>

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
              <Label>eOSCAR Reason Code</Label>
              <Select onValueChange={v => {
                const reason = OSCAR_REASON_CODES.find(r => r.code === v);
                if (reason) setForm(p => ({ ...p, dispute_reason: reason.label }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select eOSCAR code (optional)" /></SelectTrigger>
                <SelectContent>
                  {OSCAR_REASON_CODES.map(r => (
                    <SelectItem key={r.code} value={r.code}>
                      <span className="font-mono text-xs mr-2">{r.code}</span>{r.label}
                    </SelectItem>
                  ))}
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

      {/* eOSCAR Letter Generator */}
      {letterDispute && (
        <DisputeLetterGenerator
          dispute={letterDispute}
          account={accounts.find(a => a.id === letterDispute.credit_account_id)}
          onSubmit={handleSubmit}
          open={!!letterDispute}
          onOpenChange={(open) => { if (!open) setLetterDispute(null); }}
        />
      )}
    </div>
  );
};

export default DisputeManager;
