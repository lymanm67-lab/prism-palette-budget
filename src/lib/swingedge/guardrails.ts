// SwingEdge — proactive guardrails.
//
// These fire on their own while a plan is being built. Nothing here calls an AI
// model: every nudge is derived from a rule the owner wrote, a number measured
// on the screen, or a habit already recorded in past trades.

import type { DisciplineReport } from './discipline';
import type { RuleCheck, RuleVerdict } from './rulebook';

export type GuardrailTone = 'STOP' | 'CAUTION' | 'NOTE';

export interface Guardrail {
  key: string;
  tone: GuardrailTone;
  title: string;
  detail: string;
  /** One concrete thing to do next. */
  action: string;
}

export interface GuardrailInput {
  rules: RuleVerdict;
  discipline: DisciplineReport | null;
  /** Circuit breaker state, when the page has it. */
  breakerBlocked?: boolean;
  breakerReason?: string | null;
  /** Heat gate from the portfolio heat check. */
  heatBlocked?: boolean;
  heatReason?: string | null;
  /** True while the owner is sizing up right after a losing trade. */
  riskPct?: number | null;
  medianRiskPct?: number | null;
}

const RECENT_DRIFT_SCORE = 75;

const ruleLine = (checks: RuleCheck[]): string =>
  checks.map((c) => c.sentence).join(' ');

/**
 * Build the nudges to show above a plan, most serious first.
 * An empty list means nothing is drifting — show the all-clear instead.
 */
export function buildGuardrails(input: GuardrailInput): Guardrail[] {
  const out: Guardrail[] = [];

  if (input.breakerBlocked) {
    out.push({
      key: 'breaker',
      tone: 'STOP',
      title: 'Trading is paused',
      detail: input.breakerReason ?? 'Your own loss limit for this period has been reached.',
      action: 'Close the planner and come back next session.',
    });
  }

  if (input.heatBlocked) {
    out.push({
      key: 'heat',
      tone: 'STOP',
      title: 'Too much already at risk',
      detail: input.heatReason ?? 'Adding this trade pushes your open risk past your limit.',
      action: 'Close or reduce an open trade before adding another.',
    });
  }

  if (input.rules.breaks.length > 0) {
    out.push({
      key: 'rule-breaks',
      tone: 'STOP',
      title:
        input.rules.breaks.length === 1
          ? 'This breaks one of your rules'
          : `This breaks ${input.rules.breaks.length} of your rules`,
      detail: ruleLine(input.rules.breaks),
      action: 'Fix the plan until the rule passes, or skip the trade.',
    });
  }

  if (input.rules.cautions.length > 0) {
    out.push({
      key: 'rule-cautions',
      tone: 'CAUTION',
      title: 'Some of your softer rules are not met',
      detail: ruleLine(input.rules.cautions),
      action: 'Say out loud why this one is worth an exception.',
    });
  }

  const risk = input.riskPct;
  const median = input.medianRiskPct;
  if (risk !== null && risk !== undefined && median && median > 0 && risk > median * 1.5) {
    out.push({
      key: 'sizing-up',
      tone: 'CAUTION',
      title: 'You are sizing up',
      detail: `This trade risks ${risk.toFixed(2)}% of capital against your usual ${median.toFixed(2)}%.`,
      action: 'Go back to your usual size unless the setup is measurably better.',
    });
  }

  const report = input.discipline;
  if (report?.scored && report.score < RECENT_DRIFT_SCORE) {
    const top = report.findings[0];
    out.push({
      key: 'drift',
      tone: 'CAUTION',
      title: `Your recent trades score ${report.score} out of 100 for following the plan`,
      detail: top ? top.detail : 'Several recorded trades did not follow your rules.',
      action: 'Read the mentor review before you open another trade.',
    });
  }

  if (report) {
    for (const finding of report.findings) {
      if (finding.severity !== 'HIGH') continue;
      if (out.some((g) => g.key === `habit-${finding.key}`)) continue;
      out.push({
        key: `habit-${finding.key}`,
        tone: 'NOTE',
        title: `Watch for: ${finding.label.toLowerCase()}`,
        detail: finding.detail,
        action: 'Check this plan does not repeat it.',
      });
      if (out.filter((g) => g.tone === 'NOTE').length >= 2) break;
    }
  }

  const order: Record<GuardrailTone, number> = { STOP: 0, CAUTION: 1, NOTE: 2 };
  return out.sort((a, b) => order[a.tone] - order[b.tone]);
}

export const worstTone = (guardrails: Guardrail[]): GuardrailTone | null =>
  guardrails.some((g) => g.tone === 'STOP')
    ? 'STOP'
    : guardrails.some((g) => g.tone === 'CAUTION')
      ? 'CAUTION'
      : guardrails.length > 0
        ? 'NOTE'
        : null;
