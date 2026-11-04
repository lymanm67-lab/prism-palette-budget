/** All dollars are in today's dollars; growth uses the real (after-inflation, after-fee) return. */
export interface OtherIncome { label: string; monthly: number; startYear: number; endYear?: number }

export interface FreedomInputs {
  currentYear: number;
  targetYear: number;
  endYear: number;
  budgetBefore: number;        // monthly, from target until change
  changeYear?: number;         // lifestyle change year
  budgetAfter?: number;        // monthly after change
  oneTimeCost?: number;        // in change year
  monthlyTaxes: number;        // taxes still to cover
  otherIncome: OtherIncome[];
  currentAssets: number;
  monthlyContribution: number;
  homeSaleNet?: number;        // only counted if modelled explicitly, net of costs & replacement housing
  homeSaleYear?: number;
  inflation: number;           // e.g. 0.03
  nominalReturn: number;       // after fees, e.g. 0.06
  endingGoal?: number;
  spendingCut?: number;        // optional leak adjustment (monthly)
  incomeGain?: number;         // optional leak adjustment (monthly, added to contribution)
  currentBudget?: number;      // today's monthly spending, for room-to-invest check
  currentTakeHome?: number;
}

export const realReturn = (nominal: number, inflation: number) => (1 + nominal) / (1 + inflation) - 1;

export function missingInputs(i: Partial<FreedomInputs>): string[] {
  const m: string[] = [];
  if (!i.targetYear) m.push('Target freedom year');
  if (!i.endYear) m.push('Planning end year');
  if (!i.budgetBefore) m.push('Freedom budget');
  if (i.targetYear && i.endYear && i.endYear <= i.targetYear) m.push('End year must be after target year');
  return m;
}

export interface YearRow { year: number; spending: number; otherIncome: number; oneTime: number; gap: number }

export function yearlyGaps(i: FreedomInputs): YearRow[] {
  const rows: YearRow[] = [];
  const cut = i.spendingCut ?? 0;
  for (let y = i.targetYear; y < i.endYear; y++) {
    const after = i.changeYear != null && i.budgetAfter != null && y >= i.changeYear;
    const monthly = Math.max(0, (after ? i.budgetAfter! : i.budgetBefore) - cut) + (i.monthlyTaxes || 0);
    const inc = i.otherIncome
      .filter((o) => y >= o.startYear && (o.endYear == null || y <= o.endYear))
      .reduce((s, o) => s + o.monthly, 0);
    const oneTime = (i.changeYear === y ? i.oneTimeCost ?? 0 : 0) - (i.homeSaleYear === y ? i.homeSaleNet ?? 0 : 0);
    const gap = Math.max(0, (monthly - inc) * 12) + oneTime;
    rows.push({ year: y, spending: monthly * 12, otherIncome: inc * 12, oneTime, gap });
  }
  return rows;
}

/** Starting balance needed at the target year to fund each year's gap (paid at start of year). */
export function freedomNumber(i: FreedomInputs, nominalReturn = i.nominalReturn): number {
  const r = realReturn(nominalReturn, i.inflation);
  const rows = yearlyGaps(i);
  let pv = rows.reduce((s, row, k) => s + row.gap / Math.pow(1 + r, k), 0);
  if (i.endingGoal) pv += i.endingGoal / Math.pow(1 + r, rows.length);
  return Math.max(0, pv);
}

export function projectedAssets(i: FreedomInputs, nominalReturn = i.nominalReturn): number {
  const r = realReturn(nominalReturn, i.inflation);
  const years = Math.max(0, i.targetYear - i.currentYear);
  const annual = (i.monthlyContribution + (i.incomeGain ?? 0)) * 12;
  const fv = i.currentAssets * Math.pow(1 + r, years);
  const contrib = r === 0 ? annual * years : annual * ((Math.pow(1 + r, years) - 1) / r);
  return fv + contrib;
}

export function evaluate(i: FreedomInputs, lowerReturnDelta = 0.02) {
  const rows = yearlyGaps(i);
  const needed = freedomNumber(i);
  const projected = projectedAssets(i);
  const lowR = i.nominalReturn - lowerReturnDelta;
  const neededLow = freedomNumber(i, lowR);
  const projectedLow = projectedAssets(i, lowR);
  const maxGap = rows.reduce((m, r) => Math.max(m, r.gap), 0);
  const peakYears = rows.filter((r) => r.gap > 0 && r.gap >= maxGap * 0.95).map((r) => r.year);
  const room = i.currentTakeHome != null && i.currentBudget != null ? i.currentTakeHome - i.currentBudget : undefined;
  return {
    rows,
    freedomBudget: i.budgetBefore,
    monthlyGap: rows[0] ? rows[0].gap / 12 : 0,
    needed,
    projected,
    surplus: projected - needed,
    low: { needed: neededLow, projected: projectedLow, surplus: projectedLow - neededLow },
    peakYears,
    contributionTooHigh: room != null && i.monthlyContribution > room,
    room,
  };
}
