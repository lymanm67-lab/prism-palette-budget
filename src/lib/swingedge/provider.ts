// SwingEdge Analyzer — provider layer.
// The engine talks to this file only. Swapping vendors later means adding one
// class here, not touching any calculation, page, or hook.

import { supabase } from '@/integrations/supabase/client';
import { demoCandles, demoQuote } from './demoData';
import type {
  Candle,
  EarningsInfo,
  MarketDataProvider,
  MarketStatus,
  Quote,
  SwingInterval,
  SymbolMatch,
} from './types';

export class ProviderUnavailableError extends Error {
  constructor(
    message: string,
    readonly kind: 'not_configured' | 'rate_limited' | 'provider_error',
  ) {
    super(message);
    this.name = 'ProviderUnavailableError';
  }
}

type Payload = Record<string, unknown>;

/** In-flight request map: identical concurrent requests share one call. */
const inflight = new Map<string, Promise<Payload>>();

async function invoke(payload: Payload): Promise<Payload> {
  const key = JSON.stringify(payload);
  const existing = inflight.get(key);
  if (existing) return existing;

  const run = (async () => {
    const { data, error } = await supabase.functions.invoke('twelve-data', { body: payload });
    if (error) throw new ProviderUnavailableError(error.message, 'provider_error');
    const body = (data ?? {}) as Payload;
    const err = typeof body.error === 'string' ? body.error : null;
    if (err) {
      const message = typeof body.message === 'string' ? body.message : err;
      const kind =
        err === 'not_configured' ? 'not_configured' : err === 'rate_limited' ? 'rate_limited' : 'provider_error';
      throw new ProviderUnavailableError(message, kind);
    }
    return body;
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, run);
  return run;
}

export class TwelveDataProvider implements MarketDataProvider {
  readonly id = 'TWELVE_DATA';

  async getQuote(symbol: string): Promise<Quote> {
    const body = await invoke({ action: 'quote', symbol });
    const quotes = (body.quotes as Quote[] | undefined) ?? [];
    if (!quotes.length) throw new ProviderUnavailableError('No quote returned.', 'provider_error');
    return quotes[0];
  }

  async getBatchQuotes(symbols: string[]): Promise<Quote[]> {
    if (!symbols.length) return [];
    const body = await invoke({ action: 'batch_quotes', symbols });
    return (body.quotes as Quote[] | undefined) ?? [];
  }

  async getTimeSeries(symbol: string, interval: SwingInterval, outputsize = 250): Promise<Candle[]> {
    const body = await invoke({ action: 'time_series', symbol, interval, outputsize });
    return (body.candles as Candle[] | undefined) ?? [];
  }

  async getSymbolSearch(query: string): Promise<SymbolMatch[]> {
    const body = await invoke({ action: 'search', query });
    return (body.matches as SymbolMatch[] | undefined) ?? [];
  }

  async getMarketStatus(): Promise<MarketStatus> {
    const body = await invoke({ action: 'market_status' });
    return {
      isOpen: Boolean(body.isOpen),
      exchange: String(body.exchange ?? 'NYSE'),
      asOf: String(body.asOf ?? new Date().toISOString()),
    };
  }

  /** Optional capability. Never throws for an unsupported plan. */
  async getEarnings(symbol: string): Promise<EarningsInfo> {
    try {
      const body = await invoke({ action: 'earnings', symbol });
      return {
        available: Boolean(body.available),
        reason: typeof body.reason === 'string' ? body.reason : undefined,
        nextDate: (body.nextDate as string | null) ?? null,
      };
    } catch {
      return { available: false, reason: 'Earnings data unavailable.' };
    }
  }

  async testConnection(): Promise<{ ok: boolean; message: string; creditsLeft?: number | null }> {
    try {
      const body = await invoke({ action: 'test' });
      return {
        ok: Boolean(body.ok),
        message: String(body.message ?? ''),
        creditsLeft: (body.creditsLeft as number | null) ?? null,
      };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : 'Connection test failed.' };
    }
  }
}

/** Clearly labelled sample data so every screen works before a key is added. */
export class DemoProvider implements MarketDataProvider {
  readonly id = 'DEMO';

  async getQuote(symbol: string) {
    return demoQuote(symbol);
  }
  async getBatchQuotes(symbols: string[]) {
    return symbols.map((s) => demoQuote(s));
  }
  async getTimeSeries(symbol: string, interval: SwingInterval, outputsize = 250) {
    return demoCandles(symbol, interval, outputsize);
  }
  async getSymbolSearch(query: string) {
    const q = query.trim().toUpperCase();
    return q ? [{ symbol: q, name: `${q} (demo instrument)`, assetType: 'stock' }] : [];
  }
  async getMarketStatus(): Promise<MarketStatus> {
    return { isOpen: false, exchange: 'DEMO', asOf: new Date().toISOString() };
  }
  async getEarnings(): Promise<EarningsInfo> {
    return { available: false, reason: 'Earnings data unavailable in demo mode.' };
  }
}

export const twelveData = new TwelveDataProvider();
export const demoProvider = new DemoProvider();

export function providerFor(mode: 'DEMO' | 'LIVE' | 'CACHED'): MarketDataProvider {
  return mode === 'LIVE' ? twelveData : demoProvider;
}
