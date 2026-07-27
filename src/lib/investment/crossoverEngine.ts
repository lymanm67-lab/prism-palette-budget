/**
 * The Compounding Crossover™ engine.
 * Pure functions — no React, no Supabase.
 *
 * Crossover Portfolio = Annual Contributions / Expected Annual Return
 * Because contributions grow (raises, employer %, debt redirects), the crossover
 * target moves upward over time — so we solve for the year where
 * annual investment growth >= annual contributions.
 */

export const NAVY = '#0B2341';
export const GOLD = '#C9A227';
export const EMERALD = '#1F7A5A';
export const BLUE = '#2563EB';

export type ScenarioKey = 'conservative' | 'expected' | 'historical';

export interface Scenario {
  key: ScenarioKey;
  label: string;
  returnPct: number;
  color: string;
  official?: boolean;
  purpose: string;
  note?: string;
}

export const SCENARIOS: Scenario[] = [
  {
    key: 'conservative',
    label: 'Conservative Planning',
    returnPct: 6,
    color: BLUE,
    purpose: 'Stress-test scenario for prolonged below-average market performance.',
  },
  {
    key: 'expected',
    label: 'Expected Planning Scenario',
    returnPct: 8,
    color: EMERALD,
    official: true,
    purpose: 'Balanced long-term financial planning using a diversified investment strategy.',
    note:
      'The Montgomery Family Wealth Operating System uses an 8% expected annual return as its primary planning assumption because it balances historical market performance with prudent long-term financial planning.',
  },
  {
    key: 'historical',
    label: 'Historical Equity Market',
    returnPct: 10,
    color: GOLD,
    purpose:
      'Illustrates long-term historical S&P 500 performance, including the effect of dividend reinvestment.',
    note:
      'This scenario reflects long-term historical U.S. equity market performance with dividends reinvested. It is presented for educational comparison only and should not be interpreted as a guaranteed future return.',
  },
];

export const OFFICIAL_RETURN_PCT = 8;

export interface CrossoverInputs {
  /** Current invested retirement portfolio balance */
  currentBalance: number;
  /** Current annual retirement contributions (employee + employer) */
  annualContributions: number;
  /** Expected annual return, in percent (6 / 8 / 10) */
  returnPct: number;
  /** Annual growth of contributions from raises + increasing deferral %, in percent */
  contributionGrowthPct: number;
  /** Extra annual dollars redirected from freed-up debt payments */
  debtRedirectAnnual?: number;
  /** Calendar year the debt redirect begins */
  debtRedirectStartYear?: number;
  /** Horizon in years for projections */
  years?: number;
}

export interface CrossoverYear {
  year: number;
  startBalance: number;
  contributions: number;
  growth: number;
  endBalance: number;
  /** Static crossover target for that year's contribution level */
  crossoverTarget: number;
  crossed: boolean;
}

export type CompoundingStatus =
  | 'Building Foundation'
  | 'Building Momentum'
  | 'Near Crossover'
  | 'Crossover Achieved'
  | 'Compounding Acceleration'
  | 'Financial Flywheel';

export interface CrossoverResult {
  rows: CrossoverYear[];
  /** Static crossover portfolio using today's contributions */
  crossoverPortfolio: number;
  /** Current annual investment growth at today's balance */
  annualGrowthNow: number;
  /** Dollars remaining to reach the static crossover portfolio */
  distanceToCrossover: number;
  /** Progress toward crossover, 0–100 */
  progressPct: number;
  /** Years until growth >= contributions (dynamic solve); null if not reached in horizon */
  yearsToCrossover: number | null;
  crossoverYear: number | null;
  crossoverBalance: number | null;
  status: CompoundingStatus;
}

export function crossoverPortfolioFor(annualContributions: number, returnPct: number): number {
  const r = returnPct / 100;
  return r > 0 ? annualContributions / r : 0;
}

export function runCrossover(inputs: CrossoverInputs): CrossoverResult {
  const years = inputs.years ?? 40;
  const r = inputs.returnPct / 100;
  const g = (inputs.contributionGrowthPct || 0) / 100;
  const baseYear = new Date().getFullYear();

  let balance = inputs.currentBalance;
  let contrib = inputs.annualContributions;
  const rows: CrossoverYear[] = [];

  let yearsToCrossover: number | null = null;
  let crossoverYear: number | null = null;
  let crossoverBalance: number | null = null;

  for (let i = 1; i <= years; i++) {
    const calYear = baseYear + i;
    const startBalance = balance;
    let yearContrib = contrib;
    if (
      inputs.debtRedirectAnnual &&
      inputs.debtRedirectStartYear &&
      calYear >= inputs.debtRedirectStartYear
    ) {
      yearContrib += inputs.debtRedirectAnnual;
    }
    // Mid-year contribution convention: growth on start balance + half of contributions
    const growth = startBalance * r + yearContrib * r * 0.5;
    balance = startBalance + yearContrib + growth;
    const crossed = growth >= yearContrib;
    if (crossed && yearsToCrossover === null) {
      yearsToCrossover = i;
      crossoverYear = calYear;
      crossoverBalance = balance;
    }
    rows.push({
      year: calYear,
      startBalance,
      contributions: yearContrib,
      growth,
      endBalance: balance,
      crossoverTarget: crossoverPortfolioFor(yearContrib, inputs.returnPct),
      crossed,
    });
    contrib = contrib * (1 + g);
  }

  const crossoverPortfolio = crossoverPortfolioFor(inputs.annualContributions, inputs.returnPct);
  const annualGrowthNow = inputs.currentBalance * r;
  const distanceToCrossover = Math.max(0, crossoverPortfolio - inputs.currentBalance);
  const progressPct =
    crossoverPortfolio > 0
      ? Math.max(0, Math.min(100, (inputs.currentBalance / crossoverPortfolio) * 100))
      : 0;

  return {
    rows,
    crossoverPortfolio,
    annualGrowthNow,
    distanceToCrossover,
    progressPct,
    yearsToCrossover,
    crossoverYear,
    crossoverBalance,
    status: classifyStatus(inputs.currentBalance, crossoverPortfolio),
  };
}

export function classifyStatus(balance: number, crossoverPortfolio: number): CompoundingStatus {
  if (balance >= 1_000_000) return 'Financial Flywheel';
  if (balance >= 500_000) return 'Compounding Acceleration';
  if (crossoverPortfolio > 0 && balance >= crossoverPortfolio) return 'Crossover Achieved';
  if (crossoverPortfolio > 0 && balance >= crossoverPortfolio * 0.8) return 'Near Crossover';
  if (balance >= 250_000) return 'Building Momentum';
  return 'Building Foundation';
}

/** Overlay series for the 6 / 8 / 10% comparison chart */
export function scenarioSeries(inputs: Omit<CrossoverInputs, 'returnPct'>, years = 30) {
  const byScenario = SCENARIOS.map((s) => ({
    scenario: s,
    result: runCrossover({ ...inputs, returnPct: s.returnPct, years }),
  }));
  const data = Array.from({ length: years }, (_, i) => {
    const row: Record<string, number> = { year: byScenario[0].result.rows[i].year };
    byScenario.forEach(({ scenario, result }) => {
      row[scenario.key] = Math.round(result.rows[i].endBalance);
    });
    return row;
  });
  return { data, byScenario };
}

export function projectedAt(inputs: Omit<CrossoverInputs, 'returnPct'>, returnPct: number, years: number) {
  const res = runCrossover({ ...inputs, returnPct, years });
  return res.rows[res.rows.length - 1]?.endBalance ?? inputs.currentBalance;
}

export const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
export const moneyShort = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
};
