import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, FileText, Upload, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatusChip, { type IssueStatus } from '@/components/credit-health/StatusChip';
import { useDisputes, type DisputeInsert } from '@/hooks/use-disputes';
import { useCreditAccounts } from '@/hooks/use-credit-accounts';
import { useHousehold } from '@/contexts/HouseholdContext';
import { format, addDays, differenceInDays, isPast } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ISSUE_TYPES = [
  'Incorrect balance', 'Account not mine', 'Wrong account status', 'Incorrect payment history',
  'Duplicate account', 'Wrong date opened', 'Wrong credit limit', 'Identity theft',
  'Account paid but showing balance', 'Outdated information', 'Other',
];

const mapDisputeStatus = (s: string): IssueStatus => {
  const m: Record<string, IssueStatus> = {
    draft: 'identified', submitted: 'submitted', in_progress: 'under_review', resolved: 'removed', denied: 'validated',
  };
  return m[s] || 'identified';
};

const CreditHealthIssues = () => {
  const navigate = useNavigate();
  const { household } = useHousehold();
  const { disputes, createDispute, updateDispute, deleteDispute, isCreating } = useDisputes();
  const { accounts } = useCreditAccounts();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ bureau: '', account_id: '', issue_type: '', description: '', submitted_date: '' });

  const handleCreate = () => {
    if (!household?.id || !form.bureau || !form.issue_type) {
      toast.error('Bureau and issue type are required');
      return;
    }
    const payload: DisputeInsert = {
      household_id: household.id,
      bureau: form.bureau,
      dispute_reason: form.issue_type,
      explanation: form.description || null,
      credit_account_id: form.account_id || null,
      status: 'draft',
      submitted_date: form.submitted_date || null,
    };
    createDispute(payload);
    setShowAdd(false);
    setForm({ bureau: '', account_id: '', issue_type: '', description: '', submitted_date: '' });
  };

  const grouped = {
    active: disputes.filter(d => ['submitted', 'in_progress'].includes(d.status)),
    pending: disputes.filter(d => d.status === 'draft'),
    resolved: disputes.filter(d => ['resolved', 'denied'].includes(d.status)),
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/capital/credit-health')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Issue Tracker</h1>
            <p className="text-sm text-muted-foreground">Track report errors and dispute progress</p>
          </div>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add New Issue
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{grouped.active.length}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{grouped.pending.length}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{grouped.resolved.length}</p>
          <p className="text-xs text-muted-foreground">Resolved</p>
        </Card>
      </div>

      {/* Issue list */}
      {disputes.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold text-lg mb-2">No Issues Tracked</h3>
          <p className="text-sm text-muted-foreground mb-4">Start by adding any errors or discrepancies from your credit reports</p>
          <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-2" />Add First Issue</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {disputes.map(d => {
            const acct = accounts.find(a => a.id === d.credit_account_id);
            const dueDate = d.submitted_date ? addDays(new Date(d.submitted_date), 30) : null;
            const daysLeft = dueDate ? differenceInDays(dueDate, new Date()) : null;
            const overdue = dueDate ? isPast(dueDate) : false;

            return (
              <Card key={d.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusChip status={mapDisputeStatus(d.status)} />
                        <Badge variant="outline" className="text-[10px]">{d.bureau}</Badge>
                        {acct && <span className="text-xs text-muted-foreground truncate">{acct.account_name}</span>}
                      </div>
                      <p className="text-sm font-medium">{d.dispute_reason}</p>
                      {d.explanation && <p className="text-xs text-muted-foreground line-clamp-2">{d.explanation}</p>}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {d.submitted_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Filed {format(new Date(d.submitted_date), 'MMM d, yyyy')}
                          </span>
                        )}
                        {daysLeft !== null && (
                          <span className={cn('font-medium', overdue ? 'text-destructive' : daysLeft <= 7 ? 'text-amber-600' : 'text-emerald-600')}>
                            {overdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d remaining`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {d.status === 'draft' && (
                        <Button size="sm" variant="outline" onClick={() => {
                          const today = format(new Date(), 'yyyy-MM-dd');
                          updateDispute({ id: d.id, status: 'submitted', submitted_date: today, response_due_date: format(addDays(new Date(), 30), 'yyyy-MM-dd') });
                        }}>Submit</Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteDispute(d.id)}>×</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Issue Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Issue</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bureau *</Label>
                <Select value={form.bureau} onValueChange={v => setForm(p => ({ ...p, bureau: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select bureau" /></SelectTrigger>
                  <SelectContent>
                    {['Equifax', 'Experian', 'TransUnion'].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Account</Label>
                <Select value={form.account_id} onValueChange={v => setForm(p => ({ ...p, account_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Issue Type *</Label>
              <Select value={form.issue_type} onValueChange={v => setForm(p => ({ ...p, issue_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {ISSUE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe the issue..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Date Filed</Label>
              <Input type="date" value={form.submitted_date} onChange={e => setForm(p => ({ ...p, submitted_date: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isCreating}>Save Issue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreditHealthIssues;
