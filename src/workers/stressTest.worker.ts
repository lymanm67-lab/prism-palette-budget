/// <reference lib="webworker" />
/**
 * Runs Monte Carlo stress-test batches off the main thread so 10,000-path
 * simulations never block the UI.
 */
import {
  contributionSensitivity,
  inflationGrid,
  ltcGrid,
  rankRisks,
  recommendedActions,
  retirementAgeGrid,
  runStressTest,
  sequenceRiskGrid,
  sequenceControlGrid,
  spendingSensitivity,
  CRISIS_SCENARIOS,
  type StressAssumptions,
  type StressGoals,
} from '@/lib/retirement/stressTest';

export type WorkerRequest = {
  id: number;
  assumptions: StressAssumptions;
  goals: StressGoals;
  runs: number;
  /** Lighter run count used for the many side-by-side sensitivity grids. */
  gridRuns?: number;
  retirementAges: number[];
  contributionDeltas: number[];
  spendingPcts: number[];
};

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, assumptions, goals, runs, gridRuns = 500, retirementAges, contributionDeltas, spendingPcts } = e.data;
  try {
    const base = runStressTest(assumptions, goals, runs);
    const payload = {
      id,
      base,
      sequence: sequenceRiskGrid(assumptions, goals, gridRuns),
      sequenceControls: sequenceControlGrid(assumptions, goals, gridRuns),
      crises: CRISIS_SCENARIOS.map((c) => {
        const res = runStressTest({ ...assumptions, ...c.patch }, goals, gridRuns);
        return {
          key: c.key,
          label: c.label,
          description: c.description,
          successProbability: res.successProbability,
          medianEnding: res.medianEnding,
          p10Ending: res.p10Ending,
          legacyProbability: res.legacyProbability,
          depletionAge: res.medianDepletionAge,
        };
      }),
      inflation: inflationGrid(assumptions, goals, gridRuns),
      ltc: ltcGrid(assumptions, goals, gridRuns),
      retirementAge: retirementAgeGrid(assumptions, goals, gridRuns, retirementAges),
      contributions: contributionSensitivity(assumptions, goals, gridRuns, contributionDeltas),
      spending: spendingSensitivity(assumptions, goals, gridRuns, spendingPcts),
      risks: rankRisks(assumptions, goals, gridRuns),
      recommendations: recommendedActions(assumptions, goals, gridRuns),
    };
    (self as unknown as Worker).postMessage({ ok: true, ...payload });
  } catch (err) {
    (self as unknown as Worker).postMessage({
      ok: false,
      id,
      error: err instanceof Error ? err.message : 'Simulation failed',
    });
  }
};
