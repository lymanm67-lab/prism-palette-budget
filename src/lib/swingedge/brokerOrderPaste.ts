// SwingEdge — parse pasted Thinkorswim order rows.
//
// The paste is read literally: nothing is guessed. A value that is not present
// in the line stays null and the row is reported as incomplete, so the risk
// snapshot never invents an entry, stop, target or share count.

import type { OrderStatus } from './portfolioRiskSnapshot';

export interface ParsedOrderRow {
  line: number;
  raw: string;
  symbol: string;
  status: OrderStatus;
  shares: number | null;
  entry: number | null;
  stop: number | null;
  target: number | null;
  missing: string[];
}

export interface ParseResult {
  rows: ParsedOrderRow[];
  skipped: { line: number; raw: string; reason: string }[];
}

const STATUS_PATTERNS: { match: RegExp; status: OrderStatus }[] = [
  { match: /wait\s*cond/i, status: 'WAIT_COND' },
  { match: /wait\s*trg/i, status: 'WAIT_TRG' },
  { match: /\bworking\b/i, status: 'WORKING' },
  { match: /\bfilled\b/i, status: 'FILLED' },
  { match: /\b(closed|canceled|cancelled)\b/i, status: 'CLOSED' },
];

/** Header rows and Thinkorswim column names that carry no order data. */
const HEADER = /^(symbol|ticker|side|qty|quantity|status|filled|price|order|time)\b.*\b(status|price|qty|quantity)\b/i;

const NOT_A_SYMBOL = new Set([
  'BUY', 'SELL', 'LMT', 'MKT', 'STP', 'STOP', 'LIMIT', 'GTC', 'DAY', 'OCO', 'TRG',
  'WAIT', 'COND', 'WORKING', 'FILLED', 'CLOSED', 'SINGLE', 'ORDER', 'TO', 'OPEN',
  'CLOSE', 'SHARES', 'AND', 'THE', 'MARK', 'TIF', 'EXCH', 'BID', 'ASK',
]);

function statusFrom(line: string): OrderStatus | null {
  const hit = STATUS_PATTERNS.find((s) => s.match.test(line));
  return hit ? hit.status : null;
}

function symbolFrom(tokens: string[]): string | null {
  for (const t of tokens) {
    const clean = t.replace(/[^A-Za-z.]/g, '').toUpperCase();
    if (clean.length >= 1 && clean.length <= 6 && /^[A-Z.]+$/.test(clean) && /[A-Z]/.test(clean) && !NOT_A_SYMBOL.has(clean)) {
      return clean;
    }
  }
  return null;
}

const num = (s: string) => Number(s.replace(/[$,]/g, ''));

/**
 * Parses one line. Comma, tab and space separated pastes are all accepted.
 * Prices are taken in the order they appear: entry, stop, target — the same
 * order Thinkorswim prints a bracket order — while a whole number without a
 * decimal point is read as the share count.
 */
export function parseOrderLine(raw: string, line: number): ParsedOrderRow | { reason: string } {
  const text = raw.trim();
  if (!text) return { reason: 'Empty line' };
  if (HEADER.test(text)) return { reason: 'Looks like a column header' };

  const tokens = text.split(/[\t,]+|\s{1,}/).filter(Boolean);
  const symbol = symbolFrom(tokens);
  if (!symbol) return { reason: 'No ticker symbol found' };

  const decimals: number[] = [];
  const wholes: number[] = [];
  for (const t of tokens) {
    const m = t.match(/^[$]?-?\d[\d,]*(\.\d+)?$/);
    if (!m) continue;
    const v = num(t);
    if (!Number.isFinite(v)) continue;
    if (m[1]) decimals.push(v);
    else wholes.push(v);
  }

  const explicitStatus = statusFrom(text);
  const shares = wholes.length ? wholes[0] : null;
  const [entry = null, stop = null, target = null] = decimals;

  const missing: string[] = [];
  if (shares === null) missing.push('shares');
  if (entry === null) missing.push('entry');
  if (stop === null) missing.push('stop');
  if (target === null) missing.push('target');

  return {
    line,
    raw: text,
    symbol,
    status: explicitStatus ?? 'WAIT_COND',
    shares,
    entry,
    stop,
    target,
    missing,
  };
}

export function parseBrokerOrders(text: string): ParseResult {
  const rows: ParsedOrderRow[] = [];
  const skipped: ParseResult['skipped'] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const out = parseOrderLine(raw, i + 1);
    if ('reason' in out) {
      if (raw.trim()) skipped.push({ line: i + 1, raw: raw.trim(), reason: out.reason });
      return;
    }
    rows.push(out);
  });
  return { rows, skipped };
}
