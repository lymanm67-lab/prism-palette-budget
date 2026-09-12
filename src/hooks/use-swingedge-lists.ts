// SwingEdge Analyzer — watchlists, scored symbols, journal, paper trades and
// academy progress. All household-scoped; market data is still cache-first.

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { loadCandles, useTradingSettings } from '@/hooks/use-swingedge';
import { scoreSymbol, type SymbolScore } from '@/lib/swingedge/score';
import { performanceStats, rankMistakes, type ClosedTrade } from '@/lib/swingedge/performance';
import { LESSONS } from '@/lib/swingedge/lessons';

export interface Watchlist {
  id: string;
  name: string;
  description: string | null;
  is_universe: boolean;
}

export interface WatchlistItem {
  id: string;
  watchlist_id: string;
  symbol: string;
  notes: string | null;
}

/** Lists plus their symbols. */
export function useWatchlists() {
  const { household } = useHousehold();
  const householdId = household?.id;
  const qc = useQueryClient();

  const listsQuery = useQuery({
    queryKey: ['se-watchlists', householdId],
    enabled: !!householdId,
    queryFn: async (): Promise<Watchlist[]> => {
      const { data, error } = await supabase
        .from('se_watchlists')
        .select('id, name, description, is_universe')
        .eq('household_id', householdId!)
        .order('created_at');
      if (error) throw error;
      return data ?? [];
    },
  });

  const itemsQuery = useQuery({
    queryKey: ['se-watchlist-items', householdId],
    enabled: !!householdId,
    queryFn: async (): Promise<WatchlistItem[]> => {
      const { data, error } = await supabase
        .from('se_watchlist_items')
        .select('id, watchlist_id, symbol, notes')
        .eq('household_id', householdId!)
        .order('symbol');
      if (error) throw error;
      return data ?? [];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['se-watchlists'] });
    qc.invalidateQueries({ queryKey: ['se-watchlist-items'] });
  };

  const createList = useMutation({
    mutationFn: async (input: { name: string; description?: string; is_universe?: boolean }) => {
      if (!householdId) throw new Error('No household');
      const { error } = await supabase.from('se_watchlists').insert({
        household_id: householdId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        is_universe: input.is_universe ?? false,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteList = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('se_watchlists').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addSymbol = useMutation({
    mutationFn: async (input: { watchlistId: string; symbol: string; notes?: string }) => {
      if (!householdId) throw new Error('No household');
      const { error } = await supabase.from('se_watchlist_items').insert({
        household_id: householdId,
        watchlist_id: input.watchlistId,
        symbol: input.symbol.trim().toUpperCase(),
        notes: input.notes?.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const removeSymbol = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('se_watchlist_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const itemsFor = (listId: string) => (itemsQuery.data ?? []).filter((i) => i.watchlist_id === listId);

  return {
    lists: listsQuery.data ?? [],
    items: itemsQuery.data ?? [],
    itemsFor,
    isLoading: listsQuery.isLoading || itemsQuery.isLoading,
    createList: createList.mutateAsync,
    deleteList: deleteList.mutateAsync,
    addSymbol: addSymbol.mutateAsync,
    removeSymbol: removeSymbol.mutateAsync,
    isWorking:
      createList.isPending || deleteList.isPending || addSymbol.isPending || removeSymbol.isPending,
  };
}

export interface ScoredSymbol extends SymbolScore {
  changePercent: number | null;
  source: 'demo' | 'cache' | 'live';
  fetchedAt: string | null;
}

/**
 * Scores a list of symbols from cache-first candles. Symbols are processed in
 * small batches so a long list cannot burst through the per-minute quota.
 */
export function useScoredSymbols(symbols: string[], batchSize = 4) {
  const { settings } = useTradingSettings();
  const mode = settings.data_mode;
  const key = symbols.map((s) => s.toUpperCase()).sort().join(',');

  const query = useQuery({
    queryKey: ['se-scored-symbols', mode, key],
    enabled: symbols.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<{ rows: ScoredSymbol[]; notice: string | null }> => {
      const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
      const rows: ScoredSymbol[] = [];
      let notice: string | null = null;

      for (let i = 0; i < unique.length; i += batchSize) {
        const slice = unique.slice(i, i + batchSize);
        const results = await Promise.all(
          slice.map(async (symbol) => ({ symbol, result: await loadCandles(symbol, '1day', mode) })),
        );
        for (const { symbol, result } of results) {
          if (!notice && result.notice) notice = result.notice;
          const scored = scoreSymbol(symbol, result.candles);
          const closes = result.candles.map((c) => c.close);
          const prev = closes[closes.length - 2];
          const price = closes[closes.length - 1];
          rows.push({
            ...scored,
            changePercent:
              prev && price ? Math.round(((price - prev) / prev) * 10000) / 100 : null,
            source: result.source,
            fetchedAt: result.fetchedAt,
          });
        }
      }
      return { rows, notice };
    },
  });

  return {
    rows: query.data?.rows ?? [],
    notice: query.data?.notice ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
    mode,
    fetchedAt: query.data?.rows[0]?.fetchedAt ?? null,
  };
}

export interface PaperTrade {
  id: string;
  symbol: string;
  status: string;
  setup_type: string | null;
  entry_price: number;
  entry_date: string;
  stop_price: number;
  target_price: number;
  shares: number;
  initial_dollar_risk: number | null;
  exit_price: number | null;
  exit_date: string | null;
  exit_reason: string | null;
  realized_pl: number | null;
  rules_followed: boolean | null;
  notes: string | null;
}

export interface JournalEntry {
  id: string;
  paper_trade_id: string | null;
  symbol: string | null;
  entry_date: string;
  title: string | null;
  what_i_planned: string | null;
  what_happened: string | null;
  mistakes: string | null;
  lessons: string | null;
  rules_followed: boolean | null;
  rating: number | null;
}

const num = (v: unknown): number => Number(v ?? 0);

/** Paper trades, journal entries and the performance statistics over them. */
export function useTradeJournal() {
  const { household } = useHousehold();
  const householdId = household?.id;
  const qc = useQueryClient();

  const tradesQuery = useQuery({
    queryKey: ['se-paper-trades', householdId],
    enabled: !!householdId,
    queryFn: async (): Promise<PaperTrade[]> => {
      const { data, error } = await supabase
        .from('se_paper_trades')
        .select('*')
        .eq('household_id', householdId!)
        .order('entry_date', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((t) => ({
        id: t.id,
        symbol: t.symbol,
        status: t.status,
        setup_type: t.setup_type,
        entry_price: num(t.entry_price),
        entry_date: t.entry_date,
        stop_price: num(t.stop_price),
        target_price: num(t.target_price),
        shares: Number(t.shares),
        initial_dollar_risk: t.initial_dollar_risk === null ? null : num(t.initial_dollar_risk),
        exit_price: t.exit_price === null ? null : num(t.exit_price),
        exit_date: t.exit_date,
        exit_reason: t.exit_reason,
        realized_pl: t.realized_pl === null ? null : num(t.realized_pl),
        rules_followed: t.rules_followed,
        notes: t.notes,
      }));
    },
  });

  const entriesQuery = useQuery({
    queryKey: ['se-journal-entries', householdId],
    enabled: !!householdId,
    queryFn: async (): Promise<JournalEntry[]> => {
      const { data, error } = await supabase
        .from('se_journal_entries')
        .select('*')
        .eq('household_id', householdId!)
        .order('entry_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as JournalEntry[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['se-paper-trades'] });
    qc.invalidateQueries({ queryKey: ['se-journal-entries'] });
    qc.invalidateQueries({ queryKey: ['se-open-risk'] });
  };

  const saveEntry = useMutation({
    mutationFn: async (input: Partial<JournalEntry> & { id?: string }) => {
      if (!householdId) throw new Error('No household');
      const row = {
        household_id: householdId,
        paper_trade_id: input.paper_trade_id ?? null,
        symbol: input.symbol?.toUpperCase() ?? null,
        entry_date: input.entry_date ?? new Date().toISOString().slice(0, 10),
        title: input.title ?? null,
        what_i_planned: input.what_i_planned ?? null,
        what_happened: input.what_happened ?? null,
        mistakes: input.mistakes ?? null,
        lessons: input.lessons ?? null,
        rules_followed: input.rules_followed ?? null,
        rating: input.rating ?? null,
      };
      if (input.id) {
        const { error } = await supabase.from('se_journal_entries').update(row).eq('id', input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('se_journal_entries').insert(row);
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('se_journal_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const closedTrades: ClosedTrade[] = useMemo(
    () =>
      (tradesQuery.data ?? [])
        .filter((t) => t.status === 'CLOSED' && t.exit_price !== null && t.exit_date)
        .map((t) => ({
          symbol: t.symbol,
          entryPrice: t.entry_price,
          stopPrice: t.stop_price,
          targetPrice: t.target_price,
          shares: t.shares,
          exitPrice: t.exit_price as number,
          entryDate: t.entry_date,
          exitDate: t.exit_date as string,
          realizedPl:
            t.realized_pl !== null
              ? t.realized_pl
              : Math.round(((t.exit_price as number) - t.entry_price) * t.shares * 100) / 100,
          rulesFollowed: t.rules_followed,
          exitReason: t.exit_reason,
        })),
    [tradesQuery.data],
  );

  const stats = useMemo(() => performanceStats(closedTrades), [closedTrades]);
  const mistakes = useMemo(() => rankMistakes(entriesQuery.data ?? []), [entriesQuery.data]);

  const tradesMissingJournal = useMemo(() => {
    const journaled = new Set((entriesQuery.data ?? []).map((e) => e.paper_trade_id).filter(Boolean));
    return (tradesQuery.data ?? []).filter((t) => t.status === 'CLOSED' && !journaled.has(t.id));
  }, [tradesQuery.data, entriesQuery.data]);

  return {
    trades: tradesQuery.data ?? [],
    openTrades: (tradesQuery.data ?? []).filter((t) => t.status === 'OPEN'),
    closedTrades,
    entries: entriesQuery.data ?? [],
    stats,
    mistakes,
    tradesMissingJournal,
    isLoading: tradesQuery.isLoading || entriesQuery.isLoading,
    saveEntry: saveEntry.mutateAsync,
    deleteEntry: deleteEntry.mutateAsync,
    isSaving: saveEntry.isPending || deleteEntry.isPending,
  };
}

/** Academy lesson progress for the signed-in member. */
export function useAcademyProgress() {
  const { household } = useHousehold();
  const householdId = household?.id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['se-academy-progress', householdId],
    enabled: !!householdId,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('se_academy_progress')
        .select('lesson_key, completed, completed_at, quiz_score')
        .eq('household_id', householdId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const setLesson = useMutation({
    mutationFn: async (input: { lessonKey: string; completed: boolean; quizScore?: number | null }) => {
      if (!householdId) throw new Error('No household');
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error('Not signed in');
      const { error } = await supabase.from('se_academy_progress').upsert(
        {
          household_id: householdId,
          user_id: userId,
          lesson_key: input.lessonKey,
          completed: input.completed,
          completed_at: input.completed ? new Date().toISOString() : null,
          quiz_score: input.quizScore ?? null,
        },
        { onConflict: 'user_id,lesson_key' },
      );
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['se-academy-progress'] });
      await query.refetch();
    },
  });

  const rows = query.data ?? [];
  const completedKeys = new Set(rows.filter((r) => r.completed).map((r) => r.lesson_key));

  return {
    completedKeys,
    completedCount: completedKeys.size,
    totalLessons: LESSONS.length,
    percent: Math.round((completedKeys.size / LESSONS.length) * 100),
    isLoading: query.isLoading,
    setLesson: setLesson.mutateAsync,
    isSaving: setLesson.isPending,
  };
}
