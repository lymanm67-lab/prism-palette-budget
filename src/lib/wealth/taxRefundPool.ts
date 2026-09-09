/**
 * Tax Refund Pool — one pool per year so refund dollars are never spent twice.
 * Pure functions only.
 */
export type RefundDestination = 'buffer' | 'investing' | 'savings' | 'debt' | 'other';

export const REFUND_DESTINATION_LABELS: Record<RefundDestination, string> = {
  buffer: 'Buffer',
  investing: 'Investing',
  savings: 'Savings',
  debt: 'Debt',
  other: 'Other',
};

export interface RefundAssignment {
  id: string;
  destination: RefundDestination;
  amount: number;
  label?: string;
  /** Investing redirects are spread monthly across the year. */
  monthlySpread?: boolean;
}

export interface RefundYear {
  year: number;
  /** Actual (or expected) refund dollars available. */
  refundAmount: number;
  status: 'confirmed' | 'planned' | 'estimated';
  assignments: RefundAssignment[];
}

export interface RefundYearResult {
  year: number;
  refundAmount: number;
  assigned: number;
  unassigned: number;
  overAllocated: number;
  conflicts: RefundDestination[];
  /** Monthly investing redirect the projection may use for this year. */
  investingMonthly: number;
  bufferAmount: number;
}

export function evaluateRefundYear(y: RefundYear): RefundYearResult {
  const assigned = y.assignments.reduce((s, a) => s + Math.max(0, a.amount), 0);
  const over = Math.max(0, assigned - y.refundAmount);
  const buffer = y.assignments
    .filter((a) => a.destination === 'buffer')
    .reduce((s, a) => s + a.amount, 0);
  const investingAssigned = y.assignments
    .filter((a) => a.destination === 'investing')
    .reduce((s, a) => s + a.amount, 0);

  // Investing may only use refund dollars left after every other destination.
  const availableForInvesting = Math.max(
    0,
    y.refundAmount - (assigned - investingAssigned),
  );
  const investingAllowed = Math.min(investingAssigned, availableForInvesting);

  return {
    year: y.year,
    refundAmount: y.refundAmount,
    assigned,
    unassigned: Math.max(0, y.refundAmount - assigned),
    overAllocated: over,
    conflicts: over > 0 ? y.assignments.map((a) => a.destination) : [],
    investingMonthly: investingAllowed / 12,
    bufferAmount: Math.min(buffer, y.refundAmount),
  };
}

export function evaluateRefundPool(years: RefundYear[]): RefundYearResult[] {
  return years.map(evaluateRefundYear).sort((a, b) => a.year - b.year);
}

/** Default plan: 2027 buffer $2,000 plus the scheduled investing redirects. */
export function defaultRefundYears(): RefundYear[] {
  return [
    {
      year: 2027,
      refundAmount: 3000,
      status: 'estimated',
      assignments: [
        { id: 'r27-buffer', destination: 'buffer', amount: 2000, label: 'SoFi buffer' },
        { id: 'r27-invest', destination: 'investing', amount: 1000, label: '$83.33/mo invested', monthlySpread: true },
      ],
    },
    {
      year: 2028,
      refundAmount: 2001,
      status: 'estimated',
      assignments: [
        { id: 'r28-invest', destination: 'investing', amount: 2001, label: '$166.76/mo invested', monthlySpread: true },
      ],
    },
    {
      year: 2029,
      refundAmount: 3600,
      status: 'estimated',
      assignments: [
        { id: 'r29-invest', destination: 'investing', amount: 3600, label: '$300/mo invested', monthlySpread: true },
      ],
    },
  ];
}
