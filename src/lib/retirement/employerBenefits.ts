// Employer Benefits Analyzer — quantify total comp beyond salary.

export interface EmployerBenefits {
  salary: number;
  match401kPct: number; // employer match cap as % of salary, e.g. 0.05 (0 if no match)
  matchLimitPct: number; // salary % you must contribute to get full match (0 if no match)
  nonElectiveEmployerPct?: number; // employer contribution that requires NO employee deferral (e.g. 9% safe-harbor)
  hsaEmployerContrib: number; // annual $
  espp: { discountPct: number; maxPct: number } | null;
  rsu: { annualGrantValue: number; vestYears: number } | null;
  pension: boolean;
  tuitionReimbursement: number; // annual $
  usesTuitionReimbursement: boolean;
  currentUserContribPct: number;
}

export interface BenefitsAnalysis {
  totalHiddenComp: number;
  match: { captured: number; missed: number };
  breakdown: Array<{ label: string; annualValue: number; captured: boolean; note?: string }>;
  action: string;
}

export function analyzeEmployerBenefits(b: EmployerBenefits): BenefitsAnalysis {
  const hasMatch = b.match401kPct > 0 && b.matchLimitPct > 0;
  const fullMatch = hasMatch ? b.salary * b.match401kPct : 0;
  const captured = hasMatch
    ? Math.min(b.currentUserContribPct, b.matchLimitPct) / b.matchLimitPct * fullMatch
    : 0;
  const missed = hasMatch ? fullMatch - captured : 0;

  const nonElectivePct = b.nonElectiveEmployerPct ?? 0;
  const nonElective = b.salary * nonElectivePct;

  const breakdown: BenefitsAnalysis["breakdown"] = [];
  if (hasMatch) {
    breakdown.push({
      label: "401(k) employer match",
      annualValue: fullMatch,
      captured: missed < 1,
      note: missed > 0 ? `Missing $${missed.toFixed(0)}/yr` : undefined,
    });
  }
  if (nonElective > 0) {
    breakdown.push({
      label: `Employer 401(k) contribution (${(nonElectivePct * 100).toFixed(1)}% non-elective)`,
      annualValue: nonElective,
      captured: true,
      note: "Automatic — no employee deferral required",
    });
  }
  breakdown.push({ label: "HSA employer contribution", annualValue: b.hsaEmployerContrib, captured: true });
  if (b.usesTuitionReimbursement) {
    breakdown.push({ label: "Tuition reimbursement", annualValue: b.tuitionReimbursement, captured: false, note: "Only if used" });
  }
  if (b.espp) {
    const esppValue = b.salary * b.espp.maxPct * b.espp.discountPct;
    breakdown.push({ label: `ESPP (${(b.espp.discountPct * 100).toFixed(0)}% discount)`, annualValue: esppValue, captured: false });
  }
  if (b.rsu) breakdown.push({ label: "RSU annual vest value", annualValue: b.rsu.annualGrantValue / b.rsu.vestYears, captured: true });
  if (b.pension) breakdown.push({ label: "Pension accrual", annualValue: b.salary * 0.05, captured: true, note: "Estimated" });

  const totalHiddenComp = breakdown.reduce((s, r) => s + r.annualValue, 0);
  let action: string;
  if (hasMatch && missed > 100) {
    action = `Increase 401(k) contribution to ${(b.matchLimitPct * 100).toFixed(0)}% immediately — you're leaving $${missed.toFixed(0)}/yr on the table.`;
  } else if (nonElective > 0 && !hasMatch) {
    action = `Employer contributes $${nonElective.toFixed(0)}/yr (${(nonElectivePct * 100).toFixed(1)}%) automatically. Since there's no match to chase, prioritize your own Roth IRA or HSA next.`;
  } else {
    action = "You're capturing full employer match. Consider ESPP and HSA next.";
  }

  return { totalHiddenComp, match: { captured, missed }, breakdown, action };
}
