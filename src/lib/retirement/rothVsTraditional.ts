// Roth vs Traditional AI Advisor logic.

export interface RothInputs {
  currentAge: number;
  retirementAge: number;
  currentMarginalRate: number; // e.g. 0.22
  expectedRetirementRate: number; // e.g. 0.24
  annualContribution: number;
  expectedReturn: number; // 0.07
  currentTaxableBalance: number;
  currentRothBalance: number;
  currentTraditionalBalance: number;
  hasStateIncomeTax: boolean;
  stateRateNow: number; // 0.04
  stateRateRetirement: number; // 0.0 if moving to no-tax state
}

export interface RothVerdict {
  recommendation: "roth" | "traditional" | "split";
  rothPct: number; // 0..1
  reasoning: string[];
  breakEvenRate: number;
  fvRoth: number;
  fvTradAfterTax: number;
}

export function analyzeRothVsTraditional(i: RothInputs): RothVerdict {
  const years = i.retirementAge - i.currentAge;
  const fv = (pmt: number) =>
    pmt * ((Math.pow(1 + i.expectedReturn, years) - 1) / i.expectedReturn);

  const rothEffectiveRate = i.currentMarginalRate + (i.hasStateIncomeTax ? i.stateRateNow : 0);
  const tradEffectiveRate = i.expectedRetirementRate + i.stateRateRetirement;

  const rothContribution = i.annualContribution * (1 - rothEffectiveRate);
  const tradContribution = i.annualContribution;

  const fvRoth = fv(rothContribution) / (1 - rothEffectiveRate); // pre-tax equivalent view isn't needed; use final:
  const fvRothFinal = fv(i.annualContribution); // roth grows tax-free
  const fvTradGross = fv(i.annualContribution);
  const fvTradAfterTax = fvTradGross * (1 - tradEffectiveRate);

  const reasoning: string[] = [];
  let recommendation: RothVerdict["recommendation"] = "split";
  let rothPct = 0.5;

  if (tradEffectiveRate > rothEffectiveRate + 0.03) {
    recommendation = "roth";
    rothPct = 0.9;
    reasoning.push("Expected retirement tax rate is meaningfully higher than today's — Roth wins.");
  } else if (rothEffectiveRate > tradEffectiveRate + 0.03) {
    recommendation = "traditional";
    rothPct = 0.1;
    reasoning.push("Current tax rate is meaningfully higher than expected retirement rate — take the deduction now.");
  } else {
    reasoning.push("Rates roughly equal — split contributions for tax diversification.");
  }

  const totalRetirement = i.currentRothBalance + i.currentTraditionalBalance;
  if (totalRetirement > 0) {
    const rothShare = i.currentRothBalance / totalRetirement;
    if (rothShare < 0.2 && recommendation !== "traditional") {
      reasoning.push("Your Roth bucket is <20% of retirement savings — tilting Roth improves flexibility for tax-bracket management in retirement.");
      rothPct = Math.max(rothPct, 0.6);
    }
  }
  if (i.stateRateRetirement < i.stateRateNow) {
    reasoning.push("You expect to retire in a lower- or no-tax state — this favors Traditional.");
    rothPct = Math.max(0.1, rothPct - 0.2);
  }

  return {
    recommendation,
    rothPct: Math.round(rothPct * 100) / 100,
    reasoning,
    breakEvenRate: rothEffectiveRate,
    fvRoth: Math.round(fvRothFinal),
    fvTradAfterTax: Math.round(fvTradAfterTax),
  };
}
