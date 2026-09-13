// SwingEdge — event data for the screens.
//
// Two rules drive this file:
//   1. Nothing is invented. When a provider has no earnings date, the record
//      stays UNKNOWN and the engine treats that as missing information.
//   2. Demo mode never fabricates a calendar. It reports that no event data is
//      available rather than inventing dates that would flatter a setup.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { assessEventRisk, type EventRiskResult } from '@/lib/swingedge/eventRisk';
import type { EarningsRecord } from '@/lib/swingedge/earningsRisk';
import { derivedMacroEvents } from '@/lib/swingedge/macroSchedule';
import type { CalendarEvent } from '@/lib/swingedge/eventCalendar';
import { useTradingSettings } from '@/hooks/use-swingedge';

const DAY_MS = 86_400_000;

const UNKNOWN_EARNINGS = (symbol: string): EarningsRecord => ({
  symbol,
  date: null,
  certainty: 'UNKNOWN',
  timing: 'TIME_UNKNOWN',
  source: null,
  fetchedAt: null,
});

/** Next reported earnings date for a symbol, or an explicit unknown. */
export function useSymbolEarnings(symbol: string | null) {
  const { settings } = useTradingSettings();
  const live = settings.data_mode === 'LIVE';

  return useQuery({
    queryKey: ['se-earnings', symbol, settings.data_mode],
    enabled: !!symbol,
    staleTime: 12 * 60 * 60_000,
    queryFn: async (): Promise<EarningsRecord> => {
      const sym = (symbol as string).toUpperCase();
      if (!live) return UNKNOWN_EARNINGS(sym);
      const { data, error } = await supabase.functions.invoke('market-data', {
        body: { action: 'earnings', symbol: sym },
      });
      if (error) return UNKNOWN_EARNINGS(sym);
      const row = data as Partial<EarningsRecord> & { date?: string | null };
      if (!row?.date) return UNKNOWN_EARNINGS(sym);
      return {
        symbol: sym,
        date: row.date,
        certainty: row.certainty === 'CONFIRMED' ? 'CONFIRMED' : 'ESTIMATED',
        timing: row.timing ?? 'TIME_UNKNOWN',
        source: row.source ?? null,
        fetchedAt: row.fetchedAt ?? null,
      };
    },
  });
}

/**
 * Earnings dates for a list of symbols. The provider publishes one calendar for
 * the whole market, so a scan costs a single call. Demo mode returns unknowns.
 */
export function useEarningsCalendar(symbols: string[]) {
  const { settings } = useTradingSettings();
  const live = settings.data_mode === 'LIVE';
  const list = useMemo(
    () => [...new Set(symbols.map((s) => s.toUpperCase()))].sort(),
    [symbols],
  );

  const query = useQuery({
    queryKey: ['se-earnings-batch', settings.data_mode, list.join(',')],
    enabled: list.length > 0,
    staleTime: 12 * 60 * 60_000,
    queryFn: async (): Promise<Record<string, EarningsRecord>> => {
      const unknown = Object.fromEntries(list.map((s) => [s, UNKNOWN_EARNINGS(s)]));
      if (!live) return unknown;
      const { data, error } = await supabase.functions.invoke('market-data', {
        body: { action: 'earnings_batch', symbols: list },
      });
      if (error) return unknown;
      const payload = data as { fetchedAt?: string; earnings?: Partial<EarningsRecord>[] };
      const out = { ...unknown };
      for (const row of payload?.earnings ?? []) {
        const sym = String(row.symbol ?? '').toUpperCase();
        if (!sym || !out[sym]) continue;
        if (!row.date) continue;
        out[sym] = {
          symbol: sym,
          date: row.date,
          certainty: row.certainty === 'CONFIRMED' ? 'CONFIRMED' : 'ESTIMATED',
          timing: row.timing ?? 'TIME_UNKNOWN',
          source: row.source ?? null,
          fetchedAt: payload?.fetchedAt ?? null,
        };
      }
      return out;
    },
  });

  return {
    bySymbol: query.data ?? {},
    isLoading: query.isLoading,
    available: live,
  };
}

/** Macro events covering the next `days`, used by the scanner and the screens. */
export function useMacroWindow(days = 30) {
  return useMemo(() => {
    const now = new Date();
    const to = new Date(now.getTime() + Math.max(days, 30) * DAY_MS);
    return derivedMacroEvents(now.toISOString().slice(0, 10), to.toISOString().slice(0, 10));
  }, [days]);
}

export interface EventRiskViewInput {
  symbol: string | null;
  sector?: string | null;
  holdingDays?: number;
  /** Explicit opt-in required before Beginner Mode will hold across a report. */
  allowEarningsEventTrades?: boolean;
  gapAcknowledged?: boolean;
  entryDate?: string | null;
}

export interface EventRiskView {
  result: EventRiskResult | null;
  earnings: EarningsRecord | null;
  events: CalendarEvent[];
  isLoading: boolean;
  earningsAvailable: boolean;
  dataNote: string | null;
}

/** Assembles the calendar the Event Risk Engine reads, then scores it. */
export function useEventRisk(input: EventRiskViewInput): EventRiskView {
  const { settings } = useTradingSettings();
  const holdingDays = input.holdingDays ?? 10;
  const earningsQuery = useSymbolEarnings(input.symbol);

  const events = useMemo(() => {
    const now = new Date();
    const to = new Date(now.getTime() + Math.max(holdingDays, 30) * DAY_MS);
    return derivedMacroEvents(now.toISOString().slice(0, 10), to.toISOString().slice(0, 10));
  }, [holdingDays]);

  const earnings = earningsQuery.data ?? null;

  const result = useMemo(() => {
    if (!input.symbol) return null;
    return assessEventRisk({
      symbol: input.symbol,
      sector: input.sector ?? null,
      holdingDays,
      earnings,
      events,
      mode: settings.advanced_mode ? 'ADVANCED' : 'BEGINNER',
      allowEarningsEventTrades: input.allowEarningsEventTrades,
      gapAcknowledged: input.gapAcknowledged,
      entryDate: input.entryDate ?? null,
    });
  }, [
    input.symbol,
    input.sector,
    input.allowEarningsEventTrades,
    input.gapAcknowledged,
    input.entryDate,
    holdingDays,
    earnings,
    events,
    settings.advanced_mode,
  ]);

  return {
    result,
    earnings,
    events,
    isLoading: earningsQuery.isLoading,
    earningsAvailable: !!earnings?.date,
    dataNote:
      settings.data_mode === 'LIVE'
        ? null
        : 'Demo mode carries no event calendar, so earnings and macro dates read as unknown rather than clear.',
  };
}
