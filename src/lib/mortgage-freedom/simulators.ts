// Mortgage Freedom strategy simulators.
// Pure, deterministic math — safe to unit test.

export interface StrategyInputs {
  mortgageBalance: number;
  mortgageRate: number;      // annual %
  remainingMonths: number;   // remaining loan term
  monthlyPayment: number;    // current P&I payment
  monthlySurplus: number;    // free cash flow after all obligations
  homeValue: number;

  // Optional accelerators
  extraMonthly?: number;
  quarterlyExtra?: number;
  annualLump?: number;
  biweekly?: boolean;
  taxRefund?: number;
  annualBonus?: number;

  // HELOC strategy
  helocRate?: number;        // annual %
  helocLimit?: number;
  helocSweepPct?: number;    // % of surplus swept
}

export interface StrategyResult {
  strategy: 'traditional' | 'extra-principal' | 'heloc-accel' | 'first-lien-heloc';
  months: number;
  years: number;
  totalInterest: number;
  totalPaid: number;
  payoffDate: Date;
  monthlyPayment: number;
  yearsSaved: number;
  interestSaved: number;
  schedule: { month: number; balance: number; interest: number; principal: number }[];
  riskScore: number;      // 0-100 (higher = riskier)
  cashFlowScore: number;  // 0-100 (higher = healthier)
}

function makeDate(monthsFromNow: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + Math.ceil(monthsFromNow));
  return d;
}

// ─── Strategy A: Traditional mortgage ───
export function simulateTraditional(inp: StrategyInputs): StrategyResult {
  const r = inp.mortgageRate / 100 / 12;
  const payment = inp.monthlyPayment;
  let balance = inp.mortgageBalance;
  let totalInterest = 0;
  const schedule: StrategyResult['schedule'] = [];

  for (let m = 1; m <= Math.max(inp.remainingMonths, 600); m++) {
    const interest = balance * r;
    const principal = Math.min(payment - interest, balance);
    balance = Math.max(0, balance - principal);
    totalInterest += interest;
    schedule.push({ month: m, balance, interest, principal });
    if (balance <= 0.01) break;
  }

  return {
    strategy: 'traditional',
    months: schedule.length,
    years: schedule.length / 12,
    totalInterest,
    totalPaid: totalInterest + inp.mortgageBalance,
    payoffDate: makeDate(schedule.length),
    monthlyPayment: payment,
    yearsSaved: 0,
    interestSaved: 0,
    schedule,
    riskScore: 5,
    cashFlowScore: 80,
  };
}

// ─── Strategy B: Extra principal ───
export function simulateExtraPrincipal(inp: StrategyInputs, baseline: StrategyResult): StrategyResult {
  const r = inp.mortgageRate / 100 / 12;
  const basePayment = inp.monthlyPayment;
  const extraMonthly = inp.extraMonthly ?? 0;
  const quarterlyExtra = inp.quarterlyExtra ?? 0;
  const annualLump = inp.annualLump ?? 0;
  const taxRefund = inp.taxRefund ?? 0;
  const annualBonus = inp.annualBonus ?? 0;
  const biweeklyBoost = inp.biweekly ? basePayment / 12 : 0; // 13th payment/yr equiv

  let balance = inp.mortgageBalance;
  let totalInterest = 0;
  const schedule: StrategyResult['schedule'] = [];

  for (let m = 1; m <= 600; m++) {
    const interest = balance * r;
    let pay = basePayment + extraMonthly + biweeklyBoost;
    if (m % 3 === 0) pay += quarterlyExtra;
    if (m % 12 === 0) pay += annualLump + taxRefund + annualBonus;

    const principal = Math.min(pay - interest, balance);
    balance = Math.max(0, balance - principal);
    totalInterest += interest;
    schedule.push({ month: m, balance, interest, principal });
    if (balance <= 0.01) break;
  }

  const yearsSaved = (baseline.months - schedule.length) / 12;
  const interestSaved = baseline.totalInterest - totalInterest;

  return {
    strategy: 'extra-principal',
    months: schedule.length,
    years: schedule.length / 12,
    totalInterest,
    totalPaid: totalInterest + inp.mortgageBalance +
      (schedule.length * extraMonthly) +
      (Math.floor(schedule.length / 3) * quarterlyExtra) +
      (Math.floor(schedule.length / 12) * (annualLump + taxRefund + annualBonus)),
    payoffDate: makeDate(schedule.length),
    monthlyPayment: basePayment + extraMonthly + biweeklyBoost,
    yearsSaved,
    interestSaved,
    schedule,
    riskScore: 10,
    cashFlowScore: Math.max(40, 80 - (extraMonthly / Math.max(inp.monthlySurplus, 1)) * 30),
  };
}

// ─── Strategy C: HELOC acceleration (2nd-lien chunking, sweep-style) ───
// Model: monthly surplus flows against HELOC balance; HELOC pays down mortgage
// principal via periodic chunks. Interest accrues on avg daily balance approx.
export function simulateHelocAccel(inp: StrategyInputs, baseline: StrategyResult): StrategyResult {
  const mRate = inp.mortgageRate / 100 / 12;
  const hRate = (inp.helocRate ?? 8) / 100 / 12;
  const surplus = Math.max(0, inp.monthlySurplus);
  const sweepPct = (inp.helocSweepPct ?? 100) / 100;
  const chunkSize = Math.max(2500, surplus * 4);
  const limit = inp.helocLimit ?? Math.max(20000, chunkSize * 3);

  let mortgage = inp.mortgageBalance;
  let heloc = 0;
  let totalMortgageInterest = 0;
  let totalHelocInterest = 0;
  const schedule: StrategyResult['schedule'] = [];

  for (let m = 1; m <= 600; m++) {
    // 1. Interest on both
    const mI = mortgage * mRate;
    const hI = heloc * hRate;

    // 2. Mortgage payment (regular)
    const mPrincipal = Math.min(inp.monthlyPayment - mI, mortgage);
    mortgage = Math.max(0, mortgage - mPrincipal);

    // 3. Surplus sweeps against HELOC first
    const toHeloc = surplus * sweepPct;
    heloc = Math.max(0, heloc - toHeloc);

    // 4. If HELOC is clear and mortgage > 0, draw a chunk
    if (heloc <= 1 && mortgage > chunkSize && (heloc + chunkSize) <= limit) {
      heloc += chunkSize;
      mortgage = Math.max(0, mortgage - chunkSize);
    }

    totalMortgageInterest += mI;
    totalHelocInterest += hI;
    const balance = mortgage + heloc;
    schedule.push({ month: m, balance, interest: mI + hI, principal: mPrincipal + toHeloc });

    if (balance <= 0.01) break;
  }

  const totalInterest = totalMortgageInterest + totalHelocInterest;
  const yearsSaved = (baseline.months - schedule.length) / 12;

  return {
    strategy: 'heloc-accel',
    months: schedule.length,
    years: schedule.length / 12,
    totalInterest,
    totalPaid: totalInterest + inp.mortgageBalance,
    payoffDate: makeDate(schedule.length),
    monthlyPayment: inp.monthlyPayment + surplus * sweepPct,
    yearsSaved,
    interestSaved: baseline.totalInterest - totalInterest,
    schedule,
    riskScore: 55, // variable rate + discipline required
    cashFlowScore: Math.max(50, 90 - Math.min(30, (chunkSize / Math.max(surplus * 12, 1)) * 100)),
  };
}

// ─── Strategy D: 1st-lien HELOC as primary loan (all-in-one) ───
export function simulateFirstLienHeloc(inp: StrategyInputs, baseline: StrategyResult): StrategyResult {
  const hRate = (inp.helocRate ?? 8) / 100 / 12;
  const totalIncome = inp.monthlyPayment + inp.monthlySurplus + inp.mortgageBalance * 0.005; // rough
  const monthlyIncome = Math.max(inp.monthlyPayment + inp.monthlySurplus, 3000);
  const monthlyExpenses = Math.max(inp.monthlyPayment, 1500); // living

  let balance = inp.mortgageBalance;
  let totalInterest = 0;
  const schedule: StrategyResult['schedule'] = [];

  for (let m = 1; m <= 600; m++) {
    // Deposit income
    balance = Math.max(0, balance - monthlyIncome);
    // Draw expenses
    balance += monthlyExpenses;
    // Interest on approx avg balance
    const interest = balance * hRate;
    balance += interest;
    totalInterest += interest;
    schedule.push({ month: m, balance, interest, principal: monthlyIncome - monthlyExpenses });
    if (balance <= 0.01) break;
  }

  const yearsSaved = (baseline.months - schedule.length) / 12;

  return {
    strategy: 'first-lien-heloc',
    months: schedule.length,
    years: schedule.length / 12,
    totalInterest,
    totalPaid: totalInterest + inp.mortgageBalance,
    payoffDate: makeDate(schedule.length),
    monthlyPayment: monthlyExpenses,
    yearsSaved,
    interestSaved: baseline.totalInterest - totalInterest,
    schedule,
    riskScore: 65,
    cashFlowScore: 75,
  };
}

export function runAllStrategies(inp: StrategyInputs) {
  const traditional = simulateTraditional(inp);
  const extraPrincipal = simulateExtraPrincipal(inp, traditional);
  const helocAccel = simulateHelocAccel(inp, traditional);
  const firstLien = simulateFirstLienHeloc(inp, traditional);
  return { traditional, extraPrincipal, helocAccel, firstLien };
}
