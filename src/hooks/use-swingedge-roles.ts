// SwingEdge — dual watchlist state: portfolio role + trading status per symbol.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import type { PortfolioRole, TradingStatus } from '@/lib/swingedge/roles';

export interface SymbolRole {
  id: string;
  symbol: string;
  portfolio_role: PortfolioRole;
  trading_status: TradingStatus;
  notes: string | null;
  status_changed_at: string;
}

export interface StatusHistoryRow {
  id: string;
  symbol: string;
  from_status: string | null;
  to_status: string;
  reason: string | null;
  created_at: string;
}

export function useSymbolRoles() {
  const { household } = useHousehold();
  const householdId = household?.id;
  const qc = useQueryClient();

  const rolesQuery = useQuery({
    queryKey: ['se-symbol-roles', householdId],
    enabled: !!householdId,
    queryFn: async (): Promise<SymbolRole[]> => {
      const { data, error } = await supabase
        .from('se_symbol_roles')
        .select('id, symbol, portfolio_role, trading_status, notes, status_changed_at')
        .eq('household_id', householdId!)
        .order('symbol');
      if (error) throw error;
      return (data ?? []) as SymbolRole[];
    },
  });

  const historyQuery = useQuery({
    queryKey: ['se-symbol-status-history', householdId],
    enabled: !!householdId,
    queryFn: async (): Promise<StatusHistoryRow[]> => {
      const { data, error } = await supabase
        .from('se_symbol_status_history')
        .select('id, symbol, from_status, to_status, reason, created_at')
        .eq('household_id', householdId!)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as StatusHistoryRow[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['se-symbol-roles'] });
    qc.invalidateQueries({ queryKey: ['se-symbol-status-history'] });
  };

  const roleFor = (symbol: string) =>
    (rolesQuery.data ?? []).find((r) => r.symbol === symbol.toUpperCase()) ?? null;

  const setRole = useMutation({
    mutationFn: async (input: { symbol: string; portfolio_role: PortfolioRole }) => {
      if (!householdId) throw new Error('No household');
      const symbol = input.symbol.toUpperCase();
      const { error } = await supabase.from('se_symbol_roles').upsert(
        {
          household_id: householdId,
          symbol,
          portfolio_role: input.portfolio_role,
          trading_status: roleFor(symbol)?.trading_status ?? 'SCAN_UNIVERSE',
        },
        { onConflict: 'household_id,symbol' },
      );
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const setStatus = useMutation({
    mutationFn: async (input: { symbol: string; trading_status: TradingStatus; reason?: string }) => {
      if (!householdId) throw new Error('No household');
      const symbol = input.symbol.toUpperCase();
      const existing = roleFor(symbol);
      if (existing && existing.trading_status === input.trading_status) return;

      const { error } = await supabase.from('se_symbol_roles').upsert(
        {
          household_id: householdId,
          symbol,
          portfolio_role: existing?.portfolio_role ?? 'UNASSIGNED',
          trading_status: input.trading_status,
          status_changed_at: new Date().toISOString(),
        },
        { onConflict: 'household_id,symbol' },
      );
      if (error) throw error;

      const { error: histError } = await supabase.from('se_symbol_status_history').insert({
        household_id: householdId,
        symbol,
        from_status: existing?.trading_status ?? null,
        to_status: input.trading_status,
        portfolio_role: existing?.portfolio_role ?? 'UNASSIGNED',
        reason: input.reason ?? null,
      });
      if (histError) throw histError;
    },
    onSuccess: invalidate,
  });

  return {
    roles: rolesQuery.data ?? [],
    history: historyQuery.data ?? [],
    historyFor: (symbol: string) =>
      (historyQuery.data ?? []).filter((h) => h.symbol === symbol.toUpperCase()),
    roleFor,
    isLoading: rolesQuery.isLoading,
    setRole: setRole.mutateAsync,
    setStatus: setStatus.mutateAsync,
    isWorking: setRole.isPending || setStatus.isPending,
  };
}
