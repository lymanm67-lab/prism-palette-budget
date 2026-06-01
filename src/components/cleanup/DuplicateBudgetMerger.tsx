import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { DuplicateBudgetGroup } from '@/hooks/use-cleanup-candidates';
import { Loader2 } from 'lucide-react';

interface Props { groups: DuplicateBudgetGroup[] }

export function DuplicateBudgetMerger({ groups }: Props) {
  if (!groups.length) return <p className="text-sm text-muted-foreground">No duplicate budget categories found.</p>;
  return (
    <div className="space-y-3">
      {groups.map((g, i) => <MergeCard key={g.groupId + g.normalizedName + i} group={g} />)}
    </div>
  );
}

function MergeCard({ group }: { group: DuplicateBudgetGroup }) {
  const defaultSurvivor = [...group.categories].sort((a, b) => b.txnCount - a.txnCount)[0]?.id;
  const [survivor, setSurvivor] = useState<string>(defaultSurvivor);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const losers = group.categories.filter(c => c.id !== survivor);
  const survivorCat = group.categories.find(c => c.id === survivor)!;

  const apply = async () => {
    setBusy(true);
    try {
      const loserIds = losers.map(c => c.id);
      // 1. reassign transactions
      await supabase.from('transactions').update({ category_id: survivor }).in('category_id', loserIds);
      // 2. reassign splits
      await supabase.from('transaction_splits').update({ category_id: survivor }).in('category_id', loserIds);
      // 3. merge budgets by month
      const monthTotals = new Map<string, number>();
      for (const c of group.categories) for (const b of c.budgets) {
        monthTotals.set(b.month, (monthTotals.get(b.month) || 0) + b.planned_amount);
      }
      // Delete all loser budget rows
      const loserBudgetIds = losers.flatMap(c => c.budgets.map(b => b.id));
      if (loserBudgetIds.length) {
        await supabase.from('budgets').delete().in('id', loserBudgetIds);
      }
      // Upsert survivor budgets per month
      const survivorBudgetByMonth = new Map(survivorCat.budgets.map(b => [b.month, b]));
      for (const [month, total] of monthTotals.entries()) {
        const existing = survivorBudgetByMonth.get(month);
        if (existing) {
          await supabase.from('budgets').update({ planned_amount: total }).eq('id', existing.id);
        } else {
          // Need household_id — get it from another budget on this category if any, else fetch
          const { data: cat } = await supabase.from('categories').select('household_id').eq('id', survivor).single();
          if (cat) {
            await supabase.from('budgets').insert({
              household_id: cat.household_id,
              category_id: survivor,
              month,
              planned_amount: total,
              rollover: false,
            });
          }
        }
      }
      // 4. verify and delete loser categories
      for (const id of loserIds) {
        const { count: txCount } = await supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('category_id', id);
        const { count: spCount } = await supabase.from('transaction_splits').select('id', { count: 'exact', head: true }).eq('category_id', id);
        if ((txCount || 0) === 0 && (spCount || 0) === 0) {
          await supabase.from('categories').delete().eq('id', id);
        }
      }
      toast({ title: 'Merged', description: `${losers.length} duplicate(s) merged into "${survivorCat.name}".` });
      qc.invalidateQueries({ queryKey: ['cleanup-candidates'] });
    } catch (e: any) {
      toast({ title: 'Merge failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Keep one:</p>
      <RadioGroup value={survivor} onValueChange={setSurvivor} className="space-y-2 mb-3">
        {group.categories.map(c => (
          <div key={c.id} className="flex items-center justify-between gap-3 rounded-md bg-muted/30 p-2">
            <div className="flex items-center gap-2">
              <RadioGroupItem value={c.id} id={c.id} />
              <Label htmlFor={c.id} className="cursor-pointer">{c.name}</Label>
            </div>
            <div className="text-xs text-muted-foreground">
              {c.txnCount} txns · ${c.totalPlanned.toFixed(0)} budgeted
            </div>
          </div>
        ))}
      </RadioGroup>
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={apply} disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Merge {losers.length} into "{survivorCat.name}"
        </Button>
      </div>
    </div>
  );
}
