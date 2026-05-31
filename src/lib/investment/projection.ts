/**
 * Investment Planning projection engine.
 * Pure functions — no React, no Supabase. Safe to unit-test.
 *
 * Monthly compounding over (retirement_age - current_age) years.
 * Supports raise schedule, debt-payment redirect, additional contributions,
 * and Social Security invest-while-working stream.
 */

export interface ProjectionInputs {
  currentAge: number;
  retirementAge: number;
  currentBalance: number;
  targetAmount: number;

  monthlyEmployeeContribution: number;
  monthlyEmployerContribution: number;

  expectedReturnPct: number; // 7 = 7%
  annualRaisePct: number;    // 3 = 3%
  raiseRedirectPct: number;  // 100 = invest 100% of raise

  employerMatchPct?: number; // e.g. 9 = 9% of salary; when set, employer contribution grows with salary

  currentMonthlyIncome?: number;

  debtPaymentAmount?: number;
  debtPayoffDate?: string | null; // ISO date — month from this date forward gets redirected

  additionalMonthlyAmount?: number;
  additionalStartDate?: string | null;

  ssMonthlyEstimate?: number;
  ssClaimingAge?: number;
  ssInvestWhileWorking?: boolean;
  ssInvestPct?: number;

  hsaBalance?: number;
  hsaMonthlyContribution?: number;
  hsaEmployerContribution?: number;
  hsaInvested?: boolean;
  hsaReturnPct?: number;

  useFutureDollars?: boolean;
  inflationPct?: number;

  /** Optional per-year annual return overrides (in %). Cycles via modulo if shorter than horizon. */
  annualReturnsPct?: number[];

  /** Dated monthly step-ups: each adds `amount`/mo starting at `startDate`. Stacks with everything else. */
  datedStepUps?: { amount: number; startDate: string }[];
  /** Annual lump-sum contribution applied every January starting in `startYear`. */
  annualLumpSum?: { amount: number; startYear: number };
}

export interface YearPoint {
  age: number;
  year: number;
  balance: number;
  hsaBalance: number;
  totalEmployeeContrib: number;
  totalEmployerContrib: number;
  totalGrowth: number;
  // Cumulative contribution sources (for stacked chart)
  cumStarting: number;
  cumEmployee: number;
  cumEmployer: number;
  cumRaiseRedirect: number;
  cumDebtRedirect: number;
  cumAdditional: number;
  cumSocialSecurity: number;
  cumGrowth: number;
}

export interface ProjectionResult {
  yearly: YearPoint[];
  projectedBalance: number;
  projectedHsaBalance: number;
  totalEmployeeContrib: number;
  totalEmployerContrib: number;
  totalGrowth: number;
  surplus: number; // projected - target (negative = shortfall)
  onTrack: 'green' | 'yellow' | 'red';
  confidenceScore: number; // 0–100
  estimatedMonthlyIncome: number; // 4% rule + SS (post-claim)
  legacyProjection: number;
  requiredMonthlyContribution: number | null;
  status: string; // plain-language summary
}

function monthsBetween(startISO: string | null | undefined, currentMonthIndex: number, startMonthIndex: number): boolean {
  if (!startISO) return false;
  // Just return whether current month index >= the start month index (relative).
  return currentMonthIndex >= startMonthIndex;
}

function monthsFromNow(dateISO: string): number {
  const now = new Date();
  const d = new Date(dateISO);
  return Math.max(0, (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth()));
}

export function runProjection(inputs: ProjectionInputs): ProjectionResult {
  const years = Math.max(0, (inputs.retirementAge || 0) - (inputs.currentAge || 0));
  const totalMonths = years * 12;
  const monthlyRate = (inputs.expectedReturnPct || 0) / 100 / 12;
  const hsaMonthlyRate = (inputs.hsaReturnPct ?? inputs.expectedReturnPct ?? 0) / 100 / 12;
  const annualRaise = (inputs.annualRaisePct || 0) / 100;
  const raiseRedirect = (inputs.raiseRedirectPct || 0) / 100;

  const debtPaymentMonth = inputs.debtPayoffDate ? monthsFromNow(inputs.debtPayoffDate) : -1;
  const additionalMonth = inputs.additionalStartDate ? monthsFromNow(inputs.additionalStartDate) : 0;
  const ssClaimMonth = inputs.ssClaimingAge
    ? Math.max(0, (inputs.ssClaimingAge - inputs.currentAge) * 12)
    : Infinity;

  let balance = inputs.currentBalance || 0;
  let hsaBalance = inputs.hsaBalance || 0;
  let salary = inputs.currentMonthlyIncome || 0;
  let employeeBase = inputs.monthlyEmployeeContribution || 0;
  let employerBase = inputs.monthlyEmployerContribution || 0;
  const employerMatchRate = (inputs.employerMatchPct || 0) / 100;
  let totalEmp = 0;
  let totalErp = 0;
  let totalContribInput = inputs.currentBalance || 0;

  const startBalance = inputs.currentBalance || 0;
  let cumEmployee = 0;
  let cumEmployer = 0;
  let cumRaiseRedirect = 0;
  let cumDebtRedirect = 0;
  let cumAdditional = 0;
  let cumSS = 0;
  // Track raise-redirect portion separately from base employee contribution
  const employeeBaseStart = inputs.monthlyEmployeeContribution || 0;

  const yearly: YearPoint[] = [{
    age: inputs.currentAge,
    year: new Date().getFullYear(),
    balance,
    hsaBalance,
    totalEmployeeContrib: 0,
    totalEmployerContrib: 0,
    totalGrowth: 0,
    cumStarting: startBalance,
    cumEmployee: 0,
    cumEmployer: 0,
    cumRaiseRedirect: 0,
    cumDebtRedirect: 0,
    cumAdditional: 0,
    cumSocialSecurity: 0,
    cumGrowth: 0,
  }];

  const hasMixedReturns = Array.isArray(inputs.annualReturnsPct) && inputs.annualReturnsPct.length > 0;
  let currentMonthlyRate = monthlyRate;
  for (let m = 1; m <= totalMonths; m++) {
    if (hasMixedReturns) {
      const yearIdx = Math.floor((m - 1) / 12);
      const cycle = inputs.annualReturnsPct!;
      currentMonthlyRate = (cycle[yearIdx % cycle.length] || 0) / 100 / 12;
    } else {
      currentMonthlyRate = monthlyRate;
    }
    // Apply raise at start of each year (every 12 months)
    if (m > 1 && m % 12 === 1) {
      const raiseBase = salary > 0 ? salary : employeeBase;
      const raiseAmount = raiseBase * annualRaise;
      // Salary grows by full raise amount
      salary = salary > 0 ? salary + raiseAmount : 0;
      // Employee redirects configured % of the raise into retirement
      employeeBase += raiseAmount * raiseRedirect;
      // Employer contribution scales with salary when employer match % is provided
      if (employerMatchRate > 0 && salary > 0) {
        employerBase = salary * employerMatchRate;
      }
    }

    let monthly = employeeBase + employerBase;
    // Allocate the employee piece into base vs raise-redirect buckets
    const raiseRedirectThisMonth = Math.max(0, employeeBase - employeeBaseStart);
    const baseEmployeeThisMonth = employeeBase - raiseRedirectThisMonth;

    let debtThisMonth = 0;
    if (debtPaymentMonth >= 0 && m >= debtPaymentMonth && inputs.debtPaymentAmount) {
      debtThisMonth = inputs.debtPaymentAmount;
      monthly += debtThisMonth;
    }

    let additionalThisMonth = 0;
    if (m >= additionalMonth && inputs.additionalMonthlyAmount) {
      additionalThisMonth = inputs.additionalMonthlyAmount;
      monthly += additionalThisMonth;
    }

    let ssThisMonth = 0;
    if (
      inputs.ssInvestWhileWorking &&
      inputs.ssMonthlyEstimate &&
      m >= ssClaimMonth
    ) {
      ssThisMonth = (inputs.ssMonthlyEstimate || 0) * ((inputs.ssInvestPct || 0) / 100);
      monthly += ssThisMonth;
    }

    // Compound retirement balance
    balance = balance * (1 + currentMonthlyRate) + monthly;
    totalEmp += employeeBase;
    totalErp += employerBase;
    cumEmployee += baseEmployeeThisMonth;
    cumEmployer += employerBase;
    cumRaiseRedirect += raiseRedirectThisMonth;
    cumDebtRedirect += debtThisMonth;
    cumAdditional += additionalThisMonth;
    cumSS += ssThisMonth;

    // HSA stream
    const hsaMonthly = (inputs.hsaMonthlyContribution || 0) + (inputs.hsaEmployerContribution || 0);
    if (inputs.hsaInvested) {
      hsaBalance = hsaBalance * (1 + hsaMonthlyRate) + hsaMonthly;
    } else {
      hsaBalance += hsaMonthly;
    }

    if (m % 12 === 0) {
      const cumContribAll = startBalance + cumEmployee + cumEmployer + cumRaiseRedirect + cumDebtRedirect + cumAdditional + cumSS;
      const cumGrowth = Math.max(0, balance - cumContribAll);
      yearly.push({
        age: inputs.currentAge + m / 12,
        year: new Date().getFullYear() + m / 12,
        balance,
        hsaBalance,
        totalEmployeeContrib: totalEmp,
        totalEmployerContrib: totalErp,
        totalGrowth: balance - totalContribInput - totalEmp - totalErp,
        cumStarting: startBalance,
        cumEmployee,
        cumEmployer,
        cumRaiseRedirect,
        cumDebtRedirect,
        cumAdditional,
        cumSocialSecurity: cumSS,
        cumGrowth,
      });
    }
  }

  let projectedBalance = balance;
  let projectedHsaBalance = hsaBalance;

  // Today's-dollars adjustment
  if (!inputs.useFutureDollars && inputs.inflationPct) {
    const factor = Math.pow(1 + inputs.inflationPct / 100, years);
    projectedBalance = projectedBalance / factor;
    projectedHsaBalance = projectedHsaBalance / factor;
  }

  const surplus = projectedBalance - (inputs.targetAmount || 0);
  const gapPct = inputs.targetAmount > 0 ? (projectedBalance / inputs.targetAmount) * 100 : 100;
  const onTrack: 'green' | 'yellow' | 'red' =
    gapPct >= 100 ? 'green' : gapPct >= 80 ? 'yellow' : 'red';
  const confidenceScore = Math.max(0, Math.min(100, Math.round(gapPct)));

  // 4% rule monthly + SS once claimed
  const fourPctMonthly = (projectedBalance * 0.04) / 12;
  const ssMonthly = inputs.ssMonthlyEstimate || 0;
  const estimatedMonthlyIncome = fourPctMonthly + ssMonthly;

  // Required monthly contribution (binary search) — skip in recursive solve calls
  let requiredMonthlyContribution: number | null = null;
  if (inputs.targetAmount > 0 && years > 0 && !(inputs as any).__skipSolve) {
    requiredMonthlyContribution = solveRequiredMonthly(inputs);
  }

  const totalGrowth = projectedBalance - totalContribInput - totalEmp - totalErp;
  const legacyProjection = Math.max(0, surplus);

  const status =
    onTrack === 'green'
      ? `On track. Projected ${formatCurrency(projectedBalance)} by age ${inputs.retirementAge}, surplus of ${formatCurrency(Math.abs(surplus))}.`
      : onTrack === 'yellow'
      ? `Close. Projected ${formatCurrency(projectedBalance)} — about ${formatCurrency(Math.abs(surplus))} short of your ${formatCurrency(inputs.targetAmount)} goal.`
      : `Off track. Projected ${formatCurrency(projectedBalance)} vs. target ${formatCurrency(inputs.targetAmount)}. Increase contributions or extend timeline.`;

  return {
    yearly,
    projectedBalance,
    projectedHsaBalance,
    totalEmployeeContrib: totalEmp,
    totalEmployerContrib: totalErp,
    totalGrowth,
    surplus,
    onTrack,
    confidenceScore,
    estimatedMonthlyIncome,
    legacyProjection,
    requiredMonthlyContribution,
    status,
  };
}

function solveRequiredMonthly(inputs: ProjectionInputs): number {
  // Binary search monthly employee contribution to hit target
  let lo = 0;
  let hi = 50000;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const r = runProjection({
      ...inputs,
      monthlyEmployeeContribution: mid,
      // strip raise + debt for clean solve
      annualRaisePct: 0,
      debtPaymentAmount: 0,
      additionalMonthlyAmount: 0,
      ssInvestWhileWorking: false,
      __skipSolve: true,
    } as any);
    if (r.projectedBalance < inputs.targetAmount) lo = mid;
    else hi = mid;
  }
  return Math.round((lo + hi) / 2);
}

export function formatCurrency(n: number): string {
  if (!isFinite(n)) return '$0';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n).toLocaleString()}`;
}

export function formatCurrencyFull(n: number): string {
  if (!isFinite(n)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

// Quick helpers for the standalone tools
export function projectRaiseRedirect(opts: {
  currentMonthlyIncome: number;
  raisePct: number;
  investPct: number;
  yearsToRetirement: number;
  returnPct: number;
  annualRepeat?: boolean;
}): { monthlyRaise: number; redirected: number; futureValue: number } {
  const monthlyRaise = opts.currentMonthlyIncome * (opts.raisePct / 100);
  const redirected = monthlyRaise * (opts.investPct / 100);
  const r = opts.returnPct / 100 / 12;
  const n = opts.yearsToRetirement * 12;
  // FV of growing annuity (simplified: assume flat redirect amount each month)
  const fv = r > 0 ? redirected * ((Math.pow(1 + r, n) - 1) / r) : redirected * n;
  return { monthlyRaise, redirected, futureValue: fv };
}

export function projectDebtToWealth(opts: {
  debtPayment: number;
  redirectPct: number;
  yearsAfterPayoff: number;
  returnPct: number;
}): { monthly: number; totalContrib: number; futureValue: number } {
  const monthly = opts.debtPayment * (opts.redirectPct / 100);
  const r = opts.returnPct / 100 / 12;
  const n = opts.yearsAfterPayoff * 12;
  const fv = r > 0 ? monthly * ((Math.pow(1 + r, n) - 1) / r) : monthly * n;
  return { monthly, totalContrib: monthly * n, futureValue: fv };
}
