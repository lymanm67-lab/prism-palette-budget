// Retirement "Next Dollar" Optimizer Engine
// Implements the 11-step KUNG FOO waterfall specialized for retirement/wealth building.

export interface OptimizerInputs {
  age: number;
  filingStatus: "single" | "married" | "hoh";
  grossIncome: number;
  hasEmergencyFund: boolean; // 3-6 months expenses
  monthlyExpenses: number;
  emergencyBalance: number;
  employer401k: {
    available: boolean;
    matchPct?: number; // e.g. 0.05
    matchLimitPct?: number; // e.g. 0.06 of salary
    currentContribPct?: number;
    hasRoth?: boolean;
  };
  hsaEligible: boolean; // HDHP
  hsaBalance?: number;
  hsaContribYTD?: number;
  familyCoverage?: boolean;
  iraContribYTD?: number;
  hasHighInterestDebt: boolean; // >7%
  totalRetirementBalance: number;
  taxableBrokerage?: number;
}

export interface Recommendation {
  step: number;
  target: string;
  amount: number; // monthly $ suggestion
  reasoning: string;
  priority: "critical" | "high" | "medium" | "low";
}

// 2026 approximate limits (used for guidance; not tax advice)
const LIMITS_2026 = {
  k401: 24000,
  k401Catchup50: 8000,
  k401Catchup60: 11250, // SECURE 2.0 super-catchup
  iraLimit: 7500,
  iraCatchup: 1000,
  hsaSelf: 4400,
  hsaFamily: 8750,
  hsaCatchup55: 1000,
};

export function optimizeNextDollar(i: OptimizerInputs): Recommendation[] {
  const recs: Recommendation[] = [];
  const monthlyIncome = i.grossIncome / 12;
  const targetEmergency = i.monthlyExpenses * 3;

  // 1. Starter emergency fund $1k
  if (i.emergencyBalance < 1000) {
    recs.push({
      step: 1,
      target: "Starter Emergency Fund ($1,000)",
      amount: Math.min(500, monthlyIncome * 0.1),
      reasoning: "Cash cushion prevents debt spiral from a $500 car repair.",
      priority: "critical",
    });
    return recs;
  }

  // 2. Employer match — free money
  if (i.employer401k.available && i.employer401k.matchPct && i.employer401k.matchLimitPct) {
    const currentPct = i.employer401k.currentContribPct ?? 0;
    if (currentPct < i.employer401k.matchLimitPct) {
      const gap = i.employer401k.matchLimitPct - currentPct;
      recs.push({
        step: 2,
        target: `Increase 401(k) to ${(i.employer401k.matchLimitPct * 100).toFixed(0)}% (capture full match)`,
        amount: Math.round((monthlyIncome * gap) * 100) / 100,
        reasoning: `Employer match = ${(i.employer401k.matchPct * 100).toFixed(0)}% instant return. Never leave this on the table.`,
        priority: "critical",
      });
    }
  }

  // 3. High-interest debt >7%
  if (i.hasHighInterestDebt) {
    recs.push({
      step: 3,
      target: "Eliminate high-interest debt (>7% APR)",
      amount: Math.round(monthlyIncome * 0.1 * 100) / 100,
      reasoning: "Guaranteed after-tax return on debt payoff beats most market returns.",
      priority: "high",
    });
  }

  // 4. HSA (triple tax advantage)
  if (i.hsaEligible) {
    const hsaLimit = i.familyCoverage ? LIMITS_2026.hsaFamily : LIMITS_2026.hsaSelf;
    const catchup = i.age >= 55 ? LIMITS_2026.hsaCatchup55 : 0;
    const cap = hsaLimit + catchup;
    const remaining = cap - (i.hsaContribYTD ?? 0);
    if (remaining > 0) {
      recs.push({
        step: 4,
        target: "Max HSA contribution",
        amount: Math.round((remaining / 12) * 100) / 100,
        reasoning: "Triple tax advantage: deductible in, tax-free growth, tax-free medical withdrawals. After 65, acts like Traditional IRA.",
        priority: "high",
      });
    }
  }

  // 5. Full 3-6 month emergency fund
  if (i.emergencyBalance < targetEmergency) {
    recs.push({
      step: 5,
      target: `Build emergency fund to 3 months ($${targetEmergency.toLocaleString()})`,
      amount: Math.round((targetEmergency - i.emergencyBalance) / 12 * 100) / 100,
      reasoning: "Protects retirement accounts from early withdrawal during job loss.",
      priority: "high",
    });
  }

  // 6. Roth IRA (income-limit permitting, guidance only)
  const iraLimit = LIMITS_2026.iraLimit + (i.age >= 50 ? LIMITS_2026.iraCatchup : 0);
  const iraRemaining = iraLimit - (i.iraContribYTD ?? 0);
  if (iraRemaining > 0) {
    recs.push({
      step: 6,
      target: "Fund Roth IRA (or Backdoor Roth if income-restricted)",
      amount: Math.round((iraRemaining / 12) * 100) / 100,
      reasoning: "Tax diversification + tax-free growth. Roth is especially powerful when current bracket ≤ expected retirement bracket.",
      priority: "medium",
    });
  }

  // 7. Max 401(k)
  if (i.employer401k.available) {
    const cap = LIMITS_2026.k401 + (i.age >= 60 && i.age < 64 ? LIMITS_2026.k401Catchup60 : i.age >= 50 ? LIMITS_2026.k401Catchup50 : 0);
    const currentAnnual = (i.employer401k.currentContribPct ?? 0) * i.grossIncome;
    if (currentAnnual < cap) {
      recs.push({
        step: 7,
        target: `Max 401(k) contribution ($${cap.toLocaleString()}/yr)`,
        amount: Math.round(((cap - currentAnnual) / 12) * 100) / 100,
        reasoning: "Full pre-tax shelter drops marginal tax bill and compounds tax-deferred.",
        priority: "medium",
      });
    }
  }

  // 8. Taxable brokerage / bridge account
  recs.push({
    step: 8,
    target: "Taxable brokerage (bridge to early retirement)",
    amount: Math.round(monthlyIncome * 0.1 * 100) / 100,
    reasoning: "Accessible before age 59½; long-term capital gains taxed favorably.",
    priority: "low",
  });

  return recs;
}

export function scoreRetirementReadiness(totalRetirement: number, age: number, income: number): number {
  // Fidelity-style multipliers of salary
  const targets: Record<number, number> = { 30: 1, 35: 2, 40: 3, 45: 4, 50: 6, 55: 7, 60: 8, 65: 10 };
  const bracket = Object.keys(targets).map(Number).reverse().find((k) => age >= k) ?? 30;
  const target = targets[bracket] * income;
  return Math.min(100, Math.round((totalRetirement / target) * 100));
}
