import { useMemo } from 'react';
import { useRecurringTransactions, useCreateRecurring, useUpdateRecurring, useDeleteRecurring } from '@/hooks/use-recurring';
import { addDays, addMonths, format, parseISO } from 'date-fns';

export interface PaycheckSchedule {
  id: string;
  merchant: string;
  net_amount: number;
  frequency: string;
  next_due_date: string;
  account_id: string;
  is_active: boolean;
}

/** Deployment engine frequency keys <-> recurring_transactions frequency keys */
export const PAYCHECK_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly', days: 7 },
  { value: 'biweekly', label: 'Every 2 weeks', days: 14 },
  { value: 'monthly', label: 'Monthly', days: 30 },
  { value: 'quarterly', label: 'Quarterly', days: 91 },
] as const;

export function toDeployFrequency(f: string) {
  return f === 'semimonthly' ? 'semi_monthly' : f;
}

export function nextPayAfter(dateIso: string, frequency: string): string {
  const d = parseISO(dateIso);
  if (frequency === 'monthly') return format(addMonths(d, 1), 'yyyy-MM-dd');
  if (frequency === 'quarterly') return format(addMonths(d, 3), 'yyyy-MM-dd');
  const days = frequency === 'weekly' ? 7 : 14;
  return format(addDays(d, days), 'yyyy-MM-dd');
}

/**
 * Recurring paychecks = active recurring rows with a positive amount (income).
 * The database trigger advances next_due_date automatically as paydays pass,
 * so a paycheck entered once keeps rolling forward with no re-entry.
 */
export function usePaycheckSchedules() {
  const { data: recurring, isLoading } = useRecurringTransactions();

  const schedules = useMemo<PaycheckSchedule[]>(() => {
    return (recurring || [])
      .filter((r: any) => Number(r.amount) > 0 && r.is_active !== false)
      .map((r: any) => ({
        id: r.id,
        merchant: r.merchant || 'Paycheck',
        net_amount: Number(r.amount),
        frequency: r.frequency,
        next_due_date: r.next_due_date,
        account_id: r.account_id,
        is_active: r.is_active !== false,
      }))
      .sort((a, b) => a.next_due_date.localeCompare(b.next_due_date));
  }, [recurring]);

  const primary = schedules[0] || null;

  /** The next few paydays projected from the primary schedule. */
  const upcoming = useMemo(() => {
    if (!primary) return [] as Array<{ date: string; net: number }>;
    const out: Array<{ date: string; net: number }> = [];
    let d = primary.next_due_date;
    for (let i = 0; i < 4; i++) {
      out.push({ date: d, net: primary.net_amount });
      d = nextPayAfter(d, primary.frequency);
    }
    return out;
  }, [primary]);

  return { schedules, primary, upcoming, isLoading };
}

export function useCreatePaycheckSchedule() {
  return useCreateRecurring();
}
export function useUpdatePaycheckSchedule() {
  return useUpdateRecurring();
}
export function useDeletePaycheckSchedule() {
  return useDeleteRecurring();
}
