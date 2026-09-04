// Session 7 — real monthly debt payments read from bank statements.
//
// Matches transactions to debt items by keyword, then reports the observed
// monthly total per debt so payoff dates and the What-If sliders use real
// cash instead of stored placeholder minimums.

export interface ActualTxn {
  id: string;
  date: string;
  merchant: string | null;
  description?: string | null;
  amount: number;
}

export interface DebtLike {
  id: string;
  name: string;
  minimum_payment?: number | null;
  extra_payment?: number | null;
  settlement_separate_payment?: number | null;
}

export interface DebtActual {
  debtId: string;
  debtName: string;
  /** Median of the observed monthly totals — resistant to one-off fees. */
  observedMonthly: number;
  /** Most recent complete month's total. */
  latestMonthly: number;
  latestMonth: string | null;
  months: { month: string; total: number; count: number }[];
  /** Stored minimum + separate leg for comparison. */
  storedMonthly: number;
  variance: number;
  matchedCount: number;
}

/** Keyword patterns per debt name fragment. Broad on purpose: bank descriptors vary. */
const MATCHERS: { test: RegExp; keys: RegExp[] }[] = [
  { test: /betrlink/i, keys: [/betrlink/i] },
  { test: /vacation loan 2306|2306/i, keys: [/upgrade/i, /2306/] },
  { test: /vacation loan 3004|3004/i, keys: [/upgrade/i, /3004/] },
  { test: /sba/i, keys: [/sba/i, /eidl/i] },
  { test: /nelnet|student/i, keys: [/nelnet/i, /student\s*loan/i, /mohela/i] },
  { test: /upstart/i, keys: [/upstart/i] },
  { test: /usaa/i, keys: [/usaa/i] },
  { test: /discover/i, keys: [/discover/i] },
];

export function keysFor(name: string): RegExp[] {
  const hit = MATCHERS.filter((m) => m.test.test(name || ''));
  if (hit.length) return hit.flatMap((h) => h.keys);
  const token = (name || '').split(/[\s—–-]+/)[0];
  return token && token.length > 3 ? [new RegExp(token.replace(/[^\w]/g, ''), 'i')] : [];
}

const monthOf = (d: string) => (d || '').slice(0, 7);
const round2 = (n: number) => Math.round(n * 100) / 100;

function median(values: number[]) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : round2((s[mid - 1] + s[mid]) / 2);
}

/**
 * @param lookbackMonths how many trailing months of statements to consider
 */
export function computeDebtActuals(
  debts: DebtLike[],
  txns: ActualTxn[],
  opts: { lookbackMonths?: number; asOfMonth?: string } = {},
): DebtActual[] {
  const lookback = opts.lookbackMonths ?? 4;
  const asOf = opts.asOfMonth ?? new Date().toISOString().slice(0, 7);

  const cutoff = (() => {
    const [y, m] = asOf.split('-').map(Number);
    const d = new Date(y, (m || 1) - 1 - lookback, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  return debts.map((debt) => {
    const keys = keysFor(debt.name);
    const hay = (t: ActualTxn) => `${t.merchant || ''} ${t.description || ''}`;
    const matched = keys.length
      ? txns.filter(
          (t) => monthOf(t.date) >= cutoff && Number(t.amount) < 0 && keys.some((k) => k.test(hay(t))),
        )
      : [];

    const byMonth = new Map<string, { total: number; count: number }>();
    for (const t of matched) {
      const key = monthOf(t.date);
      const cur = byMonth.get(key) || { total: 0, count: 0 };
      cur.total = round2(cur.total + Math.abs(Number(t.amount)));
      cur.count += 1;
      byMonth.set(key, cur);
    }

    const months = [...byMonth.entries()]
      .map(([month, v]) => ({ month, total: v.total, count: v.count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const observedMonthly = median(months.map((m) => m.total));
    const latest = months[months.length - 1] || null;
    const storedMonthly = round2(
      Number(debt.minimum_payment || 0) + Number(debt.settlement_separate_payment || 0),
    );

    return {
      debtId: debt.id,
      debtName: debt.name,
      observedMonthly,
      latestMonthly: latest ? latest.total : 0,
      latestMonth: latest ? latest.month : null,
      months,
      storedMonthly,
      variance: round2((latest ? latest.total : observedMonthly) - storedMonthly),
      matchedCount: matched.length,
    };
  });
}

/** Map of debt id → payment the forecast should use (latest month wins, else median). */
export function observedPaymentMap(actuals: DebtActual[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of actuals) {
    const value = a.latestMonthly > 0 ? a.latestMonthly : a.observedMonthly;
    if (value > 0) out[a.debtId] = value;
  }
  return out;
}
