import { addDays, addMonths, differenceInCalendarDays, format, parseISO } from 'date-fns';

export type DueKind = 'subscription' | 'bill';

export interface DueItem {
  id: string;
  name: string;
  amount: number;
  kind: DueKind;
  date: string; // yyyy-MM-dd
  frequency: string;
}

/** Plain-English label for a due date, with a tone for colouring. */
export function dueLabel(dateStr?: string | null): { text: string; tone: 'late' | 'today' | 'soon' | 'later' } | null {
  if (!dateStr) return null;
  const due = parseISO(String(dateStr).slice(0, 10));
  if (Number.isNaN(due.getTime())) return null;
  const days = differenceInCalendarDays(due, new Date());
  const when = format(due, 'MMM d');
  if (days < 0) return { text: `${when} · ${Math.abs(days)}d late`, tone: 'late' };
  if (days === 0) return { text: `${when} · today`, tone: 'today' };
  if (days <= 7) return { text: `${when} · in ${days}d`, tone: 'soon' };
  return { text: `${when} · in ${days}d`, tone: 'later' };
}

export const DUE_TONE_CLASS: Record<'late' | 'today' | 'soon' | 'later', string> = {
  late: 'text-prism-rose',
  today: 'text-prism-amber',
  soon: 'text-prism-amber',
  later: 'text-muted-foreground',
};

const stepFrom = (d: Date, frequency: string, direction: 1 | -1) => {
  switch (frequency) {
    case 'weekly':
      return addDays(d, 7 * direction);
    case 'biweekly':
      return addDays(d, 14 * direction);
    case 'quarterly':
      return addMonths(d, 3 * direction);
    case 'yearly':
    case 'annual':
      return addMonths(d, 12 * direction);
    default:
      return addMonths(d, 1 * direction);
  }
};

/**
 * Every occurrence of one recurring item inside [start, end], projected from its
 * known anchor date. Items with no anchor date produce nothing — never guessed.
 */
export function occurrencesInRange(
  anchor: string | null | undefined,
  frequency: string,
  start: Date,
  end: Date,
): string[] {
  if (!anchor) return [];
  let d = parseISO(String(anchor).slice(0, 10));
  if (Number.isNaN(d.getTime())) return [];

  let guard = 0;
  while (d > start && guard++ < 500) d = stepFrom(d, frequency, -1);
  guard = 0;
  const out: string[] = [];
  while (d <= end && guard++ < 500) {
    if (d >= start) out.push(format(d, 'yyyy-MM-dd'));
    d = stepFrom(d, frequency, 1);
  }
  return out;
}

/** Combined subscription + recurring-bill due items for a date range. */
export function buildDueItems(
  subscriptions: any[] | undefined,
  recurring: any[] | undefined,
  start: Date,
  end: Date,
): DueItem[] {
  const out: DueItem[] = [];

  for (const s of subscriptions || []) {
    if (s.is_cancelled) continue;
    const anchor = s.next_expected_date || s.last_charge_date || null;
    const freq = s.frequency || 'monthly';
    for (const date of occurrencesInRange(anchor, freq, start, end)) {
      out.push({
        id: `s-${s.id}-${date}`,
        name: s.merchant || 'Subscription',
        amount: Math.abs(Number(s.average_amount || 0)),
        kind: 'subscription',
        date,
        frequency: freq,
      });
    }
  }

  for (const b of recurring || []) {
    if (b.is_active === false) continue;
    if (Number(b.amount || 0) >= 0) continue; // income is not a bill
    const freq = b.frequency || 'monthly';
    for (const date of occurrencesInRange(b.next_due_date, freq, start, end)) {
      out.push({
        id: `r-${b.id}-${date}`,
        name: b.merchant || b.categories?.name || 'Recurring bill',
        amount: Math.abs(Number(b.amount || 0)),
        kind: 'bill',
        date,
        frequency: freq,
      });
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date) || b.amount - a.amount);
}
