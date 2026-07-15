// Prism Mortgage Freedom Score — 10-factor, transparent, 0-100.

export interface FreedomScoreInputs {
  monthlyIncome: number;
  monthlyDebts: number;      // non-housing
  monthlyExpenses: number;   // living excl housing
  monthlyHousingPayment: number;
  creditScore: number;
  homeValue: number;
  mortgageBalance: number;
  monthlySurplus: number;
  mortgageRate: number;
  marketRate?: number;       // current market ~7%
  retirementContribPct?: number;
  emergencyFundMonths?: number;
}

export interface FactorScore {
  key: string;
  label: string;
  score: number;       // 0-100
  weight: number;      // %
  detail: string;
}

export interface FreedomScore {
  total: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  factors: FactorScore[];
}

function clamp(n: number, min = 0, max = 100) { return Math.max(min, Math.min(max, n)); }

export function computeFreedomScore(inp: FreedomScoreInputs): FreedomScore {
  const income = Math.max(1, inp.monthlyIncome);
  const dti = ((inp.monthlyDebts + inp.monthlyHousingPayment) / income) * 100;
  const housingRatio = (inp.monthlyHousingPayment / income) * 100;
  const ltv = inp.homeValue > 0 ? (inp.mortgageBalance / inp.homeValue) * 100 : 100;
  const equity = Math.max(0, inp.homeValue - inp.mortgageBalance);
  const equityPct = inp.homeValue > 0 ? (equity / inp.homeValue) * 100 : 0;
  const surplusPct = (inp.monthlySurplus / income) * 100;
  const marketRate = inp.marketRate ?? 7.0;
  const rateDelta = marketRate - inp.mortgageRate; // + means user has cheap rate
  const emergencyMo = inp.emergencyFundMonths ?? Math.max(0, (inp.monthlySurplus * 3) / Math.max(inp.monthlyExpenses, 1));
  const accelPotential = inp.mortgageBalance > 0 ? (inp.monthlySurplus * 12) / inp.mortgageBalance * 100 : 0;

  const factors: FactorScore[] = [
    {
      key: 'housing',
      label: 'Housing Affordability',
      weight: 15,
      score: clamp(100 - Math.max(0, housingRatio - 25) * 4),
      detail: `Housing is ${housingRatio.toFixed(0)}% of gross income (target ≤ 28%).`,
    },
    {
      key: 'dti',
      label: 'Debt-to-Income',
      weight: 12,
      score: clamp(100 - Math.max(0, dti - 30) * 3),
      detail: `Total DTI ${dti.toFixed(0)}% (target ≤ 36%).`,
    },
    {
      key: 'credit',
      label: 'Credit Health',
      weight: 10,
      score: clamp(((inp.creditScore || 650) - 580) / (850 - 580) * 100),
      detail: `FICO ${inp.creditScore || 'unknown'}.`,
    },
    {
      key: 'equity',
      label: 'Equity Growth',
      weight: 10,
      score: clamp(equityPct * 1.4),
      detail: `${equityPct.toFixed(0)}% equity, LTV ${ltv.toFixed(0)}%.`,
    },
    {
      key: 'emergency',
      label: 'Emergency Fund',
      weight: 10,
      score: clamp(emergencyMo * 16),
      detail: `~${emergencyMo.toFixed(1)} months of expenses covered.`,
    },
    {
      key: 'retirement',
      label: 'Retirement Contributions',
      weight: 10,
      score: clamp((inp.retirementContribPct ?? 10) * 6.5),
      detail: `~${(inp.retirementContribPct ?? 10).toFixed(0)}% of income to retirement.`,
    },
    {
      key: 'cashflow',
      label: 'Cash Flow',
      weight: 10,
      score: clamp(surplusPct * 4),
      detail: `Monthly surplus is ${surplusPct.toFixed(0)}% of income.`,
    },
    {
      key: 'accel',
      label: 'Mortgage Acceleration Potential',
      weight: 8,
      score: clamp(accelPotential * 8),
      detail: `Annual surplus = ${accelPotential.toFixed(1)}% of balance.`,
    },
    {
      key: 'ratedelta',
      label: 'Interest Savings Opportunity',
      weight: 8,
      score: clamp(50 + rateDelta * 15),
      detail: rateDelta > 0
        ? `Your rate is ${rateDelta.toFixed(2)}% below market — keep it.`
        : `Your rate is ${Math.abs(rateDelta).toFixed(2)}% above market — refinance may help.`,
    },
    {
      key: 'stability',
      label: 'Overall Financial Stability',
      weight: 7,
      score: clamp((emergencyMo * 8) + (surplusPct * 2) + ((inp.creditScore || 650) - 620) / 3),
      detail: `Composite of surplus, reserves, and credit.`,
    },
  ];

  const total = Math.round(factors.reduce((s, f) => s + (f.score * f.weight) / 100, 0));
  const grade = total >= 85 ? 'A' : total >= 70 ? 'B' : total >= 55 ? 'C' : total >= 40 ? 'D' : 'F';
  return { total, grade, factors };
}
