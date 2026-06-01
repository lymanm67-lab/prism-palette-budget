export type Moment = 'all' | 'today' | 'week' | 'month' | 'long';

export const CARD_MOMENT: Record<number, Moment> = {
  1: 'today',
  2: 'week',
  3: 'week',
  4: 'long',
  5: 'today',
  6: 'month',
  7: 'today',
  8: 'week',
  9: 'month',
  10: 'long',
};

export const MOMENT_LABEL: Record<Moment, string> = {
  all: 'All',
  today: 'Today',
  week: 'This week',
  month: 'This month',
  long: 'Long game',
};
