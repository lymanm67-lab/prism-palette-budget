/** Lot-level cost basis parsing and rollup for the Five Investment Roles. */

export interface ParsedLot {
  ticker: string;
  trade_date: string; // yyyy-mm-dd
  shares: number;
  price_per_share: number;
  fees: number;
  total_cost: number;
}

export interface LotRow extends ParsedLot {
  id: string;
  position_id: string | null;
  account_type: string | null;
  source: string;
  notes: string | null;
}

const num = (raw?: string): number | null => {
  if (!raw) return null;
  const neg = /^\(.*\)$/.test(raw.trim());
  const cleaned = raw.replace(/[$,()"\s]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
};

const findIdx = (header: string[], candidates: string[]): number =>
  header.findIndex((h) => candidates.some((c) => h.includes(c)));

/** Normalises common broker date formats to yyyy-mm-dd. Returns null when unparseable. */
export function normaliseDate(raw?: string): string | null {
  if (!raw) return null;
  const s = raw.trim().replace(/^"|"$/g, '');
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (us) {
    const yr = us[3].length === 2 ? `20${us[3]}` : us[3];
    return `${yr}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`;
  }
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

/**
 * Parses a broker CSV/TSV export into individual lots.
 * Detects ticker, trade date, shares, price per share, fees and total cost columns.
 */
export function parseLotCsv(text: string): { lots: ParsedLot[]; skipped: number } {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { lots: [], skipped: 0 };
  const split = (line: string) =>
    line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)|\t|;/).map((c) => (c ?? '').trim().replace(/^"|"$/g, ''));

  const header = split(lines[0]).map((h) => h.toLowerCase());
  const tickerIdx = findIdx(header, ['symbol', 'ticker', 'security id']);
  const hasHeader = tickerIdx >= 0;

  const dateIdx = findIdx(header, ['acquired', 'trade date', 'purchase date', 'date acquired', 'open date', 'date']);
  const sharesIdx = findIdx(header, ['shares', 'quantity', 'qty', 'units']);
  const priceIdx = findIdx(header, ['price per share', 'purchase price', 'unit cost', 'cost per share', 'avg price', 'average price', 'price']);
  const feesIdx = findIdx(header, ['fees', 'commission']);
  const totalIdx = findIdx(header, ['cost basis total', 'total cost', 'cost basis', 'basis', 'amount']);

  const lots: ParsedLot[] = [];
  let skipped = 0;
  const body = hasHeader ? lines.slice(1) : lines;

  for (const line of body) {
    const cells = split(line);
    const rawTicker = hasHeader ? cells[tickerIdx] : cells[0];
    const ticker = (rawTicker ?? '').toUpperCase().replace(/[^A-Z0-9.\-]/g, '');
    if (!ticker || /^TOTAL/i.test(ticker)) {
      skipped += 1;
      continue;
    }

    const trade_date =
      normaliseDate(hasHeader ? (dateIdx >= 0 ? cells[dateIdx] : undefined) : cells[1]) ??
      new Date().toISOString().slice(0, 10);
    const shares = (hasHeader ? num(sharesIdx >= 0 ? cells[sharesIdx] : undefined) : num(cells[2])) ?? 0;
    const fees = (hasHeader && feesIdx >= 0 ? num(cells[feesIdx]) : null) ?? 0;
    let price = hasHeader ? num(priceIdx >= 0 ? cells[priceIdx] : undefined) : num(cells[3]);
    let total = hasHeader ? num(totalIdx >= 0 ? cells[totalIdx] : undefined) : num(cells[4]);

    if (total == null && price != null) total = price * shares + fees;
    if (price == null && total != null && shares !== 0) price = (total - fees) / shares;
    if (price == null && total == null) {
      skipped += 1;
      continue;
    }

    lots.push({
      ticker,
      trade_date,
      shares,
      price_per_share: Math.abs(price ?? 0),
      fees: Math.abs(fees),
      total_cost: Math.abs(total ?? 0),
    });
  }
  return { lots, skipped };
}

export interface LotRollup {
  shares: number;
  costBasis: number;
  avgPrice: number | null;
  lotCount: number;
  earliestTradeDate: string | null;
}

/** Sums lots into the shares / total cost basis / average price for a position. */
export function rollupLots(lots: ParsedLot[]): LotRollup {
  const shares = lots.reduce((s, l) => s + Number(l.shares || 0), 0);
  const costBasis = lots.reduce(
    (s, l) => s + (Number(l.total_cost) || Number(l.shares || 0) * Number(l.price_per_share || 0) + Number(l.fees || 0)),
    0,
  );
  const dates = lots.map((l) => l.trade_date).filter(Boolean).sort();
  return {
    shares,
    costBasis,
    avgPrice: shares > 0 ? costBasis / shares : null,
    lotCount: lots.length,
    earliestTradeDate: dates[0] ?? null,
  };
}

/** Groups lots by ticker (upper-cased). */
export function groupLotsByTicker<T extends { ticker: string }>(lots: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  lots.forEach((l) => {
    const key = l.ticker.toUpperCase();
    map.set(key, [...(map.get(key) ?? []), l]);
  });
  return map;
}

const DAY = 86_400_000;

/** Holding period for a lot, using long-term = held more than 365 days. */
export function lotHoldingPeriod(tradeDate: string, asOf = new Date()) {
  const start = new Date(`${tradeDate}T00:00:00`).getTime();
  const days = Math.max(0, Math.floor((asOf.getTime() - start) / DAY));
  const longTerm = days > 365;
  return { days, longTerm, label: longTerm ? 'Long-term' : 'Short-term' };
}

/** Stable dedupe key matching the database unique index. */
export function lotKey(l: ParsedLot): string {
  return [l.ticker.toUpperCase(), l.trade_date, l.shares, l.price_per_share].join('|');
}
