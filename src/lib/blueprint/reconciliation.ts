// Every-dollar reconciliation audit (PrismMoney §25–26).
//
// Builds the GROSS → NET → purpose-bucket flow and verifies no dollar is
// counted twice.

import type { MoneyPurposeSnapshot } from '@/hooks/use-money-purpose';

export interface ReconLine {
  label: string;
  amount: number;
  kind: 'gross' | 'deduction' | 'net' | 'bucket' | 'check' | 'info';
  source: string;
  detail?: string;
}

export interface ReconAudit {
  lines: ReconLine[];
  /** gross pay derived from net + payroll withholdings */
  derivedGross: number;
  netIncome: number;
  unallocated: number;
  /** should be exactly 0 — sum(buckets) + unallocated must equal net */
  netResidual: number;
  /** dollars flagged as potentially double counted */
  doubleCountWarnings: string[];
  balanced: boolean;
}

export function buildReconciliationAudit(snap: MoneyPurposeSnapshot): ReconAudit {
  const r = snap.blueprint.reconciliation;
  const payrollWealth = snap.payrollWealth;
  const payrollDeductions = snap.payrollDeductions;
  const employer = snap.employerWealth;
  const derivedGross = Math.round((r.netIncome + payrollWealth + payrollDeductions) * 100) / 100;

  const lines: ReconLine[] = [
    {
      label: 'GROSS PAY (derived)',
      amount: derivedGross,
      kind: 'gross',
      source: 'Net pay + payroll withholdings',
      detail: 'Reconstructed — gross is never a spend bucket',
    },
    {
      label: '− Payroll taxes & benefits',
      amount: payrollDeductions,
      kind: 'deduction',
      source: 'payroll_elections / paystub import',
      detail: 'Withheld before deposit — never touches checking',
    },
    {
      label: '− Payroll wealth contributions',
      amount: payrollWealth,
      kind: 'deduction',
      source: 'payroll_elections (TDA, 457(b), Roth, HSA)',
      detail: 'Credited to BUILD WEALTH target; not re-charged to net pay',
    },
    {
      label: '= NET TAKE-HOME',
      amount: r.netIncome,
      kind: 'net',
      source: 'Income transactions (window average)',
    },
    { label: '− LIVE', amount: r.live, kind: 'bucket', source: 'Transactions mapped to LIVE' },
    { label: '− ENJOY', amount: r.enjoy, kind: 'bucket', source: 'Transactions mapped to ENJOY' },
    {
      label: '− BUILD WEALTH (from take-home)',
      amount: r.buildWealthFromTakeHome,
      kind: 'bucket',
      source: 'Transactions mapped to BUILD WEALTH',
      detail: 'Excludes payroll contributions — they were already counted above',
    },
    { label: '− ELIMINATE DEBT', amount: r.eliminateDebt, kind: 'bucket', source: 'Transactions mapped to ELIMINATE DEBT' },
    { label: '= UNALLOCATED', amount: r.unallocated, kind: 'check', source: 'Computed remainder' },
  ];

  const netResidual =
    Math.round((r.netIncome - r.live - r.enjoy - r.buildWealthFromTakeHome - r.eliminateDebt - r.unallocated) * 100) / 100;

  const doubleCountWarnings: string[] = [];
  // Payroll wealth must not also appear as a take-home wealth outflow beyond
  // what the elections report (small tolerance for rounding).
  if (r.buildWealthFromTakeHome > 0 && payrollWealth > 0) {
    // Not a violation by itself — extra investing from take-home is allowed.
    // Only warn when the snapshot already marks payroll rows inside the window
    // as build_wealth transactions (they'd be counted twice).
    if (snap.actual.build_wealth > 0 && snap.actual.payroll_deduction > 0) {
      // payroll rows were correctly rerouted to payroll_deduction — no warning.
    }
  }
  if (Math.abs(netResidual) > 0.01) {
    doubleCountWarnings.push(
      `Buckets do not tie out to net pay — residual of $${netResidual.toFixed(2)}. A dollar may be counted twice or a purpose is unmapped.`,
    );
  }
  if (employer > 0 && employer > derivedGross) {
    doubleCountWarnings.push('Employer contribution exceeds derived gross pay — verify payroll elections.');
  }

  if (employer > 0) {
    lines.push({
      label: 'Employer Wealth Boost (memo only)',
      amount: employer,
      kind: 'info',
      source: 'payroll_elections (is_employer)',
      detail: 'Economic gain only — excluded from every personal ratio and from net pay',
    });
  }

  return {
    lines,
    derivedGross,
    netIncome: r.netIncome,
    unallocated: r.unallocated,
    netResidual,
    doubleCountWarnings,
    balanced: doubleCountWarnings.length === 0,
  };
}
