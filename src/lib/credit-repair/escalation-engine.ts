/**
 * Escalation cadence engine — computes the next action for a credit dispute
 * based on submission date, round, and outcome.
 *
 * Round 1 (day 0)      — Initial bureau/creditor dispute (FCRA §611 / §623)
 * Round 2 (day 30-35)  — Method of Verification (MOV) letter if verified or no response
 * Round 3 (day 60-65)  — CFPB complaint + State AG (if still unresolved)
 * Round 4 (day 90+)    — Arbitration notice / small claims prep
 */
import { addDays, differenceInDays, format } from 'date-fns';

export type EscalationChannel = 'bureau' | 'creditor' | 'cfpb' | 'state_ag' | 'arbitration' | 'bbb';
export type DisputeOutcome = 'pending' | 'verified' | 'deleted' | 'updated' | 'frivolous' | 'no_response';

export interface EscalationStep {
  round: number;
  channel: EscalationChannel;
  actionType: string;              // key for letter template
  actionLabel: string;             // human label
  triggerAfterDays: number;        // days after previous submission
  description: string;
}

export const ESCALATION_LADDER: EscalationStep[] = [
  {
    round: 1,
    channel: 'bureau',
    actionType: 'bureau-initial-dispute',
    actionLabel: 'Round 1 — Bureau dispute',
    triggerAfterDays: 0,
    description: 'FCRA §611 dispute filed with the credit bureau. Bureau has 30 days to investigate.',
  },
  {
    round: 2,
    channel: 'bureau',
    actionType: 'mov-letter',
    actionLabel: 'Round 2 — Method of Verification',
    triggerAfterDays: 35,
    description: 'Demand the bureau disclose HOW they verified the item under FCRA §611(a)(7). Most bureaus cannot produce this.',
  },
  {
    round: 3,
    channel: 'creditor',
    actionType: 'furnisher-direct-dispute',
    actionLabel: 'Round 3 — Direct furnisher dispute',
    triggerAfterDays: 65,
    description: 'FCRA §623(b) dispute mailed directly to the data furnisher (creditor/collector). Bypasses the bureau.',
  },
  {
    round: 4,
    channel: 'cfpb',
    actionType: 'cfpb-complaint',
    actionLabel: 'Round 4 — CFPB complaint',
    triggerAfterDays: 95,
    description: 'File a formal complaint with the CFPB. Response is typically within 15 days and gets bureau attention.',
  },
  {
    round: 5,
    channel: 'state_ag',
    actionType: 'state-ag-complaint',
    actionLabel: 'Round 5 — State Attorney General',
    triggerAfterDays: 125,
    description: 'File complaint with your state AG consumer protection division under state UDAP laws.',
  },
  {
    round: 6,
    channel: 'arbitration',
    actionType: 'arbitration-notice',
    actionLabel: 'Round 6 — Arbitration / small claims',
    triggerAfterDays: 155,
    description: 'Serve arbitration notice or file in small claims. FCRA allows $1,000+ statutory damages per willful violation.',
  },
];

export interface DisputeLike {
  round?: number | null;
  submitted_date?: string | null;
  status?: string | null;
  outcome?: string | null;
}

export function getCurrentStep(round: number): EscalationStep {
  return ESCALATION_LADDER.find(s => s.round === round) || ESCALATION_LADDER[0];
}

export function getNextStep(round: number): EscalationStep | null {
  return ESCALATION_LADDER.find(s => s.round === round + 1) || null;
}

/**
 * Compute the next action date based on submission and current round.
 * Returns null when the dispute is fully resolved.
 */
export function computeNextAction(dispute: DisputeLike): { date: string; step: EscalationStep } | null {
  if (dispute.outcome === 'deleted' || dispute.outcome === 'updated' || dispute.status === 'resolved') {
    return null;
  }
  const currentRound = dispute.round ?? 1;
  const nextStep = getNextStep(currentRound);
  if (!nextStep) return null;
  if (!dispute.submitted_date) return null;
  const nextDate = addDays(new Date(dispute.submitted_date), nextStep.triggerAfterDays);
  return { date: format(nextDate, 'yyyy-MM-dd'), step: nextStep };
}

export function isEscalationReady(dispute: DisputeLike): boolean {
  const next = computeNextAction(dispute);
  if (!next) return false;
  return differenceInDays(new Date(next.date), new Date()) <= 0;
}

export function daysUntilNextAction(dispute: DisputeLike): number | null {
  const next = computeNextAction(dispute);
  if (!next) return null;
  return differenceInDays(new Date(next.date), new Date());
}

/**
 * Recommend escalation based on outcome from bureau response.
 * - verified/frivolous → escalate to next round
 * - no_response → escalate immediately (bureau missed 30-day window = automatic deletion demand)
 * - deleted/updated → done
 */
export function recommendEscalationFromOutcome(outcome: DisputeOutcome, currentRound: number): EscalationStep | null {
  if (outcome === 'deleted' || outcome === 'updated') return null;
  if (outcome === 'no_response') {
    // Skip MOV, go direct to CFPB — bureau violated §611
    return ESCALATION_LADDER.find(s => s.round === 4) || null;
  }
  return getNextStep(currentRound);
}
