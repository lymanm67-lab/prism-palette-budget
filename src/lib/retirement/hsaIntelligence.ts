// HSA Intelligence — triple-tax advantage projection + medical-vs-investment strategy.

export interface HsaInputs {
  age: number;
  currentBalance: number;
  annualContribution: number;
  employerContribution: number;
  marginalTaxRate: number; // 0.22
  investedPct: number; // 0..1 fraction invested vs cash
  expectedReturn: number; // 0.07
  annualQualifiedMedical: number; // paid out-of-pocket now
  yearsUntil65: number;
}

export interface HsaProjection {
  balanceAt65: number;
  tripleTaxSavings: number;
  strategy: "invest-and-hoard" | "reimburse-later" | "pay-now";
  recommendation: string;
  projectionSeries: Array<{ age: number; balance: number }>;
}

export function projectHsa(i: HsaInputs): HsaProjection {
  const series: Array<{ age: number; balance: number }> = [];
  let bal = i.currentBalance;
  const annual = i.annualContribution + i.employerContribution;

  for (let y = 0; y <= i.yearsUntil65; y++) {
    series.push({ age: i.age + y, balance: Math.round(bal) });
    const growth = bal * i.investedPct * i.expectedReturn;
    bal = bal + annual + growth;
  }

  const tripleTaxSavings =
    i.annualContribution * i.marginalTaxRate * i.yearsUntil65 + // income tax deduction
    (bal - i.currentBalance - annual * i.yearsUntil65) * i.marginalTaxRate; // tax-free growth vs taxable

  const strategy: HsaProjection["strategy"] =
    i.investedPct >= 0.7 && i.annualQualifiedMedical > 0
      ? "invest-and-hoard"
      : i.annualQualifiedMedical > i.annualContribution
      ? "pay-now"
      : "reimburse-later";

  const recMap = {
    "invest-and-hoard": "Pay medical out-of-pocket now, save receipts, invest HSA aggressively. Reimburse yourself decades later tax-free.",
    "reimburse-later": "You're on the right track. Move more of the balance into HSA investments (target 70%+ invested).",
    "pay-now": "Medical expenses currently exceed contributions. Use HSA to pay them, then build up contribution capacity.",
  } as const;

  return {
    balanceAt65: Math.round(bal),
    tripleTaxSavings: Math.round(tripleTaxSavings),
    strategy,
    recommendation: recMap[strategy],
    projectionSeries: series,
  };
}
