// SwingEdge Analyzer — cache freshness rules.
// Completed historical candles are immutable. Only the newest candle needs
// refreshing, and weekly data can sit much longer than daily data.

import type { CacheStatus, SwingInterval } from './types';

/** Minutes after which cached data stops being Fresh, then stops being Aging. */
const THRESHOLDS: Record<SwingInterval, { fresh: number; aging: number }> = {
  '1h': { fresh: 30, aging: 240 },
  '4h': { fresh: 120, aging: 720 },
  '1day': { fresh: 240, aging: 60 * 36 },
  '1week': { fresh: 60 * 24 * 3, aging: 60 * 24 * 10 },
};

export function cacheStatus(
  fetchedAt: string | null | undefined,
  interval: SwingInterval = '1day',
  now: Date = new Date(),
): CacheStatus {
  if (!fetchedAt) return 'Unavailable';
  const ts = new Date(fetchedAt).getTime();
  if (!Number.isFinite(ts)) return 'Unavailable';
  const minutes = (now.getTime() - ts) / 60000;
  const t = THRESHOLDS[interval] ?? THRESHOLDS['1day'];
  if (minutes <= t.fresh) return 'Fresh';
  if (minutes <= t.aging) return 'Aging';
  return 'Stale';
}

export const CACHE_STATUS_TONE: Record<CacheStatus, string> = {
  Fresh: 'text-prism-lime',
  Aging: 'text-prism-amber',
  Stale: 'text-prism-orange',
  Unavailable: 'text-muted-foreground',
};

export function lastUpdatedLabel(fetchedAt: string | null | undefined): string {
  if (!fetchedAt) return 'No market data yet';
  const d = new Date(fetchedAt);
  if (Number.isNaN(d.getTime())) return 'No market data yet';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * True when a symbol/interval needs a network call. Everything else is served
 * from cache so credits are only spent when they buy new information.
 */
export function needsRefresh(
  fetchedAt: string | null | undefined,
  interval: SwingInterval,
  now: Date = new Date(),
): boolean {
  return cacheStatus(fetchedAt, interval, now) !== 'Fresh';
}
