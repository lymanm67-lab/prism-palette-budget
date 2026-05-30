// Tax & withdrawal intelligence — pure functions, no I/O.

export type TaxBracket = { upTo: number; rate: number };

// 2025 single filer (simplified)
export const BRACKETS_SINGLE_2025: TaxBracket[] = [
  { upTo: 11_925, rate: 0.10 },
  { upTo: 48_475, rate: 0.12 },
  { upTo: 103_350, rate: 0.22 },
  { upTo: 197_300, rate: 0.24 },
  { upTo: 250_525, rate: 0.32 },
  { upTo: 626_350, rate: 0.35 },
  { upTo: Infinity, rate: 0.37 },
];

// 2025 married filing jointly (simplified)
export const BRACKETS_MFJ_2025: TaxBracket[] = [
  { upTo: 23_850, rate: 0.10 },
  { upTo: 96_950, rate: 0.12 },
  { upTo: 206_700, rate: 0.22 },
  { upTo: 394_600, rate: 0.24 },
  { upTo: 501_050, rate: 0.32 },
  { upTo: 751_600, rate: 0.35 },
  { upTo: Infinity, rate: 0.37 },
];

export function marginalRate(taxableIncome: number, brackets: TaxBracket[]): number {
  for (const b of brackets) if (taxableIncome <= b.upTo) return b.rate;
  return brackets[brackets.length - 1].rate;
}

export function taxOn(taxableIncome: number, brackets: TaxBracket[]): number {
  let tax = 0;
  let prev = 0;
  for (const b of brackets) {
    if (taxableIncome <= prev) break;
    const slice = Math.min(taxableIncome, b.upTo) - prev;
    tax += slice * b.rate;
    prev = b.upTo;
    if (taxableIncome <= b.upTo) break;
  }
  return tax;
}

// Roth vs Traditional break-even
// Returns after-tax value at retirement for each path.
export function rothVsTraditional(input: {
  annualContribution: number;
  years: number;
  returnPct: number;
  marginalNow: number;       // 0..1
  marginalRetire: number;    // 0..1
}) {
  const { annualContribution, years, returnPct, marginalNow, marginalRetire } = input;
  const r = returnPct / 100;
  // FV of annuity due
  const fv = annualContribution * (((1 + r) ** years - 1) / r);
  // Roth: contributions are post-tax; reduce contribution by tax now, but withdraw tax-free.
  const rothAfterTax = annualContribution * (1 - marginalNow) * (((1 + r) ** years - 1) / r);
  // Traditional: full contribution grows, then withdraw at retirement rate.
  const tradAfterTax = fv * (1 - marginalRetire);
  return {
    roth: Math.round(rothAfterTax),
    traditional: Math.round(tradAfterTax),
    winner: rothAfterTax >= tradAfterTax ? 'roth' : 'traditional',
    differenceUSD: Math.round(Math.abs(rothAfterTax - tradAfterTax)),
  };
}

// Roth conversion ladder — fills up to top of target bracket each year.
export function rothConversionLadder(input: {
  traditionalBalance: number;
  baseTaxableIncome: number;
  yearsAvailable: number;
  fillToTopOfBracketRate: number; // e.g. 0.12 or 0.22
  brackets: TaxBracket[];
  returnPct: number;
}) {
  const { traditionalBalance, baseTaxableIncome, yearsAvailable, fillToTopOfBracketRate, brackets, returnPct } = input;
  let bracketTop = 0;
  for (const b of brackets) { if (b.rate === fillToTopOfBracketRate) { bracketTop = b.upTo; break; } }
  const yearly: { year: number; conversion: number; taxOwed: number; remaining: number }[] = [];
  let remaining = traditionalBalance;
  const r = returnPct / 100;
  let totalTax = 0;
  let totalConverted = 0;
  for (let y = 1; y <= yearsAvailable && remaining > 0; y++) {
    const headroom = Math.max(0, bracketTop - baseTaxableIncome);
    const convert = Math.min(headroom, remaining);
    const tax = taxOn(baseTaxableIncome + convert, brackets) - taxOn(baseTaxableIncome, brackets);
    remaining = (remaining - convert) * (1 + r);
    totalTax += tax;
    totalConverted += convert;
    yearly.push({ year: y, conversion: Math.round(convert), taxOwed: Math.round(tax), remaining: Math.round(remaining) });
  }
  return { yearly, totalConverted: Math.round(totalConverted), totalTax: Math.round(totalTax), effectiveRate: totalConverted > 0 ? totalTax / totalConverted : 0 };
}

// RMD (Required Minimum Distribution) using IRS Uniform Lifetime Table (simplified)
// Source: IRS Pub 590-B Uniform Lifetime Table
const UNIFORM_LIFETIME: Record<number, number> = {
  73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1,
  80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2,
  87: 14.4, 88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1,
  94: 9.5, 95: 8.9, 96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4,
};

export function projectRMDs(input: {
  traditionalBalance: number;
  currentAge: number;
  returnPct: number;
  throughAge?: number;
}) {
  const { traditionalBalance, currentAge, returnPct, throughAge = 95 } = input;
  const r = returnPct / 100;
  let bal = traditionalBalance;
  // Grow balance until age 73
  const startAge = Math.max(currentAge, 73);
  const yearsToStart = Math.max(0, 73 - currentAge);
  bal = bal * (1 + r) ** yearsToStart;
  const rows: { age: number; balance: number; rmd: number; divisor: number }[] = [];
  for (let age = startAge; age <= throughAge; age++) {
    const divisor = UNIFORM_LIFETIME[age] ?? Math.max(1, UNIFORM_LIFETIME[100] - (age - 100));
    const rmd = bal / divisor;
    rows.push({ age, balance: Math.round(bal), rmd: Math.round(rmd), divisor });
    bal = Math.max(0, (bal - rmd) * (1 + r));
  }
  return rows;
}

// Withdrawal order recommendation (general rule of thumb)
export function withdrawalOrder(balances: { taxable: number; traditional: number; roth: number }) {
  const sequence = [
    { account: 'Taxable brokerage', balance: balances.taxable, rationale: 'Use first; growth has already been taxed annually and lets tax-deferred keep compounding.' },
    { account: 'Traditional 401(k) / IRA', balance: balances.traditional, rationale: 'Use next; withdrawals are ordinary income. Coordinate with RMDs starting age 73.' },
    { account: 'Roth IRA / 401(k)', balance: balances.roth, rationale: 'Use last; tax-free growth and no RMDs (Roth IRA). Preserve for late retirement and heirs.' },
  ];
  return sequence;
}
