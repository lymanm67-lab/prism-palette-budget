// SwingEdge — Event Risk Engine.
//
// This engine never predicts what an event will do. It answers five questions:
//   1. What is expected, and when?
//   2. What does it touch?
//   3. Does it land inside the holding period?
//   4. How material could it be?
//   5. Should this trade stay GO, move to WAIT, or need REVIEW?
//
// Nothing is invented. An unknown stays unknown, and an unverified report that
// could be severe forces a REVIEW rather than sitting silently behind a GO.

import { assessEarnings, type EarningsAssessment, type EarningsRecord, type EarningsWindowConfig } from './earningsRisk';
import {
  daysUntil,
  isActionable,
  needsVerificationReview,
  SESSION_EXPLANATION,
  SEVERITY_RANK,
  type CalendarEvent,
  type EventSeverity,
} from './eventCalendar';
import { sectorRisk, type SectorRiskRead } from './sectorEvents';

export type EventDecision = 'GO' | 'WAIT' | 'REVIEW';

export type EventRiskBand = 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';

export interface EventRiskBands {
  lowMax: number;
  moderateMax: number;
  highMax: number;
}

export const DEFAULT_EVENT_RISK_BANDS: EventRiskBands = { lowMax: 24, moderateMax: 49, highMax: 74 };

export interface EventTimelineItem {
  label: string;
  date: string;
  daysFromNow: number | null;
  kind: 'TODAY' | 'ENTRY' | 'EVENT' | 'HOLDING_END';
  severity?: EventSeverity;
  session?: string;
}

export interface EventRiskInput {
  symbol: string;
  sector?: string | null;
  /** Planned holding period in calendar days. */
  holdingDays: number;
  earnings: EarningsRecord | null;
  events: CalendarEvent[];
  mode?: 'BEGINNER' | 'ADVANCED';
  allowEarningsEventTrades?: boolean;
  gapAcknowledged?: boolean;
  earningsWindows?: EarningsWindowConfig;
  bands?: EventRiskBands;
  now?: Date;
  entryDate?: string | null;
}

export interface EventRiskResult {
  score: number;
  band: EventRiskBand;
  decision: EventDecision;
  earnings: EarningsAssessment;
  sector: SectorRiskRead | null;
  /** Verified live events touching this symbol or its sector. */
  relevant: CalendarEvent[];
  /** Unverified reports that could be HIGH or SEVERE. */
  pendingSignificant: CalendarEvent[];
  unverifiedEventRisk: boolean;
  hardGates: string[];
  warnings: string[];
  lines: string[];
  timeline: EventTimelineItem[];
  revalidationRequired: boolean;
  requiresGapAcknowledgement: boolean;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function bandFor(score: number, bands: EventRiskBands): EventRiskBand {
  if (score <= bands.lowMax) return 'LOW';
  if (score <= bands.moderateMax) return 'MODERATE';
  if (score <= bands.highMax) return 'HIGH';
  return 'SEVERE';
}

/** Scores event risk 0-100, where 0 is a clear calendar and 100 is a minefield. */
export function assessEventRisk(input: EventRiskInput): EventRiskResult {
  const now = input.now ?? new Date();
  const mode = input.mode ?? 'BEGINNER';
  const bands = input.bands ?? DEFAULT_EVENT_RISK_BANDS;

  const earnings = assessEarnings({
    record: input.earnings,
    holdingDays: input.holdingDays,
    windows: input.earningsWindows,
    now,
  });

  const symbolUpper = input.symbol.toUpperCase();
  const touching = input.events.filter(
    (e) =>
      e.symbols.some((s) => s.toUpperCase() === symbolUpper) ||
      (input.sector ? e.sectors.some((s) => s.toLowerCase() === (input.sector as string).toLowerCase()) : false) ||
      e.kind === 'MACRO',
  );
  const relevant = touching.filter(isActionable);
  const pendingSignificant = touching.filter(needsVerificationReview);
  const sector = input.sector ? sectorRisk(input.sector, input.events) : null;

  let score = 0;
  const lines: string[] = [];
  const warnings: string[] = [];
  const hardGates: string[] = [];

  // Earnings contribution.
  if (!earnings.available) {
    score += 45;
    warnings.push('Earnings timing is unknown for this symbol.');
    if (mode === 'BEGINNER') {
      hardGates.push('Earnings date unknown. Verify it manually before holding this for several days.');
    }
  } else {
    const byWindow: Record<string, number> = { VERY_HIGH: 55, HIGH: 40, MODERATE: 20, LOWER: 5, NONE: 0, UNKNOWN: 45 };
    score += byWindow[earnings.window] ?? 0;
    if (earnings.insideHoldingWindow) {
      score += 10;
      warnings.push('Earnings land inside the planned holding period.');
      if (mode === 'BEGINNER' && !input.allowEarningsEventTrades) {
        hardGates.push(
          'Earnings fall inside the holding period. Beginner Mode requires either a shorter hold or the explicit earnings opt-in.',
        );
      }
    }
    if (earnings.certainty === 'ESTIMATED') score += 5;
    if (earnings.postEarningsRevalidationRequired) {
      score += 10;
      warnings.push('This symbol has reported very recently, so prior levels are stale.');
    }
  }
  lines.push(...earnings.lines);

  // Verified event contribution.
  relevant.forEach((ev) => {
    const d = daysUntil(ev.eventStart ?? ev.eventDate, now);
    const near = d !== null && d >= 0 && d <= input.holdingDays;
    const weight = { LOW: 4, MODERATE: 12, HIGH: 25, SEVERE: 45 }[ev.severity];
    score += near ? weight : Math.round(weight / 2);
    lines.push(
      `${ev.kind === 'MACRO' ? 'Macro' : ev.kind === 'EARNINGS' ? 'Earnings' : 'Event'}: ${ev.title} on ${ev.eventDate} (${ev.severity})${
        near ? ' — inside your holding window' : ''
      }. ${SESSION_EXPLANATION[ev.session]}`,
    );
    if (ev.severity === 'SEVERE' && mode === 'BEGINNER') {
      hardGates.push(`A severe verified event affects this trade: ${ev.title}.`);
    }
  });

  // Unverified but potentially significant reports: never silent, never automatic.
  if (pendingSignificant.length) {
    score += 20;
    warnings.push(
      `UNVERIFIED EVENT RISK: ${pendingSignificant.length} unverified report${
        pendingSignificant.length === 1 ? '' : 's'
      } could be significant here. Verify or dismiss before treating this as clear.`,
    );
  }

  // Stale events request a fresh look rather than scoring as if resolved.
  const stale = touching.filter((e) => e.status === 'STALE');
  if (stale.length) {
    warnings.push(
      `${stale.length} event${stale.length === 1 ? '' : 's'} passed the review date without being resolved, so this needs revalidating.`,
    );
  }

  score = clamp(score);
  const band = bandFor(score, bands);

  const severeVerified = relevant.some((e) => e.severity === 'SEVERE');
  const highVerified = relevant.some((e) => e.severity === 'HIGH');

  let decision: EventDecision = 'GO';
  if (severeVerified) decision = mode === 'BEGINNER' ? 'WAIT' : 'REVIEW';
  else if (pendingSignificant.length || stale.length) decision = 'REVIEW';
  else if (highVerified || band === 'HIGH' || band === 'SEVERE') decision = 'REVIEW';
  else if (!earnings.available && mode === 'BEGINNER') decision = 'REVIEW';
  else if (earnings.insideHoldingWindow && mode === 'BEGINNER' && !input.allowEarningsEventTrades) decision = 'WAIT';

  const requiresGapAcknowledgement =
    earnings.insideHoldingWindow || earnings.window === 'VERY_HIGH' || earnings.window === 'HIGH';
  if (requiresGapAcknowledgement && input.allowEarningsEventTrades && !input.gapAcknowledged) {
    hardGates.push('The gap-risk acknowledgement has not been given for an earnings-window trade.');
  }

  return {
    score,
    band,
    decision,
    earnings,
    sector,
    relevant,
    pendingSignificant,
    unverifiedEventRisk: pendingSignificant.length > 0,
    hardGates,
    warnings,
    lines,
    timeline: buildTimeline(input, relevant, pendingSignificant, earnings, now),
    revalidationRequired: stale.length > 0 || earnings.postEarningsRevalidationRequired,
    requiresGapAcknowledgement,
  };
}

function buildTimeline(
  input: EventRiskInput,
  relevant: CalendarEvent[],
  pending: CalendarEvent[],
  earnings: EarningsAssessment,
  now: Date,
): EventTimelineItem[] {
  const items: EventTimelineItem[] = [
    { label: 'Today', date: now.toISOString().slice(0, 10), daysFromNow: 0, kind: 'TODAY' },
  ];
  if (input.entryDate) {
    items.push({ label: 'Planned entry', date: input.entryDate, daysFromNow: daysUntil(input.entryDate, now), kind: 'ENTRY' });
  }
  if (earnings.available && earnings.date) {
    items.push({
      label: `Earnings (${earnings.certainty})`,
      date: earnings.date,
      daysFromNow: earnings.daysUntil,
      kind: 'EVENT',
      severity: earnings.insideHoldingWindow ? 'HIGH' : 'MODERATE',
      session: earnings.timingLabel,
    });
  }
  [...relevant, ...pending].forEach((ev) => {
    items.push({
      label: ev.verification === 'VERIFIED' ? ev.title : `${ev.title} (unverified)`,
      date: ev.eventDate,
      daysFromNow: daysUntil(ev.eventStart ?? ev.eventDate, now),
      kind: 'EVENT',
      severity: ev.severity,
    });
  });
  const end = new Date(now.getTime() + input.holdingDays * 86_400_000).toISOString().slice(0, 10);
  items.push({ label: 'Holding window ends', date: end, daysFromNow: input.holdingDays, kind: 'HOLDING_END' });

  return items.sort((a, b) => (a.daysFromNow ?? 0) - (b.daysFromNow ?? 0));
}

export const EVENT_RISK_DISCLAIMER =
  'Event risk describes what is scheduled and how material it could be. It never predicts which way price will move.';

export function severityAtLeast(a: EventSeverity, b: EventSeverity): boolean {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b];
}
