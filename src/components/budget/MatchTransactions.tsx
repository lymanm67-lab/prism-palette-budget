import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useCurrency } from '@/hooks/use-currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props { monthStart: string; monthEnd: string; categories: { id: string; name: string }[] }

/** Lists this month's bank transactions with no budget category so each can be matched; matching updates spending and surplus automatically. */
export default function MatchTransactions({ monthStart, monthEnd, categories }: Props) {
  const { household } = useHousehold();
  const { format } = useCurrency();
  const qc = useQueryClient();
  const [rememberMerchant, setRememberMerchant] = useState(true);
  const key = ['unmatched-transactions', household?.id, monthStart];
  const { data: rows = [] } = useQuery({
    queryKey: key,
    enabled: !!household?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from('transactions')
        .select('id, date, merchant, amount')
        .eq('household_id', household!.id).is('category_id', null).is('deleted_at', null)
        .eq('is_transfer', false).gte('date', monthStart).lte('date', monthEnd)
        .order('date', { ascending: false }).limit(1000);
      if (error) throw error;
      return data || [];
    },
  });
  const sorted = useMemo(() => [...categories].sort((a, b) => a.name.localeCompare(b.name)), [categories]);

  const assign = async (tx: { id: string; merchant: string | null }, categoryId: string) => {
    let q = supabase.from('transactions').update({ category_id: categoryId }).eq('household_id', household!.id)
      .is('category_id', null).is('deleted_at', null).gte('date', monthStart).lte('date', monthEnd);
    q = rememberMerchant && tx.merchant ? q.eq('merchant', tx.merchant) : q.eq('id', tx.id);
    const { error } = await q;
    if (error) { toast.error('Could not match transaction'); return; }
    toast.success('Matched — budget spending and surplus updated');
    await Promise.all(['unmatched-transactions', 'transactions', 'budgets', 'budget-actual'].map(k => qc.invalidateQueries({ queryKey: [k] })));
  };

  if (!rows.length) return null;
  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-4 w-4 text-primary" /> Match bank transactions
          <Badge variant="secondary">{rows.length} unmatched</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">Pick a budget category for each. Spending, over-budget alerts and this month's surplus update right away. Transfers are skipped.</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={rememberMerchant} onChange={e => setRememberMerchant(e.target.checked)} />
          Apply to all of this month's unmatched charges from the same vendor
        </label>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map(tx => (
          <div key={tx.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2">
            <span className="w-20 text-xs text-muted-foreground">{tx.date}</span>
            <span className="min-w-0 flex-1 truncate text-sm">{tx.merchant || 'Unknown'}</span>
            <span className={`w-24 text-right text-sm font-medium ${Number(tx.amount) < 0 ? 'text-destructive' : 'text-primary'}`}>{format(Number(tx.amount))}</span>
            <Select onValueChange={v => assign(tx, v)}>
              <SelectTrigger className="h-8 w-52"><SelectValue placeholder="Choose category" /></SelectTrigger>
              <SelectContent>{sorted.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
