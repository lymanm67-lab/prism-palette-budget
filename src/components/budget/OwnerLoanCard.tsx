import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useCurrency } from '@/hooks/use-currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Landmark } from 'lucide-react';
import { excludesTakeHomeAllocation } from '@/lib/budgeting/takeHomeAllocation';
import { ownerLoanLedger, type OwnerLoanMonth } from '@/lib/budgeting/ownerLoan';

export default function OwnerLoanCard({ throughMonth }: { throughMonth: string }) {
  const { household } = useHousehold();
  const { formatCurrency } = useCurrency();
  const { data: rows } = useQuery({
    queryKey: ['owner-loan', household?.id, throughMonth],
    enabled: !!household?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('month, planned_amount, categories(name, category_groups(budget_type, expense_type))')
        .eq('household_id', household!.id)
        .lte('month', `${throughMonth}-01`)
        .range(0, 9999);
      if (error) throw error;
      const byMonth = new Map<string, OwnerLoanMonth>();
      for (const b of (data || []) as any[]) {
        const g = b.categories?.category_groups;
        if ((g?.budget_type || 'personal') !== 'business') continue;
        const t = g?.expense_type;
        if (t === 'payroll_deduction') continue;
        const m = String(b.month).slice(0, 7);
        const cur = byMonth.get(m) || { month: m, businessIncome: 0, businessExpense: 0 };
        const amt = Number(b.planned_amount) || 0;
        if (t === 'income') cur.businessIncome += amt;
        else if (!excludesTakeHomeAllocation(b.categories?.name || '', false)) cur.businessExpense += amt;
        byMonth.set(m, cur);
      }
      return ownerLoanLedger(Array.from(byMonth.values()));
    },
  });
  if (!rows || rows.length === 0) return null;
  const last = rows[rows.length - 1];
  const lent = rows.reduce((s, r) => s + r.lent, 0);
  const repaid = rows.reduce((s, r) => s + r.repaid, 0);
  return (
    <Card className="print:hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Landmark className="h-4 w-4 text-prism-sky" /> Owner loan to business
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <p className="text-2xl font-semibold tabular-nums">{formatCurrency(last.balance)}</p>
        <p className="text-muted-foreground">
          The business owes you this. Lent {formatCurrency(lent)} · repaid by consulting fees {formatCurrency(repaid)}
          {last.balance <= 0 ? ' · fully repaid ✓' : ''}
        </p>
      </CardContent>
    </Card>
  );
}
