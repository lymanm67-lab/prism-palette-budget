// SwingEdge — live quote polling.
// One batched quote call per tick so the ticker never costs more than the
// per-minute data allowance. Polling pauses when the tab is hidden.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTradingSettings } from '@/hooks/use-swingedge';
import { providerFor, ProviderUnavailableError } from '@/lib/swingedge/provider';
import type { MarketStatus, Quote } from '@/lib/swingedge/types';

export type LiveInterval = 0 | 30_000 | 60_000 | 300_000;

export const LIVE_INTERVALS: { value: LiveInterval; label: string }[] = [
  { value: 30_000, label: 'Every 30 seconds' },
  { value: 60_000, label: 'Every minute' },
  { value: 300_000, label: 'Every 5 minutes' },
  { value: 0, label: 'Off (manual refresh)' },
];

export interface LiveRow extends Quote {
  /** Direction of the most recent price change, for the flash highlight. */
  tick: 'up' | 'down' | 'flat';
}

/** True while the browser tab is visible, so hidden tabs stop spending credits. */
function useTabVisible() {
  const [visible, setVisible] = useState(() =>
    typeof document === 'undefined' ? true : !document.hidden,
  );
  useEffect(() => {
    const onChange = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return visible;
}

export function useMarketStatus() {
  const { settings } = useTradingSettings();
  const mode = settings.data_mode;
  return useQuery({
    queryKey: ['se-market-status', mode],
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    queryFn: async (): Promise<MarketStatus> => providerFor(mode).getMarketStatus(),
  });
}

export function useLiveQuotes(symbols: string[], intervalMs: LiveInterval, marketOpen: boolean) {
  const { settings } = useTradingSettings();
  const mode = settings.data_mode;
  const visible = useTabVisible();

  /** Batched quotes cost one credit per symbol, so cap each tick. */
  const maxSymbols = Math.max(1, settings.api_minute_limit || 8);
  const watched = useMemo(() => symbols.slice(0, maxSymbols), [symbols, maxSymbols]);
  const skipped = Math.max(0, symbols.length - watched.length);

  const previous = useRef<Map<string, number>>(new Map());
  const [rows, setRows] = useState<LiveRow[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const polling = intervalMs > 0 && visible && marketOpen && watched.length > 0;

  const query = useQuery({
    queryKey: ['se-live-quotes', mode, watched.join(',')],
    enabled: watched.length > 0,
    staleTime: 0,
    gcTime: 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: polling ? intervalMs : false,
    queryFn: async (): Promise<Quote[]> => {
      try {
        const quotes = await providerFor(mode).getBatchQuotes(watched);
        setNotice(null);
        return quotes;
      } catch (e) {
        if (e instanceof ProviderUnavailableError) {
          setNotice(
            e.kind === 'rate_limited'
              ? 'Market data limit reached. The last prices below stay on screen until it resets.'
              : e.kind === 'not_configured'
                ? 'Market data is not connected yet, so these are sample prices.'
                : 'Live prices are unavailable right now. The last prices below stay on screen.',
          );
        } else {
          setNotice('Live prices are unavailable right now.');
        }
        throw e;
      }
    },
  });

  // Keep the last good set on screen and remember each tick's direction.
  useEffect(() => {
    if (!query.data) return;
    const next = query.data.map((q) => {
      const before = previous.current.get(q.symbol);
      const tick: LiveRow['tick'] =
        before === undefined || before === q.price ? 'flat' : q.price > before ? 'up' : 'down';
      return { ...q, tick };
    });
    next.forEach((q) => previous.current.set(q.symbol, q.price));
    setRows(next);
    setFetchedAt(new Date().toISOString());
  }, [query.data]);

  const refresh = useCallback(() => {
    void query.refetch();
  }, [query]);

  return {
    rows,
    fetchedAt,
    notice,
    skipped,
    watched,
    maxSymbols,
    polling,
    tabVisible: visible,
    isFetching: query.isFetching,
    refresh,
  };
}
