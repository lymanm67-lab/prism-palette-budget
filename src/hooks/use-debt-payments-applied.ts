import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import {
  applyPaymentsToDebt, summarizeApplied, type DebtApplied, type PaymentTxn,
} from '@/lib/budgeting/debtPaymentsApplied';

const sb = supabase as any;

/**
 * Live debt balances: stored balance minus the principal portion of every
 * matched payment transaction dated after the debt's `balance_as_of`.
 */
export function useDebtPaymentsApplied(debts: any[]) {
  const { household } = useHousehold();

  const earliest = useMemo(() => {
    const dates = (debts || [])
      .map((d) => d.balance_as_of as string | null)
      .filter(Boolean) as string[];
    if (!dates.length) {
      const d = new Date();
      d.setMonth(d.getMonth() - 6);
      return d.toISOString().slice(0, 10);
    }
    return dates.sort()[0];
  }, [debts]);

  const txnQuery = useQuery({
    queryKey: ['debt_applied_txns', household?.id, earliest],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await sb
        .from('transactions')
        .select('id,date,merchant,notes,amount')
        .eq('household_id', household!.id)
        .is('deleted_at', null)
        .lt('amount', 0)
        .gt('date', earliest)
        .order('date', { ascending: false })
        .limit(3000);
      if (error) throw error;
      return ((data || []) as any[]).map((t) => ({
        id: t.id,
        date: t.date,
        merchant: t.merchant,
        description: t.notes ?? undefined,
        amount: Number(t.amount),
      })) as PaymentTxn[];
    },
  });

  const rows: DebtApplied[] = useMemo(
    () => (debts || []).map((d) => applyPaymentsToDebt(d, txnQuery.data || [])),
    [debts, txnQuery.data],
  );

  const liveBalances = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows) map[r.debtId] = r.liveBalance;
    return map;
  }, [rows]);

  return {
    rows,
    liveBalances,
    totals: useMemo(() => summarizeApplied(rows), [rows]),
    isLoading: txnQuery.isLoading,
  };
}

/** Rolls a debt's stored balance forward to the live balance. */
export function useApplyDebtPayments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { debtId: string; newBalance: number; asOf?: string }) => {
      const { data, error } = await sb
        .from('debt_items')
        .update({
          balance: Math.max(0, Math.round(input.newBalance * 100) / 100),
          balance_as_of: input.asOf || new Date().toISOString().slice(0, 10),
        })
        .eq('id', input.debtId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debt_items'] });
      qc.invalidateQueries({ queryKey: ['household_debt_items'] });
      qc.invalidateQueries({ queryKey: ['debt_applied_txns'] });
    },
  });
}
