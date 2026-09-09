/**
 * Builds the dated wealth events for the projection. Pure TypeScript — callers
 * normalise app data (freed cash, debts, reserves, payroll) into TimelineInput.
 */
import {
  BufferInjection,
  DebtSchedule,
  FlowAssignment,
  FlowInput,
  WealthEvent,
  indexToMonth,
  monthIndex,
  releaseMonthAfterFinalPayment,
  releaseMonthFromEffectiveDate,
} from './sourceOfFunds';
import { RefundYearResult } from './taxRefundPool';

export interface FreedCashInputItem {
  id: string;
  label: string;
  monthly: number;
  /** Explicit effective date — used as-is, no extra month. */
  effectiveDate?: string | null;
  /** Only a final payment date is known — the release starts the month after. */
  finalPaymentDate?: string | null;
  endDate?: string | null;
  reversalDate?: string | null;
  reactivationDate?: string | null;
  status: 'confirmed' | 'planned' | 'estimated';
}

export interface TimelineInput {
  startMonth: string;
  /** Core payroll and employer money. */
  employeeRetirementMonthly: number;
  employerRetirementMonthly: number;
  employeeHsaMonthly: number;
  employerHsaPerDeposit: number;
  employerHsaMonths: number[];
  /** Confirmed accelerators. */
  acceleratorMonthly: number;
  acceleratorStartMonth: string;
  scheduledIncreases: { month: string; amount: number; label: string }[];
  /** Pay raise redirect. */
  monthlyGrossSalary: number;
  annualRaisePct: number;
  raiseMonth: number; // calendar month, 7 = July
  raiseYears: number;
  /** Freed cash. */
  freedCashBaselineMonthly: number;
  freedCashEvents: FreedCashInputItem[];
  /** Buffer. */
  bufferTarget: number;
  bufferStartingBalance: number;
  bufferMonthly: number;
  bufferMonthlyStart: string;
  bufferInjections: BufferInjection[];
  /** Savings and other planned claims on flexible cash. */
  savingsAssignments: FlowAssignment[];
  /** Debts. */
  debts: DebtSchedule[];
  /** Refund pool results, already validated. */
  refunds: RefundYearResult[];
}

export const MONTGOMERY_TIMELINE: TimelineInput = {
  startMonth: '2027-01',
  employeeRetirementMonthly: 340,
  employerRetirementMonthly: 532.05,
  employeeHsaMonthly: 366.67,
  employerHsaPerDeposit: 1000,
  employerHsaMonths: [1, 6],
  acceleratorMonthly: 208,
  acceleratorStartMonth: '2027-01',
  scheduledIncreases: [
    { month: '2028-06', amount: 500, label: 'Scheduled increase — June 2028' },
    { month: '2029-01', amount: 200, label: 'Scheduled increase — January 2029' },
    { month: '2030-01', amount: 500, label: 'Scheduled increase — January 2030' },
  ],
  monthlyGrossSalary: 5911.67,
  annualRaisePct: 3,
  raiseMonth: 7,
  raiseYears: 30,
  freedCashBaselineMonthly: 1832.05,
  freedCashEvents: [
    {
      id: 'fc-betrilink',
      label: 'BetrLink payment ends',
      monthly: 583,
      finalPaymentDate: '2026-12-10',
      status: 'confirmed',
    },
    {
      id: 'fc-trueaccord',
      label: 'True Accord payment ends',
      monthly: 136.14,
      finalPaymentDate: '2026-12-30',
      status: 'confirmed',
    },
    {
      id: 'fc-capitalone',
      label: 'Capital One saving effective',
      monthly: 50,
      effectiveDate: '2027-05-01',
      status: 'confirmed',
    },
  ],
  bufferTarget: 7000,
  bufferStartingBalance: 0,
  bufferMonthly: 300,
  bufferMonthlyStart: '2027-01',
  bufferInjections: [
    { id: 'buf-consult', label: 'October 2026 consulting income', month: '2026-10', amount: 1000, status: 'planned' },
    { id: 'buf-speak', label: 'December 2026 speaking income', month: '2026-12', amount: 2000, status: 'planned' },
    { id: 'buf-refund', label: '2027 tax refund allocation', month: '2027-04', amount: 2000, status: 'estimated' },
  ],
  savingsAssignments: [],
  debts: [
    {
      id: 'student-loan',
      label: 'Student loans (PSLF)',
      balance: 108_000,
      annualRatePct: 5,
      payment: 390,
      startMonth: '2027-01',
      forgivenessMonth: '2032-06', // 65 qualifying payments from January 2027
      release: [
        { toDebtId: 'sba', amount: 219, label: 'to SBA' },
        { amount: 171, label: 'available to next priority' },
      ],
      status: 'estimated',
    },
    {
      id: 'sba',
      label: 'SBA loan',
      balance: 48_000,
      annualRatePct: 3,
      payment: 148,
      startMonth: '2027-01',
      extras: [{ month: '2027-06', amount: 100, label: 'SBA acceleration' }],
      status: 'confirmed',
    },
  ],
  refunds: [],
};

/* -------------------------------- builders --------------------------------- */

function raiseEvents(t: TimelineInput): WealthEvent[] {
  const out: WealthEvent[] = [];
  let gross = t.monthlyGrossSalary;
  const startYear = Number(t.startMonth.split('-')[0]);
  for (let n = 0; n < t.raiseYears; n++) {
    const year = startYear + n;
    const next = gross * (1 + t.annualRaisePct / 100);
    const increment = next - gross;
    gross = next;
    const month = `${year}-${String(t.raiseMonth).padStart(2, '0')}`;
    if (monthIndex(month) < monthIndex(t.startMonth)) continue;
    out.push({
      id: `raise-${year}`,
      label: `${t.annualRaisePct}% raise redirected (${year})`,
      category: 'raise',
      flow: 'core',
      status: 'estimated',
      amount: Number(increment.toFixed(2)),
      recurrence: 'monthly',
      startMonth: month,
      bucket: 'retirement',
      notes: 'Only the incremental raise is added, once per year.',
    });
  }
  return out;
}

function refundEvents(refunds: RefundYearResult[], startMonth: string): WealthEvent[] {
  return refunds
    .filter((r) => r.investingMonthly > 0)
    .map((r) => {
      const start = `${r.year}-01`;
      return {
        id: `refund-invest-${r.year}`,
        label: `Tax refund redirected to investing (${r.year})`,
        category: 'tax_refund' as const,
        flow: 'core' as const,
        status: 'estimated' as const,
        amount: Number(r.investingMonthly.toFixed(2)),
        recurrence: 'monthly' as const,
        startMonth: monthIndex(start) < monthIndex(startMonth) ? startMonth : start,
        endMonth: `${r.year}-12`,
        bucket: 'taxable' as const,
        notes: 'Limited to refund dollars not already assigned elsewhere.',
      };
    });
}

function freedCashEvents(t: TimelineInput): WealthEvent[] {
  const out: WealthEvent[] = [
    {
      id: 'fc-baseline',
      label: 'Freed cash already running',
      category: 'freed_cash',
      flow: 'flexible',
      status: 'confirmed',
      amount: t.freedCashBaselineMonthly,
      recurrence: 'monthly',
      startMonth: t.startMonth,
    },
  ];

  for (const f of t.freedCashEvents) {
    const start = f.effectiveDate
      ? releaseMonthFromEffectiveDate(f.effectiveDate)
      : f.finalPaymentDate
        ? releaseMonthAfterFinalPayment(f.finalPaymentDate)
        : t.startMonth;
    out.push({
      id: f.id,
      label: f.label,
      category: 'freed_cash',
      flow: 'flexible',
      status: f.status,
      amount: f.monthly,
      recurrence: 'monthly',
      startMonth: monthIndex(start) < monthIndex(t.startMonth) ? t.startMonth : start,
      endMonth: f.endDate ? f.endDate.slice(0, 7) : null,
      reversalMonth: f.reversalDate ? f.reversalDate.slice(0, 7) : null,
      reactivationMonth: f.reactivationDate ? f.reactivationDate.slice(0, 7) : null,
    });
  }
  return out;
}

export function buildEventTimeline(t: TimelineInput): FlowInput {
  const events: WealthEvent[] = [
    {
      id: 'ee-retirement',
      label: 'Employee retirement deferrals',
      category: 'employee',
      flow: 'core',
      status: 'confirmed',
      amount: t.employeeRetirementMonthly,
      recurrence: 'monthly',
      startMonth: t.startMonth,
      bucket: 'retirement',
    },
    {
      id: 'er-retirement',
      label: 'Employer retirement contribution',
      category: 'employer',
      flow: 'core',
      status: 'confirmed',
      amount: t.employerRetirementMonthly,
      recurrence: 'monthly',
      startMonth: t.startMonth,
      bucket: 'retirement',
      notes: 'Employer money — never counted as your own saving.',
    },
    {
      id: 'ee-hsa',
      label: 'Employee HSA',
      category: 'employee_hsa',
      flow: 'core',
      status: 'confirmed',
      amount: t.employeeHsaMonthly,
      recurrence: 'monthly',
      startMonth: t.startMonth,
      bucket: 'hsa',
    },
    {
      id: 'er-hsa',
      label: 'Employer HSA deposits',
      category: 'employer_hsa',
      flow: 'core',
      status: 'confirmed',
      amount: t.employerHsaPerDeposit,
      recurrence: 'annual',
      annualMonths: t.employerHsaMonths,
      startMonth: t.startMonth,
      bucket: 'hsa',
      notes: 'Two real deposits a year, not twelve monthly ones.',
    },
    {
      id: 'accelerator',
      label: 'First Million Accelerator',
      category: 'accelerator',
      flow: 'core',
      status: 'confirmed',
      amount: t.acceleratorMonthly,
      recurrence: 'monthly',
      startMonth: t.acceleratorStartMonth,
      bucket: 'taxable',
    },
    ...t.scheduledIncreases.map((s) => ({
      id: `sched-${s.month}`,
      label: s.label,
      category: 'scheduled_increase' as const,
      flow: 'core' as const,
      status: 'planned' as const,
      amount: s.amount,
      recurrence: 'monthly' as const,
      startMonth: s.month,
      bucket: 'taxable' as const,
    })),
    ...raiseEvents(t),
    ...refundEvents(t.refunds, t.startMonth),
    ...freedCashEvents(t),
  ];

  const assignments: FlowAssignment[] = [
    {
      id: 'buffer',
      label: 'SoFi buffer',
      destination: 'buffer',
      monthly: t.bufferMonthly,
      startMonth: t.bufferMonthlyStart,
      targetBalance: t.bufferTarget,
      status: 'planned',
    },
    ...t.savingsAssignments,
  ];

  return {
    events,
    assignments,
    injections: t.bufferInjections,
    debts: t.debts,
  };
}

/** Events the checks panel expects to see fire, with their expected month. */
export function expectedEvents(t: TimelineInput) {
  const out: { id: string; label: string; expectedMonth: string }[] = [
    { id: 'accelerator', label: 'First Million Accelerator', expectedMonth: t.acceleratorStartMonth },
  ];
  for (const f of t.freedCashEvents) {
    const m = f.effectiveDate
      ? releaseMonthFromEffectiveDate(f.effectiveDate)
      : f.finalPaymentDate
        ? releaseMonthAfterFinalPayment(f.finalPaymentDate)
        : t.startMonth;
    out.push({ id: f.id, label: f.label, expectedMonth: monthIndex(m) < monthIndex(t.startMonth) ? t.startMonth : m });
  }
  for (const s of t.scheduledIncreases) {
    out.push({ id: `sched-${s.month}`, label: s.label, expectedMonth: s.month });
  }
  const firstRaiseYear = Number(t.startMonth.split('-')[0]);
  out.push({
    id: `raise-${firstRaiseYear}`,
    label: `${t.annualRaisePct}% raise redirected (${firstRaiseYear})`,
    expectedMonth: `${firstRaiseYear}-${String(t.raiseMonth).padStart(2, '0')}`,
  });
  return out;
}

/** Milestone months worth showing on the contribution timeline. */
export function milestoneMonths(t: TimelineInput, result: { months: { month: string; releases: { label: string }[] }[] }) {
  const set = new Map<string, string>();
  set.set(t.startMonth, 'Projection starts');
  for (const f of t.freedCashEvents) {
    const m = f.effectiveDate
      ? releaseMonthFromEffectiveDate(f.effectiveDate)
      : f.finalPaymentDate
        ? releaseMonthAfterFinalPayment(f.finalPaymentDate)
        : t.startMonth;
    const month = monthIndex(m) < monthIndex(t.startMonth) ? t.startMonth : m;
    set.set(month, f.label);
  }
  for (const s of t.scheduledIncreases) set.set(s.month, s.label);
  const firstRaise = `${Number(t.startMonth.split('-')[0])}-${String(t.raiseMonth).padStart(2, '0')}`;
  set.set(firstRaise, 'First raise redirected');
  for (const m of result.months) {
    if (m.releases.length) set.set(m.month, m.releases[0].label);
  }
  return [...set.entries()]
    .sort((a, b) => monthIndex(a[0]) - monthIndex(b[0]))
    .map(([month, label]) => ({ month, label }));
}

export function nextMonth(month: string): string {
  return indexToMonth(monthIndex(month) + 1);
}
