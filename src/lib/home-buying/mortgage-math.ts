// Mortgage math helpers for the Home-Buying Readiness page.

export interface MortgageInputs {
  price: number;
  downPct: number;        // e.g. 20 = 20%
  ratePct: number;        // annual interest rate %
  termYears: number;      // 15, 20, 30
  propertyTaxPct?: number; // annual % of price
  insurancePct?: number;   // annual % of price
  hoaMonthly?: number;
  pmiPct?: number;         // annual % of loan when down < 20%
}

export interface MortgageBreakdown {
  loanAmount: number;
  downPayment: number;
  monthlyPI: number;
  monthlyTax: number;
  monthlyInsurance: number;
  monthlyPmi: number;
  monthlyHoa: number;
  monthlyPITI: number;
  totalInterest: number;
  totalPaid: number;
}

export function calcMortgage(input: MortgageInputs): MortgageBreakdown {
  const loanAmount = input.price * (1 - input.downPct / 100);
  const downPayment = input.price - loanAmount;
  const r = input.ratePct / 100 / 12;
  const n = input.termYears * 12;
  const monthlyPI = r === 0
    ? loanAmount / n
    : (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const monthlyTax = ((input.propertyTaxPct ?? 0) / 100 * input.price) / 12;
  const monthlyInsurance = ((input.insurancePct ?? 0) / 100 * input.price) / 12;
  const monthlyPmi = input.downPct < 20
    ? ((input.pmiPct ?? 0.5) / 100 * loanAmount) / 12
    : 0;
  const monthlyHoa = input.hoaMonthly ?? 0;
  const monthlyPITI = monthlyPI + monthlyTax + monthlyInsurance + monthlyPmi + monthlyHoa;
  const totalPaid = monthlyPI * n;
  const totalInterest = totalPaid - loanAmount;
  return {
    loanAmount, downPayment, monthlyPI, monthlyTax, monthlyInsurance,
    monthlyPmi, monthlyHoa, monthlyPITI, totalInterest, totalPaid,
  };
}

export interface EquityPoint { year: number; equity: number; balance: number; interestPaid: number; }

export function buildEquityCurve(input: MortgageInputs): EquityPoint[] {
  const { loanAmount, monthlyPI } = calcMortgage(input);
  const r = input.ratePct / 100 / 12;
  const n = input.termYears * 12;
  const points: EquityPoint[] = [];
  let balance = loanAmount;
  let interestPaid = 0;
  for (let m = 1; m <= n; m++) {
    const interest = balance * r;
    const principal = monthlyPI - interest;
    balance = Math.max(0, balance - principal);
    interestPaid += interest;
    if (m % 12 === 0) {
      points.push({
        year: m / 12,
        balance,
        equity: input.price - balance,
        interestPaid,
      });
    }
  }
  return points;
}

// Rough FICO → rate table (national avg snapshot; informational only).
export function estimateRateForFico(fico: number, baseRate = 7.0): number {
  if (fico >= 760) return baseRate - 0.5;
  if (fico >= 740) return baseRate - 0.3;
  if (fico >= 720) return baseRate - 0.1;
  if (fico >= 700) return baseRate;
  if (fico >= 680) return baseRate + 0.25;
  if (fico >= 660) return baseRate + 0.6;
  if (fico >= 640) return baseRate + 1.0;
  if (fico >= 620) return baseRate + 1.5;
  return baseRate + 2.2;
}

export function fmt$(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}
