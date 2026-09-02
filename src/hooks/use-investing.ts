import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';

const sb = supabase as any;
import { ROLES, ROLE_META, type InvestmentRole } from '@/lib/investing/roles';

const K = {
  settings: 'inv-settings',
  targets: 'inv-role-targets',
  positions: 'inv-role-positions',
  contributions: 'inv-contributions',
  securities: 'inv-securities',
  fundHoldings: 'inv-security-holdings',
  limits: 'inv-concentration-limits',
  decisions: 'inv-decisions',
  reviews: 'inv-reviews',
  watchlist: 'inv-watchlist-items',
  scenarios: 'inv-scenarios',
};

export interface InvSettings {
  id: string;
  household_id: string;
  drift_band_pct: number;
  conviction_catalyst_warn_pct: number;
  legacy_goal_amount: number;
  legacy_goal_age: number;
  default_dividend_instruction: string;
  emergency_floor_override: number | null;
}

export interface RoleTarget {
  id: string;
  household_id: string;
  role: string;
  target_pct: number;
  max_pct: number | null;
  benchmark_ticker: string | null;
  benchmark_label: string | null;
  expected_return_pct: number;
  volatility_pct: number;
  risk_bucket: string;
  sort_order: number;
}

export interface RolePosition {
  id: string;
  household_id: string;
  role: string;
  ticker: string;
  name: string | null;
  security_type: string;
  verified: boolean;
  account_type: string;
  account_label: string | null;
  shares: number;
  current_price: number | null;
  price_updated_at: string | null;
  cost_basis: number;
  avg_price: number | null;
  entry_date: string | null;
  entry_price: number | null;
  dividend_income_ytd: number;
  dividend_instruction: string;
  target_pct: number | null;
  max_pct: number | null;
  thesis: string | null;
  expected_opportunity: string | null;
  expected_holding_period: string | null;
  review_date: string | null;
  invalidation: string | null;
  catalyst: string | null;
  catalyst_category: string | null;
  catalyst_why: string | null;
  risk_level: string | null;
  exit_criteria: string | null;
  status: string;
  thesis_state: string;
  catalyst_state: string | null;
  notes: string | null;
  sort_order: number;
}

export interface InvContribution {
  id: string;
  role: string | null;
  account_type: string;
  amount: number;
  source: string;
  contributed_on: string;
  is_transfer: boolean;
  is_employer: boolean;
  notes: string | null;
}

export interface InvDecision {
  id: string;
  decided_on: string;
  action: string;
  role: string | null;
  ticker: string | null;
  amount: number | null;
  reason: string | null;
  expected_outcome: string | null;
  risk_considered: string | null;
  review_date: string | null;
  actual_outcome: string | null;
}

export interface WatchlistItem {
  id: string;
  ticker: string;
  name: string | null;
  security_type: string;
  verified: boolean;
  candidate_role: string;
  thesis: string | null;
  desired_entry_price: number | null;
  current_price: number | null;
  catalyst: string | null;
  research_notes: string | null;
  review_date: string | null;
  decision_status: string;
}

export interface InvScenario {
  id: string;
  name: string;
  allocations: Record<string, number>;
  results: Record<string, unknown> | null;
  notes: string | null;
}

export interface FundHoldingRow {
  id: string;
  ticker: string;
  holding_symbol: string | null;
  holding_name: string;
  weight_pct: number;
  sector: string | null;
}

/* ------------------------------- settings ------------------------------- */

export function useInvSettings() {
  const { household } = useHousehold();
  const householdId = household?.id;
  return useQuery({
    queryKey: [K.settings, householdId],
    enabled: !!householdId,
    queryFn: async (): Promise<InvSettings | null> => {
      const { data, error } = await sb
        .from('inv_settings')
        .select('*')
        .eq('household_id', householdId!)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as unknown as InvSettings;
      const { data: created, error: insErr } = await sb
        .from('inv_settings')
        .insert({ household_id: householdId! })
        .select('*')
        .single();
      if (insErr) throw insErr;
      return created as unknown as InvSettings;
    },
  });
}

export function useUpdateInvSettings() {
  const { household } = useHousehold();
  const householdId = household?.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<InvSettings>) => {
      const { error } = await sb
        .from('inv_settings')
        .update(patch)
        .eq('household_id', householdId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [K.settings] });
      toast.success('Strategy settings saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/* ------------------------------ role targets ---------------------------- */

export function useRoleTargets() {
  const { household } = useHousehold();
  const householdId = household?.id;
  return useQuery({
    queryKey: [K.targets, householdId],
    enabled: !!householdId,
    queryFn: async (): Promise<RoleTarget[]> => {
      const { data, error } = await sb
        .from('inv_role_targets')
        .select('*')
        .eq('household_id', householdId!)
        .order('sort_order');
      if (error) throw error;
      if ((data ?? []).length > 0) return data as unknown as RoleTarget[];

      // Seed the five roles with unset (0%) targets — the user sets them.
      const seed = ROLES.map((role, i) => ({
        household_id: householdId!,
        role,
        target_pct: 0,
        benchmark_ticker: ROLE_META[role].defaultBenchmark,
        benchmark_label: ROLE_META[role].defaultBenchmarkLabel,
        expected_return_pct: ROLE_META[role].defaultReturn,
        volatility_pct: ROLE_META[role].defaultVolatility,
        risk_bucket: ROLE_META[role].riskBucket,
        sort_order: i,
      }));
      const { data: created, error: insErr } = await sb
        .from('inv_role_targets')
        .insert(seed)
        .select('*');
      if (insErr) throw insErr;
      return (created ?? []) as unknown as RoleTarget[];
    },
  });
}

export function useUpdateRoleTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<RoleTarget> }) => {
      const { error } = await sb.from('inv_role_targets').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [K.targets] }),
    onError: (e: Error) => toast.error(e.message),
  });
}

/* ------------------------------- positions ------------------------------ */

export function useRolePositions() {
  const { household } = useHousehold();
  const householdId = household?.id;
  return useQuery({
    queryKey: [K.positions, householdId],
    enabled: !!householdId,
    queryFn: async (): Promise<RolePosition[]> => {
      const { data, error } = await sb
        .from('inv_role_positions')
        .select('*')
        .eq('household_id', householdId!)
        .is('deleted_at', null)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as unknown as RolePosition[];
    },
  });
}

export function useSavePosition() {
  const { household } = useHousehold();
  const householdId = household?.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<RolePosition> & { id?: string }) => {
      const { id, ...rest } = input;
      if (id) {
        const { error } = await sb.from('inv_role_positions').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await sb
          .from('inv_role_positions')
          .insert({ ...rest, household_id: householdId! });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [K.positions] });
      toast.success('Position saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeletePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb
        .from('inv_role_positions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [K.positions] });
      toast.success('Position removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/* ----------------------------- contributions ---------------------------- */

export function useInvContributions() {
  const { household } = useHousehold();
  const householdId = household?.id;
  return useQuery({
    queryKey: [K.contributions, householdId],
    enabled: !!householdId,
    queryFn: async (): Promise<InvContribution[]> => {
      const { data, error } = await sb
        .from('inv_contributions')
        .select('*')
        .eq('household_id', householdId!)
        .is('deleted_at', null)
        .order('contributed_on', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as InvContribution[];
    },
  });
}

export function useAddContribution() {
  const { household } = useHousehold();
  const householdId = household?.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<InvContribution>) => {
      const { error } = await sb
        .from('inv_contributions')
        .insert({ ...input, household_id: householdId! });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [K.contributions] });
      toast.success('Contribution recorded');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/* ---------------------------- fund holdings ----------------------------- */

export function useFundHoldings() {
  const { household } = useHousehold();
  const householdId = household?.id;
  return useQuery({
    queryKey: [K.fundHoldings, householdId],
    enabled: !!householdId,
    queryFn: async (): Promise<FundHoldingRow[]> => {
      const { data, error } = await sb
        .from('inv_security_holdings')
        .select('*')
        .eq('household_id', householdId!)
        .order('weight_pct', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FundHoldingRow[];
    },
  });
}

/* ------------------------------- decisions ------------------------------ */

export function useInvDecisions() {
  const { household } = useHousehold();
  const householdId = household?.id;
  return useQuery({
    queryKey: [K.decisions, householdId],
    enabled: !!householdId,
    queryFn: async (): Promise<InvDecision[]> => {
      const { data, error } = await sb
        .from('inv_decisions')
        .select('*')
        .eq('household_id', householdId!)
        .is('deleted_at', null)
        .order('decided_on', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as InvDecision[];
    },
  });
}

export function useSaveDecision() {
  const { household } = useHousehold();
  const householdId = household?.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<InvDecision> & { id?: string }) => {
      const { id, ...rest } = input;
      if (id) {
        const { error } = await sb.from('inv_decisions').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await sb
          .from('inv_decisions')
          .insert({ ...rest, household_id: householdId! });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [K.decisions] });
      toast.success('Decision journaled');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/* -------------------------------- reviews ------------------------------- */

export function useInvReviews() {
  const { household } = useHousehold();
  const householdId = household?.id;
  return useQuery({
    queryKey: [K.reviews, householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data, error } = await sb
        .from('inv_reviews')
        .select('*')
        .eq('household_id', householdId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveReview() {
  const { household } = useHousehold();
  const householdId = household?.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { review_type: string; period_label: string; answers: Record<string, unknown>; metrics: Record<string, unknown>; notes?: string }) => {
      const { error } = await sb
        .from('inv_reviews')
        .upsert({ ...input, household_id: householdId! }, { onConflict: 'household_id,review_type,period_label' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [K.reviews] });
      toast.success('Review saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/* ------------------------------- watchlist ------------------------------ */

export function useRoleWatchlist() {
  const { household } = useHousehold();
  const householdId = household?.id;
  return useQuery({
    queryKey: [K.watchlist, householdId],
    enabled: !!householdId,
    queryFn: async (): Promise<WatchlistItem[]> => {
      const { data, error } = await sb
        .from('inv_watchlist_items')
        .select('*')
        .eq('household_id', householdId!)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as WatchlistItem[];
    },
  });
}

export function useSaveWatchlistItem() {
  const { household } = useHousehold();
  const householdId = household?.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<WatchlistItem> & { id?: string }) => {
      const { id, ...rest } = input;
      if (id) {
        const { error } = await sb.from('inv_watchlist_items').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await sb
          .from('inv_watchlist_items')
          .insert({ ...rest, household_id: householdId! });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [K.watchlist] });
      toast.success('Watchlist updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteWatchlistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb
        .from('inv_watchlist_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [K.watchlist] }),
    onError: (e: Error) => toast.error(e.message),
  });
}

/* ------------------------------- scenarios ------------------------------ */

export function useInvScenarios() {
  const { household } = useHousehold();
  const householdId = household?.id;
  return useQuery({
    queryKey: [K.scenarios, householdId],
    enabled: !!householdId,
    queryFn: async (): Promise<InvScenario[]> => {
      const { data, error } = await sb
        .from('inv_scenarios')
        .select('*')
        .eq('household_id', householdId!)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as InvScenario[];
    },
  });
}

export function useSaveScenario() {
  const { household } = useHousehold();
  const householdId = household?.id;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; allocations: Record<string, number>; results?: Record<string, unknown>; notes?: string }) => {
      const { error } = await sb
        .from('inv_scenarios')
        .insert({ ...input, household_id: householdId! });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [K.scenarios] });
      toast.success('Scenario saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/* ------------------------------ market data ----------------------------- */

export interface QuoteResult {
  symbol: string;
  price: number | null;
  name: string | null;
  securityType: string;
  verified: boolean;
  sector: string | null;
  industry: string | null;
}

export function useMarketLookup() {
  const { household } = useHousehold();
  const householdId = household?.id;
  const qc = useQueryClient();

  const quote = useMutation({
    mutationFn: async (symbol: string): Promise<QuoteResult> => {
      const { data, error } = await sb.functions.invoke('market-data', {
        body: { action: 'quote', symbol },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      const result = data as QuoteResult;
      await sb.from('inv_securities').upsert(
        {
          household_id: householdId!,
          ticker: result.symbol,
          name: result.name,
          security_type: result.securityType,
          verified: result.verified,
          sector: result.sector,
          industry: result.industry,
          price: result.price,
          price_updated_at: new Date().toISOString(),
          source: 'alphavantage',
        },
        { onConflict: 'household_id,ticker' },
      );
      return result;
    },
    onError: (e: Error) => toast.error(`Lookup failed: ${e.message}. Enter the price and type manually.`),
  });

  const holdings = useMutation({
    mutationFn: async (symbol: string) => {
      const { data, error } = await sb.functions.invoke('market-data', {
        body: { action: 'holdings', symbol },
      });
      if (error) throw error;
      const payload = data as {
        error?: string;
        holdings?: { symbol: string | null; name: string; weightPct: number }[];
        sectors?: { sector: string; weightPct: number }[];
      };
      if (payload?.error) throw new Error(payload.error);
      const rows = (payload.holdings ?? []).map((h) => ({
        household_id: householdId!,
        ticker: symbol.toUpperCase(),
        holding_symbol: h.symbol,
        holding_name: h.name,
        weight_pct: h.weightPct,
      }));
      await sb
        .from('inv_security_holdings')
        .delete()
        .eq('household_id', householdId!)
        .eq('ticker', symbol.toUpperCase());
      if (rows.length > 0) {
        const { error: insErr } = await sb.from('inv_security_holdings').insert(rows);
        if (insErr) throw insErr;
      }
      return rows.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: [K.fundHoldings] });
      toast.success(count > 0 ? `Loaded ${count} underlying holdings` : 'No underlying holdings returned');
    },
    onError: (e: Error) => toast.error(`Holdings lookup failed: ${e.message}`),
  });

  return { quote, holdings };
}

export type { InvestmentRole };
