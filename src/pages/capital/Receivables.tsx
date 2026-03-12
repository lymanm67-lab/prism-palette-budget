import { useState, useMemo, forwardRef } from 'react';
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
import { addDays } from 'date-fns';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/* ── Payment Predictor Component ── */
const PaymentPredictor = forwardRef<HTMLDivElement, { claims: MedicaidClaim[]; avgCycle: number | null }>(
  function PaymentPredictor({ claims, avgCycle }, ref) {
    const predictions = useMemo(() => {
      const paidClaims = claims.filter(c => c.status === 'paid' && c.submission_date && c.payment_date);

      // Compute per-status average days from historical data
      const statusDurations: Record<string, number[]> = {};
      paidClaims.forEach(c => {
        const days = differenceInDays(new Date(c.payment_date!), new Date(c.submission_date!));
        if (days > 0) {
          (statusDurations['all'] ??= []).push(days);
        }
      });

      const allDurations = statusDurations['all'] ?? [];
      const mean = allDurations.length > 0 ? allDurations.reduce((a, b) => a + b, 0) / allDurations.length : 45;
      const stdDev = allDurations.length > 1
        ? Math.sqrt(allDurations.reduce((s, d) => s + (d - mean) ** 2, 0) / (allDurations.length - 1))
        : mean * 0.3;

      // Predict for open claims
      const openClaims = claims.filter(c => ['submitted', 'pending', 'approved', 'appealed'].includes(c.status));

      return openClaims.map(claim => {
        const refDate = claim.submission_date || claim.service_date;
        const daysSoFar = differenceInDays(new Date(), new Date(refDate));

        // Status-based adjustment: closer statuses get shorter remaining time
        const statusMultiplier: Record<string, number> = { submitted: 1, pending: 0.65, approved: 0.25, appealed: 0.85 };
        const mult = statusMultiplier[claim.status] ?? 1;
        const expectedTotal = Math.round(mean * mult + (claim.status === 'appealed' ? mean * 0.3 : 0));
        const remainingDays = Math.max(0, expectedTotal - daysSoFar * (1 - mult));
        const estPaymentDate = addDays(new Date(), Math.round(remainingDays));

        // Delay probability: chance it exceeds average
        const zScore = (daysSoFar - mean) / (stdDev || 1);
        const delayProb = daysSoFar > mean * 0.5
          ? Math.min(95, Math.max(5, Math.round(50 + zScore * 25)))
          : Math.max(5, Math.round(15 + daysSoFar / mean * 20));

        // Confidence based on data volume
        const confidence = allDurations.length >= 10 ? 'high' : allDurations.length >= 3 ? 'medium' : 'low';

        return {
          claim,
          estPaymentDate,
          remainingDays: Math.round(remainingDays),
          delayProb,
          daysSoFar,
          confidence,
        };
      }).sort((a, b) => a.remainingDays - b.remainingDays);
    }, [claims, avgCycle]);

    if (predictions.length === 0) {
      return (
        <Card ref={ref} className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Payment Predictor</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground text-center py-6">No open claims to predict. Add claims to see estimated payment dates.</p>
        </Card>
      );
    }

    const highRisk = predictions.filter(p => p.delayProb >= 60);

    return (
      <Card ref={ref}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Payment Predictor</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {predictions[0]?.confidence === 'low' ? 'Limited Data' : predictions[0]?.confidence === 'medium' ? 'Moderate Data' : 'Strong Data'}
              </Badge>
            </div>
            {highRisk.length > 0 && (
            <Badge variant="destructive" className="text-xs gap-1">
              <AlertTriangle className="h-3 w-3" />
              {highRisk.length} at risk of delay
            </Badge>
          )}
        </div>
        <CardDescription>Estimated payment dates based on historical reimbursement patterns</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {predictions.map(p => {
            const isOverdue = p.delayProb >= 60;
            const isWarning = p.delayProb >= 40 && p.delayProb < 60;
            return (
              <div
                key={p.claim.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  isOverdue ? 'border-destructive/30 bg-destructive/5' : isWarning ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-border bg-muted/30'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{p.claim.client_name}</span>
                    <span className="text-xs text-muted-foreground">{p.claim.claim_number || ''}</span>
                    <Badge variant={statusConfig[p.claim.status]?.badgeVariant || 'outline'} className="text-[10px] capitalize h-5">
                      {p.claim.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">{fmt(p.claim.amount)}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{p.daysSoFar}d in pipeline</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1.5 justify-end">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-semibold">
                      {p.remainingDays === 0 ? 'Due now' : `~${p.remainingDays}d`}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Est. {format(p.estPaymentDate, 'MMM d, yyyy')}
                  </p>
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-full border-2 shrink-0 ${
                      isOverdue ? 'border-destructive text-destructive' : isWarning ? 'border-yellow-500 text-yellow-600' : 'border-accent text-accent'
                    }`}>
                      <span className="text-xs font-bold leading-none">{p.delayProb}%</span>
                      <span className="text-[8px] leading-none mt-0.5">delay</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Probability of payment delay beyond average cycle</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

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
