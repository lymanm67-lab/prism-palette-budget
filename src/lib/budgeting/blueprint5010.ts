// 45/10/25/20 engine — targets, reconciliation and freedom indicators.
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
  /** LAYER A only: business money paid out of the personal account this month. */
  businessOutflow?: number;
  /** LAYER A only: sinking fund contributions (travel, annual bills, goals). */
  sinkingFunds?: number;
  /** LAYER A only: cash intentionally parked in Buffer this month. */
  bufferAssignment?: number;
  /** LAYER A only: dated one-time expenses (settlement fees, etc.). */
  oneTimeExpenses?: number;
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
  /** true when the label reports a positive under-target cushion (ceilings) */
  underTarget?: boolean;
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
  /** Personal four-bucket leftover (LAYER B free cash). */
  unallocated: number;
  // ----- LAYER A: total cash flow, zero-based -----
  businessOutflow: number;
  sinkingFunds: number;
  bufferAssignment: number;
  oneTimeExpenses: number;
  /** Take-home minus EVERY job a dollar was given. Target: 0.00 */
  unassigned: number;
  /** true when more was assigned than came in */
  overallocated: boolean;
  /** Ordered assignment lines for the Layer A statement. */
  lines: { key: string; label: string; amount: number }[];
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
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
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

    // Build Wealth is measured on a combined basis: payroll withholding plus
    // the employer contribution both count toward the floor, without
    // re-charging them against deposited net pay.
    const fromTakeHome = input.actual[key];
    const actualAmount =
      key === 'build_wealth' ? fromTakeHome + payrollWealth + employerWealth : fromTakeHome;
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
    // LIVE and ENJOY are ceilings: coming in under target is a win.
    if ((key === 'live' || key === 'enjoy') && variance < 0) {
      card.aboveTargetLabel = `Under Target by ${money(-variance)}`;
      card.underTarget = true;
    }
    if (key === 'build_wealth') {
      card.fundedByPayroll = payrollWealth;
      card.remainingToTarget = Math.max(0, Math.round((targetAmount - actualAmount) * 100) / 100);
      // Build Wealth is a floor, not a cap — present any shortfall as a
      // positive "gap to close" (an action item), never a negative variance.
      if (card.remainingToTarget > 0) {
        card.aboveTargetLabel = `Gap to Close ${money(card.remainingToTarget)}`;
      } else {
        card.aboveTargetLabel = `Floor Met · ${money(-variance)} above`;
        card.underTarget = true;
      }
    }
    if (key === 'eliminate_debt') {
      card.remainingToTarget = Math.max(0, Math.round((targetAmount - actualAmount) * 100) / 100);
      if (card.remainingToTarget > 0) {
        card.aboveTargetLabel = `Gap to Close ${money(card.remainingToTarget)}`;
      } else {
        card.aboveTargetLabel = `Floor Met · ${money(variance)} above`;
        card.underTarget = true;
      }
    }
    return card;
  });

  const businessOutflow = round2(Number(input.businessOutflow) || 0);
  const sinkingFunds = round2(Number(input.sinkingFunds) || 0);
  const bufferAssignment = round2(Number(input.bufferAssignment) || 0);
  const oneTimeExpenses = round2(Number(input.oneTimeExpenses) || 0);

  const unallocated = round2(
    net - input.actual.live - input.actual.enjoy - input.actual.build_wealth - input.actual.eliminate_debt,
  );
  const unassigned = round2(
    unallocated - businessOutflow - sinkingFunds - bufferAssignment - oneTimeExpenses,
  );

  const reconciliation: Reconciliation = {
    netIncome: net,
    live: input.actual.live,
    enjoy: input.actual.enjoy,
    buildWealthFromTakeHome: input.actual.build_wealth,
    eliminateDebt: input.actual.eliminate_debt,
    unallocated,
    businessOutflow,
    sinkingFunds,
    bufferAssignment,
    oneTimeExpenses,
    unassigned,
    overallocated: unassigned < -0.004,
    lines: [
      { key: 'live', label: 'Live', amount: round2(input.actual.live) },
      { key: 'enjoy', label: 'Enjoy', amount: round2(input.actual.enjoy) },
      {
        key: 'build_wealth',
        label: 'Build Wealth from take-home',
        amount: round2(input.actual.build_wealth),
      },
      { key: 'eliminate_debt', label: 'Eliminate Debt', amount: round2(input.actual.eliminate_debt) },
      { key: 'business', label: 'Business expenses', amount: businessOutflow },
      { key: 'sinking', label: 'Sinking funds', amount: sinkingFunds },
      { key: 'buffer', label: 'Buffer assignment', amount: bufferAssignment },
      { key: 'one_time', label: 'One-time expenses', amount: oneTimeExpenses },
    ],
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
    const isFloor = c.key === 'build_wealth' || c.key === 'eliminate_debt';
    const miss = isFloor ? Math.max(0, c.targetPct - c.actualPct) : Math.max(0, c.actualPct - c.targetPct);
    return s + miss;
  }, 0);
  const alignmentScore = Math.max(0, Math.min(100, Math.round(100 - penalty * 1.5)));

  const indicators = [
    { key: 'liveRatio', label: 'LIVE Ratio', value: `${liveCard.actualPct.toFixed(1)}%`, hint: `Target ≤ ${liveCard.targetPct}%` },
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
    {
      key: 'unassigned',
      label: 'Unassigned Cash',
      value: money(reconciliation.unassigned),
      hint: reconciliation.unassigned === 0 ? 'Every dollar has a job' : 'Target $0.00 — give this money a job',
    },
    { key: 'redirect', label: 'Debt-to-Wealth Redirect', value: money(debtCard.actualAmount), hint: 'Available to invest once debt clears' },
    { key: 'employerBoost', label: 'Employer Wealth Boost', value: money(wealth.employerBoost) },
    { key: 'alignment', label: '45/10/25/20 Alignment', value: `${alignmentScore}` },
    { key: 'wealthGap', label: 'Remaining to Wealth Target', value: money(wealthCard.remainingToTarget || 0) },
  ];

  return { phase, cards, reconciliation, wealth, enjoy, indicators, alignmentScore };
}

/**
 * Which buckets pushed the month over its income. Only ceilings (LIVE, ENJOY)
 * and any bucket above its target can "cause" an overallocation — funding
 * Build Wealth or Eliminate Debt above target is intentional, so it is named
 * as a deliberate choice rather than a fault.
 */
export function overallocationCauses(
  cards: BlueprintCard[],
  reconciliation: Reconciliation,
): { label: string; amount: number; intentional: boolean }[] {
  if (!reconciliation.overallocated) return [];
  const causes = cards
    .filter((c) => c.variance > 0)
    .map((c) => ({
      label: c.label,
      amount: round2(c.variance),
      intentional: c.key === 'build_wealth' || c.key === 'eliminate_debt',
    }));
  for (const extra of [
    { label: 'Business expenses', amount: reconciliation.businessOutflow },
    { label: 'Sinking funds', amount: reconciliation.sinkingFunds },
    { label: 'Buffer assignment', amount: reconciliation.bufferAssignment },
    { label: 'One-time expenses', amount: reconciliation.oneTimeExpenses },
  ]) {
    if (extra.amount > 0) causes.push({ ...extra, intentional: true });
  }
  return causes.sort((a, b) => b.amount - a.amount);
}

