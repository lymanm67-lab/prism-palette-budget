import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, FileText, CheckCircle2, XCircle, Trash2, AlertCircle } from 'lucide-react';
import { useCreditInquiries, type CreditInquiry } from '@/hooks/use-credit-inquiries';
import { LETTER_TEMPLATES } from '@/lib/credit-repair/letter-templates';
import LetterGenerator from './LetterGenerator';
import { format, differenceInDays } from 'date-fns';

const statusBadge: Record<string, string> = {
  none: 'bg-muted text-muted-foreground',
  draft: 'bg-amber-500/15 text-amber-600',
  submitted: 'bg-primary/15 text-primary',
  removed: 'bg-emerald-500/15 text-emerald-600',
  verified: 'bg-destructive/15 text-destructive',
};

export default function InquiryDisputes() {
  const { inquiries, hard, disputed, removed, createInquiry, updateInquiry, deleteInquiry, isCreating } = useCreditInquiries();
  const [showAdd, setShowAdd] = useState(false);
  const [letterFor, setLetterFor] = useState<CreditInquiry | null>(null);
  const [form, setForm] = useState({
    bureau: '',
    creditor_name: '',
    inquiry_date: format(new Date(), 'yyyy-MM-dd'),
    inquiry_type: 'hard' as 'hard' | 'soft',
    is_authorized: null as boolean | null,
    notes: '',
  });

  const reset = () => setForm({
    bureau: '',
    creditor_name: '',
    inquiry_date: format(new Date(), 'yyyy-MM-dd'),
    inquiry_type: 'hard',
    is_authorized: null,
    notes: '',
  });

  const handleCreate = () => {
    if (!form.bureau || !form.creditor_name) return;
    createInquiry({
      ...form,
      dispute_status: 'none',
      dispute_submitted_date: null,
      dispute_outcome: null,
    } as any);
    setShowAdd(false);
    reset();
  };

  const startDispute = (i: CreditInquiry) => {
    updateInquiry({ id: i.id, dispute_status: 'draft' });
    setLetterFor(i);
  };

  const markSubmitted = (i: CreditInquiry) => {
    updateInquiry({
      id: i.id,
      dispute_status: 'submitted',
      dispute_submitted_date: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  const markOutcome = (i: CreditInquiry, outcome: 'removed' | 'verified') => {
    updateInquiry({ id: i.id, dispute_status: outcome, dispute_outcome: outcome });
  };

  const inquiryLetterTemplate = LETTER_TEMPLATES.find(t => t.id === 'inquiry-dispute');

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Total inquiries</p>
          <p className="text-2xl font-bold">{inquiries.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Hard inquiries</p>
          <p className="text-2xl font-bold text-amber-600">{hard.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Disputed</p>
          <p className="text-2xl font-bold text-primary">{disputed.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Removed</p>
          <p className="text-2xl font-bold text-emerald-600">{removed.length}</p>
        </Card>
      </div>

      {/* Info */}
      <Card className="border-primary/20">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-medium">Hard inquiries stay on your report for 2 years and drop your score 3–10 points each.</p>
            <p className="text-muted-foreground">Under FCRA §604, an inquiry is legal ONLY if you initiated a credit transaction with that company. Any inquiry you did not authorize can be disputed and removed.</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold">Credit Inquiries</h3>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-1" />Add Inquiry
        </Button>
      </div>

      {inquiries.length === 0 ? (
        <Card className="p-8 text-center">
          <Search className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground mb-3">No inquiries logged yet. Add hard inquiries from your credit report.</p>
          <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4 mr-1" />Add First Inquiry
          </Button>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Inquirer</TableHead>
                <TableHead>Bureau</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inquiries.map(i => {
                const age = differenceInDays(new Date(), new Date(i.inquiry_date));
                const stale = age > 730; // 2 years
                return (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.creditor_name}</TableCell>
                    <TableCell>{i.bureau}</TableCell>
                    <TableCell className="text-xs">
                      {format(new Date(i.inquiry_date), 'MMM d, yyyy')}
                      {stale && <Badge variant="outline" className="ml-1 text-[9px]">expired</Badge>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={i.inquiry_type === 'hard' ? 'default' : 'secondary'} className="text-[10px]">
                        {i.inquiry_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusBadge[i.dispute_status]} border-0 text-[10px]`}>{i.dispute_status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {i.inquiry_type === 'hard' && i.dispute_status === 'none' && (
                          <Button size="sm" variant="outline" onClick={() => startDispute(i)}>
                            <FileText className="h-3 w-3 mr-1" />Dispute
                          </Button>
                        )}
                        {i.dispute_status === 'draft' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => setLetterFor(i)}>Letter</Button>
                            <Button size="sm" onClick={() => markSubmitted(i)}>Sent</Button>
                          </>
                        )}
                        {i.dispute_status === 'submitted' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => markOutcome(i, 'removed')}>
                              <CheckCircle2 className="h-3 w-3 mr-1" />Removed
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => markOutcome(i, 'verified')}>
                              <XCircle className="h-3 w-3 mr-1" />Verified
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteInquiry(i.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Credit Inquiry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Inquirer / Lender Name *</Label>
              <Input value={form.creditor_name} onChange={e => setForm(p => ({ ...p, creditor_name: e.target.value }))} placeholder="Capital One" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Bureau *</Label>
                <Select value={form.bureau} onValueChange={v => setForm(p => ({ ...p, bureau: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Equifax">Equifax</SelectItem>
                    <SelectItem value="Experian">Experian</SelectItem>
                    <SelectItem value="TransUnion">TransUnion</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={form.inquiry_type} onValueChange={v => setForm(p => ({ ...p, inquiry_type: v as 'hard' | 'soft' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hard">Hard</SelectItem>
                    <SelectItem value="soft">Soft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Inquiry Date *</Label>
              <Input type="date" value={form.inquiry_date} onChange={e => setForm(p => ({ ...p, inquiry_date: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Did you authorize this inquiry?</Label>
              <Select
                value={form.is_authorized === null ? 'unknown' : form.is_authorized ? 'yes' : 'no'}
                onValueChange={v => setForm(p => ({ ...p, is_authorized: v === 'unknown' ? null : v === 'yes' }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unknown">Not sure</SelectItem>
                  <SelectItem value="yes">Yes, I applied</SelectItem>
                  <SelectItem value="no">No — unauthorized (dispute candidate)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isCreating}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Letter generator */}
      {letterFor && inquiryLetterTemplate && (
        <LetterGenerator
          template={inquiryLetterTemplate}
          open={!!letterFor}
          onOpenChange={(o) => { if (!o) setLetterFor(null); }}
          initialVars={{
            bureau: letterFor.bureau,
            inquirerName: letterFor.creditor_name,
            inquiryDate: format(new Date(letterFor.inquiry_date), 'MMMM d, yyyy'),
          }}
        />
      )}
    </div>
  );
}
