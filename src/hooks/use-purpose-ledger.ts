import { useMemo } from 'react';
import { useTransactionsByDateRange } from '@/hooks/use-finance-data';
import { usePayrollElections, usePurposeResolution, electionsForMonth } from '@/hooks/use-money-purpose';
import type { MoneyPurpose } from '@/lib/budgeting/moneyPurpose';
import { CORE_KEYS, type CoreKey } from '@/lib/budgeting/blueprint5010';

export interface LedgerLine {
  id: string;
  date: string;
  description: string;
  categoryName: string;
  amount: number;
  source: 'transaction' | 'payroll';
  /** payroll wealth credit / excluded reason */
  note?: string;
}

export interface LedgerBucket {
  key: CoreKey;
  lines: LedgerLine[];
  transactionsTotal: number;
  payrollTotal: number;
  total: number;
}

export interface PurposeLedger {
  month: string;
  buckets: Record<CoreKey, LedgerBucket>;
  excluded: { label: string; count: number; total: number; reason: string }[];
  netIncome: number;
  loading: boolean;
}

const mk = (m: string) => m.slice(0, 7);

function monthBounds(month: string) {
  const [y, m] = mk(month).split('-').map(Number);
  const start = `${mk(month)}-01`;
  const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return { start, end };
}

/**
 * Line-level audit of a single month: exactly which transactions and payroll
 * items land in LIVE / ENJOY / BUILD WEALTH / ELIMINATE DEBT.
 */
export function usePurposeLedger(month: string): PurposeLedger {
  const resolution = usePurposeResolution();
  const { start, end } = monthBounds(month);
  const { data: txns, isLoading } = useTransactionsByDateRange(start, end);
  const { data: elections, isLoading: eLoading } = usePayrollElections();

  return useMemo(() => {
    const buckets = CORE_KEYS.reduce((acc, key) => {
      acc[key] = { key, lines: [], transactionsTotal: 0, payrollTotal: 0, total: 0 };
      return acc;
    }, {} as Record<CoreKey, LedgerBucket>);

    const excludedMap = new Map<string, { label: string; count: number; total: number; reason: string }>();
    const addExcluded = (label: string, reason: string, amount: number) => {
      const cur = excludedMap.get(label) || { label, count: 0, total: 0, reason };
      cur.count += 1;
      cur.total = Math.round((cur.total + amount) * 100) / 100;
      excludedMap.set(label, cur);
    };

    let netIncome = 0;

    for (const t of ((txns as any[]) || [])) {
      const amount = Number(t.amount) || 0;
      const catId = t.category_id as string | null;
      const categoryName = t.categories?.name || 'Uncategorized';
      const description = t.merchant || t.normalized_merchant || t.notes || 'Transaction';

      if (t.is_transfer) {
        addExcluded('Transfers', 'Internal movement — never counted as spending', Math.abs(amount));
        continue;
      }
      if (catId && resolution.incomeCategoryIds.has(catId)) {
        if (amount > 0) netIncome += amount;
        addExcluded('Income', 'Income is the denominator, not an allocation', Math.abs(amount));
        continue;
      }

      const p = ((t.money_purpose as MoneyPurpose | null) ||
        (catId ? resolution.byCategory.get(catId) : null)) as MoneyPurpose | null | undefined;

      if (!p) {
        addExcluded('Unclassified', 'No Money Purpose resolved yet', Math.abs(amount));
        continue;
      }
      if (p === 'business') {
        addExcluded('Business', 'Business money never enters personal ratios', Math.abs(amount));
        continue;
      }
      if (p === 'employer_contribution') {
        addExcluded('Employer contribution', 'Employer-paid — a gain, not spendable income', Math.abs(amount));
        continue;
      }
      if (catId && resolution.payrollCategoryIds.has(catId)) {
        addExcluded(
          'Payroll deduction rows',
          'Already inside net pay — never charged against take-home a second time',
          Math.abs(amount),
        );
        continue;
      }
      if (p === 'payroll_deduction') {
        addExcluded('Payroll deduction rows', 'Withheld before net pay', Math.abs(amount));
        continue;
      }

      const bucket = buckets[p as CoreKey];
      if (!bucket) continue;
      const value = Math.round(-amount * 100) / 100;
      bucket.lines.push({
        id: t.id,
        date: t.date,
        description,
        categoryName,
        amount: value,
        source: 'transaction',
      });
      bucket.transactionsTotal = Math.round((bucket.transactionsTotal + value) * 100) / 100;
    }

    // Payroll wealth elections get credit toward Build Wealth (never re-charged).
    for (const e of electionsForMonth(elections, mk(month))) {
      const amt = Number(e.amount) || 0;
      if (e.is_employer) {
        addExcluded('Employer contribution', 'Boosts wealth analytics only', amt);
        continue;
      }
      if (!e.counts_as_wealth) {
        addExcluded('Payroll taxes & benefits', 'Withheld before net pay', amt);
        continue;
      }
      const bucket = buckets.build_wealth;
      bucket.lines.push({
        id: `payroll-${e.id}`,
        date: `${mk(month)}-01`,
        description: e.label,
        categoryName: `Payroll · ${e.tax_treatment || 'election'}`,
        amount: amt,
        source: 'payroll',
        note: 'Credited to target, not deducted from net pay again',
      });
      bucket.payrollTotal = Math.round((bucket.payrollTotal + amt) * 100) / 100;
    }

    for (const key of CORE_KEYS) {
      const b = buckets[key];
      b.total = Math.round((b.transactionsTotal + b.payrollTotal) * 100) / 100;
      b.lines.sort((a, z) => (a.date < z.date ? 1 : a.date > z.date ? -1 : 0));
    }

    return {
      month: mk(month),
      buckets,
      excluded: Array.from(excludedMap.values()).sort((a, b) => b.total - a.total),
      netIncome: Math.round(netIncome * 100) / 100,
      loading: isLoading || eLoading,
    };
  }, [txns, elections, resolution, month, isLoading, eLoading]);
}
