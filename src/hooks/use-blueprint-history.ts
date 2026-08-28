import { useMemo } from 'react';
import { useTransactionsByDateRange } from '@/hooks/use-finance-data';
import { usePurposeResolution, usePayrollElections, electionsForMonth, type PayrollElection } from '@/hooks/use-money-purpose';
import { computeBlueprint5010, CORE_KEYS, type CoreKey } from '@/lib/budgeting/blueprint5010';
import { PHASE_TARGETS, type FreedomPhase, type MoneyPurpose } from '@/lib/budgeting/moneyPurpose';

export interface BlueprintHistoryPoint {
  month: string; // YYYY-MM
  label: string; // "Mar 26"
  phase: FreedomPhase;
  netIncome: number;
  /** actual % of net pay per purpose (build_wealth includes payroll credit) */
  actual: Record<CoreKey, number>;
  /** target % per purpose for that month's phase */
  target: Record<CoreKey, number>;
  alignmentScore: number;
}

function addMonths(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthEnd(month: string) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

const MONTH_LABEL = (month: string) =>
  new Date(`${month}-02T00:00:00`).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

function monthWealth(elections: PayrollElection[] | undefined, month: string) {
  const active = electionsForMonth(elections, month);
  return {
    payrollWealth: active.filter((e) => e.counts_as_wealth && !e.is_employer).reduce((s, e) => s + Number(e.amount || 0), 0),
    employerWealth: active.filter((e) => e.is_employer).reduce((s, e) => s + Number(e.amount || 0), 0),
  };
}

/**
 * Month-by-month actual vs target 50/10/20/20 history over the last `months`
 * months ending at `month`.
 */
export function useBlueprintHistory(month: string, months: 3 | 6 | 12 = 6) {
  const resolution = usePurposeResolution();
  const { data: elections } = usePayrollElections();
  const startMonth = addMonths(month, -(months - 1));
  const { data: txns, isLoading } = useTransactionsByDateRange(`${startMonth}-01`, monthEnd(month));

  const points = useMemo<BlueprintHistoryPoint[]>(() => {
    const list: BlueprintHistoryPoint[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const m = addMonths(month, -i);
      const actual: Record<CoreKey, number> = { live: 0, enjoy: 0, build_wealth: 0, eliminate_debt: 0 };
      let netIncome = 0;

      for (const t of ((txns as any[]) || [])) {
        if (t.deleted_at || t.is_transfer) continue;
        const d = String(t.date || '').slice(0, 7);
        if (d !== m) continue;
        const amount = Number(t.amount) || 0;
        const catId = t.category_id as string | null;

        if (catId && resolution.incomeCategoryIds.has(catId)) {
          if (amount > 0) netIncome += amount;
          continue;
        }
        const p = ((t.money_purpose as MoneyPurpose | null) ||
          (catId ? resolution.byCategory.get(catId) : null)) as MoneyPurpose | null | undefined;
        if (!p) continue;
        if ((CORE_KEYS as string[]).includes(p)) actual[p as CoreKey] += -amount;
      }

      const { payrollWealth, employerWealth } = monthWealth(elections, m);
      const bp = computeBlueprint5010({
        netIncome,
        actual,
        planned: actual,
        payrollWealth,
        employerWealth,
      });

      const targets = PHASE_TARGETS[bp.phase];
      const pctOf = (v: number) => (netIncome > 0 ? Math.round((v / netIncome) * 1000) / 10 : 0);

      list.push({
        month: m,
        label: MONTH_LABEL(m),
        phase: bp.phase,
        netIncome,
        actual: {
          live: pctOf(actual.live),
          enjoy: pctOf(actual.enjoy),
          build_wealth: pctOf(actual.build_wealth + payrollWealth),
          eliminate_debt: pctOf(actual.eliminate_debt),
        },
        target: { ...targets },
        alignmentScore: bp.alignmentScore,
      });
    }
    return list;
  }, [txns, elections, resolution, month, months]);

  /** consecutive trailing months where LIVE actual stayed at/below its target */
  const liveStreak = useMemo(() => {
    let n = 0;
    for (let i = points.length - 1; i >= 0; i--) {
      const p = points[i];
      if (p.netIncome > 0 && p.actual.live <= p.target.live) n++;
      else break;
    }
    return n;
  }, [points]);

  return { points, liveStreak, loading: isLoading };
}
