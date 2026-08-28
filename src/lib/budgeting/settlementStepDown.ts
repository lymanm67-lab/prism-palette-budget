// Debt Settlement Step-Down & Fee Reserve engine (PrismMoney §27)
//
// Core rule: temporarily freed debt cash flow is NOT permanently available
// until every known future obligation (settlement fees, new debt payments)
// has been accounted for.

export interface StepDown {
  /** YYYY-MM the reduction takes effect */
  month: string;
  /** positive dollar amount the regular payment drops by */
  reduction: number;
  note?: string;
}

export interface SettlementFee {
  /** YYYY-MM-DD due date */
  date: string;
  amount: number;
}

export interface NewObligation {
  month: string;
  label: string;
  amount: number;
}

export const SETTLEMENT_BASELINE = 888;

export const SETTLEMENT_STEP_DOWNS: StepDown[] = [
  { month: '2026-09', reduction: 256, note: 'First scheduled reduction' },
  { month: '2026-10', reduction: 49, note: 'Second scheduled reduction' },
  { month: '2027-01', reduction: 583, note: 'Regular payments reach $0' },
];

export const SETTLEMENT_FEES: SettlementFee[] = [
  { date: '2027-02-04', amount: 371.48 },
  { date: '2027-03-04', amount: 555.15 },
  { date: '2027-04-06', amount: 355.28 },
];

/** New debt obligations that consume freed cash flow. */
export const NEW_OBLIGATIONS: NewObligation[] = [
  { month: '2027-01', label: 'Student loan / PSLF payment', amount: 390 },
];

/** Reserve funding window: Sep 2026 → Jan 2027 (5 months). */
export const RESERVE_MONTHS = ['2026-09', '2026-10', '2026-11', '2026-12', '2027-01'];

export const totalSettlementFees = () =>
  round2(SETTLEMENT_FEES.reduce((s, f) => s + f.amount, 0));

export const reserveMonthlyTarget = () =>
  round2(totalSettlementFees() / RESERVE_MONTHS.length);

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

const monthKey = (d: string) => d.slice(0, 7);
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export interface SettlementMonthState {
  month: string;
  /** regular settlement payment due this month */
  regularPayment: number;
  /** cumulative reduction vs the $888 baseline */
  cashFlowReleased: number;
  /** recommended reserve contribution this month */
  reserveContribution: number;
  /** reserve balance at end of month, after fees paid */
  reserveBalance: number;
  /** settlement fees due this month */
  feesDue: number;
  /** new debt obligations that started on/before this month */
  newObligations: number;
  /** released − reserve contribution − new obligations */
  netRedirectable: number;
  regularPaymentsComplete: boolean;
  settlementFullyComplete: boolean;
}

export interface SettlementPlan {
  baseline: number;
  months: SettlementMonthState[];
  current: SettlementMonthState;
  reserveTarget: number;
  reserveMonthly: number;
  nextFee: SettlementFee | null;
  finalFeeDate: string;
  regularPaymentsEndMonth: string;
  /** permanent monthly cash-flow improvement once settlement is fully complete */
  permanentImprovement: number;
  timeline: {
    month: string;
    label: string;
    detail: string;
    kind: 'baseline' | 'reduction' | 'fee' | 'obligation' | 'complete';
  }[];
  /** unused reserve after final fee, if any */
  leftoverReserve: number;
}

/**
 * Builds the month-by-month settlement plan from Aug 2026 through the month
 * after the final known fee.
 */
export function buildSettlementPlan(currentMonth: string): SettlementPlan {
  const start = '2026-08';
  const end = '2027-05';
  const months: SettlementMonthState[] = [];

  let regular = SETTLEMENT_BASELINE;
  let reserveBalance = 0;
  let reserveFunded = 0;
  const reserveTarget = totalSettlementFees();
  const reserveMonthly = reserveMonthlyTarget();
  const regularPaymentsEndMonth = '2027-01';
  const finalFeeDate = SETTLEMENT_FEES[SETTLEMENT_FEES.length - 1].date;
  const finalFeeMonth = monthKey(finalFeeDate);

  let cursor = start;
  while (cmp(cursor, end) <= 0) {
    const step = SETTLEMENT_STEP_DOWNS.find((s) => s.month === cursor);
    if (step) regular = round2(Math.max(0, regular - step.reduction));

    const released = round2(SETTLEMENT_BASELINE - regular);

    // Fund the reserve only while inside the funding window and short of target.
    let contribution = 0;
    if (RESERVE_MONTHS.includes(cursor) && reserveFunded < reserveTarget) {
      contribution = round2(Math.min(reserveMonthly, reserveTarget - reserveFunded));
      reserveFunded = round2(reserveFunded + contribution);
      reserveBalance = round2(reserveBalance + contribution);
    }

    const feesDue = round2(
      SETTLEMENT_FEES.filter((f) => monthKey(f.date) === cursor).reduce((s, f) => s + f.amount, 0),
    );
    if (feesDue) reserveBalance = round2(reserveBalance - feesDue);

    const newObligations = round2(
      NEW_OBLIGATIONS.filter((o) => cmp(o.month, cursor) <= 0).reduce((s, o) => s + o.amount, 0),
    );

    months.push({
      month: cursor,
      regularPayment: regular,
      cashFlowReleased: released,
      reserveContribution: contribution,
      reserveBalance,
      feesDue,
      newObligations,
      netRedirectable: round2(released - contribution - newObligations),
      regularPaymentsComplete: cmp(cursor, regularPaymentsEndMonth) >= 0 && regular === 0,
      settlementFullyComplete: cmp(cursor, finalFeeMonth) > 0,
    });

    // advance month
    const [y, m] = cursor.split('-').map(Number);
    const nd = new Date(Date.UTC(y, m, 1));
    cursor = `${nd.getUTCFullYear()}-${String(nd.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  const current =
    months.find((m) => m.month === currentMonth) ??
    (cmp(currentMonth, start) < 0 ? months[0] : months[months.length - 1]);

  const nextFee =
    SETTLEMENT_FEES.find((f) => cmp(monthKey(f.date), currentMonth) >= 0) ?? null;

  const totalNewObligations = round2(NEW_OBLIGATIONS.reduce((s, o) => s + o.amount, 0));

  const last = months[months.length - 1];

  return {
    baseline: SETTLEMENT_BASELINE,
    months,
    current,
    reserveTarget,
    reserveMonthly,
    nextFee,
    finalFeeDate,
    regularPaymentsEndMonth,
    permanentImprovement: round2(SETTLEMENT_BASELINE - totalNewObligations),
    leftoverReserve: Math.max(0, last.reserveBalance),
    timeline: [
      { month: '2026-08', label: 'Baseline', detail: '$888.00 monthly settlement payment', kind: 'baseline' },
      { month: '2026-09', label: '−$256.00', detail: 'Regular payment → $632.00', kind: 'reduction' },
      { month: '2026-10', label: '−$49.00', detail: 'Regular payment → $583.00', kind: 'reduction' },
      { month: '2026-11', label: 'Hold', detail: 'Regular payment stays $583.00', kind: 'baseline' },
      { month: '2027-01', label: '−$583.00', detail: 'Regular payments reach $0 · +$390.00 PSLF begins', kind: 'obligation' },
      { month: '2027-02', label: 'Fee $371.48', detail: 'Due Feb 4, 2027', kind: 'fee' },
      { month: '2027-03', label: 'Fee $555.15', detail: 'Due Mar 4, 2027', kind: 'fee' },
      { month: '2027-04', label: 'Fee $355.28', detail: 'Final known fee, due Apr 6, 2027 → Settlement complete', kind: 'complete' },
    ],
  };
}

/** January 2027 transition math shown explicitly to the user. */
export function januaryTransition() {
  const reduction = 583;
  const pslf = 390;
  return {
    reduction,
    pslf,
    net: round2(reduction - pslf),
    alreadyReleased: 305, // Sep ($256) + Oct ($49), tracked separately
  };
}
