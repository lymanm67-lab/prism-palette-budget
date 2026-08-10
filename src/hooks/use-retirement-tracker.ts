import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import {
  BASELINE_DATE,
  SEED_ACCOUNTS,
  SEED_FUND_RETURNS,
  buildTimeline,
  wealthSources,
  type FundReturnRow,
  type RetirementAccountRow,
  type RetirementStatementRow,
} from '@/lib/retirement/investmentTracker';

export interface StatementInput {
  account_id: string;
  period_month: string;
  statement_date?: string | null;
  beginning_balance: number;
  employee_contributions: number;
  employer_contributions: number;
  transfers_in: number;
  transfers_out: number;
  withdrawals: number;
  fees: number;
  ending_balance: number;
  reported_prr?: number | null;
  ytd_return?: number | null;
  one_year_return?: number | null;
  three_year_return?: number | null;
  five_year_return?: number | null;
  ten_year_return?: number | null;
  fund_name?: string | null;
  ticker?: string | null;
  statement_path?: string | null;
  notes?: string | null;
}

export function useRetirementTracker() {
  const { household } = useHousehold();
  const householdId = household?.id;
  const qc = useQueryClient();

  const accountsQuery = useQuery({
    queryKey: ['retirement-accounts', householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('retirement_accounts')
        .select('*')
        .eq('household_id', householdId!)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true });
      if (error) throw error;

      if (!data || data.length === 0) {
        const seeds = SEED_ACCOUNTS.map((a) => ({
          household_id: householdId!,
          name: a.name,
          institution: a.institution,
          account_kind: a.account_kind,
          fund_name: a.fund_name,
          ticker: a.ticker,
          current_balance: a.balance,
          baseline_balance: a.balance,
          baseline_date: BASELINE_DATE,
          sort_order: a.sort_order,
        }));
        const ins = await supabase.from('retirement_accounts').insert(seeds).select();
        if (ins.error) throw ins.error;

        const seededAccounts = (ins.data ?? []) as unknown as RetirementAccountRow[];
        // Seed the baseline month so charts and comparisons have an anchor point.
        const baselineStatements = seededAccounts.map((acc) => ({
          household_id: householdId!,
          account_id: acc.id,
          period_month: `${BASELINE_DATE.slice(0, 7)}-01`,
          statement_date: BASELINE_DATE,
          beginning_balance: acc.baseline_balance,
          ending_balance: acc.baseline_balance,
          employee_contributions: 0,
          employer_contributions: 0,
          transfers_in: 0,
          transfers_out: 0,
          withdrawals: 0,
          fees: 0,
          fund_name: acc.fund_name,
          ticker: acc.ticker,
          notes: 'Baseline balance as of August 7, 2026.',
        }));
        await supabase.from('retirement_statements').insert(baselineStatements);
        return seededAccounts;
      }
      return data as unknown as RetirementAccountRow[];
    },
  });

  const statementsQuery = useQuery({
    queryKey: ['retirement-statements', householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('retirement_statements')
        .select('*')
        .eq('household_id', householdId!)
        .is('deleted_at', null)
        .order('period_month', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as RetirementStatementRow[];
    },
  });

  const fundReturnsQuery = useQuery({
    queryKey: ['retirement-fund-returns', householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('retirement_fund_returns')
        .select('*')
        .eq('household_id', householdId!)
        .is('deleted_at', null)
        .order('label', { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) {
        const ins = await supabase
          .from('retirement_fund_returns')
          .insert(SEED_FUND_RETURNS.map((f) => ({ ...f, household_id: householdId! })))
          .select();
        if (ins.error) throw ins.error;
        return (ins.data ?? []) as unknown as FundReturnRow[];
      }
      return data as unknown as FundReturnRow[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['retirement-accounts', householdId] });
    qc.invalidateQueries({ queryKey: ['retirement-statements', householdId] });
  };

  /** Saves a month without ever overwriting other months; the current month is upserted. */
  const saveStatement = useMutation({
    mutationFn: async (input: StatementInput) => {
      const existing = (statementsQuery.data ?? []).find(
        (s) => s.account_id === input.account_id && String(s.period_month).slice(0, 7) === input.period_month.slice(0, 7),
      );

      const payload = { ...input, household_id: householdId! };
      if (existing) {
        const { error } = await supabase
          .from('retirement_statements')
          .update(payload as never)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('retirement_statements').insert(payload as never);
        if (error) throw error;
      }

      // Keep the account card in sync with its latest statement.
      const latestMonth = (statementsQuery.data ?? [])
        .filter((s) => s.account_id === input.account_id)
        .reduce((max, s) => (s.period_month > max ? s.period_month : max), '0000-00-00');
      if (input.period_month >= latestMonth) {
        await supabase
          .from('retirement_accounts')
          .update({ current_balance: input.ending_balance } as never)
          .eq('id', input.account_id);
      }
    },
    onSuccess: invalidate,
  });

  const deleteStatement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('retirement_statements')
        .update({ deleted_at: new Date().toISOString() } as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateFundReturns = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<FundReturnRow> }) => {
      const { error } = await supabase
        .from('retirement_fund_returns')
        .update(patch as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['retirement-fund-returns', householdId] }),
  });

  const accounts = accountsQuery.data ?? [];
  const statements = statementsQuery.data ?? [];
  const fundReturns = fundReturnsQuery.data ?? [];

  const timeline = useMemo(() => buildTimeline(statements), [statements]);
  const totalPortfolio = useMemo(
    () => accounts.reduce((s, a) => s + Number(a.current_balance), 0),
    [accounts],
  );
  const startingPrincipal = useMemo(
    () => accounts.reduce((s, a) => s + Number(a.baseline_balance), 0),
    [accounts],
  );
  const sources = useMemo(
    () => wealthSources(timeline, startingPrincipal, totalPortfolio),
    [timeline, startingPrincipal, totalPortfolio],
  );

  return {
    isLoading: accountsQuery.isLoading || statementsQuery.isLoading,
    accounts,
    statements,
    fundReturns,
    timeline,
    totalPortfolio,
    startingPrincipal,
    sources,
    saveStatement: saveStatement.mutateAsync,
    isSaving: saveStatement.isPending,
    deleteStatement: deleteStatement.mutate,
    updateFundReturns: updateFundReturns.mutate,
  };
}
