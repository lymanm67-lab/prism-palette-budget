// SwingEdge Hybrid Signal Engine — fundamental data access.
// Same shape as the market-data provider: capabilities are declared, an endpoint
// the plan does not include is never retried, and nothing is ever invented.

import { supabase } from '@/integrations/supabase/client';
import type { EtfMetrics } from './etfQuality';
import type { FundamentalMetrics } from './fundamentals';

export type FundamentalProviderKind = 'ALPHA_VANTAGE' | 'TWELVE_DATA' | 'MANUAL_DATA' | 'NONE';

export type FundamentalCapability =
  | 'companyProfile'
  | 'statistics'
  | 'incomeStatement'
  | 'balanceSheet'
  | 'cashFlow'
  | 'etfProfile'
  | 'earningsCalendar';

export type FundamentalDataMode = 'LIVE' | 'CACHED' | 'MANUAL' | 'PARTIAL' | 'UNAVAILABLE';

export interface CompanyProfile {
  symbol: string;
  name: string | null;
  sector: string | null;
  industry: string | null;
  assetType: 'STOCK' | 'ETF';
  exchange: string | null;
}

export interface FundamentalBundle {
  symbol: string;
  assetType: 'STOCK' | 'ETF';
  profile: CompanyProfile | null;
  metrics: FundamentalMetrics;
  etf: EtfMetrics | null;
  mode: FundamentalDataMode;
  sources: string[];
  /** Newest reporting date behind the figures. */
  asOf: string | null;
  periodsAvailable: number;
  unavailableReason: string | null;
  missingCapabilities: FundamentalCapability[];
}

export interface FundamentalDataProvider {
  kind: FundamentalProviderKind;
  supports(capability: FundamentalCapability): boolean;
  getBundle(symbol: string, assetType: 'STOCK' | 'ETF'): Promise<FundamentalBundle>;
}

const emptyBundle = (
  symbol: string,
  assetType: 'STOCK' | 'ETF',
  reason: string,
  missing: FundamentalCapability[] = [],
): FundamentalBundle => ({
  symbol: symbol.toUpperCase(),
  assetType,
  profile: null,
  metrics: {},
  etf: assetType === 'ETF' ? {} : null,
  mode: 'UNAVAILABLE',
  sources: [],
  asOf: null,
  periodsAvailable: 0,
  unavailableReason: reason,
  missingCapabilities: missing,
});

export const FUNDAMENTAL_UNAVAILABLE_TEXT =
  'FUNDAMENTAL DATA UNAVAILABLE — your data plan does not include these figures. You can enter them by hand, and the signal will say the values came from you.';

export const FUNDAMENTAL_PARTIAL_TEXT =
  'PARTIAL FUNDAMENTAL DATA — some figures are missing. Missing items are left out of the score rather than counted as zero, and data confidence is reduced.';

/**
 * Twelve Data on the Basic plan does not include company statements, so the
 * capability map is honest about it and the code never calls those endpoints.
 * Anything the server-side function can supply comes through it, never a direct
 * call with a key in the browser.
 */
export class TwelveDataFundamentals implements FundamentalDataProvider {
  kind: FundamentalProviderKind = 'TWELVE_DATA';

  constructor(private capabilities: Set<FundamentalCapability>) {}

  supports(capability: FundamentalCapability): boolean {
    return this.capabilities.has(capability);
  }

  async getBundle(symbol: string, assetType: 'STOCK' | 'ETF'): Promise<FundamentalBundle> {
    const needed: FundamentalCapability[] =
      assetType === 'ETF' ? ['etfProfile'] : ['companyProfile', 'statistics'];
    const missing = needed.filter((c) => !this.supports(c));
    if (missing.length === needed.length) {
      return emptyBundle(symbol, assetType, FUNDAMENTAL_UNAVAILABLE_TEXT, missing);
    }

    try {
      const { data, error } = await supabase.functions.invoke('twelve-data', {
        body: { action: assetType === 'ETF' ? 'etf_profile' : 'fundamentals', symbol: symbol.toUpperCase() },
      });
      if (error) throw error;
      const payload = (data ?? {}) as {
        profile?: CompanyProfile;
        metrics?: FundamentalMetrics;
        etf?: EtfMetrics;
        as_of?: string;
        periods?: number;
        unsupported?: boolean;
      };
      if (payload.unsupported) {
        return emptyBundle(symbol, assetType, FUNDAMENTAL_UNAVAILABLE_TEXT, needed);
      }
      const metrics = payload.metrics ?? {};
      const hasAny = Object.values(metrics).some((v) => v !== null && v !== undefined) || !!payload.etf;
      return {
        symbol: symbol.toUpperCase(),
        assetType,
        profile: payload.profile ?? null,
        metrics,
        etf: assetType === 'ETF' ? (payload.etf ?? {}) : null,
        mode: !hasAny ? 'UNAVAILABLE' : missing.length ? 'PARTIAL' : 'LIVE',
        sources: ['TWELVE_DATA'],
        asOf: payload.as_of ?? null,
        periodsAvailable: payload.periods ?? (hasAny ? 1 : 0),
        unavailableReason: hasAny ? null : FUNDAMENTAL_UNAVAILABLE_TEXT,
        missingCapabilities: missing,
      };
    } catch {
      return emptyBundle(symbol, assetType, FUNDAMENTAL_UNAVAILABLE_TEXT, needed);
    }
  }
}

/** Hand-entered figures, stored per household and clearly labelled as manual. */
export class ManualFundamentals implements FundamentalDataProvider {
  kind: FundamentalProviderKind = 'MANUAL_DATA';

  constructor(private householdId: string | null) {}

  supports(): boolean {
    return true;
  }

  async getBundle(symbol: string, assetType: 'STOCK' | 'ETF'): Promise<FundamentalBundle> {
    if (!this.householdId) return emptyBundle(symbol, assetType, 'No household selected.');
    const { data, error } = await supabase
      .from('se_fundamental_overrides')
      .select('*')
      .eq('household_id', this.householdId)
      .eq('symbol', symbol.toUpperCase())
      .maybeSingle();
    if (error || !data) {
      return emptyBundle(symbol, assetType, 'No hand-entered figures saved for this symbol yet.');
    }
    const metrics = (data.metrics ?? {}) as FundamentalMetrics;
    const etf = (data.etf_metrics ?? {}) as EtfMetrics;
    return {
      symbol: symbol.toUpperCase(),
      assetType,
      profile: data.sector || data.industry
        ? {
            symbol: symbol.toUpperCase(),
            name: (data.company_name as string | null) ?? null,
            sector: (data.sector as string | null) ?? null,
            industry: (data.industry as string | null) ?? null,
            assetType,
            exchange: null,
          }
        : null,
      metrics,
      etf: assetType === 'ETF' ? etf : null,
      mode: 'MANUAL',
      sources: ['MANUAL_DATA'],
      asOf: (data.as_of as string | null) ?? null,
      periodsAvailable: Number(data.periods_available ?? 1),
      unavailableReason: null,
      missingCapabilities: [],
    };
  }
}

/** Merges provider figures with hand-entered ones without silently overwriting. */
export function mergeBundles(primary: FundamentalBundle, manual: FundamentalBundle | null) {
  if (!manual || manual.mode === 'UNAVAILABLE') {
    return { bundle: primary, conflictingMetrics: [] as string[] };
  }
  const merged: FundamentalMetrics = { ...primary.metrics };
  const conflictingMetrics: string[] = [];
  for (const [key, value] of Object.entries(manual.metrics)) {
    if (value === null || value === undefined) continue;
    const existing = (primary.metrics as Record<string, unknown>)[key];
    if (typeof existing === 'number' && typeof value === 'number' && Math.abs(existing - value) > Math.abs(existing) * 0.1) {
      conflictingMetrics.push(key);
      continue; // keep provider value, report the disagreement
    }
    (merged as Record<string, unknown>)[key] = value;
  }
  const etf = primary.etf || manual.etf ? { ...(primary.etf ?? {}), ...(manual.etf ?? {}) } : null;
  const usedManual = Object.keys(manual.metrics).length > 0 || !!manual.etf;
  return {
    bundle: {
      ...primary,
      metrics: merged,
      etf,
      mode: primary.mode === 'UNAVAILABLE' ? 'MANUAL' : usedManual ? 'PARTIAL' : primary.mode,
      sources: usedManual ? [...primary.sources, 'MANUAL_DATA'] : primary.sources,
      asOf: primary.asOf ?? manual.asOf,
      periodsAvailable: Math.max(primary.periodsAvailable, manual.periodsAvailable),
      unavailableReason: null,
    } as FundamentalBundle,
    conflictingMetrics,
  };
}

export function providerQualityFor(bundle: FundamentalBundle) {
  const manual = bundle.sources.includes('MANUAL_DATA');
  const provider = bundle.sources.some((s) => s !== 'MANUAL_DATA');
  if (manual && provider) return 'MIXED' as const;
  if (manual) return 'MANUAL' as const;
  if (provider) return 'PROVIDER' as const;
  return 'NONE' as const;
}
