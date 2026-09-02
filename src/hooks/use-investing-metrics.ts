import { useMemo } from 'react';
import { useReserveFunds } from '@/hooks/use-reserves';
import { useHouseholdDebts } from '@/hooks/use-household-debts';
import { useInvSettings, useRoleTargets, useRolePositions, useFundHoldings } from '@/hooks/use-investing';
import {
  computeAllocation,
  computeConcentration,
  computeOverlap,
  declineStress,
  evaluateCapitalPriority,
  nextDollarTarget,
  riskBudget,
  strategyFitScore,
  positionValue,
  ROLES,
  type InvestmentRole,
} from '@/lib/investing/roles';

/** Everything the Strategy Control Center needs, derived from real household data. */
export function useInvestingMetrics() {
  const settingsQ = useInvSettings();
  const targetsQ = useRoleTargets();
  const positionsQ = useRolePositions();
  const holdingsQ = useFundHoldings();
  const reservesQ = useReserveFunds();
  const debtsQ = useHouseholdDebts();

  const settings = settingsQ.data;
  const positions = positionsQ.data ?? [];
  const targetRows = targetsQ.data ?? [];
  const fundHoldings = holdingsQ.data ?? [];
  const reserves = (reservesQ.funds ?? []) as any[];
  const debts = (debtsQ.data ?? []) as any[];

  const driftBand = Number(settings?.drift_band_pct ?? 5);
  const tacticalWarn = Number(settings?.conviction_catalyst_warn_pct ?? 20);

  const targets = useMemo(() => {
    const map: Partial<Record<InvestmentRole, number>> = {};
    targetRows.forEach((t) => {
      if (ROLES.includes(t.role as InvestmentRole)) map[t.role as InvestmentRole] = Number(t.target_pct ?? 0);
    });
    return map;
  }, [targetRows]);

  const allocation = useMemo(
    () => computeAllocation(positions, targets, driftBand),
    [positions, targets, driftBand],
  );

  const concentration = useMemo(
    () =>
      computeConcentration(positions, {
        tacticalWarnPct: tacticalWarn,
        roleLimits: targetRows.reduce<Partial<Record<InvestmentRole, number>>>((acc, t) => {
          if (t.max_pct) acc[t.role as InvestmentRole] = Number(t.max_pct);
          return acc;
        }, {}),
      }),
    [positions, tacticalWarn, targetRows],
  );

  const overlap = useMemo(() => computeOverlap(positions, fundHoldings), [positions, fundHoldings]);

  const emergency = useMemo(() => {
    const cashFunds = reserves.filter(
      (f) => f.kind !== 'investment' && (f.liquidity_class === 'immediate' || f.kind === 'emergency' || f.kind === 'buffer'),
    );
    const balance = cashFunds.reduce((s, f) => s + Number(f.market_value || 0), 0);
    const floor =
      Number(settings?.emergency_floor_override ?? 0) ||
      cashFunds.reduce((s, f) => s + Number(f.primary_target || f.stage1_target || 0), 0);
    return { balance, floor, intact: floor <= 0 ? balance > 0 : balance >= floor };
  }, [reserves, settings]);

  const highInterestBalance = useMemo(
    () =>
      debts
        .filter((d) => Number(d.interest_rate ?? d.apr ?? 0) >= 8 && !d.deleted_at)
        .reduce((s, d) => s + Number(d.balance || 0), 0),
    [debts],
  );

  const priority = useMemo(
    () =>
      evaluateCapitalPriority({
        emergencyCash: emergency.balance,
        emergencyFloor: emergency.floor,
        requiredDebtPaymentsCurrent: true,
        highInterestDebtBalance: highInterestBalance,
        highInterestOnPlan: debts.length > 0,
        sinkingFundShortfall: reserves
          .filter((f) => f.kind === 'sinking' || f.kind === 'vehicle')
          .reduce((s, f) => s + Math.max(0, Number(f.primary_target || 0) - Number(f.market_value || 0)), 0),
        coreRetirementOnTrack: true,
        monthlyLiquidityAvailable: reserves
          .filter((f) => f.redirect_excess_enabled)
          .reduce((s, f) => s + Math.max(0, Number(f.market_value || 0) - Number(f.primary_target || 0)), 0),
      }),
    [emergency, highInterestBalance, debts, reserves],
  );

  const nextDollar = useMemo(() => nextDollarTarget(allocation.rows), [allocation.rows]);

  const totals = useMemo(() => {
    const value = allocation.total;
    const basis = positions.reduce((s, p) => s + Number(p.cost_basis ?? 0), 0);
    const dividends = positions.reduce((s, p) => s + Number(p.dividend_income_ytd ?? 0), 0);
    const weightedVol = targetRows.reduce((s, t) => {
      const roleValue = positions.filter((p) => p.role === t.role).reduce((a, p) => a + positionValue(p), 0);
      return s + (value > 0 ? (roleValue / value) * Number(t.volatility_pct ?? 0) : 0);
    }, 0);
    const weightedReturn = targetRows.reduce((s, t) => {
      const roleValue = positions.filter((p) => p.role === t.role).reduce((a, p) => a + positionValue(p), 0);
      return s + (value > 0 ? (roleValue / value) * Number(t.expected_return_pct ?? 0) : 0);
    }, 0);
    return {
      value,
      basis,
      gain: value - basis,
      gainPct: basis > 0 ? ((value - basis) / basis) * 100 : 0,
      dividends,
      volatility: weightedVol,
      expectedReturn: weightedReturn,
      estMaxDrawdown: weightedVol * 2, // rough estimate: ~2 standard deviations
    };
  }, [allocation.total, positions, targetRows]);

  const tacticalPct = concentration.find((c) => c.scope === 'tactical')?.pct ?? 0;
  const tacticalPositions = positions.filter((p) => p.role === 'CONVICTION' || p.role === 'CATALYST');
  const documented = tacticalPositions.filter((p) => (p.thesis?.trim() || p.catalyst?.trim())).length;

  const fit = useMemo(
    () =>
      strategyFitScore({
        targetsTotal: allocation.targetsTotal,
        maxDriftPp: allocation.maxDriftPp,
        driftBandPp: driftBand,
        overlapScore: overlap.score,
        concentrationBreaches: concentration.filter((c) => c.breached).length,
        tacticalPct,
        tacticalWarnPct: tacticalWarn,
        emergencyFundIntact: emergency.intact,
        thesesDocumented: documented,
        tacticalPositions: tacticalPositions.length,
      }),
    [allocation, driftBand, overlap.score, concentration, tacticalPct, tacticalWarn, emergency.intact, documented, tacticalPositions.length],
  );

  const stress = useMemo(() => declineStress(allocation.total, allocation.rows), [allocation]);
  const risk = useMemo(() => riskBudget(allocation.rows), [allocation.rows]);

  return {
    loading: settingsQ.isLoading || targetsQ.isLoading || positionsQ.isLoading,
    settings,
    targetRows,
    positions,
    fundHoldings,
    allocation,
    concentration,
    overlap,
    emergency,
    highInterestBalance,
    priority,
    nextDollar,
    totals,
    tacticalPct,
    fit,
    stress,
    risk,
    driftBand,
    tacticalWarn,
  };
}
