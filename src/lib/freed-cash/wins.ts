/**
 * Top Freed Cash Wins ranking + "what happens if I keep these savings" scenarios.
 *
 * Ranking: which cancellations/reductions move the needle most, and how much
 * time they shave off the goal their money is redirected to.
 *
 * Scenarios: per destination goal, what the redirected money becomes over
 * 12 months, 3 years and 5 years (with growth where the destination invests).
 */
import {
  FreedCashRedirect,
  FreedCashSource,
  destinationLabel,
  monthlySavings,
} from '@/hooks/use-freed-cash';
import { savingsEndDate } from './timing';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Annual growth assumption by destination. Cash goals do not compound. */
export const GROWTH_BY_DESTINATION: Record<string, number> = {
  investing: 0.07,
  hsa: 0.06,
  business_reserve: 0.02,
  emergency_fund: 0.02,
  travel: 0,
  buffer: 0,
  debt_payoff: 0,
  goal: 0,
};

export function growthFor(destination: string): number {
  return GROWTH_BY_DESTINATION[destination] ?? 0;
}

/** Future value of a monthly contribution over n months at an annual rate. */
export function futureValue(monthly: number, months: number, annualRate: number): number {
  if (monthly <= 0 || months <= 0) return 0;
  if (annualRate <= 0) return round2(monthly * months);
  const r = annualRate / 12;
  return round2(monthly * ((Math.pow(1 + r, months) - 1) / r));
}

function isActive(s: FreedCashSource, today: Date): boolean {
  if (s.status === 'historical' || s.status === 'reversed') return false;
  const end = savingsEndDate(s);
  return !end || end >= today;
}

export interface WinRow {
  sourceId: string;
  name: string;
  vendor: string | null;
  category: string | null;
  scope: string;
  monthly: number;
  annual: number;
  fiveYear: number;
  confidence: string;
  durability: string;
  /** Destinations this saving is redirected to. */
  destinations: string[];
  assignedMonthly: number;
  executedMonthly: number;
  /** Share of the total active savings run rate (0-1). */
  share: number;
  /**
   * Months of goal timing this saving buys, i.e. how many months of the goal's
   * own contribution rate this saving covers per year. Null when unassigned.
   */
  monthsSavedPerYear: number | null;
  rank: number;
}

export interface WinRanking {
  rows: WinRow[];
  totalMonthly: number;
  totalAnnual: number;
  unassignedMonthly: number;
  topThreeShare: number;
}

/** Rank active savings by how much money they free up and where it goes. */
export function winRanking(
  sources: FreedCashSource[],
  redirects: FreedCashRedirect[],
  today = new Date(),
): WinRanking {
  const active = sources.filter((s) => isActive(s, today) && monthlySavings(s) > 0);
  const bySource = new Map<string, FreedCashRedirect[]>();
  for (const r of redirects) {
    if (!r.source_id || r.status === 'cancelled') continue;
    const list = bySource.get(r.source_id) ?? [];
    list.push(r);
    bySource.set(r.source_id, list);
  }

  const totalMonthly = round2(active.reduce((sum, s) => sum + monthlySavings(s), 0));

  const rows: WinRow[] = active
    .map((s) => {
      const monthly = round2(monthlySavings(s));
      const rs = bySource.get(s.id) ?? [];
      const assignedMonthly = round2(rs.reduce((sum, r) => sum + Number(r.monthly_amount), 0));
      const executedMonthly = round2(rs.reduce((sum, r) => sum + Number(r.executed_monthly ?? 0), 0));
      const destinations = [...new Set(rs.map((r) => r.destination_type))];
      const primary = destinations[0];
      const goalRate = primary
        ? round2(
            redirects
              .filter((r) => r.destination_type === primary && r.status !== 'cancelled')
              .reduce((sum, r) => sum + Number(r.monthly_amount), 0),
          )
        : 0;
      const monthsSavedPerYear =
        primary && goalRate > 0 ? round2((assignedMonthly * 12) / goalRate) : null;
      return {
        sourceId: s.id,
        name: s.name,
        vendor: s.vendor,
        category: s.category,
        scope: s.entity_scope,
        monthly,
        annual: round2(monthly * 12),
        fiveYear: round2(monthly * 60),
        confidence: s.confidence,
        durability: s.durability,
        destinations,
        assignedMonthly,
        executedMonthly,
        share: totalMonthly > 0 ? monthly / totalMonthly : 0,
        monthsSavedPerYear,
        rank: 0,
      };
    })
    .sort((a, b) => b.monthly - a.monthly)
    .map((row, i) => ({ ...row, rank: i + 1 }));

  const assignedTotal = round2(
    redirects
      .filter((r) => r.status !== 'cancelled')
      .reduce((sum, r) => sum + Number(r.monthly_amount), 0),
  );

  return {
    rows,
    totalMonthly,
    totalAnnual: round2(totalMonthly * 12),
    unassignedMonthly: round2(Math.max(0, totalMonthly - assignedTotal)),
    topThreeShare: rows.slice(0, 3).reduce((sum, r) => sum + r.share, 0),
  };
}

export interface ScenarioRow {
  destination: string;
  label: string;
  monthly: number;
  executedMonthly: number;
  growthRate: number;
  year1: number;
  year3: number;
  year5: number;
  /** Same horizons using only money that actually moved. */
  executedYear1: number;
  executedYear3: number;
  executedYear5: number;
  /** Growth earned on top of the contributions over 5 years. */
  fiveYearGrowth: number;
}

export interface KeepScenarios {
  rows: ScenarioRow[];
  totalMonthly: number;
  totalYear1: number;
  totalYear3: number;
  totalYear5: number;
  executedMonthly: number;
  executedYear5: number;
  /** What is lost over 5 years by only moving part of the assigned money. */
  gapYear5: number;
}

/** "What happens if I keep these savings" — per destination goal outcomes. */
export function keepScenarios(redirects: FreedCashRedirect[]): KeepScenarios {
  const byDest = new Map<string, { monthly: number; executed: number }>();
  for (const r of redirects) {
    if (r.status === 'cancelled') continue;
    const entry = byDest.get(r.destination_type) ?? { monthly: 0, executed: 0 };
    entry.monthly += Number(r.monthly_amount);
    entry.executed += Number(r.executed_monthly ?? 0);
    byDest.set(r.destination_type, entry);
  }

  const rows: ScenarioRow[] = [...byDest.entries()]
    .map(([destination, { monthly, executed }]) => {
      const rate = growthFor(destination);
      const year5 = futureValue(monthly, 60, rate);
      return {
        destination,
        label: destinationLabel(destination),
        monthly: round2(monthly),
        executedMonthly: round2(executed),
        growthRate: rate,
        year1: futureValue(monthly, 12, rate),
        year3: futureValue(monthly, 36, rate),
        year5,
        executedYear1: futureValue(executed, 12, rate),
        executedYear3: futureValue(executed, 36, rate),
        executedYear5: futureValue(executed, 60, rate),
        fiveYearGrowth: round2(year5 - monthly * 60),
      };
    })
    .sort((a, b) => b.year5 - a.year5);

  const sum = (pick: (r: ScenarioRow) => number) => round2(rows.reduce((t, r) => t + pick(r), 0));
  const totalYear5 = sum((r) => r.year5);
  const executedYear5 = sum((r) => r.executedYear5);

  return {
    rows,
    totalMonthly: sum((r) => r.monthly),
    totalYear1: sum((r) => r.year1),
    totalYear3: sum((r) => r.year3),
    totalYear5,
    executedMonthly: sum((r) => r.executedMonthly),
    executedYear5,
    gapYear5: round2(Math.max(0, totalYear5 - executedYear5)),
  };
}
