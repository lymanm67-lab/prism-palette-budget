/**
 * Monthly budget CSV parsing.
 *
 * Accepted shape (header row required, order-independent, case-insensitive):
 *   category, amount[, month][, group]
 *
 * `month` accepts `YYYY-MM`, `YYYY-MM-DD`, `8/2026` or `Aug 2026`; when absent the
 * importer's selected month is used. Amounts tolerate `$`, thousands separators and
 * parenthesised negatives — budgets are stored as positive planned outflows.
 */

export interface BudgetCsvRow {
  category: string;
  group?: string;
  amount: number;
  month?: string;
  line: number;
}

export interface BudgetCsvParse {
  rows: BudgetCsvRow[];
  errors: string[];
}

const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** Splits one CSV line, honouring double-quoted fields. */
function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; continue; }
      if (ch === '"') { quoted = false; continue; }
      cur += ch;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === ',') { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

export function parseAmount(raw: string): number | null {
  if (!raw) return null;
  const negative = /^\(.*\)$/.test(raw.trim()) || raw.trim().startsWith('-');
  const cleaned = raw.replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  // Budgets are planned outflows: sign is dropped, magnitude is what matters.
  return negative ? Math.abs(n) : n;
}

/** Normalises any supported month token to a `YYYY-MM-01` key. */
export function parseMonth(raw?: string): string | null {
  if (!raw) return null;
  const v = raw.trim();
  let m = v.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/);
  if (m) return `${m[1]}-${String(Number(m[2])).padStart(2, '0')}-01`;
  m = v.match(/^(\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[2]}-${String(Number(m[1])).padStart(2, '0')}-01`;
  m = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${String(Number(m[1])).padStart(2, '0')}-01`;
  m = v.match(/^([A-Za-z]{3,})[\s-]+(\d{4})$/);
  if (m) {
    const idx = MONTH_NAMES.indexOf(m[1].slice(0, 3).toLowerCase());
    if (idx >= 0) return `${m[2]}-${String(idx + 1).padStart(2, '0')}-01`;
  }
  return null;
}

const findHeader = (headers: string[], ...candidates: string[]) =>
  headers.findIndex((h) => candidates.some((c) => h === c || h.includes(c)));

export function parseBudgetCsv(text: string): BudgetCsvParse {
  const errors: string[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) return { rows: [], errors: ['The file is empty.'] };

  const headers = splitLine(lines[0]).map((h) => h.toLowerCase());
  const catIdx = findHeader(headers, 'category', 'name', 'line item', 'item');
  const amtIdx = findHeader(headers, 'amount', 'budget', 'planned', 'monthly');
  const monthIdx = findHeader(headers, 'month', 'period', 'date');
  const groupIdx = findHeader(headers, 'group', 'bucket', 'type');

  if (catIdx < 0 || amtIdx < 0) {
    return {
      rows: [],
      errors: ['Header row must include a category column and an amount column (e.g. "Category,Amount,Month").'],
    };
  }

  const rows: BudgetCsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    const category = (cells[catIdx] || '').trim();
    if (!category) continue;
    if (/^(total|subtotal|grand total)/i.test(category)) continue;
    const amount = parseAmount(cells[amtIdx] || '');
    if (amount === null) {
      errors.push(`Line ${i + 1}: "${category}" has no readable amount.`);
      continue;
    }
    const monthCell = monthIdx >= 0 ? cells[monthIdx] : undefined;
    const month = parseMonth(monthCell) ?? undefined;
    if (monthCell && !month) errors.push(`Line ${i + 1}: month "${monthCell}" was not understood — the selected month is used.`);
    rows.push({
      category,
      group: groupIdx >= 0 ? cells[groupIdx] || undefined : undefined,
      amount,
      month,
      line: i + 1,
    });
  }

  if (!rows.length) errors.push('No budget rows were found.');
  return { rows, errors };
}

/** Loose name match so "Groceries " and "groceries" land on the same category. */
export const normalizeName = (s: string) =>
  s.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
