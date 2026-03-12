import { useState, useMemo } from 'react';
import { DollarSign, Plus, Clock, CheckCircle2, XCircle, Send, Trash2, Edit2, ChevronRight, BarChart3, TrendingUp, AlertTriangle, CalendarClock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import PageOverview from '@/components/PageOverview';
import { useMedicaidClaims, MedicaidClaim } from '@/hooks/use-medicaid-claims';
import { format, differenceInDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { toast } from 'sonner';

const STATUSES = ['submitted', 'pending', 'approved', 'paid', 'denied', 'appealed'] as const;

const statusConfig: Record<string, { color: string; icon: typeof Send; badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  submitted: { color: 'text-blue-500', icon: Send, badgeVariant: 'outline' },
  pending: { color: 'text-yellow-500', icon: Clock, badgeVariant: 'secondary' },
  approved: { color: 'text-accent', icon: CheckCircle2, badgeVariant: 'default' },
  paid: { color: 'text-accent', icon: CheckCircle2, badgeVariant: 'default' },
  denied: { color: 'text-destructive', icon: XCircle, badgeVariant: 'destructive' },
  appealed: { color: 'text-orange-500', icon: Clock, badgeVariant: 'secondary' },
};

const NEXT_STATUS: Record<string, string> = {
  submitted: 'pending',
  pending: 'approved',
  approved: 'paid',
  denied: 'appealed',
  appealed: 'pending',
};

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

type ClaimFormData = {
  client_name: string;
  claim_number: string;
  amount: string;
  service_date: string;
  submission_date: string;
  status: string;
  notes: string;
};

const emptyForm: ClaimFormData = {
  client_name: '',
  claim_number: '',
  amount: '',
  service_date: format(new Date(), 'yyyy-MM-dd'),
  submission_date: format(new Date(), 'yyyy-MM-dd'),
  status: 'submitted',
  notes: '',
};

const Receivables = () => {
  const { claims, isLoading, createClaim, updateClaim, deleteClaim } = useMedicaidClaims();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClaim, setEditingClaim] = useState<MedicaidClaim | null>(null);
  const [form, setForm] = useState<ClaimFormData>(emptyForm);

  // Pipeline stats
  const stats = useMemo(() => {
    const submitted = claims.filter(c => c.status === 'submitted');
    const pending = claims.filter(c => c.status === 'pending' || c.status === 'appealed');
    const approved = claims.filter(c => c.status === 'approved');
    const paid = claims.filter(c => c.status === 'paid');
    const denied = claims.filter(c => c.status === 'denied');
    const pipelineValue = [...submitted, ...pending, ...approved].reduce((s, c) => s + Number(c.amount), 0);
    const paidTotal = paid.reduce((s, c) => s + Number(c.payment_amount || c.amount), 0);

    // Average reimbursement cycle (submission to payment)
    const paidWithDates = paid.filter(c => c.submission_date && c.payment_date);
    const avgCycle = paidWithDates.length > 0
      ? Math.round(paidWithDates.reduce((s, c) => s + differenceInDays(new Date(c.payment_date!), new Date(c.submission_date!)), 0) / paidWithDates.length)
      : null;

    return { submitted, pending, approved, paid, denied, pipelineValue, paidTotal, avgCycle };
  }, [claims]);

  // Aging chart data
  const agingData = useMemo(() => {
    const openClaims = claims.filter(c => !['paid', 'denied'].includes(c.status));
    const buckets = [
      { label: '0-30 days', min: 0, max: 30, count: 0, amount: 0 },
      { label: '31-60 days', min: 31, max: 60, count: 0, amount: 0 },
      { label: '61-90 days', min: 61, max: 90, count: 0, amount: 0 },
      { label: '90+ days', min: 91, max: Infinity, count: 0, amount: 0 },
    ];
    const today = new Date();
    openClaims.forEach(c => {
      const refDate = c.submission_date || c.service_date;
      const age = differenceInDays(today, new Date(refDate));
      const bucket = buckets.find(b => age >= b.min && age <= b.max)!;
      bucket.count++;
      bucket.amount += Number(c.amount);
    });
    return buckets;
  }, [claims]);

  const agingColors = ['hsl(var(--accent))', 'hsl(48, 96%, 53%)', 'hsl(25, 95%, 53%)', 'hsl(var(--destructive))'];

  const openDialog = (claim?: MedicaidClaim) => {
    if (claim) {
      setEditingClaim(claim);
      setForm({
        client_name: claim.client_name,
        claim_number: claim.claim_number || '',
        amount: String(claim.amount),
        service_date: claim.service_date,
        submission_date: claim.submission_date || '',
        status: claim.status,
        notes: claim.notes || '',
      });
    } else {
      setEditingClaim(null);
      setForm(emptyForm);
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.client_name || !form.amount || !form.service_date) {
      toast.error('Client name, amount, and service date are required');
      return;
    }
    try {
      if (editingClaim) {
        await updateClaim.mutateAsync({
          id: editingClaim.id,
          client_name: form.client_name,
          claim_number: form.claim_number || null,
          amount: parseFloat(form.amount),
          service_date: form.service_date,
          submission_date: form.submission_date || null,
          status: form.status,
          notes: form.notes || null,
        });
        toast.success('Claim updated');
      } else {
        await createClaim.mutateAsync({
          client_name: form.client_name,
          claim_number: form.claim_number || null,
          amount: parseFloat(form.amount),
          service_date: form.service_date,
          submission_date: form.submission_date || null,
          status: form.status as string,
          notes: form.notes || null,
        });
        toast.success('Claim added');
      }
      setDialogOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const advanceStatus = async (claim: MedicaidClaim) => {
    const next = NEXT_STATUS[claim.status];
    if (!next) return;
    const updates: any = { id: claim.id, status: next };
    if (next === 'paid') {
      updates.payment_date = format(new Date(), 'yyyy-MM-dd');
      updates.payment_amount = claim.amount;
    }
    try {
      await updateClaim.mutateAsync(updates);
      toast.success(`Claim moved to ${next}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteClaim.mutateAsync(id);
      toast.success('Claim deleted');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <PageOverview
        title="Medicaid Receivable Pipeline"
        description="Track claims status and forecast reimbursement timing"
        icon={DollarSign}
        ttsScript="Track claims status and forecast reimbursement timing."
        features={['Claims tracking', 'Payment prediction', 'Reimbursement cycle analysis']}
      />

      {/* Pipeline Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Send className="h-4 w-4 text-blue-500" />
            <p className="text-xs text-muted-foreground">Submitted</p>
          </div>
          <p className="text-2xl font-bold">{stats.submitted.length}</p>
          <p className="text-xs text-muted-foreground">{fmt(stats.submitted.reduce((s, c) => s + Number(c.amount), 0))}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-yellow-500" />
            <p className="text-xs text-muted-foreground">Pending / Appealed</p>
          </div>
          <p className="text-2xl font-bold">{stats.pending.length}</p>
          <p className="text-xs text-muted-foreground">{fmt(stats.pending.reduce((s, c) => s + Number(c.amount), 0))}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-accent" />
            <p className="text-xs text-muted-foreground">Paid</p>
          </div>
          <p className="text-2xl font-bold">{fmt(stats.paidTotal)}</p>
          <p className="text-xs text-muted-foreground">{stats.paid.length} claims</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="h-4 w-4 text-destructive" />
            <p className="text-xs text-muted-foreground">Denied</p>
          </div>
          <p className="text-2xl font-bold">{stats.denied.length}</p>
          <p className="text-xs text-muted-foreground">{fmt(stats.denied.reduce((s, c) => s + Number(c.amount), 0))}</p>
        </Card>
      </div>

      {/* Pipeline Value + Avg Cycle */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6 text-center">
          <p className="text-xs text-muted-foreground mb-1">Total Receivable Pipeline</p>
          <p className="text-3xl font-bold text-accent">{fmt(stats.pipelineValue)}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Avg reimbursement cycle: {stats.avgCycle !== null ? `${stats.avgCycle} days` : '— days'}
          </p>
        </Card>

        {/* Aging Chart */}
        <Card className="p-4">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Claim Aging
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {agingData.some(d => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={agingData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <RechartsTooltip
                    formatter={(value: number, name: string, props: any) => [fmt(props.payload.amount), `${value} claims`]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {agingData.map((_, i) => (
                      <Cell key={i} fill={agingColors[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">No open claims to display</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Medicaid Payment Predictor */}
      <PaymentPredictor claims={claims} avgCycle={stats.avgCycle} />

      {/* Claims Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Claims</CardTitle>
            <CardDescription>{claims.length} total claims</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => openDialog()}>
                <Plus className="h-4 w-4 mr-2" />Add Claim
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingClaim ? 'Edit Claim' : 'Add New Claim'}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="grid gap-1.5">
                  <Label>Client Name *</Label>
                  <Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="Client name" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Claim #</Label>
                    <Input value={form.claim_number} onChange={e => setForm(f => ({ ...f, claim_number: e.target.value }))} placeholder="CLM-001" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Amount *</Label>
                    <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Service Date *</Label>
                    <Input type="date" value={form.service_date} onChange={e => setForm(f => ({ ...f, service_date: e.target.value }))} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Submission Date</Label>
                    <Input type="date" value={form.submission_date} onChange={e => setForm(f => ({ ...f, submission_date: e.target.value }))} />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => (
                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={handleSave} disabled={createClaim.isPending || updateClaim.isPending}>
                  {editingClaim ? 'Save Changes' : 'Add Claim'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {claims.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground">No claims yet. Add your first Medicaid claim to start tracking.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Claim #</TableHead>
                    <TableHead>Service Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map(claim => {
                    const cfg = statusConfig[claim.status] || statusConfig.submitted;
                    const Icon = cfg.icon;
                    const nextStatus = NEXT_STATUS[claim.status];
                    return (
                      <TableRow key={claim.id}>
                        <TableCell className="font-medium">{claim.client_name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{claim.claim_number || '—'}</TableCell>
                        <TableCell className="text-xs">{format(new Date(claim.service_date), 'MM/dd/yyyy')}</TableCell>
                        <TableCell>
                          <Badge variant={cfg.badgeVariant} className="text-xs capitalize gap-1">
                            <Icon className="h-3 w-3" />
                            {claim.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{fmt(claim.amount)}</TableCell>
                        <TableCell className="text-xs">
                          {claim.submission_date ? format(new Date(claim.submission_date), 'MM/dd/yyyy') : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {nextStatus && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" title={`Move to ${nextStatus}`} onClick={() => advanceStatus(claim)}>
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDialog(claim)}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(claim.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Receivables;
