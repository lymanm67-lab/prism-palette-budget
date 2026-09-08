import { useCallback, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useSubscriptions } from '@/hooks/use-subscriptions';
import { useRecurringTransactions } from '@/hooks/use-recurring';

export const NET_PAY_STORAGE_KEY = 'prism-net-pay-monthly';
export const DEFAULT_NET_PAY = '4250.02';

export type Commitment = {
  id: string;
  name: string;
  monthly: number;
  kind: 'subscription' | 'bill';
  businessOnly: boolean;
  isSavingsTransfer: boolean;
  endDate: Date | null;
  pauseMonths: string[];
};

const toMonthly = (amount: number, frequency?: string | null) => {
  const a = Math.abs(Number(amount || 0));
  if (frequency === 'weekly') return a * 4.33;
  if (frequency === 'biweekly') return a * 2.17;
  if (frequency === 'quarterly') return a / 3;
  if (frequency === 'yearly' || frequency === 'annual') return a / 12;
  return a;
};

const toDate = (v: any) => (v ? new Date(`${String(v).slice(0, 10)}T00:00:00`) : null);

const NON_SUB_KEYWORDS = ['rent', 'mortgage', 'insurance', 'utilit', 'electric', 'gas', 'water', 'sewer', 'trash', 'debt', 'loan', 'transfer', 'payment'];

export const isNonSubscriptionItem = (item: any) => {
  const merchant = (item.merchant || '').toLowerCase();
  const catName = (item.categories?.name || '').toLowerCase();
  return NON_SUB_KEYWORDS.some(kw => merchant.includes(kw) || catName.includes(kw)) || item.is_transfer === true;
};

export const isBusinessOnlyItem = (item: any) => {
  const pct = Number(item.business_split_pct || 0);
  if (pct >= 100) return true;
  if (pct > 0) return false; // split items are partly personal
  const group = item.categories?.category_groups;
  return group?.budget_type === 'business' || !!group?.business_profile_id;
};

/**
 * Single source of truth for "what leaves the paycheck every month".
 * Honours end dates, paused months and savings transfers so every page that
 * shows a committed / left-over number agrees.
 */
export function useMonthlyCommitments() {
  const { data: subscriptions } = useSubscriptions();
  const { data: recurring } = useRecurringTransactions();

  const [netPayInput, setNetPayInput] = useState<string>(
    () => localStorage.getItem(NET_PAY_STORAGE_KEY) || DEFAULT_NET_PAY,
  );
  const setNetPay = useCallback((value: string) => {
    setNetPayInput(value);
    localStorage.setItem(NET_PAY_STORAGE_KEY, value);
  }, []);
  const netPay = Number(netPayInput) || 0;

  const commitments = useMemo<Commitment[]>(() => {
    const subs: Commitment[] = (subscriptions || [])
      .filter((s: any) => !s.is_cancelled)
      .map((s: any) => ({
        id: `s-${s.id}`,
        name: s.merchant || 'Subscription',
        monthly: toMonthly(s.average_amount, s.frequency),
        kind: isNonSubscriptionItem(s) ? ('bill' as const) : ('subscription' as const),
        businessOnly: isBusinessOnlyItem(s),
        isSavingsTransfer: s.is_transfer === true,
        endDate: toDate(s.end_date),
        pauseMonths: (s.pause_months || []) as string[],
      }));
    const bills: Commitment[] = (recurring || [])
      .filter((b: any) => b.is_active !== false && Number(b.amount || 0) < 0)
      .map((b: any) => ({
        id: `r-${b.id}`,
        name: b.merchant || b.categories?.name || 'Recurring bill',
        monthly: toMonthly(b.amount, b.frequency),
        kind: 'bill' as const,
        businessOnly: isBusinessOnlyItem(b),
        isSavingsTransfer: b.is_transfer === true,
        endDate: toDate(b.end_date),
        pauseMonths: (b.pause_months || []) as string[],
      }));
    return [...subs, ...bills].filter(c => c.monthly > 0);
  }, [subscriptions, recurring]);

  const activeInMonth = useCallback(
    (c: Commitment, monthStart: Date) =>
      (!c.endDate || c.endDate >= monthStart) && !c.pauseMonths.includes(format(monthStart, 'yyyy-MM')),
    [],
  );

  /** Total that leaves the paycheck in a given month (savings transfers excluded). */
  const committedForMonth = useCallback(
    (monthStart: Date, opts?: { excludeBusiness?: boolean }) =>
      commitments
        .filter(c => !c.isSavingsTransfer)
        .filter(c => !(opts?.excludeBusiness && c.businessOnly))
        .filter(c => activeInMonth(c, monthStart))
        .reduce((sum, c) => sum + c.monthly, 0),
    [commitments, activeInMonth],
  );

  const monthStart = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }, []);

  const committedMonthly = committedForMonth(monthStart);
  const savingsTransfers = useMemo(
    () =>
      commitments
        .filter(c => c.isSavingsTransfer && activeInMonth(c, monthStart))
        .reduce((sum, c) => sum + c.monthly, 0),
    [commitments, activeInMonth, monthStart],
  );
  const businessReimbursable = useMemo(
    () =>
      commitments
        .filter(c => c.businessOnly && !c.isSavingsTransfer && activeInMonth(c, monthStart))
        .reduce((sum, c) => sum + c.monthly, 0),
    [commitments, activeInMonth, monthStart],
  );
  const subscriptionsMonthly = useMemo(
    () =>
      commitments
        .filter(c => c.kind === 'subscription' && !c.isSavingsTransfer && activeInMonth(c, monthStart))
        .reduce((sum, c) => sum + c.monthly, 0),
    [commitments, activeInMonth, monthStart],
  );
  const billsMonthly = committedMonthly - subscriptionsMonthly;
  const leftOver = netPay - committedMonthly;
  const usedPct = netPay > 0 ? Math.min(100, Math.round((committedMonthly / netPay) * 100)) : 0;

  return {
    commitments,
    netPay,
    netPayInput,
    setNetPay,
    committedMonthly,
    subscriptionsMonthly,
    billsMonthly,
    savingsTransfers,
    businessReimbursable,
    leftOver,
    usedPct,
    committedForMonth,
    activeInMonth,
    isLoading: !subscriptions || !recurring,
  };
}
