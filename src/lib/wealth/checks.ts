/**
 * Integrity checks for the Wealth Projection: double counting, reconciliation,
 * event timing, stale values and cross-module conflicts. Pure functions.
 */
import {
  FlowInput,
  FlowResult,
  WealthAssumptions,
  money,
  money2,
  monthIndex,
  monthLabel,
} from './sourceOfFunds';
import { RefundYearResult } from './taxRefundPool';

export type CheckSeverity = 'error' | 'warning' | 'info';

export interface CheckResult {
  id: string;
  severity: CheckSeverity;
  title: string;
  detail: string;
}

export interface CrossModuleValue {
  item: string;
  sourceModule: string;
  sourceValue: number;
  otherModule: string;
  otherValue: number;
}

export function runFlowChecks(
  input: FlowInput,
  result: FlowResult,
  a: WealthAssumptions,
  refunds: RefundYearResult[],
  expectedEventIds: { id: string; label: string; expectedMonth: string }[],
): CheckResult[] {
  const out: CheckResult[] = [];

  /* reconciliation: sources must equal destinations each month */
  if (result.reconciliationErrors.length) {
    const first = result.reconciliationErrors[0];
    out.push({
      id: 'reconciliation',
      severity: 'error',
      title: 'Flow reconciliation error',
      detail: `${monthLabel(first.month)}: money in ${money2(first.expected)} does not equal money out ${money2(
        first.actual,
      )} — a difference of ${money2(Math.abs(first.diff))}. ${result.reconciliationErrors.length} month(s) affected.`,
    });
  }

  /* month count */
  const expectedMonths = result.monthCount;
  if (expectedMonths % 12 !== 0) {
    out.push({
      id: 'month-count',
      severity: 'warning',
      title: 'Unexpected number of months',
      detail: `The projection ran ${expectedMonths} months, which is not a whole number of years.`,
    });
  }

  /* buffer must stop at target */
  const overfunded = result.months.find(
    (m) => m.bufferBalance > a.bufferTarget + 0.01,
  );
  if (overfunded) {
    out.push({
      id: 'buffer-overfunded',
      severity: 'error',
      title: 'Buffer funded past its target',
      detail: `${monthLabel(overfunded.month)}: buffer reached ${money2(
        overfunded.bufferBalance,
      )} against a ${money(a.bufferTarget)} target.`,
    });
  }

  /* core contributions must continue while the buffer is below target */
  const belowTarget = result.months.filter((m) => m.bufferBalance < a.bufferTarget);
  const pausedCore = belowTarget.find((m) => m.coreTotal <= 0);
  if (belowTarget.length && pausedCore) {
    out.push({
      id: 'core-paused',
      severity: 'error',
      title: 'Core contributions paused while the buffer was building',
      detail: `${monthLabel(
        pausedCore.month,
      )} shows no core retirement or HSA money. Core contributions must continue regardless of buffer status.`,
    });
  }

  /* shortfall: debts could not be paid from available cash */
  const short = result.months.find((m) => m.shortfall > 0.01);
  if (short) {
    out.push({
      id: 'shortfall',
      severity: 'warning',
      title: 'Not enough flexible cash for the assigned payments',
      detail: `${monthLabel(short.month)} is short ${money2(short.shortfall)} after the buffer, debts and savings.`,
    });
  }

  /* HSA contributions counted without the HSA balance */
  const hsaContributions = (result.byCategory.employee_hsa || 0) + (result.byCategory.employer_hsa || 0);
  if (hsaContributions > 0 && !a.includeHsa) {
    out.push({
      id: 'hsa-mismatch',
      severity: 'error',
      title: 'HSA money counted but the HSA balance is excluded',
      detail: 'Either include the HSA balance in the total or leave HSA contributions out.',
    });
  }

  /* tax refund double counting */
  for (const r of refunds) {
    if (r.overAllocated > 0.01) {
      out.push({
        id: `refund-${r.year}`,
        severity: 'error',
        title: `Tax refund allocation conflict — ${r.year}`,
        detail: `Refund ${money(r.refundAmount)}, assigned ${money(r.assigned)}, over-allocated ${money(
          r.overAllocated,
        )}. The buffer allocation and the investing redirect cannot use the same dollars.`,
      });
    }
  }

  /* duplicate flexible sources */
  const flex = input.events.filter((e) => e.flow === 'flexible' && e.enabled !== false);
  for (let i = 0; i < flex.length; i++) {
    for (let j = i + 1; j < flex.length; j++) {
      if (
        Math.abs(flex[i].amount - flex[j].amount) < 0.51 &&
        flex[i].startMonth === flex[j].startMonth &&
        flex[i].amount > 0
      ) {
        out.push({
          id: `dupe-${flex[i].id}-${flex[j].id}`,
          severity: 'warning',
          title: 'Possible duplicate funding source',
          detail: `“${flex[i].label}” and “${flex[j].label}” are both ${money2(
            flex[i].amount,
          )}/mo starting ${monthLabel(flex[i].startMonth)}. Check this is not the same money twice.`,
        });
      }
    }
  }

  /* temporary or reversed savings still running to the end */
  const lastMonth = result.months[result.months.length - 1]?.month;
  for (const e of input.events) {
    if (!lastMonth) break;
    if (e.endMonth && monthIndex(e.endMonth) >= monthIndex(lastMonth) && e.amount > 0) {
      out.push({
        id: `temp-${e.id}`,
        severity: 'info',
        title: 'Temporary saving runs the whole projection',
        detail: `“${e.label}” is marked temporary but does not end before ${monthLabel(lastMonth)}.`,
      });
    }
  }

  /* events that never fired */
  for (const ex of expectedEventIds) {
    const fired = result.eventsFired[ex.id];
    if (!fired || fired.total <= 0) {
      out.push({
        id: `missing-${ex.id}`,
        severity: 'warning',
        title: 'Missing future contribution event',
        detail: `“${ex.label}” was expected from ${monthLabel(ex.expectedMonth)} but contributed nothing.`,
      });
    } else if (fired.firstMonth && monthIndex(fired.firstMonth) !== monthIndex(ex.expectedMonth)) {
      out.push({
        id: `timing-${ex.id}`,
        severity: 'warning',
        title: 'Event fired on the wrong month',
        detail: `“${ex.label}” was expected in ${monthLabel(ex.expectedMonth)} but first appears in ${monthLabel(
          fired.firstMonth,
        )}.`,
      });
    }
  }

  return out;
}

/** Diagnostic sanity band for the upper-capacity scenario at 25 years. */
export function validateMagnitude(ending: number, strategyLabel: string): CheckResult | null {
  if (ending < 3_000_000) {
    return {
      id: 'magnitude-low',
      severity: 'warning',
      title: 'Missing future funding sources',
      detail: `${strategyLabel} at 25 years lands at ${money(
        ending,
      )}. Check that the freed-cash releases, scheduled increases, raises and refund redirects all fired.`,
    };
  }
  if (ending > 25_000_000) {
    return {
      id: 'magnitude-high',
      severity: 'warning',
      title: 'Possible duplicate funding source',
      detail: `${strategyLabel} at 25 years lands at ${money(
        ending,
      )}, which is implausibly high. Look for a source entered twice.`,
    };
  }
  return null;
}

/** Cross-module comparison: same item, two modules, different numbers. */
export function crossModuleConflicts(values: CrossModuleValue[]): CheckResult[] {
  return values
    .filter((v) => Math.abs(v.sourceValue - v.otherValue) > 0.51)
    .map((v) => ({
      id: `xmod-${v.item}`,
      severity: 'warning' as CheckSeverity,
      title: `${v.item} differs between pages`,
      detail: `${v.sourceModule} shows ${money2(v.sourceValue)} but ${v.otherModule} shows ${money2(
        v.otherValue,
      )} — a difference of ${money2(Math.abs(v.sourceValue - v.otherValue))}. ${v.sourceModule} is the source of truth.`,
    }));
}
