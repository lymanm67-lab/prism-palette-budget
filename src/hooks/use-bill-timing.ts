import { useMemo } from 'react';
import { useRecurringTransactions } from '@/hooks/use-recurring';
import { useAccounts } from '@/hooks/use-finance-data';
import { addDays, differenceInDays, parseISO, format } from 'date-fns';

export interface BillCollision {
  window_start: string;
  window_end: string;
  bills: Array<{ id: string; merchant: string; amount: number; due_date: string }>;
  total: number;
  cash_available: number;
  suggested_shifts: Array<{
    id: string;
    merchant: string;
    from_date: string;
    suggested_date: string;
    reason: string;
  }>;
}

/**
 * Detects 7-day windows where outgoing bills cluster and exceed expected available cash.
 * Pure client-side — uses existing recurring_transactions + account balances.
 */
export function useBillTiming(opts: { horizonDays?: number; cushion?: number } = {}) {
  const horizon = opts.horizonDays ?? 30;
  const cushion = opts.cushion ?? 1.1;
  const { data: recurring } = useRecurringTransactions();
  const { data: accounts } = useAccounts();

  return useMemo(() => {
    const today = new Date();
    const cash = (accounts || [])
      .filter((a: any) => ['checking', 'cash', 'savings'].includes((a.type || '').toLowerCase()))
      .reduce((s: number, a: any) => s + Number(a.balance || 0), 0);

    const upcoming = (recurring || [])
      .filter((r: any) => r.is_active && Number(r.amount) < 0 && r.next_due_date)
      .map((r: any) => ({
        id: r.id,
        merchant: r.merchant || 'Bill',
        amount: Math.abs(Number(r.amount)),
        due_date: r.next_due_date as string,
      }))
      .filter(b => {
        const d = parseISO(b.due_date);
        const days = differenceInDays(d, today);
        return days >= 0 && days <= horizon;
      })
      .sort((a, b) => a.due_date.localeCompare(b.due_date));

    // Group into overlapping 7-day windows; flag collisions
    const collisions: BillCollision[] = [];
    for (let i = 0; i < upcoming.length; i++) {
      const start = parseISO(upcoming[i].due_date);
      const end = addDays(start, 6);
      const bucket = upcoming.filter(b => {
        const d = parseISO(b.due_date);
        return d >= start && d <= end;
      });
      if (bucket.length < 2) continue;
      const total = bucket.reduce((s, b) => s + b.amount, 0);
      if (total <= cash / cushion) continue;
      // Dedupe overlapping windows by start
      if (collisions.some(c => Math.abs(differenceInDays(parseISO(c.window_start), start)) < 3)) continue;

      // Suggest shifts for the smaller bills in the bucket (after the first)
      const sorted = [...bucket].sort((a, b) => b.amount - a.amount);
      const toShift = sorted.slice(Math.max(1, Math.ceil(sorted.length / 2)));
      const target = addDays(end, 7);

      collisions.push({
        window_start: format(start, 'yyyy-MM-dd'),
        window_end: format(end, 'yyyy-MM-dd'),
        bills: bucket,
        total,
        cash_available: cash,
        suggested_shifts: toShift.map(b => ({
          id: b.id,
          merchant: b.merchant,
          from_date: b.due_date,
          suggested_date: format(target, 'yyyy-MM-dd'),
          reason: `Spreads the load away from the ${format(start, 'MMM d')}–${format(end, 'MMM d')} cluster.`,
        })),
      });
      // Skip ahead past this window
      i += bucket.length - 1;
    }

    return {
      collisions,
      totalCash: cash,
      upcomingCount: upcoming.length,
    };
  }, [recurring, accounts, horizon, cushion]);
}
