/**
 * Deferred-withdrawal + withdrawal-tax engine.
 *
 * Models the "let it compound, touch it late" strategy:
 *   - No withdrawals until `deferUntilAge` (default 85)
 *   - First withdrawal at `withdrawalStartAge` (default 86) at `withdrawalRatePct` (default 2.5%)
 *   - Estimates federal + state tax owed on each withdrawal
 *   - Flags IRS Required Minimum Distributions (RMDs), which can force
 *     withdrawals earlier than the chosen strategy.
 *
 * Pure functions — no React, no I/O.
 */

import { taxOn, marginalRate, type TaxBracket } from './tax';

/** SECURE 2.0 RMD start age. 73 for those born 1951–1959, 75 for born 1960 or later. */
export function rmdStartAge(birthYear: number): number {
  if (birthYear >= 1960) return 75;
  if (birthYear >= 1951) return 73;
  return 72;
}

/** IRS Uniform Lifetime Table (2022+) distribution periods. */
const UNIFORM_LIFETIME: Record<number, number> = {
  72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1,
  80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4,
  88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9,
  96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4, 101: 6.0, 102: 5.6, 103: 5.2,
  104: 4.9, 105: 4.6, 106: 4.3, 107: 4.1, 108: 3.9, 109: 3.7, 110: 3.5,
};

export function uniformLifetimeFactor(age: number): number {
  const a = Math.max(72, Math.min(110, Math.round(age)));
  return UNIFORM_LIFETIME[a] ?? 3.5;
}

export interface DeferredWithdrawalInputs {
  /** Portfolio balance at `startAge` (usually the plan's projected balance at retirement age). */
  startingBalance: number;
  startAge: number;
  /** Portfolio is left untouched through this age. */
  deferUntilAge: number;
  /** First withdrawal happens at this age. */
  withdrawalStartAge: number;
  /** Annual withdrawal rate applied to the prior year-end balance. */
  withdrawalRatePct: number;
  /** Model through this age. */
  throughAge: number;
  expectedReturnPct: number;

  /** Share of the portfolio held in pre-tax (traditional) accounts — fully taxable on withdrawal. */
  pretaxSharePct: number;
  /** Share in Roth — tax-free, no RMD. Remainder is treated as taxable brokerage (basis-adjusted). */
  rothSharePct: number;
  /** For the taxable-brokerage slice, the share of a withdrawal treated as long-term gain. */
  brokerageGainSharePct?: number;
  /** Long-term capital gains rate applied to the brokerage gain slice. */
  ltcgRatePct?: number;

  /** Other ordinary income in retirement (pension + taxable Social Security), today's dollars. */
  otherTaxableIncome: number;
  brackets: TaxBracket[];
  /** Flat state income tax rate (Ohio ≈ 2.75%). */
  stateTaxRatePct: number;
  /** Birth year — drives the RMD start age. */
  birthYear: number;
  /** Include RMD enforcement (withdraw at least the RMD from the pre-tax slice). */
  enforceRmd: boolean;
}

export interface WithdrawalYear {
  age: number;
  startBalance: number;
  /** What the chosen strategy would take. */
  strategyWithdrawal: number;
  /** IRS-required minimum from the pre-tax slice (0 before RMD age). */
  rmdRequired: number;
  /** Actual gross withdrawal taken (max of strategy and RMD when enforced). */
  grossWithdrawal: number;
  ordinaryTaxable: number;
  capitalGains: number;
  federalTax: number;
  stateTax: number;
  totalTax: number;
  netIncome: number;
  effectiveTaxRatePct: number;
  marginalRatePct: number;
  endBalance: number;
  rmdForced: boolean;
}

export interface DeferredWithdrawalResult {
  years: WithdrawalYear[];
  balanceAtDeferAge: number;
  firstWithdrawal: WithdrawalYear | null;
  totalGross: number;
  totalTax: number;
  totalNet: number;
  endingBalance: number;
  blendedTaxRatePct: number;
  rmdAge: number;
  /** True when RMDs begin before the chosen withdrawal start age. */
  rmdConflict: boolean;
  /** Total tax paid on RMDs taken before the intended withdrawal start age. */
  preStrategyRmdTax: number;
}

export function runDeferredWithdrawal(inp: DeferredWithdrawalInputs): DeferredWithdrawalResult {
  const r = (inp.expectedReturnPct || 0) / 100;
  const pretax = Math.max(0, Math.min(100, inp.pretaxSharePct)) / 100;
  const roth = Math.max(0, Math.min(100, inp.rothSharePct)) / 100;
  const brokerage = Math.max(0, 1 - pretax - roth);
  const gainShare = (inp.brokerageGainSharePct ?? 60) / 100;
  const ltcg = (inp.ltcgRatePct ?? 15) / 100;
  const stateRate = (inp.stateTaxRatePct || 0) / 100;
  const rmdAge = rmdStartAge(inp.birthYear);

  let pretaxBal = inp.startingBalance * pretax;
  let rothBal = inp.startingBalance * roth;
  let brokerBal = inp.startingBalance * brokerage;

  const years: WithdrawalYear[] = [];
  let balanceAtDeferAge = 0;
  let totalGross = 0;
  let totalTax = 0;
  let totalNet = 0;
  let preStrategyRmdTax = 0;

  for (let age = inp.startAge + 1; age <= inp.throughAge; age++) {
    // Grow first
    pretaxBal *= 1 + r;
    rothBal *= 1 + r;
    brokerBal *= 1 + r;
    const startBalance = pretaxBal + rothBal + brokerBal;

    const strategyOn = age >= inp.withdrawalStartAge;
    const strategyWithdrawal = strategyOn ? startBalance * (inp.withdrawalRatePct / 100) : 0;

    const rmdRequired =
      inp.enforceRmd && age >= rmdAge && pretaxBal > 0
        ? pretaxBal / uniformLifetimeFactor(age)
        : 0;

    // Pre-tax slice must satisfy the RMD; strategy withdrawal is drawn pro-rata across buckets.
    const pretaxFromStrategy = startBalance > 0 ? strategyWithdrawal * (pretaxBal / startBalance) : 0;
    const pretaxDraw = Math.min(pretaxBal, Math.max(pretaxFromStrategy, rmdRequired));
    const rothDraw = Math.min(rothBal, startBalance > 0 ? strategyWithdrawal * (rothBal / startBalance) : 0);
    const brokerDraw = Math.min(brokerBal, startBalance > 0 ? strategyWithdrawal * (brokerBal / startBalance) : 0);

    const gross = pretaxDraw + rothDraw + brokerDraw;

    const ordinaryTaxable = pretaxDraw;
    const capitalGains = brokerDraw * gainShare;

    const baseIncome = inp.otherTaxableIncome;
    const fedOnBase = taxOn(baseIncome, inp.brackets);
    const fedWithDraw = taxOn(baseIncome + ordinaryTaxable, inp.brackets);
    const federalOrdinary = Math.max(0, fedWithDraw - fedOnBase);
    const federalTax = federalOrdinary + capitalGains * ltcg;
    const stateTax = (ordinaryTaxable + capitalGains) * stateRate;
    const tax = federalTax + stateTax;

    pretaxBal -= pretaxDraw;
    rothBal -= rothDraw;
    brokerBal -= brokerDraw;

    const row: WithdrawalYear = {
      age,
      startBalance,
      strategyWithdrawal,
      rmdRequired,
      grossWithdrawal: gross,
      ordinaryTaxable,
      capitalGains,
      federalTax,
      stateTax,
      totalTax: tax,
      netIncome: gross - tax,
      effectiveTaxRatePct: gross > 0 ? (tax / gross) * 100 : 0,
      marginalRatePct: marginalRate(baseIncome + ordinaryTaxable, inp.brackets) * 100,
      endBalance: pretaxBal + rothBal + brokerBal,
      rmdForced: rmdRequired > pretaxFromStrategy + 0.01,
    };
    years.push(row);

    if (age === inp.deferUntilAge) balanceAtDeferAge = row.endBalance;
    totalGross += gross;
    totalTax += tax;
    totalNet += row.netIncome;
    if (age < inp.withdrawalStartAge) preStrategyRmdTax += tax;
  }

  return {
    years,
    balanceAtDeferAge,
    firstWithdrawal: years.find((y) => y.age === inp.withdrawalStartAge) ?? null,
    totalGross,
    totalTax,
    totalNet,
    endingBalance: years.length ? years[years.length - 1].endBalance : inp.startingBalance,
    blendedTaxRatePct: totalGross > 0 ? (totalTax / totalGross) * 100 : 0,
    rmdAge,
    rmdConflict: inp.enforceRmd && rmdAge < inp.withdrawalStartAge,
    preStrategyRmdTax,
  };
}
