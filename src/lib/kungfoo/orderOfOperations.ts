/**
 * KUNG FOO™ Financial Order of Operations engine.
 * Rule-based dynamic ordering of the 10-step wealth waterfall.
 */

export type KungFooStepKey =
  | 'emergency_starter'
  | 'employer_match'
  | 'hsa'
  | 'high_interest_debt'
  | 'emergency_full'
  | 'roth'
  | 'tax_deferred'
  | 'taxable'
  | 'real_estate'
  | 'legacy_trust'
  | 'charitable';

export interface KungFooContext {
  age: number;
  annualIncome: number;
  marginalBracket: number; // 0..1
  employerMatchPct: number; // 0..1
  employerMatchMaxed: boolean;
  liquidCash: number;
  monthlyExpenses: number;
  highInterestDebt: number;
  hasHsaEligibility: boolean;
  hsaMaxed: boolean;
  retirementTimelineYears: number;
  familySize: number;
  hasLegacyGoal: boolean;
  paycheckNet: number;
}

export interface KungFooStep {
  step: number;
  key: KungFooStepKey;
  label: string;
  priority: number;
  allocationAmt: number;
  allocationPct: number;
  rationale: string;
  unlockWhen: string;
  done: boolean;
}

const LABELS: Record<KungFooStepKey, string> = {
  emergency_starter: 'Starter Emergency Fund ($1,000)',
  employer_match: 'Capture Full Employer Match',
  hsa: 'Health Savings Account (HSA)',
  high_interest_debt: 'Eliminate High-Interest Debt',
  emergency_full: 'Full Emergency Fund (3–6 months)',
  roth: 'Roth Contributions',
  tax_deferred: 'Tax-Deferred Retirement (401k / IRA)',
  taxable: 'Taxable Brokerage',
  real_estate: 'Real Estate Investing',
  legacy_trust: 'Montgomery Family Legacy Trust',
  charitable: 'Charitable Giving',
};

export function buildKungFooPlan(ctx: KungFooContext): KungFooStep[] {
  const monthsCovered = ctx.monthlyExpenses > 0 ? ctx.liquidCash / ctx.monthlyExpenses : 0;
  const starterDone = ctx.liquidCash >= 1000;
  const emergencyDone = monthsCovered >= 3;
  const debtGone = ctx.highInterestDebt <= 0;

  // Base priority order (lower = earlier)
  const base: Array<{ key: KungFooStepKey; pri: number; done: boolean; rationale: string; unlock: string }> = [
    { key: 'emergency_starter', pri: 1, done: starterDone,
      rationale: 'Before anything else, protect against a small surprise so you never touch credit for a flat tire.',
      unlock: 'Reach $1,000 in liquid cash.' },
    { key: 'employer_match', pri: 2, done: ctx.employerMatchMaxed,
      rationale: `Your employer offers ${(ctx.employerMatchPct * 100).toFixed(0)}% match — that's an instant 100% return. Never leave it on the table.`,
      unlock: 'Enroll to at least the match ceiling.' },
    { key: 'hsa', pri: ctx.hasHsaEligibility ? 3 : 99, done: ctx.hsaMaxed,
      rationale: 'HSA is the only triple-tax-advantaged account: deductible in, tax-free growth, tax-free medical withdrawals.',
      unlock: 'Confirm HDHP eligibility and open an HSA.' },
    { key: 'high_interest_debt', pri: 4, done: debtGone,
      rationale: ctx.highInterestDebt > 0
        ? `You have $${ctx.highInterestDebt.toLocaleString()} of high-APR debt — guaranteed loss you can eliminate.`
        : 'No high-interest debt detected.',
      unlock: 'Reduce high-interest debt (APR ≥ 8%) to $0.' },
    { key: 'emergency_full', pri: 5, done: emergencyDone,
      rationale: 'A 3–6 month buffer turns Safe-to-Spend into real peace of mind.',
      unlock: 'Cover 3 months of expenses in liquid savings.' },
    { key: 'roth', pri: 6, done: false,
      rationale: ctx.marginalBracket < 0.24
        ? 'Your current bracket is low — Roth locks in tax-free growth forever.'
        : 'A partial Roth allocation hedges against future higher taxes.',
      unlock: 'Open and fund a Roth IRA (or Roth 401k).' },
    { key: 'tax_deferred', pri: 7, done: false,
      rationale: ctx.marginalBracket >= 0.24
        ? 'You are in a higher bracket — traditional 401k gives the biggest current-year tax break.'
        : 'Fill remaining retirement room with pre-tax if Roth is capped.',
      unlock: 'Max 401k or Traditional IRA up to IRS limits.' },
    { key: 'taxable', pri: 8, done: false,
      rationale: 'Bridge accounts you can touch before 59½ — critical for early Financial Freedom.',
      unlock: 'Open a taxable brokerage; automate monthly buys.' },
    { key: 'real_estate', pri: 9, done: false,
      rationale: 'Real estate adds a non-correlated cash-flowing asset and inflation hedge.',
      unlock: 'Complete home-buying checklist or open a REIT position.' },
    { key: 'legacy_trust', pri: ctx.hasLegacyGoal ? 10 : 11, done: false,
      rationale: 'Fund the Montgomery Family Legacy Trust so wealth outlives you.',
      unlock: 'Draft trust, name trustees, fund initial contribution.' },
    { key: 'charitable', pri: 11, done: false,
      rationale: 'Structured giving compounds impact and unlocks tax strategies (QCD, DAF, appreciated stock).',
      unlock: 'Set an annual giving target and route it through a strategy.' },
  ];

  // Dynamic reorder tweaks
  if (ctx.highInterestDebt > ctx.annualIncome * 0.1) {
    // Very high consumer debt → push high-interest debt above HSA
    const debt = base.find(s => s.key === 'high_interest_debt')!;
    debt.pri = 2.5;
  }
  if (ctx.age >= 55 && !ctx.employerMatchMaxed) {
    // Older + no match yet: match becomes urgent
    const match = base.find(s => s.key === 'employer_match')!;
    match.pri = 0.5;
  }
  if (ctx.marginalBracket >= 0.32) {
    // High bracket: tax-deferred moves ahead of Roth
    const roth = base.find(s => s.key === 'roth')!;
    const td = base.find(s => s.key === 'tax_deferred')!;
    roth.pri = 7.5;
    td.pri = 6.5;
  }

  // Sort, then take first unfinished step's rationale as headline
  const sorted = base.sort((a, b) => a.pri - b.pri);

  // Allocation math — simple waterfall from paycheck
  let remaining = Math.max(0, ctx.paycheckNet);
  const targets: Partial<Record<KungFooStepKey, number>> = {
    emergency_starter: Math.max(0, 1000 - ctx.liquidCash),
    employer_match: !ctx.employerMatchMaxed ? ctx.paycheckNet * (ctx.employerMatchPct || 0.05) : 0,
    hsa: ctx.hasHsaEligibility && !ctx.hsaMaxed ? Math.min(remaining * 0.1, 350) : 0,
    high_interest_debt: ctx.highInterestDebt > 0 ? Math.min(remaining * 0.2, ctx.highInterestDebt) : 0,
    emergency_full: !emergencyDone ? Math.min(remaining * 0.1, ctx.monthlyExpenses * 3 - ctx.liquidCash) : 0,
    roth: remaining * 0.1,
    tax_deferred: remaining * 0.08,
    taxable: remaining * 0.05,
    real_estate: 0,
    legacy_trust: ctx.hasLegacyGoal ? remaining * 0.02 : 0,
    charitable: remaining * 0.03,
  };

  const steps: KungFooStep[] = sorted.map((s, idx) => {
    const desired = Math.max(0, targets[s.key] ?? 0);
    const alloc = s.done ? 0 : Math.min(desired, remaining);
    remaining -= alloc;
    return {
      step: idx + 1,
      key: s.key,
      label: LABELS[s.key],
      priority: s.pri,
      allocationAmt: Math.round(alloc),
      allocationPct: ctx.paycheckNet > 0 ? (alloc / ctx.paycheckNet) : 0,
      rationale: s.rationale,
      unlockWhen: s.unlock,
      done: s.done,
    };
  });

  return steps;
}

export function nextActionableStep(steps: KungFooStep[]): KungFooStep | null {
  return steps.find(s => !s.done) ?? null;
}
