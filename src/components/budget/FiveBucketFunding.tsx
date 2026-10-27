import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/hooks/use-currency';
import { useHousehold } from '@/contexts/HouseholdContext';
import { supabase } from '@/integrations/supabase/client';
import { BASELINE, BUCKETS, STAGE_LABEL, type PlanInputs } from '@/lib/fiveBucket/engine';
import { budgetFunding, FUNDING_PREFIX, fundingName } from '@/lib/fiveBucket/budgetFunding';
import { Loader2, PiggyBank } from 'lucide-react';
import FiveBucketGrowth from './FiveBucketGrowth';

interface Props {
  amount: number; month: string;
  categories: { id: string; name: string; group_id: string | null }[];
  groupId?: string;
  budgets: { category_id: string; planned_amount: number }[];
}

export default function FiveBucketFunding({ amount, month, categories, groupId, budgets }: Props) {
  const { household } = useHousehold();
  const { formatCurrency } = useCurrency();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [inputs] = useState<PlanInputs>(() => {
    try { return { ...BASELINE, ...JSON.parse(localStorage.getItem('five-bucket-plan:v1') || '{}') }; }
    catch { return BASELINE; }
  });
  const funding = budgetFunding(inputs, amount, month);
  const existing = budgets.filter(b => categories.some(c => c.id === b.category_id && c.name.startsWith(FUNDING_PREFIX)))
    .reduce((sum, b) => sum + Number(b.planned_amount), 0);
  const valid = funding.total === funding.available && funding.allocation.shortfall === 0;
  const save = async () => {
    if (busy || !household || !valid || funding.available <= 0) return;
    setBusy(true);
    try {
      let savingsGroupId = groupId;
      if (!savingsGroupId) {
        const { data, error } = await supabase.from('category_groups').insert({
          household_id: household.id, name: 'Five-Bucket Funding', budget_type: 'personal', expense_type: 'non_monthly',
        }).select('id').single();
        if (error) throw error;
        savingsGroupId = data.id;
      }
      const rows = [];
      for (const bucket of BUCKETS) {
        const cents = funding.allocation[bucket.key];
        if (!cents) continue;
        const name = fundingName(bucket.key);
        let categoryId = categories.find(c => c.name === name && c.group_id === savingsGroupId)?.id;
        if (!categoryId) {
          const { data, error } = await supabase.from('categories').insert({
            household_id: household.id, group_id: savingsGroupId, name, money_purpose: 'build_wealth',
          }).select('id').single();
          if (error) throw error;
          categoryId = data.id;
        }
        const prior = budgets.find(b => b.category_id === categoryId);
        rows.push({ household_id: household.id, category_id: categoryId, month,
          planned_amount: Math.round((Number(prior?.planned_amount || 0) + cents / 100) * 100) / 100, rollover: true });
      }
      // One write: retries replace the same totals rather than appending a second allocation.
      const { error } = await supabase.from('budgets').upsert(rows, { onConflict: 'household_id,category_id,month' });
      if (error) throw error;
      await Promise.all([qc.invalidateQueries({ queryKey: ['budgets'] }), qc.invalidateQueries({ queryKey: ['categories'] }), qc.invalidateQueries({ queryKey: ['category_groups'] })]);
      toast.success('Unallocated money assigned to your Five-Bucket plan');
    } catch (error) { toast.error(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Could not save bucket funding'); }
    finally { setBusy(false); }
  };

  return <><section aria-label="Five-Bucket funding" className="space-y-3 border-b border-border py-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-semibold">Five-Bucket funding</h2>
      <Button asChild variant="outline" size="sm"><Link to={`/planning/savings-plans?tab=five-bucket&budgetMonth=${month}`}>View funded plan</Link></Button>
    </div>
    <p className="text-sm text-muted-foreground">{formatCurrency(existing)} assigned this month · {STAGE_LABEL[funding.stage]}</p>
    {amount > 0 && <>
      <div className="grid gap-2 sm:grid-cols-5">{BUCKETS.map(b => <div key={b.key}>
        <p className="text-xs text-muted-foreground">{b.label}</p>
        <p className="font-semibold tabular-nums">{formatCurrency(funding.allocation[b.key] / 100)}</p>
      </div>)}</div>
      {!valid && <p role="alert" className="text-sm text-destructive">Your saved splits exceed the available money. Adjust them in Five-Bucket before assigning.</p>}
      <Button onClick={save} disabled={busy || !valid} size="sm">
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PiggyBank className="mr-2 h-4 w-4" />}
        Assign {formatCurrency(funding.available / 100)} to Five-Bucket
      </Button>
    </>}
  </section>{household && <FiveBucketGrowth householdId={household.id} />}</>;
}