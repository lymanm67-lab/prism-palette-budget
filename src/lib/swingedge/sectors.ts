// SwingEdge Hybrid Signal Engine — sector context.
// Fundamental thresholds are not universal: a bank's balance sheet does not read
// like a software company's. Each profile says which valuation measures matter
// and where the thresholds sit. When no profile matches we fall back to a
// clearly labelled generic model and lower data confidence.

export type SectorKey =
  | 'BANKS'
  | 'INSURANCE'
  | 'REITS'
  | 'UTILITIES'
  | 'TECHNOLOGY'
  | 'CONSUMER'
  | 'INDUSTRIALS'
  | 'HEALTHCARE'
  | 'ENERGY'
  | 'GENERIC';

export interface SectorProfile {
  key: SectorKey;
  label: string;
  /** Valuation measures that make sense for this business model, in priority order. */
  valuationMetrics: ('pe' | 'forwardPe' | 'peg' | 'priceToSales' | 'priceToBook' | 'evToEbitda' | 'fcfYield')[];
  /** Debt-to-equity above this is treated as heavy for the sector. */
  heavyDebtToEquity: number;
  /** Operating margin at or above this is treated as strong for the sector. */
  strongOperatingMargin: number;
  /** Return on equity at or above this is treated as strong for the sector. */
  strongRoe: number;
  /** Some models (banks, REITs) make cash-flow comparisons less meaningful. */
  cashFlowMeaningful: boolean;
  note: string;
}

export const SECTOR_PROFILES: Record<SectorKey, SectorProfile> = {
  BANKS: {
    key: 'BANKS',
    label: 'Banks',
    valuationMetrics: ['priceToBook', 'pe', 'forwardPe'],
    heavyDebtToEquity: 300,
    strongOperatingMargin: 30,
    strongRoe: 12,
    cashFlowMeaningful: false,
    note: 'Banks carry deposits as liabilities, so debt ratios and cash flow are read differently.',
  },
  INSURANCE: {
    key: 'INSURANCE',
    label: 'Insurance',
    valuationMetrics: ['priceToBook', 'pe'],
    heavyDebtToEquity: 120,
    strongOperatingMargin: 12,
    strongRoe: 10,
    cashFlowMeaningful: false,
    note: 'Float and reserves distort ordinary cash-flow and margin comparisons.',
  },
  REITS: {
    key: 'REITS',
    label: 'Real estate',
    valuationMetrics: ['priceToBook', 'evToEbitda', 'fcfYield'],
    heavyDebtToEquity: 200,
    strongOperatingMargin: 30,
    strongRoe: 8,
    cashFlowMeaningful: true,
    note: 'Property companies run higher leverage by design, and earnings understate cash generation.',
  },
  UTILITIES: {
    key: 'UTILITIES',
    label: 'Utilities',
    valuationMetrics: ['pe', 'evToEbitda', 'priceToBook'],
    heavyDebtToEquity: 180,
    strongOperatingMargin: 18,
    strongRoe: 9,
    cashFlowMeaningful: true,
    note: 'Regulated returns mean steady margins and heavy, planned debt.',
  },
  TECHNOLOGY: {
    key: 'TECHNOLOGY',
    label: 'Technology',
    valuationMetrics: ['forwardPe', 'peg', 'priceToSales', 'fcfYield'],
    heavyDebtToEquity: 100,
    strongOperatingMargin: 20,
    strongRoe: 15,
    cashFlowMeaningful: true,
    note: 'Growth and cash generation matter more than book value here.',
  },
  CONSUMER: {
    key: 'CONSUMER',
    label: 'Consumer',
    valuationMetrics: ['pe', 'forwardPe', 'evToEbitda', 'fcfYield'],
    heavyDebtToEquity: 150,
    strongOperatingMargin: 10,
    strongRoe: 14,
    cashFlowMeaningful: true,
    note: 'Thin margins are normal, so consistency matters more than absolute margin.',
  },
  INDUSTRIALS: {
    key: 'INDUSTRIALS',
    label: 'Industrials',
    valuationMetrics: ['pe', 'evToEbitda', 'fcfYield'],
    heavyDebtToEquity: 150,
    strongOperatingMargin: 12,
    strongRoe: 13,
    cashFlowMeaningful: true,
    note: 'Cyclical earnings, so multi-period trend matters more than one quarter.',
  },
  HEALTHCARE: {
    key: 'HEALTHCARE',
    label: 'Healthcare',
    valuationMetrics: ['forwardPe', 'peg', 'evToEbitda'],
    heavyDebtToEquity: 130,
    strongOperatingMargin: 15,
    strongRoe: 13,
    cashFlowMeaningful: true,
    note: 'Pipeline and patent timing can swing single periods sharply.',
  },
  ENERGY: {
    key: 'ENERGY',
    label: 'Energy',
    valuationMetrics: ['evToEbitda', 'pe', 'fcfYield'],
    heavyDebtToEquity: 150,
    strongOperatingMargin: 15,
    strongRoe: 12,
    cashFlowMeaningful: true,
    note: 'Commodity prices drive results, so a single strong period proves little.',
  },
  GENERIC: {
    key: 'GENERIC',
    label: 'Generic model',
    valuationMetrics: ['pe', 'forwardPe', 'priceToSales', 'fcfYield'],
    heavyDebtToEquity: 150,
    strongOperatingMargin: 12,
    strongRoe: 12,
    cashFlowMeaningful: true,
    note: 'No sector profile matched, so general thresholds are used and confidence is reduced.',
  },
};

const KEYWORDS: { key: SectorKey; words: string[] }[] = [
  { key: 'BANKS', words: ['bank', 'financial services', 'credit services', 'capital markets'] },
  { key: 'INSURANCE', words: ['insurance', 'insurer', 'reinsurance'] },
  { key: 'REITS', words: ['reit', 'real estate'] },
  { key: 'UTILITIES', words: ['utility', 'utilities', 'electric', 'water'] },
  { key: 'TECHNOLOGY', words: ['technology', 'software', 'semiconductor', 'internet', 'hardware'] },
  { key: 'CONSUMER', words: ['consumer', 'retail', 'restaurant', 'apparel', 'beverage', 'food'] },
  { key: 'INDUSTRIALS', words: ['industrial', 'machinery', 'aerospace', 'transport', 'construction'] },
  { key: 'HEALTHCARE', words: ['health', 'pharma', 'biotech', 'medical', 'drug'] },
  { key: 'ENERGY', words: ['energy', 'oil', 'gas', 'coal', 'refin'] },
];

/** Maps a provider sector/industry string onto a profile. Never guesses silently. */
export function profileFor(sector?: string | null, industry?: string | null): SectorProfile {
  const text = `${sector ?? ''} ${industry ?? ''}`.toLowerCase().trim();
  if (!text) return SECTOR_PROFILES.GENERIC;
  for (const entry of KEYWORDS) {
    if (entry.words.some((w) => text.includes(w))) return SECTOR_PROFILES[entry.key];
  }
  return SECTOR_PROFILES.GENERIC;
}

/** Benchmark used for the sector-alignment part of the technical score. */
export const SECTOR_BENCHMARKS: Record<SectorKey, string> = {
  BANKS: 'XLF',
  INSURANCE: 'XLF',
  REITS: 'XLRE',
  UTILITIES: 'XLU',
  TECHNOLOGY: 'XLK',
  CONSUMER: 'XLY',
  INDUSTRIALS: 'XLI',
  HEALTHCARE: 'XLV',
  ENERGY: 'XLE',
  GENERIC: 'SPY',
};

export const MARKET_BENCHMARK = 'SPY';
