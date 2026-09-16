// SwingEdge — Analysis snapshot.
//
// What the Analyzer knew at the moment a trade was prepared. It is written once,
// handed to the Trade Planner, and stored with the saved plan so the plan can
// always be read back against the conditions that produced it.
//
// Anything the Analyzer could not measure is stored as null and rendered as
// "not available". Nothing here is estimated to fill a gap.

export const SNAPSHOT_VERSION = '1.0';

export interface AnalysisSnapshot {
  version: string;
  takenAt: string;
  symbol: string;
  currentPrice: number | null;
  setup: string | null;
  entryTrigger: number | null;
  support: number | null;
  resistance: number | null;
  stopSuggestion: number | null;
  /** Entry + (risk x reward multiple). */
  mathematicalTarget: number | null;
  /** A level-based target when one was identified. */
  technicalTarget: number | null;
  targetPath: string | null;
  targetPathReason: string | null;
  dailyTrend: string | null;
  h4Trend: string | null;
  h1Trend: string | null;
  weeklyContext: string | null;
  /** Heikin Ashi confirmation. Null until that module exists. */
  haConfirmation: string | null;
  directionalBias: string | null;
  eventRisk: string | null;
  signalStatus: string | null;
  readinessScore: number | null;
  readinessBand: string | null;
}

export type AnalysisSnapshotInput = Omit<AnalysisSnapshot, 'version' | 'takenAt'> & {
  takenAt?: string;
};

/** Builds the snapshot. Missing inputs stay null rather than being guessed. */
export function buildAnalysisSnapshot(input: AnalysisSnapshotInput): AnalysisSnapshot {
  return {
    ...input,
    symbol: (input.symbol ?? '').toUpperCase(),
    version: SNAPSHOT_VERSION,
    takenAt: input.takenAt ?? new Date().toISOString(),
  };
}

const KEY_PREFIX = 'swingedge.prep.';

/** Stashes the snapshot for the Planner to pick up on the next page. */
export function stashSnapshot(snapshot: AnalysisSnapshot): string {
  const key = snapshot.symbol || 'UNKNOWN';
  try {
    sessionStorage.setItem(KEY_PREFIX + key, JSON.stringify(snapshot));
  } catch {
    // Private browsing can refuse storage. The Planner then opens with the
    // symbol only, which is honest rather than half-filled.
  }
  return key;
}

/** Reads a stashed snapshot. Returns null when nothing usable is stored. */
export function readSnapshot(key: string | null | undefined): AnalysisSnapshot | null {
  if (!key) return null;
  try {
    const raw = sessionStorage.getItem(KEY_PREFIX + key.toUpperCase());
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AnalysisSnapshot;
    return parsed && typeof parsed.symbol === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export function clearSnapshot(key: string | null | undefined): void {
  if (!key) return;
  try {
    sessionStorage.removeItem(KEY_PREFIX + key.toUpperCase());
  } catch {
    /* nothing to clear */
  }
}

/** Values the Planner pre-fills. Only fields the Analyzer actually measured. */
export interface PlannerPrefill {
  symbol: string;
  setup: string | null;
  entry: string | null;
  stop: string | null;
  target: string | null;
}

export function plannerPrefill(snapshot: AnalysisSnapshot): PlannerPrefill {
  const price = (n: number | null) => (typeof n === 'number' && n > 0 ? n.toFixed(2) : null);
  return {
    symbol: snapshot.symbol,
    setup: snapshot.setup && snapshot.setup !== 'NONE' ? snapshot.setup : null,
    entry: price(snapshot.entryTrigger),
    stop: price(snapshot.stopSuggestion),
    target: price(snapshot.technicalTarget ?? snapshot.mathematicalTarget),
  };
}

/** One line the Planner shows so the source of the pre-filled numbers is clear. */
export function snapshotOrigin(snapshot: AnalysisSnapshot): string {
  const when = new Date(snapshot.takenAt);
  const time = Number.isNaN(when.getTime()) ? 'earlier' : when.toLocaleString();
  return `Pre-filled from your ${snapshot.symbol} analysis, taken ${time}. Confirm or change anything before you save.`;
}
