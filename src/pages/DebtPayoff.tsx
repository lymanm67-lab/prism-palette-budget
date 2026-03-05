import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCurrency } from '@/hooks/use-currency';
import { useAccounts } from '@/hooks/use-finance-data';
import {
  Plus, Trash2, Pencil, CreditCard, TrendingDown, Snowflake, Flame,
  ArrowDownUp, CalendarDays, DollarSign, Loader2, Info, CheckCircle2
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// ─── Types ───
interface Debt {
  id: string;
  name: string;
  balance: number;
  minimum_payment: number;
  interest_rate: number; // APR %
  account_id?: string;
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

  // Sort debts based on strategy
  let sorted = [...debts];
  if (strategy === 'snowball') {
    sorted.sort((a, b) => a.balance - b.balance); // smallest balance first
  } else if (strategy === 'avalanche') {
    sorted.sort((a, b) => b.interest_rate - a.interest_rate); // highest rate first
  } else {
    // hybrid: weight of rate * 0.6 + inverse-balance * 0.4
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
  const MAX_MONTHS = 600; // 50 years safety cap

  while (Array.from(balances.values()).some(b => b > 0.01) && month < MAX_MONTHS) {
    month++;
    let availableExtra = extraPayment;
    const monthDebts: PayoffStep['debts'] = [];

    // Apply interest first
    for (const d of sorted) {
      const bal = balances.get(d.id)!;
      if (bal <= 0) continue;
      const monthlyRate = d.interest_rate / 100 / 12;
      balances.set(d.id, bal * (1 + monthlyRate));
    }

    // Pay minimums
    for (const d of sorted) {
      const bal = balances.get(d.id)!;
      if (bal <= 0) continue;
      const payment = Math.min(d.minimum_payment, bal);
      balances.set(d.id, bal - payment);
    }

    // Apply extra payment to priority debt
    for (const d of sorted) {
      if (availableExtra <= 0) break;
      const bal = balances.get(d.id)!;
      if (bal <= 0) continue;
      const extra = Math.min(availableExtra, bal);
      balances.set(d.id, bal - extra);
      availableExtra -= extra;
    }

    // Build month snapshot
    for (const d of sorted) {
      const bal = Math.max(0, balances.get(d.id)!);
      const wasPaidOff = bal < 0.01;
      monthDebts.push({
        name: d.name,
        payment: d.minimum_payment, // simplified
        balance: bal,
        paid_off: wasPaidOff,
      });
    }

    steps.push({
      month,
      debts: monthDebts,
      total_payment: sorted.reduce((s, d) => s + d.minimum_payment, 0) + extraPayment - availableExtra,
      total_balance: Array.from(balances.values()).reduce((s, b) => s + Math.max(0, b), 0),
    });

    if (steps[steps.length - 1].total_balance < 0.01) break;
  }

  return steps;
}

function calcTotalInterest(debts: Debt[], extraPayment: number, strategy: Strategy): number {
  const steps = calculatePayoff(debts, extraPayment, strategy);
  const totalPaid = steps.reduce((s, step) => s + step.total_payment, 0);
  const totalOriginal = debts.reduce((s, d) => s + d.balance, 0);
  return Math.max(0, totalPaid - totalOriginal);
}

// ─── Component ───
const DebtPayoff = () => {
  const { formatCurrency } = useCurrency();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [strategy, setStrategy] = useState<Strategy>('avalanche');
  const [extraPayment, setExtraPayment] = useState(100);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', balance: '', minimum_payment: '', interest_rate: '', account_id: '' });

  // Auto-import credit/loan accounts as debts
  const importableAccounts = useMemo(() => {
    if (!accounts) return [];
    const existingIds = new Set(debts.map(d => d.account_id));
    return accounts.filter(a => (a.account_type === 'credit' || a.account_type === 'loan') && !existingIds.has(a.id));
  }, [accounts, debts]);

  const importAccount = (acc: any) => {
    setDebts(prev => [...prev, {
      id: crypto.randomUUID(),
      name: acc.name,
      balance: Math.abs(acc.balance),
      minimum_payment: Math.round(Math.abs(acc.balance) * 0.02) || 25,
      interest_rate: acc.account_type === 'credit' ? 22.99 : 6.5,
      account_id: acc.id,
    }]);
  };

  const handleSave = () => {
    const debt: Debt = {
      id: editId || crypto.randomUUID(),
      name: form.name,
      balance: parseFloat(form.balance) || 0,
      minimum_payment: parseFloat(form.minimum_payment) || 0,
      interest_rate: parseFloat(form.interest_rate) || 0,
      account_id: form.account_id || undefined,
    };
    if (editId) {
      setDebts(prev => prev.map(d => d.id === editId ? debt : d));
    } else {
      setDebts(prev => [...prev, debt]);
    }
    setEditId(null);
    setForm({ name: '', balance: '', minimum_payment: '', interest_rate: '', account_id: '' });
    setDialogOpen(false);
  };

  const openEdit = (d: Debt) => {
    setEditId(d.id);
    setForm({
      name: d.name,
      balance: String(d.balance),
      minimum_payment: String(d.minimum_payment),
      interest_rate: String(d.interest_rate),
      account_id: d.account_id || '',
    });
    setDialogOpen(true);
  };

  const deleteDbt = (id: string) => setDebts(prev => prev.filter(d => d.id !== id));

  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const totalMinPayments = debts.reduce((s, d) => s + d.minimum_payment, 0);

  // Payoff results for each strategy
  const results = useMemo(() => {
    if (debts.length === 0) return null;
    const strategies: Strategy[] = ['snowball', 'avalanche', 'hybrid'];
    return Object.fromEntries(strategies.map(s => {
      const steps = calculatePayoff(debts, extraPayment, s);
      const interest = calcTotalInterest(debts, extraPayment, s);
      return [s, { months: steps.length, interest, steps }];
    })) as Record<Strategy, { months: number; interest: number; steps: PayoffStep[] }>;
  }, [debts, extraPayment]);

  const activeResult = results?.[strategy];

  const STRATEGIES = [
    {
      value: 'snowball' as Strategy,
      label: 'Debt Snowball',
      icon: Snowflake,
      color: 'text-prism-sky',
      bg: 'from-prism-sky/20 to-prism-sky/5',
      description: 'Pay smallest balances first for quick psychological wins. Popularized by Dave Ramsey.',
    },
    {
      value: 'avalanche' as Strategy,
      label: 'Debt Avalanche',
      icon: Flame,
      color: 'text-prism-rose',
      bg: 'from-prism-rose/20 to-prism-rose/5',
      description: 'Pay highest interest rates first to minimize total interest paid. Mathematically optimal.',
    },
    {
      value: 'hybrid' as Strategy,
      label: 'Hybrid Strategy',
      icon: ArrowDownUp,
      color: 'text-prism-amber',
      bg: 'from-prism-amber/20 to-prism-amber/5',
      description: 'Balances both approaches: considers rate (60%) and balance size (40%) for prioritization.',
    },
  ];

  if (accountsLoading) return (
    <div className="flex items-center justify-center p-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
        </div>
        <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) setEditId(null); }}>
          <DialogTrigger asChild>
            <Button className="gap-2 prism-gradient text-white border-0 hover:opacity-90">
              <Plus className="h-4 w-4" /> Add Debt
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">{editId ? 'Edit Debt' : 'Add Debt'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Debt Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Chase Visa" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Current Balance</Label>
                  <Input type="number" step="0.01" value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} placeholder="5000" />
                </div>
                <div className="space-y-2">
                  <Label>Interest Rate (%)</Label>
                  <Input type="number" step="0.01" value={form.interest_rate} onChange={e => setForm(f => ({ ...f, interest_rate: e.target.value }))} placeholder="22.99" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Minimum Monthly Payment</Label>
                <Input type="number" step="0.01" value={form.minimum_payment} onChange={e => setForm(f => ({ ...f, minimum_payment: e.target.value }))} placeholder="150" />
              </div>
              <Button onClick={handleSave} disabled={!form.name || !form.balance} className="w-full prism-gradient text-white border-0 hover:opacity-90">
                {editId ? 'Update' : 'Add Debt'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Import from accounts */}
      {importableAccounts.length > 0 && (
        <Card className="prism-card-shine border-border/50">
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-prism-sky" />
              Import from your accounts
            </p>
            <div className="flex flex-wrap gap-2">
              {importableAccounts.map(acc => (
                <Button key={acc.id} variant="outline" size="sm" className="gap-2" onClick={() => importAccount(acc)}>
                  <Plus className="h-3 w-3" />
                  {acc.name} ({formatCurrency(Math.abs(acc.balance))})
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debt list */}
      {debts.length === 0 ? (
        <Card className="prism-card-shine border-border/50">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-prism-rose to-prism-orange flex items-center justify-center mb-4">
              <TrendingDown className="h-8 w-8 text-white" />
            </div>
            <h3 className="font-display text-lg font-bold mb-1">No debts added yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm">Add your debts to see how different payoff strategies can save you money and time.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary cards */}
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
                  <Input
                    type="number"
                    value={extraPayment}
                    onChange={e => setExtraPayment(Math.max(0, parseInt(e.target.value) || 0))}
                    className="h-9 font-display text-lg font-bold w-24"
                  />
                  <span className="text-sm text-muted-foreground">/mo</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Debt items */}
          <div className="grid gap-3 sm:grid-cols-2">
            {debts.map((d) => {
              const pctPaid = totalDebt > 0 ? ((totalDebt - d.balance) / totalDebt) * 100 : 0;
              return (
                <Card key={d.id} className="prism-card-shine border-border/50 group hover-lift">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-prism-rose" />
                        <span className="font-medium text-sm">{d.name}</span>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(d)} aria-label="Edit debt">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteDbt(d.id)} aria-label="Delete debt">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <div>
                        <p className="font-display text-base font-bold text-foreground">{formatCurrency(d.balance)}</p>
                        <p>Balance</p>
                      </div>
                      <div>
                        <p className="font-display text-base font-bold text-foreground">{d.interest_rate}%</p>
                        <p>APR</p>
                      </div>
                      <div>
                        <p className="font-display text-base font-bold text-foreground">{formatCurrency(d.minimum_payment)}</p>
                        <p>Min. Payment</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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
                    <Card
                      className={`cursor-pointer transition-all duration-200 prism-card-shine ${isActive ? 'ring-2 ring-primary shadow-lg' : 'border-border/50 hover:border-primary/30'}`}
                      onClick={() => setStrategy(s.value)}
                    >
                      <CardContent className="p-5">
                        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${s.bg} flex items-center justify-center mb-3`}>
                          <s.icon className={`h-5 w-5 ${s.color}`} />
                        </div>
                        <h3 className="font-display font-bold text-sm">{s.label}</h3>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.description}</p>
                        {result && (
                          <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="text-muted-foreground">Debt-free in</p>
                              <p className="font-display font-bold text-foreground">
                                {Math.floor(result.months / 12)}y {result.months % 12}m
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Interest paid</p>
                              <p className="font-display font-bold text-prism-rose">{formatCurrency(result.interest)}</p>
                            </div>
                          </div>
                        )}
                        {isActive && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-primary font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Selected
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Payoff timeline */}
          {activeResult && activeResult.steps.length > 0 && (
            <Card className="prism-card-shine border-border/50">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-prism-teal" />
                  Payoff Timeline
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>This shows your projected debt balance each month. Extra payments go toward the priority debt based on your chosen strategy.</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {/* Show milestones — every debt payoff + final */}
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
                    if (lastStep.total_balance < 0.01) {
                      milestones.push({ month: lastStep.month, event: '🎉 Debt Free!', balance: 0 });
                    }

                    return milestones.map((m, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center gap-4 p-3 rounded-xl bg-muted/50"
                      >
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-prism-teal/20 text-prism-teal text-xs font-bold shrink-0">
                          {m.month}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{m.event}</p>
                          <p className="text-xs text-muted-foreground">
                            Month {m.month} • Remaining: {formatCurrency(m.balance)}
                          </p>
                        </div>
                        <Progress
                          value={totalDebt > 0 ? ((totalDebt - m.balance) / totalDebt) * 100 : 100}
                          className="w-24 h-2"
                        />
                      </motion.div>
                    ));
                  })()}
                </div>

                {/* Comparison summary */}
                {results && (
                  <div className="mt-6 p-4 rounded-xl bg-muted/30 border border-border/50">
                    <h4 className="font-display font-bold text-sm mb-3">Strategy Comparison</h4>
                    <div className="grid grid-cols-3 gap-4 text-center text-xs">
                      {STRATEGIES.map(s => {
                        const r = results[s.value];
                        const isActive = strategy === s.value;
                        return (
                          <div key={s.value} className={`p-3 rounded-lg ${isActive ? 'bg-primary/10 ring-1 ring-primary/30' : ''}`}>
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
        </>
      )}
    </motion.div>
  );
};

export default DebtPayoff;
