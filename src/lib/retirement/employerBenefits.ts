// Employer Benefits Analyzer — quantify total comp beyond salary.

export interface EmployerBenefits {
  salary: number;
  match401kPct: number; // employer match cap as % of salary, e.g. 0.05
  matchLimitPct: number; // salary % you must contribute to get full match
  hsaEmployerContrib: number; // annual $
  espp: { discountPct: number; maxPct: number } | null;
  rsu: { annualGrantValue: number; vestYears: number } | null;
  pension: boolean;
  tuitionReimbursement: number; // annual $
  currentUserContribPct: number;
}

export interface BenefitsAnalysis {
  totalHiddenComp: number;
  match: { captured: number; missed: number };
  breakdown: Array<{ label: string; annualValue: number; captured: boolean; note?: string }>;
  action: string;
}

export function analyzeEmployerBenefits(b: EmployerBenefits): BenefitsAnalysis {
  const fullMatch = b.salary * b.match401kPct;
  const captured = Math.min(b.currentUserContribPct, b.matchLimitPct) / b.matchLimitPct * fullMatch;
  const missed = fullMatch - captured;

  const breakdown: BenefitsAnalysis["breakdown"] = [
    { label: "401(k) employer match", annualValue: fullMatch, captured: missed < 1, note: missed > 0 ? `Missing $${missed.toFixed(0)}/yr` : undefined },
    { label: "HSA employer contribution", annualValue: b.hsaEmployerContrib, captured: true },
    { label: "Tuition reimbursement", annualValue: b.tuitionReimbursement, captured: false, note: "Only if used" },
  ];
  if (b.espp) {
    const esppValue = b.salary * b.espp.maxPct * b.espp.discountPct;
    breakdown.push({ label: `ESPP (${(b.espp.discountPct * 100).toFixed(0)}% discount)`, annualValue: esppValue, captured: false });
  }
  if (b.rsu) breakdown.push({ label: "RSU annual vest value", annualValue: b.rsu.annualGrantValue / b.rsu.vestYears, captured: true });
  if (b.pension) breakdown.push({ label: "Pension accrual", annualValue: b.salary * 0.05, captured: true, note: "Estimated" });

  const totalHiddenComp = breakdown.reduce((s, r) => s + r.annualValue, 0);
  const action = missed > 100
    ? `Increase 401(k) contribution to ${(b.matchLimitPct * 100).toFixed(0)}% immediately — you're leaving $${missed.toFixed(0)}/yr on the table.`
    : "You're capturing full employer match. Consider ESPP and HSA next.";

  return { totalHiddenComp, match: { captured, missed }, breakdown, action };
}
