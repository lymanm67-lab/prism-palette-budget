// Multi-timeframe read for one symbol.
//
// The weekly chart is built from the daily candles already loaded, so the extra
// cost is one 4-hour, one 1-hour and one 15-minute request. The 15-minute chart
// is optional: if the request fails or returns nothing it reads "not used"
// rather than showing invented numbers.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { loadCandles, useTradingSettings } from '@/hooks/use-swingedge';
import { toWeekly } from '@/lib/swingedge/candles';
import {
  multiTimeframeAlignment,
  readDaily,
  readH1,
  readH4,
  readM15,
  readWeekly,
  type MultiTimeframeResult,
} from '@/lib/swingedge/multiTimeframe';
import type { Candle } from '@/lib/swingedge/types';

export interface UseMultiTimeframeOptions {
  price?: number | null;
  entryZone?: { low: number; high: number } | null;
  enabled?: boolean;
}

export function useMultiTimeframe(
  symbol: string | null,
  dailyCandles: Candle[] | undefined,
  opts: UseMultiTimeframeOptions = {},
): { result: MultiTimeframeResult | null; isLoading: boolean } {
  const { settings } = useTradingSettings();
  const enabled = !!symbol && opts.enabled !== false;

  const { data: intraday, isLoading } = useQuery({
    queryKey: ['se-mtf', symbol, settings.data_mode],
    queryFn: async () => {
      const [h4, h1, m15] = await Promise.all([
        loadCandles(symbol as string, '4h', settings.data_mode, 200),
        loadCandles(symbol as string, '1h', settings.data_mode, 200),
        loadCandles(symbol as string, '15m', settings.data_mode, 200).catch(() => null),
      ]);
      return { h4: h4.candles, h1: h1.candles, m15: m15?.candles ?? [] };
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const result = useMemo(() => {
    const daily = dailyCandles ?? [];
    if (!symbol || daily.length === 0) return null;
    return multiTimeframeAlignment({
      weekly: readWeekly(toWeekly(daily)),
      daily: readDaily(daily),
      h4: readH4(intraday?.h4 ?? []),
      h1: readH1(intraday?.h1 ?? []),
      m15: readM15([]),
      beginner: !settings.advanced_mode,
      price: opts.price ?? daily[daily.length - 1]?.close ?? null,
      entryZone: opts.entryZone ?? null,
    });
  }, [symbol, dailyCandles, intraday, settings.advanced_mode, opts.price, opts.entryZone]);

  return { result, isLoading: enabled && isLoading };
}
