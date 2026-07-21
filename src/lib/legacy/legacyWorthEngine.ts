/**
 * Legacy Worth™ scoring engine.
 * 14 weighted factors → 0–1000 score.
 * Pure functions — deterministic, no side effects.
 */

export type LifeStage =
  | 'builder'
  | 'protector'
  | 'multiplier'
  | 'freedom'
  | 'legacy_builder'
  | 'family_endowment';

export interface LegacyWorthInputs {
  age?: number | null;
  annualIncome: number;
  monthlyExpenses: number;
  netWorth: number;
  liquidSavings: number;
  investableAssets: number;
  passiveMonthlyIncome: number;
  highInterestDebt: number; // APR >= 8%
  totalDebt: number;
  monthlyDebtPayments?: number;
  insuranceCoverageTotal: number;
  insuranceKindsCount: number; // life+disability+health+umbrella etc.
  estateItemsComplete: number; // 0..22
  estateItemsTotal: number;
  trustFunded: boolean;
  trustReadinessPct: number; // 0..100
  rothPct: number; // 0..100 of retirement assets
  hsaContribution: number;
  holdingsHHI: number; // 0..1 — 1 = concentrated
  charitableAnnual: number;
  hasConstitution: boolean;
  hadSummitLast12Months: boolean;
  beneficiariesCount?: number;
  hasBusinessOwnership: boolean;
  realEstateEquity: number;
  currentBelt: string;
  fiPercentage: number; // 0..1
}

export interface FactorScore {
  key: string;
  label: string;
  weight: number;
  score: number; // 0..100
  contribution: number; // score * weight (0..weight)
  next: string; // suggested next action
}

const BELT_TO_LITERACY: Record<string, number> = {
  white: 10, yellow: 25, orange: 40, green: 55, blue: 65,
  purple: 75, brown: 85, black: 92, master: 97, grandmaster: 100,
};

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

export function computeLegacyWorth(i: LegacyWorthInputs): {
  score: number; // 0..1000
  factors: FactorScore[];
  lifeStage: LifeStage;
} {
  const monthlyIncome = i.annualIncome / 12;
  const monthsCovered = i.monthlyExpenses > 0 ? i.liquidSavings / i.monthlyExpenses : 0;
  const passiveCoverage = i.monthlyExpenses > 0 ? i.passiveMonthlyIncome / i.monthlyExpenses : 0;
  const monthlyDebtToIncome = monthlyIncome > 0 ? (i.monthlyDebtPayments ?? 0) / monthlyIncome : 0;

  // Age-adjusted net worth (rough Kitces target: age*income/10 by 40, 2x by 50, 4x by 60)
  const ageTarget = (() => {
    const age = i.age ?? 40;
    if (age < 30) return i.annualIncome * 0.5;
    if (age < 40) return i.annualIncome * 2;
    if (age < 50) return i.annualIncome * 4;
    if (age < 60) return i.annualIncome * 7;
    return i.annualIncome * 10;
  })();
  const netWorthScore = clamp((i.netWorth / Math.max(ageTarget, 1)) * 100);

  const retirementReadiness = clamp(i.fiPercentage * 100);
  const passiveIncomeScore = clamp(passiveCoverage * 100);
  const emergencyFundScore = clamp((monthsCovered / 3) * 100);
  const insuranceScore = clamp(
    (i.insuranceKindsCount / 5) * 60 +
    (i.insuranceCoverageTotal / Math.max(i.annualIncome * 10, 1)) * 40
  );
  const debtScore = clamp(
    100 -
    (i.highInterestDebt / Math.max(i.annualIncome, 1)) * 200 -
    Math.max(0, monthlyDebtToIncome - 0.36) * 160
  );
  const estateScore = i.estateItemsTotal > 0 ? clamp((i.estateItemsComplete / i.estateItemsTotal) * 100) : 0;
  const trustScore = clamp(i.trustReadinessPct);
  const taxEfficiencyScore = clamp(i.rothPct * 0.6 + (i.hsaContribution > 0 ? 25 : 0) + 15);
  const diversificationScore = clamp((1 - i.holdingsHHI) * 100);
  const givingPct = i.annualIncome > 0 ? (i.charitableAnnual / i.annualIncome) * 100 : 0;
  const givingScore = clamp(givingPct * 10); // 10% = 100
  const literacyScore = BELT_TO_LITERACY[i.currentBelt] ?? 10;
  const estateChecklistPct = i.estateItemsTotal > 0 ? i.estateItemsComplete / i.estateItemsTotal : 0;
  const governanceScore = clamp(
    (i.hasConstitution ? 35 : 0) +
    (i.hadSummitLast12Months ? 25 : 0) +
    (i.trustFunded ? 20 : 0) +
    Math.min(10, estateChecklistPct * 10) +
    (Number(i.beneficiariesCount || 0) > 0 ? 10 : 0)
  );
  const realEstateBusinessScore = clamp(
    (i.realEstateEquity / Math.max(i.annualIncome, 1)) * 30 + (i.hasBusinessOwnership ? 40 : 0) + 20
  );

  const factors: FactorScore[] = [
    { key: 'net_worth', label: 'Net Worth', weight: 12, score: netWorthScore,
      contribution: 0, next: 'Increase savings rate; sell one unused asset.' },
    { key: 'retirement', label: 'Retirement Readiness', weight: 10, score: retirementReadiness,
      contribution: 0, next: 'Raise investment contribution by 2%.' },
    { key: 'passive_income', label: 'Passive Income Coverage', weight: 10, score: passiveIncomeScore,
      contribution: 0, next: 'Add dividend-paying ETF or rental unit.' },
    { key: 'emergency_fund', label: 'Emergency Fund', weight: 8, score: emergencyFundScore,
      contribution: 0, next: 'Auto-transfer to hit 3 months of expenses (dual stable income).' },
    { key: 'insurance', label: 'Insurance Protection', weight: 7, score: insuranceScore,
      contribution: 0, next: 'Add term life or umbrella policy.' },
    { key: 'debt', label: 'Debt Health', weight: 8, score: debtScore,
      contribution: 0, next: 'Attack highest-APR debt with avalanche method.' },
    { key: 'estate', label: 'Estate Planning', weight: 7, score: estateScore,
      contribution: 0, next: 'Complete next open checklist item.' },
    { key: 'trust', label: 'Trust Readiness', weight: 7, score: trustScore,
      contribution: 0, next: 'Draft or fund the family trust.' },
    { key: 'tax', label: 'Tax Efficiency', weight: 7, score: taxEfficiencyScore,
      contribution: 0, next: 'Increase Roth allocation; max HSA.' },
    { key: 'diversification', label: 'Diversification', weight: 6, score: diversificationScore,
      contribution: 0, next: 'Reduce single-position concentration below 15%.' },
    { key: 'giving', label: 'Charitable Giving', weight: 4, score: givingScore,
      contribution: 0, next: 'Automate a small monthly charitable gift.' },
    { key: 'literacy', label: 'Financial Literacy', weight: 5, score: literacyScore,
      contribution: 0, next: 'Earn the next belt by completing milestones.' },
    { key: 'governance', label: 'Family Governance', weight: 4, score: governanceScore,
      contribution: 0, next: 'Publish your Family Constitution.' },
    { key: 'real_estate_biz', label: 'Real Estate & Business', weight: 5, score: realEstateBusinessScore,
      contribution: 0, next: 'Explore rental or business ownership.' },
  ];

  factors.forEach(f => { f.contribution = (f.score / 100) * f.weight * 10; }); // weight*10 -> total 1000

  const score = Math.round(factors.reduce((s, f) => s + f.contribution, 0));

  const lifeStage: LifeStage =
    score < 200 ? 'builder' :
    score < 400 ? 'protector' :
    score < 600 ? 'multiplier' :
    score < 750 ? 'freedom' :
    score < 900 ? 'legacy_builder' : 'family_endowment';

  return { score, factors, lifeStage };
}

export const LIFE_STAGE_LABELS: Record<LifeStage, { label: string; description: string }> = {
  builder: { label: 'Builder', description: 'Building the foundation — emergency fund, income stability, debt payoff.' },
  protector: { label: 'Protector', description: 'Protecting what you built — insurance, cash reserves, high-interest debt gone.' },
  multiplier: { label: 'Multiplier', description: 'Compounding wealth — maxing retirement, adding taxable investments, real estate.' },
  freedom: { label: 'Financial Freedom', description: 'Work is optional — passive income covers most of your lifestyle.' },
  legacy_builder: { label: 'Legacy Builder', description: 'Creating multigenerational wealth — trust funded, estate planned, mission clear.' },
  family_endowment: { label: 'Family Endowment', description: 'Perpetual capital — supporting multiple generations and causes.' },
};

export function projectEstateAt85(currentNetWorth: number, age: number | null | undefined, annualContribution: number, growthRate = 0.07): number {
  const years = Math.max(0, 85 - (age ?? 40));
  const fvContrib = annualContribution * (((1 + growthRate) ** years - 1) / growthRate);
  const fvBase = currentNetWorth * (1 + growthRate) ** years;
  return fvBase + fvContrib;
}

export function daysUntilFreedom(
  fiPercentage: number,
  monthlySavings: number,
  targetPortfolio: number,
  currentPortfolio: number,
  annualGrowthRate = 0.07,
): number | null {
  if (fiPercentage >= 1) return 0;
  if (targetPortfolio <= 0) return null;
  if (currentPortfolio >= targetPortfolio) return 0;

  const annualContribution = Math.max(0, monthlySavings) * 12;
  const r = annualGrowthRate;

  // If no contribution and no growth possible, fall back to linear
  if (annualContribution <= 0 && currentPortfolio <= 0) return null;

  // Solve for t: FV = P*(1+r)^t + C*((1+r)^t - 1)/r = target
  // (P + C/r) * (1+r)^t = target + C/r
  // t = ln((target + C/r) / (P + C/r)) / ln(1+r)
  let years: number;
  if (r > 0) {
    const cOverR = annualContribution / r;
    const num = targetPortfolio + cOverR;
    const den = currentPortfolio + cOverR;
    if (den <= 0 || num <= 0) return null;
    years = Math.log(num / den) / Math.log(1 + r);
  } else {
    // No growth: linear
    if (annualContribution <= 0) return null;
    years = (targetPortfolio - currentPortfolio) / annualContribution;
  }

  if (!isFinite(years) || years < 0) return null;
  return Math.round(years * 365);
}

