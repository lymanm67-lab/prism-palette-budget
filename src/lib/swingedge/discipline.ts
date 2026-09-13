// SwingEdge — discipline analysis.
//
// Everything here is measured from trades and journal entries the owner already
// recorded. Nothing is inferred from a guess, and nothing is invented: when a
// field was never filled in, the check reports "not recorded" instead of a
// verdict. The AI Mentor reads this output as fact — it never recomputes it.

export interface DisciplineTrade {
  id: string;
  symbol: string | null;
  entryDate: string | null;
  exitDate: string | null;
  status: string | null;
  setupType: string | null;
  initialDollarRisk: number | null;
  realizedPl: number | null;
  stopPrice: number | null;
  originalStop: number | null;
  entryPrice: number | null;
  rulesFollowed: boolean | null;
  readinessScore: number | null;
  earningsWithinHold: boolean | null;
  eventDecision: string | null;
  revalidatedAt: string | null;
  exitReason: string | null;
}

export interface DisciplineJournalEntry {
  id: string;
  symbol: string | null;
  entryDate: string | null;
  rulesFollowed: boolean | null;
  followedStopRule: boolean | null;
  widenedStop: boolean | null;
  stopMoved: boolean | null;
  mistakes: string | null;
  resultR: number | null;
}

export type RuleSeverity = 'LOW' | 'MODERATE' | 'HIGH';

export interface RuleFinding {
  /** Stable key so the same habit can be tracked over time. */
  key: string;
  /** Short plain-English name of the habit. */
  label: string;
  severity: RuleSeverity;
  /** How many recorded trades show it. */
  count: number;
  /** How many trades could have shown it (0 when nothing was recorded). */
  outOf: number;
  /** One sentence of evidence, always from recorded data. */
  detail: string;
}

export interface DisciplineReport {
  /** 0-100. 100 = every recorded trade followed the rules you set. */
  score: number;
  /** Null when there is not enough recorded history to score anything. */
  scored: boolean;
  tradesConsidered: number;
  closedTrades: number;
  findings: RuleFinding[];
  /** Habits that were checked and came back clean. */
  clean: string[];
  /** Checks that could not run because the data was never recorded. */
  notRecorded: string[];
  medianRisk: number | null;
}

const MIN_TRADES_TO_SCORE = 3;

const PENALTY: Record<RuleSeverity, number> = { LOW: 6, MODERATE: 12, HIGH: 20 };

const median = (values: number[]): number | null => {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const dayKey = (iso: string | null): string | null => (iso ? iso.slice(0, 10) : null);

const daysBetween = (a: string, b: string): number =>
  Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86_400_000;

/**
 * Measure rule-following and emotional patterns across recorded trades.
 * Long-only paper trading: a stop moved DOWN (further from price) is a widened stop.
 */
export function assessDiscipline(
  trades: DisciplineTrade[],
  journal: DisciplineJournalEntry[] = [],
): DisciplineReport {
  const findings: RuleFinding[] = [];
  const clean: string[] = [];
  const notRecorded: string[] = [];

  const closed = trades.filter((t) => (t.status ?? '').toUpperCase() === 'CLOSED');
  const risks = trades.map((t) => Number(t.initialDollarRisk)).filter((v) => Number.isFinite(v) && v > 0);
  const medianRisk = median(risks);

  const add = (
    key: string,
    label: string,
    severity: RuleSeverity,
    count: number,
    outOf: number,
    detail: string,
  ) => {
    if (outOf === 0) {
      notRecorded.push(label);
      return;
    }
    if (count === 0) {
      clean.push(label);
      return;
    }
    findings.push({ key, label, severity, count, outOf, detail });
  };

  // 1. Stop widened after entry — the single most costly break of the rules.
  const stopPool = trades.filter(
    (t) => Number.isFinite(Number(t.stopPrice)) && Number.isFinite(Number(t.originalStop)),
  );
  const widened = stopPool.filter((t) => Number(t.stopPrice) < Number(t.originalStop) - 0.0001);
  const journalWidened = journal.filter((j) => j.widenedStop === true);
  add(
    'stop_widened',
    'Stop moved further from price',
    'HIGH',
    widened.length + (widened.length === 0 ? journalWidened.length : 0),
    stopPool.length || journal.filter((j) => j.widenedStop !== null).length,
    widened.length > 0
      ? `${widened.length} trade(s) ended with a stop below the one first planned — ${widened
          .slice(0, 3)
          .map((t) => t.symbol ?? '—')
          .join(', ')}.`
      : `${journalWidened.length} journal entr(y/ies) record widening the stop.`,
  );

  // 2. Self-reported rule breaks.
  const ruleRecorded = trades.filter((t) => t.rulesFollowed !== null);
  const ruleBroken = ruleRecorded.filter((t) => t.rulesFollowed === false);
  add(
    'self_reported_break',
    'Trades you marked as not following the rules',
    'HIGH',
    ruleBroken.length,
    ruleRecorded.length,
    `${ruleBroken.length} of ${ruleRecorded.length} recorded trades are marked as rule breaks.`,
  );

  // 3. Oversized risk versus your own normal size.
  const oversized =
    medianRisk && medianRisk > 0
      ? trades.filter((t) => Number(t.initialDollarRisk) > medianRisk * 1.5)
      : [];
  add(
    'oversized_risk',
    'Position risk well above your normal size',
    'MODERATE',
    oversized.length,
    risks.length,
    medianRisk
      ? `Your usual risk is about $${medianRisk.toFixed(0)} per trade; ${oversized.length} trade(s) risked more than 1.5 times that.`
      : 'No planned risk recorded.',
  );

  // 4. Revenge sizing — bigger risk straight after a loss.
  const byEntry = [...trades]
    .filter((t) => t.entryDate)
    .sort((a, b) => new Date(a.entryDate!).getTime() - new Date(b.entryDate!).getTime());
  const losers = closed.filter((t) => Number(t.realizedPl) < 0 && t.exitDate);
  let revenge = 0;
  const revengeSymbols: string[] = [];
  if (medianRisk && medianRisk > 0) {
    for (const trade of byEntry) {
      const risk = Number(trade.initialDollarRisk);
      if (!Number.isFinite(risk) || risk <= medianRisk * 1.25) continue;
      const afterLoss = losers.some(
        (l) => l.id !== trade.id && daysBetween(l.exitDate!, trade.entryDate!) <= 2,
      );
      if (afterLoss) {
        revenge += 1;
        if (trade.symbol) revengeSymbols.push(trade.symbol);
      }
    }
  }
  add(
    'revenge_sizing',
    'Bigger risk taken within two days of a loss',
    'HIGH',
    revenge,
    losers.length && medianRisk ? byEntry.length : 0,
    `${revenge} trade(s) opened at above-normal risk within two days of closing a loser${
      revengeSymbols.length ? ` — ${revengeSymbols.slice(0, 3).join(', ')}` : ''
    }.`,
  );

  // 5. Overtrading — several entries stacked into one day.
  const perDay = new Map<string, number>();
  for (const t of trades) {
    const key = dayKey(t.entryDate);
    if (key) perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }
  const busyDays = [...perDay.entries()].filter(([, n]) => n >= 4);
  add(
    'overtrading',
    'Four or more entries in a single day',
    'MODERATE',
    busyDays.length,
    perDay.size,
    `${busyDays.length} day(s) with four or more entries${
      busyDays.length ? ` — ${busyDays.slice(0, 3).map(([d, n]) => `${d} (${n})`).join(', ')}` : ''
    }.`,
  );

  // 6. Entering below your own readiness bar.
  const readinessPool = trades.filter((t) => Number.isFinite(Number(t.readinessScore)));
  const lowReadiness = readinessPool.filter((t) => Number(t.readinessScore) < 70);
  add(
    'low_readiness',
    'Entries taken below 70 readiness',
    'MODERATE',
    lowReadiness.length,
    readinessPool.length,
    `${lowReadiness.length} of ${readinessPool.length} trades with a recorded readiness score were below 70.`,
  );

  // 7. Held through earnings.
  const earningsPool = trades.filter((t) => t.earningsWithinHold !== null);
  const heldEarnings = earningsPool.filter((t) => t.earningsWithinHold === true);
  add(
    'held_through_earnings',
    'Held a position through earnings',
    'MODERATE',
    heldEarnings.length,
    earningsPool.length,
    `${heldEarnings.length} of ${earningsPool.length} trades with a recorded earnings check were held through the report.`,
  );

  // 8. Entered against a WAIT or REVIEW event call.
  const decisionPool = trades.filter((t) => t.eventDecision);
  const againstCall = decisionPool.filter((t) => (t.eventDecision ?? '').toUpperCase() !== 'GO');
  add(
    'entered_against_event_call',
    'Entered while the event check said wait or review',
    'HIGH',
    againstCall.length,
    decisionPool.length,
    `${againstCall.length} of ${decisionPool.length} trades were opened on a wait/review event call.`,
  );

  // 9. Exit discipline — journal says the stop rule was not followed.
  const stopRulePool = journal.filter((j) => j.followedStopRule !== null);
  const brokeStopRule = stopRulePool.filter((j) => j.followedStopRule === false);
  add(
    'stop_rule_ignored',
    'Exit did not follow the stop rule',
    'HIGH',
    brokeStopRule.length,
    stopRulePool.length,
    `${brokeStopRule.length} of ${stopRulePool.length} journalled trades did not exit by the stop rule.`,
  );

  const scored = trades.length >= MIN_TRADES_TO_SCORE;
  let score = 100;
  for (const f of findings) {
    const rate = f.outOf > 0 ? f.count / f.outOf : 0;
    score -= PENALTY[f.severity] * Math.min(1, Math.max(rate, 1 / Math.max(f.outOf, 1)));
  }

  return {
    score: Math.max(0, Math.round(score)),
    scored,
    tradesConsidered: trades.length,
    closedTrades: closed.length,
    findings: findings.sort((a, b) => PENALTY[b.severity] - PENALTY[a.severity]),
    clean,
    notRecorded,
    medianRisk,
  };
}

export const disciplineBand = (score: number): string =>
  score >= 90 ? 'DISCIPLINED' : score >= 75 ? 'MOSTLY ON PLAN' : score >= 55 ? 'DRIFTING' : 'OFF PLAN';
