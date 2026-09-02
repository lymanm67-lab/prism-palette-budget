import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useHouseholdDebts } from '@/hooks/use-household-debts';
import { computeDebtActuals, observedPaymentMap, type ActualTxn } from '@/lib/budgeting/debtActuals';

const sb = supabase as any;

const monthsAgo = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

/** Debt-payment transactions from the last N months, household scoped. */
function useDebtPaymentTxns(lookbackMonths = 5) {
  const { household } = useHousehold();

  return useQuery({
    queryKey: ['debt_payment_txns', household?.id, lookbackMonths],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await sb
        .from('transactions')
        .select('id,date,merchant,notes,amount')
        .eq('household_id', household!.id)
        .is('deleted_at', null)
        .lt('amount', 0)
        .gte('date', monthsAgo(lookbackMonths))
        .order('date', { ascending: false })
        .limit(2000);
      if (error) throw error;
      return ((data || []) as any[]).map((t) => ({
        id: t.id,
        date: t.date,
        merchant: t.merchant,
        description: t.notes ?? undefined,
        amount: t.amount,
      })) as ActualTxn[];
    },
  });
}

/** Session 7: observed vs stored monthly debt payments. */
export function useDebtActuals(lookbackMonths = 4) {
  const { data: debts, isLoading: debtsLoading } = useHouseholdDebts();
  const { data: txns, isLoading: txnsLoading } = useDebtPaymentTxns(lookbackMonths + 1);

  const actuals = useMemo(
    () => computeDebtActuals((debts || []) as any[], txns || [], { lookbackMonths }),
    [debts, txns, lookbackMonths],
  );

  const paymentMap = useMemo(() => observedPaymentMap(actuals), [actuals]);

  return { actuals, paymentMap, debts: debts || [], isLoading: debtsLoading || txnsLoading };
}
