import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useCurrency } from '@/hooks/use-currency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BUCKETS } from '@/lib/fiveBucket/engine';
import { fundingName } from '@/lib/fiveBucket/budgetFunding';
import { CARRYOVER_NAME, monthlyBalance } from '@/lib/fiveBucket/monthlyBalance';

interface Props { month: string; income: number; expenses: number; ready: boolean; categories: { id: string; name: string; group_id: string | null }[]; budgets: { category_id: string; planned_amount: number }[]; carryover: number; emergencyBalance: number }
const locks = new Set<string>();
export default function MonthlyBudgetBalance({ month, income, expenses, ready, categories, budgets, carryover, emergencyBalance }: Props) {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const { formatCurrency } = useCurrency();
  const [draft, setDraft] = useState(String(carryover));
  const [status, setStatus] = useState('');
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => setDraft(String(carryover)), [carryover, month]);
  const { data: prior, isSuccess } = useQuery({
    queryKey: ['budgets', 'prior-emergency', household?.id, month], enabled: !!household,
    queryFn: async () => {
      if (!household) return 0;
      const { data, error } = await supabase.from('budgets').select('planned_amount,categories(name)').eq('household_id', household.id).gte('month', '2026-10-01').lt('month', month);
      if (error) throw error;
      return (data || []).filter(r => r.categories?.name === fundingName('emergency')).reduce((sum,r) => sum + Number(r.planned_amount),0);
    },
  });
  const desired = monthlyBalance(income, expenses, emergencyBalance, prior || 0);
  const signature = JSON.stringify(BUCKETS.map(b => [b.key, desired[b.key]]));
  useEffect(() => {
    if (!ready || !household || !isSuccess || month < '2026-10-01') return;
    const scope = `${household.id}:${month}`;
    if (locks.has(scope)) return;
    const rows = BUCKETS.flatMap(b => {
      const category = categories.find(c => c.name === fundingName(b.key));
      if (!category) return [];
      const existing = budgets.find(r => r.category_id === category.id);
      if (existing && Math.round(Number(existing.planned_amount)*100) === Math.round(desired[b.key]*100)) return [];
      return [{ household_id: household.id, category_id: category.id, month, planned_amount: desired[b.key], rollover: true }];
    });
    if (!rows.length) { setStatus('Balanced automatically'); return; }
    locks.add(scope);
    setStatus('Balancing savings…');
    void (async () => {
      const { error } = await supabase.from('budgets').upsert(rows, { onConflict: 'household_id,category_id,month' });
      locks.delete(scope);
      if (mounted.current) setStatus(error ? `Could not balance: ${error.message}` : 'Balanced automatically');
      if (!error) await Promise.all([qc.invalidateQueries({ queryKey:['budgets'] }),qc.invalidateQueries({ queryKey:['budget-actual'] })]);
    })();
  }, [ready, household?.id, month, isSuccess, signature, categories, budgets, qc]);
  const saveCarryover = async () => {
    const category = categories.find(c => c.name === CARRYOVER_NAME);
    const amount = Number(draft);
    if (!household || !category || !Number.isFinite(amount) || amount < 0) return;
    const { error } = await supabase.from('budgets').upsert({ household_id:household.id, category_id:category.id,month,planned_amount:Math.round(amount*100)/100,rollover:false },{onConflict:'household_id,category_id,month'});
    if (error) setStatus(`Could not save surplus: ${error.message}`);
    else await qc.invalidateQueries({queryKey:['budgets']});
  };
  return <section aria-label="Monthly budget balancing" className="space-y-2 border-b border-border py-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Monthly balancing</h2><span className="text-xs text-muted-foreground" role="status">{status}</span></div>
    <div className="flex flex-wrap items-center gap-2"><Label htmlFor="monthly-carryover">Previous month’s surplus ($)</Label><Input id="monthly-carryover" className="w-32" type="number" min="0" step="0.01" value={draft} onChange={e=>setDraft(e.target.value)} /><Button size="sm" variant="outline" onClick={saveCarryover}>Save surplus</Button></div>
    <p className="text-sm text-muted-foreground">{formatCurrency(income)} available including {formatCurrency(carryover)} carryover − {formatCurrency(expenses)} expenses = {formatCurrency(desired.available)} for savings.</p>
    <p className="text-xs text-muted-foreground">Expenses first, then Deductibles & Emergency toward {formatCurrency(7000)}. Retirement and HSA remain funded through payroll.</p>
    {desired.shortfall > 0 && <p role="alert" className="text-sm text-destructive">Expenses need {formatCurrency(desired.shortfall)} more funding. Savings allocations are zero.</p>}
  </section>;
}