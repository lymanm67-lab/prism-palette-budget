// Saved simulator runs, stored locally so runs survive reloads without a schema change.

import type { BureauEstimate, ScenarioAction, Sensitivity, Bureau } from './triBureauModel';

export const RUNS_KEY = 'prism.triBureauRuns.v1';
export const MAX_RUNS = 12;

export interface SavedRunBureau {
  bureau: Bureau;
  base: number | null;
  projected: number | null;
  delta: number;
  margin: number;
  aggregateUtil: number;
  simAggregateUtil: number;
}

export interface SavedRun {
  id: string;
  label: string;
  savedAt: string;
  actions: ScenarioAction[];
  sensitivity: Sensitivity;
  bureaus: SavedRunBureau[];
  baseMiddle: number | null;
  simMiddle: number | null;
  programs: { program: string; ok: boolean }[];
  actionSummary: string[];
}

export function loadRuns(): SavedRun[] {
  try {
    const raw = localStorage.getItem(RUNS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRuns(runs: SavedRun[]) {
  try {
    localStorage.setItem(RUNS_KEY, JSON.stringify(runs.slice(0, MAX_RUNS)));
  } catch {
    /* ignore quota */
  }
}

export function toSavedRun(args: {
  label: string;
  actions: ScenarioAction[];
  sensitivity: Sensitivity;
  estimates: BureauEstimate[];
  baseMiddle: number | null;
  simMiddle: number | null;
  programs: { program: string; ok: boolean }[];
  actionSummary: string[];
}): SavedRun {
  return {
    id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: args.label,
    savedAt: new Date().toISOString(),
    actions: args.actions,
    sensitivity: args.sensitivity,
    bureaus: args.estimates.map(e => ({
      bureau: e.bureau,
      base: e.base,
      projected: e.projected,
      delta: e.delta,
      margin: e.margin,
      aggregateUtil: e.aggregateUtil,
      simAggregateUtil: e.simAggregateUtil,
    })),
    baseMiddle: args.baseMiddle,
    simMiddle: args.simMiddle,
    programs: args.programs,
    actionSummary: args.actionSummary,
  };
}
