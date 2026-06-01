import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useCurrency } from '@/hooks/use-currency';
import { useAccounts } from '@/hooks/use-finance-data';
import {
  useDebtPlans, useCreateDebtPlan, useUpdateDebtPlan, useDeleteDebtPlan,
  useDebtItems, useCreateDebtItem, useUpdateDebtItem, useDeleteDebtItem,
} from '@/hooks/use-debt-plans';
import {
  Plus, Trash2, Pencil, CreditCard, TrendingDown, Snowflake, Flame,
  ArrowDownUp, CalendarDays, DollarSign, Loader2, Info, CheckCircle2,
  Save, FolderOpen, Sparkles, Bot, Volume2, VolumeX, Pause, Play,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { useTTS } from '@/hooks/use-tts';
import PageOverview from '@/components/PageOverview';
import DebtInsights from '@/components/DebtInsights';
import { RelatedToolsBar } from '@/components/planning/RelatedToolsBar';
import { DebtStatementScanner } from '@/components/DebtStatementScanner';
import { Target, FileUp } from 'lucide-react';

// ─── Types ───
interface Debt {
  id: string;
  name: string;
  balance: number;
  minimum_payment: number;
  interest_rate: number;
  account_id?: string;
  business_split_pct: number;
  business_name?: string;
  deferred_until?: string;
  forgiveness_eligible?: boolean;
  forgiveness_date?: string;
  forgiveness_note?: string;
}



type Strategy = 'snowball' | 'avalanche' | 'hybrid';

interface PayoffStep {
  month: number;
  debts: { name: string; payment: number; balance: number; paid_off: boolean }[];
  total_payment: number;
  total_balance: number;
}

// ─── Payoff calculator ───
function calculatePayoff(debts: Debt[], extraPayment: number, strategy: Strategy): PayoffStep[] {
  if (debts.length === 0) return [];
  let sorted = [...debts];
  if (strategy === 'snowball') {
    sorted.sort((a, b) => a.balance - b.balance);
  } else if (strategy === 'avalanche') {
    sorted.sort((a, b) => b.interest_rate - a.interest_rate);
  } else {
    const maxBal = Math.max(...sorted.map(d => d.balance));
    sorted.sort((a, b) => {
      const scoreA = a.interest_rate * 0.6 + ((maxBal - a.balance) / maxBal) * 100 * 0.4;
      const scoreB = b.interest_rate * 0.6 + ((maxBal - b.balance) / maxBal) * 100 * 0.4;
      return scoreB - scoreA;
    });
  }
  const balances = new Map(sorted.map(d => [d.id, d.balance]));
  const steps: PayoffStep[] = [];
  let month = 0;
  const MAX_MONTHS = 600;
  while (Array.from(balances.values()).some(b => b > 0.01) && month < MAX_MONTHS) {
    month++;
    let availableExtra = extraPayment;
    const monthDebts: PayoffStep['debts'] = [];
    for (const d of sorted) { const bal = balances.get(d.id)!; if (bal <= 0) continue; balances.set(d.id, bal * (1 + d.interest_rate / 100 / 12)); }
    for (const d of sorted) { const bal = balances.get(d.id)!; if (bal <= 0) continue; const payment = Math.min(d.minimum_payment, bal); balances.set(d.id, bal - payment); }
    for (const d of sorted) { if (availableExtra <= 0) break; const bal = balances.get(d.id)!; if (bal <= 0) continue; const extra = Math.min(availableExtra, bal); balances.set(d.id, bal - extra); availableExtra -= extra; }
    for (const d of sorted) { const bal = Math.max(0, balances.get(d.id)!); monthDebts.push({ name: d.name, payment: d.minimum_payment, balance: bal, paid_off: bal < 0.01 }); }
    steps.push({ month, debts: monthDebts, total_payment: sorted.reduce((s, d) => s + d.minimum_payment, 0) + extraPayment - availableExtra, total_balance: Array.from(balances.values()).reduce((s, b) => s + Math.max(0, b), 0) });
    if (steps[steps.length - 1].total_balance < 0.01) break;
  }
  return steps;
}

function calcTotalInterest(debts: Debt[], extraPayment: number, strategy: Strategy): number {
  const steps = calculatePayoff(debts, extraPayment, strategy);
  const totalPaid = steps.reduce((s, step) => s + step.total_payment, 0);
  return Math.max(0, totalPaid - debts.reduce((s, d) => s + d.balance, 0));
}

const STRATEGIES = [
  { value: 'snowball' as Strategy, label: 'Debt Snowball', icon: Snowflake, color: 'text-prism-sky', bg: 'from-prism-sky/20 to-prism-sky/5', description: 'Pay smallest balances first for quick psychological wins. Popularized by Dave Ramsey.' },
  { value: 'avalanche' as Strategy, label: 'Debt Avalanche', icon: Flame, color: 'text-prism-rose', bg: 'from-prism-rose/20 to-prism-rose/5', description: 'Pay highest interest rates first to minimize total interest paid. Mathematically optimal.' },
  { value: 'hybrid' as Strategy, label: 'Hybrid Strategy', icon: ArrowDownUp, color: 'text-prism-amber', bg: 'from-prism-amber/20 to-prism-amber/5', description: 'Balances both approaches: considers rate (60%) and balance size (40%) for prioritization.' },
];

// ─── Component ───
const DebtPayoff = () => {
  const { formatCurrency } = useCurrency();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();

  // DB hooks
  const { data: plans, isLoading: plansLoading } = useDebtPlans();
  const createPlan = useCreateDebtPlan();
  const updatePlan = useUpdateDebtPlan();
  const deletePlan = useDeleteDebtPlan();

  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const { data: dbItems, isLoading: itemsLoading } = useDebtItems(activePlanId);
  const createItem = useCreateDebtItem();
  const updateItem = useUpdateDebtItem();
  const deleteItem = useDeleteDebtItem();

  // Auto-select first plan
  useEffect(() => {
    if (plans && plans.length > 0 && !activePlanId) {
      setActivePlanId(plans[0].id);
    }
  }, [plans, activePlanId]);

  const activePlan = plans?.find(p => p.id === activePlanId);
  const strategy: Strategy = (activePlan?.strategy as Strategy) || 'avalanche';
  const extraPayment = activePlan?.extra_payment ?? 100;

  // Map DB items to local Debt shape
  const debts: Debt[] = useMemo(() =>
    (dbItems || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      balance: Number(item.balance),
      minimum_payment: Number(item.minimum_payment),
      interest_rate: Number(item.interest_rate),
      account_id: item.account_id || undefined,
      business_split_pct: Number(item.business_split_pct ?? 0),
      business_name: item.business_name || undefined,
      deferred_until: item.deferred_until || undefined,
      forgiveness_eligible: !!item.forgiveness_eligible,
      forgiveness_date: item.forgiveness_date || undefined,
      forgiveness_note: item.forgiveness_note || undefined,
    })),
    [dbItems]
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', balance: '', minimum_payment: '', interest_rate: '', account_id: '', business_split_pct: 0, business_name: '', deferred_until: '', forgiveness_eligible: false, forgiveness_date: '', forgiveness_note: '' });


  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [planName, setPlanName] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get('scan') === 'debt') {
      setScanOpen(true);
      searchParams.delete('scan');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);


  // Import from accounts
  const importableAccounts = useMemo(() => {
    if (!accounts) return [];
    const existingIds = new Set(debts.map(d => d.account_id));
    return accounts.filter(a => (a.account_type === 'credit' || a.account_type === 'loan') && !existingIds.has(a.id));
  }, [accounts, debts]);

  const importAccount = async (acc: any) => {
    if (!activePlanId) return;
    await createItem.mutateAsync({
      plan_id: activePlanId,
      name: acc.name,
      balance: Math.abs(acc.balance),
      minimum_payment: Math.round(Math.abs(acc.balance) * 0.02) || 25,
      interest_rate: acc.account_type === 'credit' ? 22.99 : 6.5,
      account_id: acc.id,
    });
    toast.success(`Imported ${acc.name}`);
  };

  const handleSaveDebt = async () => {
    if (!activePlanId) return;
    const pct = Math.max(0, Math.min(100, Number(form.business_split_pct) || 0));
    const payload = {
      name: form.name,
      balance: parseFloat(form.balance) || 0,
      minimum_payment: parseFloat(form.minimum_payment) || 0,
      interest_rate: parseFloat(form.interest_rate) || 0,
      account_id: form.account_id || null,
      business_split_pct: pct,
      business_name: pct > 0 ? (form.business_name.trim() || null) : null,
      deferred_until: form.deferred_until || null,
      forgiveness_eligible: !!form.forgiveness_eligible,
      forgiveness_date: form.forgiveness_eligible ? (form.forgiveness_date || null) : null,
      forgiveness_note: form.forgiveness_eligible ? (form.forgiveness_note.trim() || null) : null,
    };
    try {
      if (editId) {
        await updateItem.mutateAsync({ id: editId, plan_id: activePlanId, ...payload });
        toast.success('Debt updated');
      } else {
        await createItem.mutateAsync({ plan_id: activePlanId, ...payload });
        toast.success('Debt added');
      }
      setEditId(null);
      setForm({ name: '', balance: '', minimum_payment: '', interest_rate: '', account_id: '', business_split_pct: 0, business_name: '', deferred_until: '', forgiveness_eligible: false, forgiveness_date: '', forgiveness_note: '' });
      setDialogOpen(false);
    } catch (err: any) {
      console.error('Save debt error:', err);
      toast.error(err?.message || 'Failed to save debt');
    }
  };

  const openEdit = (d: Debt) => {
    setEditId(d.id);
    setForm({ name: d.name, balance: String(d.balance), minimum_payment: String(d.minimum_payment), interest_rate: String(d.interest_rate), account_id: d.account_id || '', business_split_pct: d.business_split_pct || 0, business_name: d.business_name || '', deferred_until: d.deferred_until || '', forgiveness_eligible: !!d.forgiveness_eligible, forgiveness_date: d.forgiveness_date || '', forgiveness_note: d.forgiveness_note || '' });
    setDialogOpen(true);
  };



  const handleDeleteDebt = async (id: string) => {
    if (!activePlanId) return;
    await deleteItem.mutateAsync({ id, plan_id: activePlanId });
    toast.success('Debt removed');
  };

  const handleCreatePlan = async () => {
    const result = await createPlan.mutateAsync({ name: planName || 'My Debt Plan' });
    setActivePlanId(result.id);
    setPlanName('');
    setPlanDialogOpen(false);
    toast.success('Plan created');
  };

  const handleDeletePlan = async () => {
    if (!activePlanId) return;
    await deletePlan.mutateAsync(activePlanId);
    setActivePlanId(null);
    toast.success('Plan deleted');
  };

  const setStrategy = (s: Strategy) => {
    if (!activePlanId) return;
    updatePlan.mutate({ id: activePlanId, strategy: s });
  };

  const setExtraPayment = (val: number) => {
    if (!activePlanId) return;
    updatePlan.mutate({ id: activePlanId, extra_payment: val });
  };

  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const totalMinPayments = debts.reduce((s, d) => s + d.minimum_payment, 0);

  const results = useMemo(() => {
    if (debts.length === 0) return null;
    const strats: Strategy[] = ['snowball', 'avalanche', 'hybrid'];
    return Object.fromEntries(strats.map(s => {
      const steps = calculatePayoff(debts, extraPayment, s);
      const interest = calcTotalInterest(debts, extraPayment, s);
      return [s, { months: steps.length, interest, steps }];
    })) as Record<Strategy, { months: number; interest: number; steps: PayoffStep[] }>;
  }, [debts, extraPayment]);

  const activeResult = results?.[strategy];

  if (plansLoading || accountsLoading) return (
    <div className="flex items-center justify-center p-20">
      <div className="flex flex-col items-center gap-3">
        <div className="h-12 w-12 rounded-2xl prism-gradient prism-glow flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-white" />
        </div>
        <p className="text-sm text-muted-foreground">Loading debt plans…</p>
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            <span className="prism-gradient-text">Debt Payoff Planner</span>
          </h1>
          <p className="text-muted-foreground mt-1">Choose a strategy and crush your debt faster.</p>
          <PageOverview title="Debt Payoff Planner" description="Plan your debt-free journey with avalanche, snowball, or hybrid strategies." icon={TrendingDown} iconColor="text-prism-rose" ttsScript="The Debt Payoff Planner helps you create a strategy to eliminate debt. Add debts with balances, interest rates, and minimum payments. Choose Avalanche, Snowball, or Hybrid strategies. Set extra payments to accelerate payoff." features={['Avalanche, Snowball, and Hybrid strategies','Projected payoff timeline','AI debt advisor','Multiple debt plans']} demoData={[{label:'Credit Card',value:'$5,200 @ 22.99%',badge:'High',color:'#ef4444'},{label:'Student Loan',value:'$18,000 @ 5.5%',badge:'Medium',color:'#f59e0b'}]} />
        </div>
        <div className="flex gap-2">
          {/* Plan selector */}
          {plans && plans.length > 1 && (
            <div className="flex items-center gap-1">
              {plans.map(p => (
                <Button
                  key={p.id}
                  variant={activePlanId === p.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActivePlanId(p.id)}
                  className={activePlanId === p.id ? 'prism-gradient text-white border-0' : ''}
                >
                  <FolderOpen className="h-3.5 w-3.5 mr-1" />
                  {p.name}
                </Button>
              ))}
            </div>
          )}

          <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <Plus className="h-3.5 w-3.5" /> New Plan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Create Debt Plan</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Plan Name</Label>
                  <Input value={planName} onChange={e => setPlanName(e.target.value)} placeholder="e.g. 2026 Debt Freedom" />
                </div>
                <Button onClick={handleCreatePlan} disabled={createPlan.isPending} className="w-full prism-gradient text-white border-0 hover:opacity-90">
                  {createPlan.isPending ? 'Creating…' : 'Create Plan'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <RelatedToolsBar
        tools={[
          { to: '/planning/investments', icon: Sparkles, label: 'Debt → Wealth tool', description: 'Project what your debt payments become when redirected to investments' },
          { to: '/goals', icon: Target, label: 'Goals', description: 'Set savings goals alongside payoff targets' },
        ]}
      />


      {/* No plan state */}
      {(!plans || plans.length === 0) ? (
        <Card className="prism-card-shine border-border/50">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-prism-rose to-prism-orange flex items-center justify-center mb-4">
              <TrendingDown className="h-8 w-8 text-white" />
            </div>
            <h3 className="font-display text-lg font-bold mb-1">No debt plans yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-4">Create a plan to start tracking your debt payoff journey.</p>
            <Button className="prism-gradient text-white border-0 hover:opacity-90 gap-2" onClick={() => setPlanDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Create Your First Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Active plan header */}
          {activePlan && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 text-sm">
                <Save className="h-4 w-4 text-prism-teal" />
                <span className="font-medium">{activePlan.name}</span>
                <span className="text-muted-foreground">• Auto-saved</span>
              </div>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive h-8" onClick={handleDeletePlan}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Plan
              </Button>
            </div>
          )}

          {/* Add debt button + import */}
          <div className="flex flex-wrap gap-3 items-center">
            <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) setEditId(null); }}>
              <DialogTrigger asChild>
                <Button className="gap-2 prism-gradient text-white border-0 hover:opacity-90">
                  <Plus className="h-4 w-4" /> Add Debt
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="font-display">{editId ? 'Edit Debt' : 'Add Debt'}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Debt Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Chase Visa" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Current Balance</Label><Input type="number" step="0.01" value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} placeholder="5000" /></div>
                    <div className="space-y-2"><Label>Interest Rate (%)</Label><Input type="number" step="0.01" value={form.interest_rate} onChange={e => setForm(f => ({ ...f, interest_rate: e.target.value }))} placeholder="22.99" /></div>
                  </div>
                  <div className="space-y-2"><Label>Minimum Monthly Payment</Label><Input type="number" step="0.01" value={form.minimum_payment} onChange={e => setForm(f => ({ ...f, minimum_payment: e.target.value }))} placeholder="150" /></div>

                  {/* Personal / Business / Split toggle */}
                  <div className="space-y-2">
                    <Label>Attribution</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { val: 0, label: '👤 Personal' },
                        { val: 50, label: '⚖️ Split' },
                        { val: 100, label: '💼 Business' },
                      ] as const).map(opt => {
                        const isSplit = opt.val === 50;
                        const active = isSplit
                          ? form.business_split_pct > 0 && form.business_split_pct < 100
                          : form.business_split_pct === opt.val;
                        return (
                          <Button
                            key={opt.label}
                            type="button"
                            variant={active ? 'default' : 'outline'}
                            className={active ? 'prism-gradient text-white border-0' : ''}
                            onClick={() => setForm(f => ({
                              ...f,
                              business_split_pct: isSplit ? (f.business_split_pct > 0 && f.business_split_pct < 100 ? f.business_split_pct : 50) : opt.val,
                            }))}
                          >
                            {opt.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {form.business_split_pct > 0 && form.business_split_pct < 100 && (
                    <div className="space-y-2">
                      <Label>Business share: {form.business_split_pct}% (Personal: {100 - form.business_split_pct}%)</Label>
                      <input
                        type="range"
                        min={1}
                        max={99}
                        value={form.business_split_pct}
                        onChange={e => setForm(f => ({ ...f, business_split_pct: Number(e.target.value) }))}
                        className="w-full accent-primary"
                      />
                    </div>
                  )}

                  {form.business_split_pct > 0 && (
                    <div className="space-y-2">
                      <Label>Business name</Label>
                      <Input
                        value={form.business_name}
                        onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))}
                        placeholder="e.g. Dove Love Travels"
                      />
                    </div>
                  )}

                  {/* Loan status: deferment & forgiveness */}
                  <div className="space-y-3 pt-2 border-t border-border/50">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Loan status (optional)</Label>
                    <div className="space-y-2">
                      <Label className="text-sm">Deferred until</Label>
                      <Input
                        type="date"
                        value={form.deferred_until}
                        onChange={e => setForm(f => ({ ...f, deferred_until: e.target.value }))}
                      />
                      <p className="text-[11px] text-muted-foreground">No payments required before this date — payoff calc skips minimums while deferred.</p>
                    </div>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.forgiveness_eligible}
                        onChange={e => setForm(f => ({ ...f, forgiveness_eligible: e.target.checked }))}
                        className="h-4 w-4 accent-primary"
                      />
                      Eligible for forgiveness (e.g. PSLF)
                    </label>
                    {form.forgiveness_eligible && (
                      <div className="space-y-2 pl-6">
                        <div className="space-y-2">
                          <Label className="text-sm">Expected forgiveness date</Label>
                          <Input
                            type="date"
                            value={form.forgiveness_date}
                            onChange={e => setForm(f => ({ ...f, forgiveness_date: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Note</Label>
                          <Input
                            value={form.forgiveness_note}
                            onChange={e => setForm(f => ({ ...f, forgiveness_note: e.target.value }))}
                            placeholder="e.g. PSLF — 10 yrs of govt service"
                          />
                        </div>
                      </div>
                    )}
                  </div>



                  <Button onClick={handleSaveDebt} disabled={!form.name || !form.balance || createItem.isPending || updateItem.isPending} className="w-full prism-gradient text-white border-0 hover:opacity-90">
                    {(createItem.isPending || updateItem.isPending) ? 'Saving…' : editId ? 'Update' : 'Add Debt'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline" className="gap-2" onClick={() => setScanOpen(true)}>
              <FileUp className="h-4 w-4" /> Scan Statement
            </Button>

            <DebtStatementScanner
              open={scanOpen}
              onOpenChange={setScanOpen}
              onResult={(d) => {
                setForm({
                  name: d.creditor,
                  balance: d.balance ? String(d.balance) : '',
                  minimum_payment: d.minimum_payment ? String(d.minimum_payment) : '',
                  interest_rate: d.apr ? String(d.apr) : '',
                  account_id: '',
                  business_split_pct: 0,
                  business_name: '',
                  deferred_until: '',
                  forgiveness_eligible: false,
                  forgiveness_date: '',
                  forgiveness_note: '',

                });
                setEditId(null);
                setDialogOpen(true);
              }}

            />

            {importableAccounts.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><CreditCard className="h-3.5 w-3.5" /> Import:</span>
                {importableAccounts.map(acc => (
                  <Button key={acc.id} variant="outline" size="sm" className="gap-1 h-8 text-xs" onClick={() => importAccount(acc)}>
                    <Plus className="h-3 w-3" /> {acc.name}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Loading items */}
          {itemsLoading && <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}

          {/* Debt list */}
          {!itemsLoading && debts.length === 0 && (
            <Card className="prism-card-shine border-border/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                No debts in this plan yet. Add debts or import from your accounts.
              </CardContent>
            </Card>
          )}

          {debts.length > 0 && (
            <>
              {/* Summary */}
              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="prism-card-shine border-border/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Debt</p>
                    <p className="font-display text-2xl font-bold mt-1">{formatCurrency(totalDebt)}</p>
                  </CardContent>
                </Card>
                <Card className="prism-card-shine border-border/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Min. Payments</p>
                    <p className="font-display text-2xl font-bold mt-1">{formatCurrency(totalMinPayments)}<span className="text-sm text-muted-foreground font-normal">/mo</span></p>
                  </CardContent>
                </Card>
                <Card className="prism-card-shine border-border/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Extra Payment</p>
                    <div className="flex items-center gap-2 mt-1">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <Input type="number" value={extraPayment} onChange={e => setExtraPayment(Math.max(0, parseInt(e.target.value) || 0))} className="h-9 font-display text-lg font-bold w-24" />
                      <span className="text-sm text-muted-foreground">/mo</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Debt cards */}
              <div className="grid gap-3 sm:grid-cols-2">
                {debts.map((d) => (
                  <Card key={d.id} className="prism-card-shine border-border/50 group hover-lift">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CreditCard className="h-4 w-4 text-prism-rose" />
                          <span className="font-medium text-sm">{d.name}</span>
                          {d.business_split_pct === 0 ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">👤 Personal</span>
                          ) : d.business_split_pct === 100 ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-prism-teal/20 text-prism-teal">💼 Business{d.business_name ? ` · ${d.business_name}` : ''}</span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-prism-amber/20 text-prism-amber">⚖️ {100 - d.business_split_pct}/{d.business_split_pct} Split{d.business_name ? ` · ${d.business_name}` : ''}</span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(d)} aria-label="Edit debt"><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteDebt(d.id)} aria-label="Delete debt"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>

                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <div><p className="font-display text-base font-bold text-foreground">{formatCurrency(d.balance)}</p><p>Balance</p></div>
                        <div><p className="font-display text-base font-bold text-foreground">{d.interest_rate}%</p><p>APR</p></div>
                        <div><p className="font-display text-base font-bold text-foreground">{formatCurrency(d.minimum_payment)}</p><p>Min. Payment</p></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Strategy selector */}
              <div>
                <h2 className="font-display text-xl font-bold mb-4">Choose Your Strategy</h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  {STRATEGIES.map((s) => {
                    const isActive = strategy === s.value;
                    const result = results?.[s.value];
                    return (
                      <motion.div key={s.value} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                        <Card className={`cursor-pointer transition-all duration-200 prism-card-shine ${isActive ? 'ring-2 ring-primary shadow-lg' : 'border-border/50 hover:border-primary/30'}`} onClick={() => setStrategy(s.value)}>
                          <CardContent className="p-5">
                            <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${s.bg} flex items-center justify-center mb-3`}><s.icon className={`h-5 w-5 ${s.color}`} /></div>
                            <h3 className="font-display font-bold text-sm">{s.label}</h3>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.description}</p>
                            {result && (
                              <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 gap-2 text-xs">
                                <div><p className="text-muted-foreground">Debt-free in</p><p className="font-display font-bold text-foreground">{Math.floor(result.months / 12)}y {result.months % 12}m</p></div>
                                <div><p className="text-muted-foreground">Interest paid</p><p className="font-display font-bold text-prism-rose">{formatCurrency(result.interest)}</p></div>
                              </div>
                            )}
                            {isActive && <div className="mt-2 flex items-center gap-1 text-xs text-primary font-medium"><CheckCircle2 className="h-3.5 w-3.5" /> Selected</div>}
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Timeline */}
              {activeResult && activeResult.steps.length > 0 && (
                <Card className="prism-card-shine border-border/50">
                  <CardHeader>
                    <CardTitle className="font-display flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-prism-teal" /> Payoff Timeline
                      <Tooltip><TooltipTrigger><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                        <TooltipContent className="max-w-xs"><p>Projected debt balance each month. Extra payments go toward the priority debt based on your chosen strategy.</p></TooltipContent>
                      </Tooltip>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(() => {
                        const milestones: { month: number; event: string; balance: number }[] = [];
                        const paidOff = new Set<string>();
                        for (const step of activeResult.steps) {
                          for (const d of step.debts) {
                            if (d.paid_off && !paidOff.has(d.name)) {
                              paidOff.add(d.name);
                              milestones.push({ month: step.month, event: `${d.name} paid off!`, balance: step.total_balance });
                            }
                          }
                        }
                        const lastStep = activeResult.steps[activeResult.steps.length - 1];
                        if (lastStep.total_balance < 0.01) milestones.push({ month: lastStep.month, event: '🎉 Debt Free!', balance: 0 });
                        return milestones.map((m, i) => (
                          <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="flex items-center gap-4 p-3 rounded-xl bg-muted/50">
                            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-prism-teal/20 text-prism-teal text-xs font-bold shrink-0">{m.month}</div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{m.event}</p>
                              <p className="text-xs text-muted-foreground">Month {m.month} • Remaining: {formatCurrency(m.balance)}</p>
                            </div>
                            <Progress value={totalDebt > 0 ? ((totalDebt - m.balance) / totalDebt) * 100 : 100} className="w-24 h-2" />
                          </motion.div>
                        ));
                      })()}
                    </div>

                    {results && (
                      <div className="mt-6 p-4 rounded-xl bg-muted/30 border border-border/50">
                        <h4 className="font-display font-bold text-sm mb-3">Strategy Comparison</h4>
                        <div className="grid grid-cols-3 gap-4 text-center text-xs">
                          {STRATEGIES.map(s => {
                            const r = results[s.value];
                            const isAct = strategy === s.value;
                            return (
                              <div key={s.value} className={`p-3 rounded-lg ${isAct ? 'bg-primary/10 ring-1 ring-primary/30' : ''}`}>
                                <s.icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
                                <p className="font-medium">{s.label}</p>
                                <p className="font-display font-bold text-lg">{r.months} mo</p>
                                <p className="text-muted-foreground">Interest: {formatCurrency(r.interest)}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Key Insights */}
              <DebtInsights
                debts={debts}
                extraPayment={extraPayment}
                strategy={strategy}
                payoffMonths={activeResult?.months}
                totalInterest={activeResult?.interest}
              />

              {/* AI Debt Advisor */}
              <AiDebtAdvisor debts={debts} extraPayment={extraPayment} />
            </>
          )}
        </>
      )}
    </motion.div>
  );
};

// ─── AI Debt Advisor Component ───
function AiDebtAdvisor({ debts, extraPayment }: { debts: Debt[]; extraPayment: number }) {
  const [aiResponse, setAiResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const { speak, pause, resume, stop, isSpeaking, isPaused } = useTTS();

  const getRecommendation = useCallback(async () => {
    if (debts.length === 0) return;
    setIsStreaming(true);
    setAiResponse('');
    setHasAnalyzed(true);

    try {
      // Get user's financial journey from profile
      const { data: { user } } = await supabase.auth.getUser();
      let financialJourney = '';
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('financial_journey')
          .eq('user_id', user.id)
          .single();
        financialJourney = profile?.financial_journey || '';
      }

      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/debt-advisor`;
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          debts: debts.map(d => ({
            name: d.name,
            balance: d.balance,
            interest_rate: d.interest_rate,
            minimum_payment: d.minimum_payment,
          })),
          extra_payment: extraPayment,
          financial_journey: financialJourney,
        }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) { toast.error('Rate limit exceeded. Please try again shortly.'); setIsStreaming(false); return; }
        if (resp.status === 402) { toast.error('AI usage limit reached. Please add credits.'); setIsStreaming(false); return; }
        throw new Error('Failed to get AI recommendation');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setAiResponse(fullText);
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error('AI advisor error:', e);
      toast.error('Failed to get AI recommendation. Please try again.');
    } finally {
      setIsStreaming(false);
    }
  }, [debts, extraPayment]);

  return (
    <Card className="prism-card-shine border-border/50 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="font-display flex items-center gap-2 text-lg">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-prism-indigo to-prism-sky flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          AI Debt Advisor
          <span className="text-xs font-normal text-muted-foreground ml-auto">Powered by AI</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasAnalyzed ? (
          <div className="text-center py-6">
            <Bot className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
              Get personalized AI recommendations based on your actual debts, interest rates, and financial goals.
            </p>
            <Button
              onClick={getRecommendation}
              disabled={debts.length === 0}
              className="gap-2 prism-gradient text-white border-0 hover:opacity-90"
            >
              <Sparkles className="h-4 w-4" />
              Analyze My Debts
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {isStreaming && !aiResponse && (
              <div className="flex items-center gap-3 py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Analyzing your debt portfolio…</span>
              </div>
            )}
            {aiResponse && (
              <div className="prose prose-sm dark:prose-invert max-w-none [&>h2]:font-display [&>h2]:text-base [&>h2]:font-bold [&>h2]:mt-4 [&>h2]:mb-2 [&>ul]:space-y-1 [&>p]:text-sm [&>ul]:text-sm">
                <ReactMarkdown>{aiResponse}</ReactMarkdown>
              </div>
            )}
            {!isStreaming && aiResponse && (
              <div className="flex gap-2 pt-2 border-t border-border/50">
                <Button variant="outline" size="sm" onClick={getRecommendation} className="gap-1">
                  <Sparkles className="h-3.5 w-3.5" /> Re-analyze
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (isSpeaking && !isPaused) pause();
                    else if (isSpeaking && isPaused) resume();
                    else speak(aiResponse);
                  }}
                  className="gap-1"
                >
                  {isSpeaking ? (isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />) : <Volume2 className="h-3.5 w-3.5" />}
                  {isSpeaking ? (isPaused ? 'Resume' : 'Pause') : 'Listen'}
                </Button>
                {isSpeaking && (
                  <Button variant="outline" size="sm" onClick={stop} className="gap-1">
                    <VolumeX className="h-3.5 w-3.5" /> Stop
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DebtPayoff;
