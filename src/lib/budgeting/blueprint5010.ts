// 50/10/20/20 engine — targets, reconciliation and freedom indicators.
//
// Accounting rules baked in here (see PrismMoney enhancement §18, §20–26):
//  - Net pay is AFTER payroll taxes, benefits and payroll wealth contributions.
//  - Payroll wealth contributions get CREDIT toward the Build Wealth target and
//    are never subtracted from net pay a second time.
//  - Employer contributions are an economic gain: they boost wealth analytics but
//    never count as spendable income or a personal expense.
//  - Business money never enters personal ratios.
//  - Targets are TARGETS, not caps on necessary living costs. LIVE above target is
//    reported as "Above Target", not as uncontrolled overspending.

import { PHASE_TARGETS, PURPOSE_META, statusFor, type FreedomPhase } from './moneyPurpose';

export type CoreKey = 'live' | 'enjoy' | 'build_wealth' | 'eliminate_debt';
export const CORE_KEYS: CoreKey[] = ['live', 'enjoy', 'build_wealth', 'eliminate_debt'];

export interface BlueprintInput {
  /** Take-home cash deposited for the household (net pay + other cash income). */
  netIncome: number;
  /** Actual money that moved from take-home cash, per purpose. */
  actual: Record<CoreKey, number>;
  /** Planned/budgeted amounts from take-home cash, per purpose. */
  planned: Record<CoreKey, number>;
  /** Employee wealth contributions withheld from pay (already inside net-pay math). */
  payrollWealth: number;
  /** Employer-paid retirement/HSA contributions. */
  employerWealth: number;
  phase?: FreedomPhase;
}

export interface BlueprintCard {
  key: CoreKey;
  label: string;
  tooltip: string;
  color: string;
  targetPct: number;
  targetAmount: number;
  actualAmount: number;
  actualPct: number;
  plannedAmount: number;
  variance: number;
  status: 'on' | 'watch' | 'off';
  /** true when the shortfall/overage is structurally acceptable (LIVE above target) */
  aboveTargetLabel?: string;
  /** BUILD WEALTH only: portion already satisfied by payroll withholding */
  fundedByPayroll?: number;
  remainingToTarget?: number;
}

export interface Reconciliation {
  netIncome: number;
  live: number;
  enjoy: number;
  buildWealthFromTakeHome: number;
  eliminateDebt: number;
  unallocated: number;
}

export interface WealthPanel {
  employeePayroll: number;
  fromTakeHome: number;
  employerBoost: number;
  employeeTotal: number;
  combinedTotal: number;
  employeeWealthRate: number;
  totalWealthFundingRate: number;
}

export interface EnjoyRedirect {
  allowance: number;
  spent: number;
  unused: number;
  suggestion: 'debt' | 'wealth';
}

export interface BlueprintOutput {
  phase: FreedomPhase;
  cards: BlueprintCard[];
  reconciliation: Reconciliation;
  wealth: WealthPanel;
  enjoy: EnjoyRedirect;
  indicators: { key: string; label: string; value: string; hint?: string }[];
  alignmentScore: number;
}

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);
const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

/** Phase is derived from how much debt elimination is still running. */
export function derivePhase(debtActual: number, netIncome: number): FreedomPhase {
  const p = pct(debtActual, netIncome);
  if (p <= 0.5) return 3;
  if (p < 15) return 2;
  return 1;
}

export function computeBlueprint5010(input: BlueprintInput): BlueprintOutput {
  const net = Math.max(0, Number(input.netIncome) || 0);
  const payrollWealth = Number(input.payrollWealth) || 0;
  const employerWealth = Number(input.employerWealth) || 0;
  const phase = input.phase ?? derivePhase(input.actual.eliminate_debt, net);
  const targets = PHASE_TARGETS[phase];

  const cards: BlueprintCard[] = CORE_KEYS.map((key) => {
    const meta = PURPOSE_META[key];
    const targetPct = targets[key];
    const targetAmount = Math.round(net * (targetPct / 100) * 100) / 100;

    // Build Wealth counts payroll withholding toward the target without
    // re-charging it against deposited net pay.
    const fromTakeHome = input.actual[key];
    const actualAmount = key === 'build_wealth' ? fromTakeHome + payrollWealth : fromTakeHome;
    const actualPct = pct(actualAmount, net);
    const variance = Math.round((actualAmount - targetAmount) * 100) / 100;

    const card: BlueprintCard = {
      key,
      label: meta.label,
      tooltip: meta.tooltip,
      color: meta.color,
      targetPct,
      targetAmount,
      actualAmount,
      actualPct,
      plannedAmount: input.planned[key],
      variance,
      status: statusFor(key, actualPct, targetPct),
    };

    if (key === 'live' && variance > 0) {
      card.aboveTargetLabel = `Above Target by ${money(variance)}`;
    }
    // Ceiling purposes: coming in under target is a win, so present it as a
    // positive cushion rather than a negative variance.
    if (key !== 'build_wealth' && variance < 0) {
      card.aboveTargetLabel = `Under Target by ${money(-variance)}`;
      card.underTarget = true;
    }
    if (key === 'build_wealth') {
      card.fundedByPayroll = payrollWealth;
      card.remainingToTarget = Math.max(0, Math.round((targetAmount - actualAmount) * 100) / 100);
    }
    return card;
  });

  const reconciliation: Reconciliation = {
    netIncome: net,
    live: input.actual.live,
    enjoy: input.actual.enjoy,
    buildWealthFromTakeHome: input.actual.build_wealth,
    eliminateDebt: input.actual.eliminate_debt,
    unallocated:
      Math.round(
        (net - input.actual.live - input.actual.enjoy - input.actual.build_wealth - input.actual.eliminate_debt) * 100,
      ) / 100,
  };

  const employeeTotal = payrollWealth + input.actual.build_wealth;
  const wealth: WealthPanel = {
    employeePayroll: payrollWealth,
    fromTakeHome: input.actual.build_wealth,
    employerBoost: employerWealth,
    employeeTotal,
    combinedTotal: employeeTotal + employerWealth,
    employeeWealthRate: pct(employeeTotal, net),
    totalWealthFundingRate: pct(employeeTotal + employerWealth, net),
  };

  const enjoyCard = cards.find((c) => c.key === 'enjoy')!;
  const enjoy: EnjoyRedirect = {
    allowance: enjoyCard.targetAmount,
    spent: enjoyCard.actualAmount,
    unused: Math.max(0, Math.round((enjoyCard.targetAmount - enjoyCard.actualAmount) * 100) / 100),
    suggestion: phase === 3 ? 'wealth' : 'debt',
  };

  const liveCard = cards.find((c) => c.key === 'live')!;
  const debtCard = cards.find((c) => c.key === 'eliminate_debt')!;
  const wealthCard = cards.find((c) => c.key === 'build_wealth')!;

  // Alignment score: 100 minus the summed distance from each target band.
  const penalty = cards.reduce((s, c) => {
    const miss = c.key === 'build_wealth' ? Math.max(0, c.targetPct - c.actualPct) : Math.max(0, c.actualPct - c.targetPct);
    return s + miss;
  }, 0);
  const alignmentScore = Math.max(0, Math.min(100, Math.round(100 - penalty * 1.5)));

  const indicators = [
    { key: 'liveRatio', label: 'LIVE Ratio', value: `${liveCard.actualPct.toFixed(1)}%`, hint: 'Target ≤ 50%' },
    { key: 'enjoyRatio', label: 'Enjoy Ratio', value: `${enjoyCard.actualPct.toFixed(1)}%`, hint: 'Ceiling, not a quota' },
    {
      key: 'employeeWealthRate',
      label: 'Employee Wealth Rate',
      value: `${wealth.employeeWealthRate.toFixed(1)}%`,
      hint: `${money(wealth.employeeTotal)} incl. payroll`,
    },
    {
      key: 'totalWealthFunding',
      label: 'Total Wealth Funding',
      value: money(wealth.combinedTotal),
      hint: `${wealth.totalWealthFundingRate.toFixed(1)}% incl. employer`,
    },
    { key: 'debtRate', label: 'Debt Elimination Rate', value: `${debtCard.actualPct.toFixed(1)}%` },
    { key: 'freeCash', label: 'Monthly Free Cash Flow', value: money(reconciliation.unallocated) },
    { key: 'redirect', label: 'Debt-to-Wealth Redirect', value: money(debtCard.actualAmount), hint: 'Available to invest once debt clears' },
    { key: 'employerBoost', label: 'Employer Wealth Boost', value: money(wealth.employerBoost) },
    { key: 'alignment', label: '50/10/20/20 Alignment', value: `${alignmentScore}` },
    { key: 'wealthGap', label: 'Remaining to Wealth Target', value: money(wealthCard.remainingToTarget || 0) },
  ];

  return { phase, cards, reconciliation, wealth, enjoy, indicators, alignmentScore };
}
