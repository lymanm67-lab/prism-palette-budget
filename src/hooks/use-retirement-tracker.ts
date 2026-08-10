import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import {
  BASELINE_DATE,
  SEED_FUND_RETURNS,
  buildTimeline,
  wealthSources,
  type FundReturnRow,
  type RetirementStatementRow,
} from '@/lib/retirement/investmentTracker';
import {
  CANONICAL_ACCOUNTS,
  accountClass,
  sumBalances,
  type InvestmentGoalRow,
  type PortfolioAccount,
  type PositionRow,
} from '@/lib/investment/portfolio';

export interface StatementInput {
  account_id: string;
  period_month: string;
  statement_date?: string | null;
  beginning_balance: number;
  employee_contributions: number;
  employer_contributions: number;
  other_contributions?: number;
  dividend_income?: number;
  interest_income?: number;
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

const LEGACY_TIAA_BASELINE = 12534.23;

/** Inserts any missing canonical account and upgrades legacy rows in place. */
async function reconcileRoster(householdId: string, rows: PortfolioAccount[]) {
  let changed = false;

  // The original seed stored TIAA as a single generic account. Convert it to
  // the TIAA IU Retirement Plan account instead of creating a duplicate.
  const legacy = rows.find((r) => r.name === 'TIAA' && (r.custodian ?? r.institution) === 'TIAA');
  if (legacy) {
    const target = CANONICAL_ACCOUNTS.find((c) => c.name === 'TIAA — IU Retirement Plan')!;
    const keepBalance = Math.abs(Number(legacy.current_balance) - LEGACY_TIAA_BASELINE) > 0.01;
    const patch: Record<string, unknown> = {
      name: target.name,
      custodian: 'TIAA',
      institution: 'TIAA',
      portfolio_class: 'retirement',
      plan_type: target.plan_type,
      account_kind: target.account_kind,
      sort_order: target.sort_order,
    };
    if (!keepBalance) {
      patch.current_balance = target.balance;
      patch.baseline_balance = target.balance;
    }
    await supabase.from('retirement_accounts').update(patch as never).eq('id', legacy.id);
    changed = true;
  }

  // Backfill classification metadata on existing rows.
  for (const r of rows) {
    if (r.name === 'TIAA') continue;
    const canonical = CANONICAL_ACCOUNTS.find((c) => c.name === r.name);
    if (!canonical) continue;
    if (r.custodian && r.portfolio_class && r.plan_type) continue;
    await supabase
      .from('retirement_accounts')
      .update({
        custodian: canonical.custodian,
        portfolio_class: canonical.portfolio_class,
        plan_type: canonical.plan_type,
      } as never)
      .eq('id', r.id);
    changed = true;
  }

  const existingNames = new Set(
    rows.map((r) => (r.name === 'TIAA' ? 'TIAA — IU Retirement Plan' : r.name)),
  );
  const missing = CANONICAL_ACCOUNTS.filter((c) => !existingNames.has(c.name));
  if (missing.length) {
    const inserts = missing.map((a) => ({
      household_id: householdId,
      name: a.name,
      institution: a.institution,
      custodian: a.custodian,
      portfolio_class: a.portfolio_class,
      plan_type: a.plan_type,
      account_kind: a.account_kind,
      fund_name: a.fund_name,
      ticker: a.ticker,
      current_balance: a.balance,
      baseline_balance: a.balance,
      baseline_date: BASELINE_DATE,
      sort_order: a.sort_order,
      default_asset_class: a.default_asset_class,
    }));
    const ins = await supabase.from('retirement_accounts').insert(inserts as never).select();
    if (!ins.error) {
      const baselineStatements = (ins.data ?? []).map((acc: { id: string; baseline_balance: number }) => ({
        household_id: householdId,
        account_id: acc.id,
        period_month: `${BASELINE_DATE.slice(0, 7)}-01`,
        statement_date: BASELINE_DATE,
        beginning_balance: acc.baseline_balance,
        ending_balance: acc.baseline_balance,
        notes: 'Baseline balance as of August 2026.',
      }));
      if (baselineStatements.length) {
        await supabase.from('retirement_statements').insert(baselineStatements as never);
      }
      changed = true;
    }
  }

  return changed;
}

export function useRetirementTracker() {
  const { household } = useHousehold();
  const householdId = household?.id;
  const qc = useQueryClient();

  const accountsQuery = useQuery({
    queryKey: ['retirement-accounts', householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const fetchAll = async () => {
        const { data, error } = await supabase
          .from('retirement_accounts')
          .select('*')
          .eq('household_id', householdId!)
          .is('deleted_at', null)
          .order('sort_order', { ascending: true });
        if (error) throw error;
        return (data ?? []) as unknown as PortfolioAccount[];
      };

      const rows = await fetchAll();
      const changed = await reconcileRoster(householdId!, rows);
      return changed ? await fetchAll() : rows;
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

  const positionsQuery = useQuery({
    queryKey: ['investment-positions', householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investment_positions')
        .select('*')
        .eq('household_id', householdId!)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PositionRow[];
    },
  });

  const goalsQuery = useQuery({
    queryKey: ['investment-goals', householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investment_goals')
        .select('*')
        .eq('household_id', householdId!)
        .is('deleted_at', null);
      if (error) throw error;
      return (data ?? []) as unknown as InvestmentGoalRow[];
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

  const invalidatePositions = () =>
    qc.invalidateQueries({ queryKey: ['investment-positions', householdId] });

  const savePosition = useMutation({
    mutationFn: async (input: Partial<PositionRow> & { account_id: string; name: string }) => {
      if (input.id) {
        const { id, ...patch } = input;
        const { error } = await supabase
          .from('investment_positions')
          .update(patch as never)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('investment_positions')
          .insert({ ...input, household_id: householdId! } as never);
        if (error) throw error;
      }
    },
    onSuccess: invalidatePositions,
  });

  const addPositions = useMutation({
    mutationFn: async (rows: Array<Partial<PositionRow> & { account_id: string; name: string }>) => {
      const { error } = await supabase
        .from('investment_positions')
        .insert(rows.map((r) => ({ ...r, household_id: householdId! })) as never);
      if (error) throw error;
    },
    onSuccess: invalidatePositions,
  });

  /** Soft delete — zero-balance history is preserved unless explicitly removed. */
  const deletePosition = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('investment_positions')
        .update({ deleted_at: new Date().toISOString() } as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidatePositions,
  });

  const saveGoal = useMutation({
    mutationFn: async (input: Partial<InvestmentGoalRow> & { scope: string }) => {
      const existing = (goalsQuery.data ?? []).find((g) => g.scope === input.scope);
      if (existing) {
        const { error } = await supabase
          .from('investment_goals')
          .update(input as never)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('investment_goals')
          .insert({ ...input, household_id: householdId! } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['investment-goals', householdId] }),
  });

  const allAccounts = (accountsQuery.data ?? []) as PortfolioAccount[];
  const statements = statementsQuery.data ?? [];
  const positions = positionsQuery.data ?? [];
  const goals = goalsQuery.data ?? [];
  const fundReturns = fundReturnsQuery.data ?? [];

  const retirementAccounts = useMemo(
    () => allAccounts.filter((a) => accountClass(a) === 'retirement'),
    [allAccounts],
  );
  const selfDirectedAccounts = useMemo(
    () => allAccounts.filter((a) => accountClass(a) === 'self_directed'),
    [allAccounts],
  );

  const retirementTotal = useMemo(() => sumBalances(retirementAccounts), [retirementAccounts]);
  const selfDirectedTotal = useMemo(() => sumBalances(selfDirectedAccounts), [selfDirectedAccounts]);
  const investmentTotal = retirementTotal + selfDirectedTotal;

  const retirementIds = useMemo(() => new Set(retirementAccounts.map((a) => a.id)), [retirementAccounts]);
  const retirementStatements = useMemo(
    () => statements.filter((s) => retirementIds.has(s.account_id)),
    [statements, retirementIds],
  );

  // Retirement-only timeline drives every retirement projection and milestone.
  const timeline = useMemo(() => buildTimeline(retirementStatements), [retirementStatements]);
  const allTimeline = useMemo(() => buildTimeline(statements), [statements]);

  const startingPrincipal = useMemo(
    () => retirementAccounts.reduce((s, a) => s + Number(a.baseline_balance), 0),
    [retirementAccounts],
  );
  const sources = useMemo(
    () => wealthSources(timeline, startingPrincipal, retirementTotal),
    [timeline, startingPrincipal, retirementTotal],
  );

  return {
    isLoading: accountsQuery.isLoading || statementsQuery.isLoading,
    accounts: allAccounts,
    retirementAccounts,
    selfDirectedAccounts,
    statements,
    retirementStatements,
    positions,
    goals,
    fundReturns,
    timeline,
    allTimeline,
    retirementTotal,
    selfDirectedTotal,
    investmentTotal,
    /** Retirement-only total; retirement projections must never include taxable money. */
    totalPortfolio: retirementTotal,
    startingPrincipal,
    sources,
    saveStatement: saveStatement.mutateAsync,
    isSaving: saveStatement.isPending,
    deleteStatement: deleteStatement.mutate,
    updateFundReturns: updateFundReturns.mutate,
    savePosition: savePosition.mutateAsync,
    addPositions: addPositions.mutateAsync,
    deletePosition: deletePosition.mutate,
    saveGoal: saveGoal.mutateAsync,
  };
}
