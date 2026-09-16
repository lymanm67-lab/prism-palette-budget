// SwingEdge — Exposure families.
//
// Different tickers are not automatically different bets. XLE, XOP, FENY, USO and
// OIH all express energy/oil exposure, so their risk belongs in one bucket.
//
// Nothing here is guessed: a symbol with no known family and no mappable sector
// returns null, and the UI says "not known" rather than inventing a grouping.

export type ExposureFamily =
  | 'ENERGY'
  | 'OIL_COMMODITY'
  | 'SEMICONDUCTORS'
  | 'TECHNOLOGY'
  | 'FINANCIALS'
  | 'SMALL_CAP'
  | 'TREASURIES'
  | 'GOLD'
  | 'BROAD_MARKET'
  | 'HEALTHCARE'
  | 'UTILITIES'
  | 'REAL_ESTATE'
  | 'CONSUMER'
  | 'INDUSTRIALS';

export const EXPOSURE_FAMILY_LABEL: Record<ExposureFamily, string> = {
  ENERGY: 'Energy',
  OIL_COMMODITY: 'Oil / commodity',
  SEMICONDUCTORS: 'Semiconductors',
  TECHNOLOGY: 'Technology',
  FINANCIALS: 'Financials',
  SMALL_CAP: 'Small cap',
  TREASURIES: 'Treasuries',
  GOLD: 'Gold',
  BROAD_MARKET: 'Broader market',
  HEALTHCARE: 'Healthcare',
  UTILITIES: 'Utilities',
  REAL_ESTATE: 'Real estate',
  CONSUMER: 'Consumer',
  INDUSTRIALS: 'Industrials',
};

/** The single force that most moves this family. Shown once, never stacked. */
export const COMMON_DRIVER: Record<ExposureFamily, string> = {
  ENERGY: 'Crude oil and energy prices',
  OIL_COMMODITY: 'Crude oil',
  SEMICONDUCTORS: 'Semiconductor demand and AI spending',
  TECHNOLOGY: 'Technology growth and interest rates',
  FINANCIALS: 'Interest rates and credit conditions',
  SMALL_CAP: 'Domestic growth and financing costs',
  TREASURIES: 'Treasury yields',
  GOLD: 'Gold price, real yields and the dollar',
  BROAD_MARKET: 'Broad market beta',
  HEALTHCARE: 'Healthcare policy and drug pipelines',
  UTILITIES: 'Interest rates and regulated returns',
  REAL_ESTATE: 'Interest rates and property values',
  CONSUMER: 'Consumer spending',
  INDUSTRIALS: 'Industrial activity and input costs',
};

/**
 * Known symbol groupings. Energy and oil funds sit together deliberately: OPEC
 * or an inventory report moves them as one.
 */
const SYMBOL_FAMILY: Record<string, ExposureFamily> = {
  // Energy / oil
  XLE: 'ENERGY',
  XOP: 'ENERGY',
  FENY: 'ENERGY',
  VDE: 'ENERGY',
  IYE: 'ENERGY',
  OIH: 'ENERGY',
  IEO: 'ENERGY',
  PXE: 'ENERGY',
  AMLP: 'ENERGY',
  USO: 'OIL_COMMODITY',
  BNO: 'OIL_COMMODITY',
  UCO: 'OIL_COMMODITY',
  DBO: 'OIL_COMMODITY',
  // Semiconductors
  SMH: 'SEMICONDUCTORS',
  SOXX: 'SEMICONDUCTORS',
  SOXL: 'SEMICONDUCTORS',
  XSD: 'SEMICONDUCTORS',
  NVDA: 'SEMICONDUCTORS',
  AMD: 'SEMICONDUCTORS',
  INTC: 'SEMICONDUCTORS',
  AVGO: 'SEMICONDUCTORS',
  MU: 'SEMICONDUCTORS',
  TSM: 'SEMICONDUCTORS',
  ASML: 'SEMICONDUCTORS',
  // Technology
  XLK: 'TECHNOLOGY',
  VGT: 'TECHNOLOGY',
  FTEC: 'TECHNOLOGY',
  QQQ: 'TECHNOLOGY',
  QQQM: 'TECHNOLOGY',
  // Financials
  XLF: 'FINANCIALS',
  VFH: 'FINANCIALS',
  KRE: 'FINANCIALS',
  KBE: 'FINANCIALS',
  IAT: 'FINANCIALS',
  // Small cap
  IWM: 'SMALL_CAP',
  VB: 'SMALL_CAP',
  IJR: 'SMALL_CAP',
  SCHA: 'SMALL_CAP',
  // Treasuries
  TLT: 'TREASURIES',
  IEF: 'TREASURIES',
  SHY: 'TREASURIES',
  GOVT: 'TREASURIES',
  BIL: 'TREASURIES',
  TMF: 'TREASURIES',
  // Gold
  GLD: 'GOLD',
  IAU: 'GOLD',
  GDX: 'GOLD',
  GDXJ: 'GOLD',
  SGOL: 'GOLD',
  // Broad market
  SPY: 'BROAD_MARKET',
  VOO: 'BROAD_MARKET',
  IVV: 'BROAD_MARKET',
  VTI: 'BROAD_MARKET',
  SCHB: 'BROAD_MARKET',
  SCHD: 'BROAD_MARKET',
  DIA: 'BROAD_MARKET',
  // Other sectors
  XLV: 'HEALTHCARE',
  VHT: 'HEALTHCARE',
  XLU: 'UTILITIES',
  VPU: 'UTILITIES',
  XLRE: 'REAL_ESTATE',
  VNQ: 'REAL_ESTATE',
  XLY: 'CONSUMER',
  XLP: 'CONSUMER',
  XLI: 'INDUSTRIALS',
  VIS: 'INDUSTRIALS',
};

/** Sector names mapped to a family, used only when the symbol is not listed. */
const SECTOR_FAMILY: { match: RegExp; family: ExposureFamily }[] = [
  { match: /energy|oil|gas/i, family: 'ENERGY' },
  { match: /semiconduct/i, family: 'SEMICONDUCTORS' },
  { match: /technolog|software|information tech/i, family: 'TECHNOLOGY' },
  { match: /financ|bank|insur/i, family: 'FINANCIALS' },
  { match: /health|pharma|biotech/i, family: 'HEALTHCARE' },
  { match: /utilit/i, family: 'UTILITIES' },
  { match: /real estate|reit/i, family: 'REAL_ESTATE' },
  { match: /consumer|retail/i, family: 'CONSUMER' },
  { match: /industrial|materials/i, family: 'INDUSTRIALS' },
  { match: /treasur|bond|fixed income/i, family: 'TREASURIES' },
  { match: /gold|precious metal/i, family: 'GOLD' },
];

/**
 * The exposure family for a symbol. Returns null when nothing is known — never
 * a guess, so a lone unclassified position cannot be blamed for concentration.
 */
export function familyFor(symbol: string, sector?: string | null): ExposureFamily | null {
  const key = (symbol ?? '').trim().toUpperCase();
  if (key && SYMBOL_FAMILY[key]) return SYMBOL_FAMILY[key];
  const s = (sector ?? '').trim();
  if (!s || /unclassified|unknown/i.test(s)) return null;
  const hit = SECTOR_FAMILY.find((r) => r.match.test(s));
  return hit ? hit.family : null;
}

export function familyLabel(family: ExposureFamily | null): string {
  return family ? EXPOSURE_FAMILY_LABEL[family] : 'Not known';
}

export function driverLabel(family: ExposureFamily | null): string {
  return family ? COMMON_DRIVER[family] : 'Not known';
}

/**
 * Energy and oil-commodity funds answer to the same driver, so they are treated
 * as one concentration group while remaining distinct labels.
 */
const RELATED: ExposureFamily[][] = [
  ['ENERGY', 'OIL_COMMODITY'],
  ['SEMICONDUCTORS', 'TECHNOLOGY'],
];

/** True when two families share a driver closely enough to pool their risk. */
export function familiesRelated(a: ExposureFamily | null, b: ExposureFamily | null): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  return RELATED.some((group) => group.includes(a) && group.includes(b));
}

export interface FamilyMember {
  symbol: string;
  family: ExposureFamily | null;
  risk: number;
}

export interface FamilyGroup {
  family: ExposureFamily;
  label: string;
  driver: string;
  symbols: string[];
  risk: number;
}

/**
 * Groups open positions by exposure family. Positions with no known family are
 * left out of every group rather than pooled into a fake one.
 */
export function groupByFamily(members: FamilyMember[]): FamilyGroup[] {
  const map = new Map<ExposureFamily, FamilyGroup>();
  for (const m of members) {
    if (!m.family) continue;
    const existing = map.get(m.family);
    if (existing) {
      existing.symbols.push(m.symbol.toUpperCase());
      existing.risk = Math.round((existing.risk + m.risk) * 100) / 100;
    } else {
      map.set(m.family, {
        family: m.family,
        label: EXPOSURE_FAMILY_LABEL[m.family],
        driver: COMMON_DRIVER[m.family],
        symbols: [m.symbol.toUpperCase()],
        risk: Math.round(m.risk * 100) / 100,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.risk - a.risk);
}

/** Combined risk of every position whose family shares a driver with `family`. */
export function relatedFamilyRisk(
  members: FamilyMember[],
  family: ExposureFamily | null,
): { risk: number; symbols: string[] } {
  if (!family) return { risk: 0, symbols: [] };
  const hits = members.filter((m) => familiesRelated(m.family, family));
  return {
    risk: Math.round(hits.reduce((s, m) => s + m.risk, 0) * 100) / 100,
    symbols: hits.map((m) => m.symbol.toUpperCase()),
  };
}
