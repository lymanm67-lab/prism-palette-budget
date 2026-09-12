import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';
import {
  computeMonthRollover,
  type CategoryRolloverInput,
  type RolloverRule,
} from '@/lib/budget/rollover';
import { buildMonthEndClose, type SweepRule } from '@/lib/budget/leftover';
import { runRolloverChecks } from '@/lib/budget/rolloverChecks';

export const monthStart = (d: Date | string) => {
  const date = typeof d === 'string' ? new Date(`${d}T00:00:00`) : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
};

const prevMonth = (month: string) => {
  const d = new Date(`${month}T00:00:00`);
  d.setMonth(d.getMonth() - 1);
  return monthStart(d);
};

const nextMonthStart = (month: string) => {
  const d = new Date(`${month}T00:00:00`);
  d.setMonth(d.getMonth() + 1);
  return monthStart(d);
};

export interface RolloverCategory {
  id: string;
  name: string;
  rollover_rule: RolloverRule;
  rollover_keep_amount: number;
  sweep_destination: string | null;
  money_purpose: string | null;
}

export function useMonthEndClose(month: string) {
  const { household } = useHousehold();
  const householdId = household?.id;
  const qc = useQueryClient();
  const monthKey = monthStart(month);

  const { data, isLoading } = useQuery({
    queryKey: ['month-end-close', householdId, monthKey],
    enabled: !!householdId,
    queryFn: async () => {
      const start = monthKey;
      const end = nextMonthStart(monthKey);

      const [cats, budgets, txns, priorBalances, rules, close, reserves, allocations] = await Promise.all([
        supabase
          .from('categories')
          .select('id, name, rollover_rule, rollover_keep_amount, sweep_destination, money_purpose')
          .eq('household_id', householdId!)
          .order('name'),
        supabase
          .from('budgets')
          .select('category_id, planned_amount')
          .eq('household_id', householdId!)
          .eq('month', monthKey),
        supabase
          .from('transactions')
          .select('category_id, amount, is_transfer, date')
          .eq('household_id', householdId!)
          .is('deleted_at', null)
          .gte('date', start)
          .lt('date', end),
        supabase
          .from('category_rollover_balances')
          .select('category_id, rolled_forward')
          .eq('household_id', householdId!)
          .eq('month', prevMonth(monthKey)),
        supabase
          .from('leftover_sweep_rules')
          .select('*')
          .eq('household_id', householdId!)
          .order('priority'),
        supabase
          .from('month_end_closes')
          .select('*')
          .eq('household_id', householdId!)
          .eq('month', monthKey)
          .maybeSingle(),
        supabase
          .from('reserve_funds')
          .select('name, primary_target, starting_balance, market_value, kind')
          .eq('household_id', householdId!),
        supabase
          .from('leftover_allocations')
          .select('*')
          .eq('household_id', householdId!)
          .order('month', { ascending: false })
          .limit(200),
      ]);

      return {
        categories: (cats.data ?? []) as unknown as RolloverCategory[],
        budgets: budgets.data ?? [],
        transactions: txns.data ?? [],
        priorBalances: priorBalances.data ?? [],
        rules: rules.data ?? [],
        close: close.data ?? null,
        reserves: reserves.data ?? [],
        allocations: allocations.data ?? [],
      };
    },
  });

  const computed = useMemo(() => {
    if (!data) return null;
    const plannedBy = new Map<string, number>();
    for (const b of data.budgets) plannedBy.set(b.category_id, Number(b.planned_amount) || 0);

    const actualBy = new Map<string, number>();
    let incomeReceived = 0;
    let transfersOut = 0;
    for (const t of data.transactions as any[]) {
      const amt = Number(t.amount) || 0;
      if (t.is_transfer) {
        if (amt < 0) transfersOut += Math.abs(amt);
        continue;
      }
      if (amt > 0) {
        incomeReceived += amt;
      } else if (t.category_id) {
        actualBy.set(t.category_id, (actualBy.get(t.category_id) ?? 0) + Math.abs(amt));
      }
    }

    const beginningBy = new Map<string, number>();
    for (const b of data.priorBalances as any[]) {
      beginningBy.set(b.category_id, Number(b.rolled_forward) || 0);
    }

    const inputs: CategoryRolloverInput[] = data.categories
      .filter((c) => (plannedBy.get(c.id) ?? 0) > 0 || (actualBy.get(c.id) ?? 0) > 0 || beginningBy.get(c.id))
      .map((c) => ({
        categoryId: c.id,
        name: c.name,
        rule: (c.rollover_rule as RolloverRule) || 'reset',
        keepAmount: Number(c.rollover_keep_amount) || 0,
        sweepDestination: c.sweep_destination,
        planned: plannedBy.get(c.id) ?? 0,
        actual: actualBy.get(c.id) ?? 0,
        beginningRollover: beginningBy.get(c.id) ?? 0,
      }));

    const rollover = computeMonthRollover(inputs);

    const buffer = (data.reserves as any[]).find(
      (r) => r.kind === 'emergency' || /emergency|buffer/i.test(r.name ?? ''),
    );
    const bufferTarget = Number(buffer?.primary_target) || 7000;
    const bufferBalance = Number(buffer?.market_value ?? buffer?.starting_balance) || 0;

    const sweepRules: SweepRule[] = (data.rules as any[]).map((r) => ({
      id: r.id,
      priority: r.priority,
      destination: r.destination,
      destinationLabel: r.destination_label,
      mode: r.mode,
      amount: Number(r.amount) || 0,
      capAmount: r.cap_amount != null ? Number(r.cap_amount) : null,
      isActive: r.is_active,
    }));

    const closeSummary = buildMonthEndClose(
      monthKey,
      {
        incomeReceived,
        actualSpending: rollover.totalActual,
        actualTransfers: transfersOut,
        rolledForward: rollover.totalRolledForward,
        categorySwept: rollover.totalSwept,
        bufferBalance,
        bufferTarget,
      },
      sweepRules,
    );

    const checks = runRolloverChecks({
      rollover,
      close: closeSummary,
      bufferBalance,
      bufferTarget,
      freedCashCategoryIds: [],
    });

    return { rollover, closeSummary, checks, sweepRules, bufferBalance, bufferTarget, incomeReceived, transfersOut };
  }, [data, monthKey]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['month-end-close'] });

  const updateCategory = useMutation({
    mutationFn: async (payload: {
      id: string;
      rollover_rule?: RolloverRule;
      rollover_keep_amount?: number;
      sweep_destination?: string | null;
    }) => {
      const { id, ...fields } = payload;
      const { error } = await supabase.from('categories').update(fields as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Rollover setting saved');
    },
    onError: (e: any) => toast.error(e.message ?? 'Could not save that setting'),
  });

  const saveRule = useMutation({
    mutationFn: async (rule: Partial<SweepRule> & { id?: string }) => {
      const row = {
        household_id: householdId!,
        priority: rule.priority ?? 1,
        destination: rule.destination!,
        mode: rule.mode ?? 'percent',
        amount: rule.amount ?? 0,
        cap_amount: rule.capAmount ?? null,
        is_active: rule.isActive ?? true,
      };
      if (rule.id) {
        const { error } = await supabase.from('leftover_sweep_rules').update(row).eq('id', rule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('leftover_sweep_rules').insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success('Sweep rule saved');
    },
    onError: (e: any) => toast.error(e.message ?? 'Could not save that rule'),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leftover_sweep_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Sweep rule removed');
    },
  });

  const closeMonth = useMutation({
    mutationFn: async () => {
      if (!computed || !householdId) throw new Error('Nothing to close yet');
      const { rollover, closeSummary } = computed;

      const balanceRows = rollover.rows.map((r) => ({
        household_id: householdId,
        category_id: r.categoryId,
        month: monthKey,
        beginning_rollover: r.beginningRollover,
        planned_amount: r.planned,
        actual_spent: r.actual,
        ending_balance: r.endingBalance,
        rolled_forward: r.rolledForward,
        swept_amount: r.sweptAmount,
        sweep_destination: r.sweepDestination,
        rollover_rule: r.rule,
      }));
      if (balanceRows.length) {
        const { error } = await supabase
          .from('category_rollover_balances')
          .upsert(balanceRows, { onConflict: 'household_id,category_id,month' });
        if (error) throw error;
      }

      const { error: closeErr } = await supabase.from('month_end_closes').upsert(
        {
          household_id: householdId,
          month: monthKey,
          scope: 'personal',
          income_received: closeSummary.incomeReceived,
          actual_spending: closeSummary.actualSpending,
          actual_transfers: closeSummary.actualTransfers,
          leftover_cash: closeSummary.leftoverCash,
          total_rolled_forward: closeSummary.totalRolledForward,
          total_swept: closeSummary.totalSwept,
          unassigned_cash: closeSummary.unassignedCash,
          status: 'closed',
          closed_at: new Date().toISOString(),
        },
        { onConflict: 'household_id,month,scope' },
      );
      if (closeErr) throw closeErr;

      await supabase
        .from('leftover_allocations')
        .delete()
        .eq('household_id', householdId)
        .eq('month', monthKey);

      if (closeSummary.allocations.length) {
        const { error } = await supabase.from('leftover_allocations').insert(
          closeSummary.allocations.map((a) => ({
            household_id: householdId,
            month: monthKey,
            scope: 'personal',
            destination: a.destination,
            destination_label: a.destinationLabel,
            amount: a.amount,
          })),
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success('Month closed. Leftover cash is now assigned.');
    },
    onError: (e: any) => toast.error(e.message ?? 'Could not close the month'),
  });

  return {
    month: monthKey,
    isLoading,
    categories: data?.categories ?? [],
    history: data?.allocations ?? [],
    closedRecord: data?.close ?? null,
    ...(computed ?? {}),
    rollover: computed?.rollover,
    closeSummary: computed?.closeSummary,
    checks: computed?.checks ?? [],
    sweepRules: computed?.sweepRules ?? [],
    updateCategory,
    saveRule,
    deleteRule,
    closeMonth,
  };
}
