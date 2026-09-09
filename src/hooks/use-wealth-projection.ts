import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFreedCashSources, useFreedCashRedirects, monthlySavings } from '@/hooks/use-freed-cash';
import { useReserves } from '@/hooks/use-reserves';
import { useHouseholdDebts } from '@/hooks/use-household-debts';
import { conversionMetrics } from '@/lib/freed-cash/conversion';
import {
  DEFAULT_ASSUMPTIONS,
  DEFAULT_RETURN_COMPARISON,
  FlowInput,
  StrategyKey,
  WealthAssumptions,
  applyStrategy,
  monthIndex,
  runFlow,
  runScenarioGrid,
} from '@/lib/wealth/sourceOfFunds';
import {
  MONTGOMERY_TIMELINE,
  TimelineInput,
  buildEventTimeline,
  expectedEvents,
  milestoneMonths,
} from '@/lib/wealth/eventTimeline';
import { defaultRefundYears, evaluateRefundPool, RefundYear } from '@/lib/wealth/taxRefundPool';
import { crossModuleConflicts, runFlowChecks, validateMagnitude } from '@/lib/wealth/checks';

const CFG_KEY = 'prism.wealthProjection.assumptions.v3';
const TL_KEY = 'prism.wealthProjection.timeline.v3';
const REFUND_KEY = 'prism.wealthProjection.refunds.v3';


function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(fallback) ? parsed : { ...fallback, ...(parsed as object) };
  } catch {
    return fallback;
  }
}

export function useWealthProjection() {
  const { data: fcSources = [] } = useFreedCashSources();
  const { data: fcRedirects = [] } = useFreedCashRedirects();
  const { emergency } = useReserves();
  const { data: debts = [] } = useHouseholdDebts();

  const [assumptions, setAssumptions] = useState<WealthAssumptions>(() =>
    load(CFG_KEY, DEFAULT_ASSUMPTIONS),
  );
  const [timeline, setTimeline] = useState<TimelineInput>(() => load(TL_KEY, MONTGOMERY_TIMELINE));
  const [refundYears, setRefundYears] = useState<RefundYear[]>(() =>
    load<RefundYear[]>(REFUND_KEY, defaultRefundYears()),
  );
  const [strategy, setStrategy] = useState<StrategyKey>('planned');
  const [returnPct, setReturnPct] = useState<number>(8);
  const [horizon, setHorizon] = useState<number>(25);

  useEffect(() => localStorage.setItem(CFG_KEY, JSON.stringify(assumptions)), [assumptions]);
  useEffect(() => localStorage.setItem(TL_KEY, JSON.stringify(timeline)), [timeline]);
  useEffect(() => localStorage.setItem(REFUND_KEY, JSON.stringify(refundYears)), [refundYears]);

  /* live figures from the rest of the app, normalised into plain numbers */
  const freedCashLive = useMemo(() => {
    const verified = fcSources.filter(
      (s: any) => s.status === 'verified' || s.status === 'active' || s.verified_at,
    );
    const runRate = verified.reduce((sum: number, s: any) => sum + monthlySavings(s), 0);
    const conversion = conversionMetrics(fcSources, fcRedirects);
    return { runRate, executedMonthly: conversion.executedMonthly };
  }, [fcSources, fcRedirects]);

  const bufferLive = useMemo(
    () => ({
      target: Number(emergency?.primary_target ?? 0) || timeline.bufferTarget,
      balance: Number(emergency?.market_value ?? 0),
    }),
    [emergency, timeline.bufferTarget],
  );

  const debtLive = useMemo(() => {
    const find = (re: RegExp) => (debts as any[]).find((d) => re.test(d.name || ''));
    return {
      student: find(/student|nelnet|mohela|pslf/i),
      sba: find(/sba/i),
    };
  }, [debts]);

  const refunds = useMemo(() => evaluateRefundPool(refundYears), [refundYears]);

  const effectiveTimeline = useMemo<TimelineInput>(
    () => ({
      ...timeline,
      startMonth: assumptions.startMonth,
      bufferTarget: assumptions.bufferTarget,
      bufferStartingBalance: assumptions.bufferStartingBalance,
      refunds,
    }),
    [timeline, assumptions.startMonth, assumptions.bufferTarget, assumptions.bufferStartingBalance, refunds],
  );

  const input: FlowInput = useMemo(() => buildEventTimeline(effectiveTimeline), [effectiveTimeline]);

  const scoped = useMemo(
    () => applyStrategy(input, strategy, assumptions.startMonth),
    [input, strategy, assumptions.startMonth],
  );

  const result = useMemo(
    () => runFlow(scoped, assumptions, returnPct, horizon * 12),
    [scoped, assumptions, returnPct, horizon],
  );

  const todayResult = useMemo(
    () => runFlow(applyStrategy(input, 'today', assumptions.startMonth), assumptions, returnPct, horizon * 12),
    [input, assumptions, returnPct, horizon],
  );

  const grid = useMemo(
    () => runScenarioGrid(input, assumptions, strategy, DEFAULT_RETURN_COMPARISON),
    [input, assumptions, strategy],
  );

  const maxAt25 = useMemo(() => {
    const scopedMax = applyStrategy(input, 'max', assumptions.startMonth);
    return runFlow(scopedMax, assumptions, returnPct, 300).ending;
  }, [input, assumptions, returnPct]);

  const milestones = useMemo(() => {
    const all = milestoneMonths(effectiveTimeline, result);
    const startIdx = monthIndex(assumptions.startMonth);
    const endIdx = startIdx + result.monthCount - 1;
    return all
      .filter((m) => monthIndex(m.month) >= startIdx && monthIndex(m.month) <= endIdx)
      .map((m) => ({ ...m, row: result.months.find((r) => r.month === m.month) }))
      .filter((m) => !!m.row);
  }, [effectiveTimeline, result, assumptions.startMonth]);

  const checks = useMemo(() => {
    const base = runFlowChecks(scoped, result, assumptions, refunds, expectedEvents(effectiveTimeline));
    const mag = validateMagnitude(maxAt25, 'Maximum Redirect Capacity');
    const cross = crossModuleConflicts([
      {
        item: 'Freed cash run rate',
        sourceModule: 'Freed Cash Engine',
        sourceValue: freedCashLive.runRate || timeline.freedCashBaselineMonthly,
        otherModule: 'Wealth Projection',
        otherValue: timeline.freedCashBaselineMonthly,
      },
      {
        item: 'Buffer target',
        sourceModule: 'Emergency Fund & Liquidity',
        sourceValue: bufferLive.target,
        otherModule: 'Wealth Projection',
        otherValue: assumptions.bufferTarget,
      },
      ...(debtLive.student
        ? [
            {
              item: 'Student loan balance',
              sourceModule: 'Debt Payoff',
              sourceValue: Number(debtLive.student.balance || 0),
              otherModule: 'Wealth Projection',
              otherValue:
                effectiveTimeline.debts.find((d) => d.id === 'student-loan')?.balance ?? 0,
            },
          ]
        : []),
      ...(debtLive.sba
        ? [
            {
              item: 'SBA loan balance',
              sourceModule: 'Debt Payoff',
              sourceValue: Number(debtLive.sba.balance || 0),
              otherModule: 'Wealth Projection',
              otherValue: effectiveTimeline.debts.find((d) => d.id === 'sba')?.balance ?? 0,
            },
          ]
        : []),
    ]);
    return [...base, ...(mag ? [mag] : []), ...cross];
  }, [
    scoped,
    result,
    assumptions,
    refunds,
    effectiveTimeline,
    maxAt25,
    freedCashLive.runRate,
    timeline.freedCashBaselineMonthly,
    bufferLive.target,
    debtLive,
  ]);

  const patchAssumptions = useCallback(
    (patch: Partial<WealthAssumptions>) => setAssumptions((a) => ({ ...a, ...patch })),
    [],
  );
  const patchTimeline = useCallback(
    (patch: Partial<TimelineInput>) => setTimeline((t) => ({ ...t, ...patch })),
    [],
  );
  const reset = useCallback(() => {
    setAssumptions(DEFAULT_ASSUMPTIONS);
    setTimeline(MONTGOMERY_TIMELINE);
    setRefundYears(defaultRefundYears());
  }, []);

  const syncFromApp = useCallback(() => {
    if (freedCashLive.runRate > 0) {
      setTimeline((t) => ({ ...t, freedCashBaselineMonthly: Number(freedCashLive.runRate.toFixed(2)) }));
    }
    if (bufferLive.target > 0) {
      setAssumptions((a) => ({
        ...a,
        bufferTarget: bufferLive.target,
        bufferStartingBalance: bufferLive.balance,
      }));
    }
  }, [freedCashLive.runRate, bufferLive.target, bufferLive.balance]);

  return {
    assumptions,
    patchAssumptions,
    timeline: effectiveTimeline,
    patchTimeline,
    refundYears,
    setRefundYears,
    refunds,
    strategy,
    setStrategy,
    returnPct,
    setReturnPct,
    horizon,
    setHorizon,
    input,
    result,
    todayResult,
    grid,
    milestones,
    checks,
    freedCashLive,
    bufferLive,
    reset,
    syncFromApp,
  };
}
