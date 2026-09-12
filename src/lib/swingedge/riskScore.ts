// SwingEdge Hybrid Signal Engine — Risk Quality Score.
// This layer does not repeat the position-size maths in risk.ts or the stop maths
// in stops.ts. It reads their results and grades how sound the risk side of the
// trade is, out of 100, with any hard gate stated in plain words.

import type { StopQuality } from './stops';

export interface RiskScoreInputs {
  /** Result of assessStop() in stops.ts. */
  stopQuality: StopQuality | null;
  /** True when the selected stop sits at a defensible technical level. */
  stopJustified: boolean;
  rewardRisk: number | null;
  minimumRewardRisk: number;
  /** Shares from calculatePosition(); zero means the trade cannot be sized. */
  shares: number;
  /** Planned loss as a percent of trading capital. */
  accountRiskPct: number | null;
  maxAccountRiskPct: number;
  /** Total open risk as a percent of capital if this trade is added. */
  portfolioRiskPctAfter: number | null;
  maxPortfolioRiskPct: number;
  /** Stop distance as a percent of ATR — very tight stops get shaken out. */
  stopDistanceInAtr: number | null;
  /** Days until the next earnings report. Null when unavailable. */
  daysToEarnings: number | null;
  earningsDataAvailable: boolean;
  /** Average daily traded value, used for a liquidity read. */
  avgDollarVolume?: number | null;
  positionValue?: number | null;
}

export interface RiskComponent {
  key: string;
  label: string;
  max: number;
  points: number;
  detail: string;
}

export interface RiskScoreResult {
  score: number;
  components: RiskComponent[];
  hardGateFailures: string[];
  warnings: string[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * 100 points: stop quality 35, reward to risk 25, sizing and account risk 20,
 * portfolio room 10, event and liquidity risk 10.
 */
export function scoreRisk(input: RiskScoreInputs): RiskScoreResult {
  const components: RiskComponent[] = [];
  const hardGateFailures: string[] = [];
  const warnings: string[] = [];

  // Stop quality — 35.
  const q = input.stopQuality;
  const stopPoints = q === 'STRONG' ? 35 : q === 'ACCEPTABLE' ? 28 : q === 'QUESTIONABLE' ? 12 : 0;
  components.push({
    key: 'stop',
    label: 'Stop quality',
    max: 35,
    points: stopPoints,
    detail:
      q === null
        ? 'No stop has been assessed yet.'
        : q === 'STRONG'
          ? 'The stop sits below a level that would genuinely prove the idea wrong.'
          : q === 'ACCEPTABLE'
            ? 'The stop is defensible, though not the cleanest level on the chart.'
            : q === 'QUESTIONABLE'
              ? 'The stop does not clearly line up with a level that invalidates the setup.'
              : 'The stop is not a valid invalidation level for this setup.',
  });
  if (q === null) hardGateFailures.push('No stop has been set, so the trade cannot be judged.');
  if (q === 'INVALID') hardGateFailures.push('The stop is not a valid invalidation level.');
  if (q === 'QUESTIONABLE') warnings.push('Stop placement needs review before this trade is taken.');
  if (!input.stopJustified && q !== null) {
    warnings.push('The written reason for the stop does not yet justify the level chosen.');
  }

  // Reward to risk — 25.
  const rr = input.rewardRisk;
  const minRr = input.minimumRewardRisk;
  let rrPoints = 0;
  if (rr !== null) {
    rrPoints = rr >= minRr * 1.5 ? 25 : rr >= minRr ? 20 : rr >= minRr * 0.75 ? 8 : 0;
  }
  components.push({
    key: 'rewardRisk',
    label: 'Reward against risk',
    max: 25,
    points: rrPoints,
    detail:
      rr === null
        ? 'Entry, stop and target are needed before reward can be compared with risk.'
        : `The target is ${round1(rr)} times the distance to the stop, against a house rule of ${minRr}.`,
  });
  if (rr !== null && rr < minRr) {
    hardGateFailures.push(`Reward to risk is ${round1(rr)}, below the ${minRr} minimum.`);
  }
  if (rr === null) hardGateFailures.push('Reward to risk cannot be calculated yet.');

  // Sizing and account risk — 20.
  let sizePoints = 0;
  const accRisk = input.accountRiskPct;
  if (input.shares >= 1 && accRisk !== null) {
    sizePoints = accRisk <= input.maxAccountRiskPct * 0.7 ? 20 : accRisk <= input.maxAccountRiskPct ? 16 : 0;
  }
  components.push({
    key: 'sizing',
    label: 'Position size and account risk',
    max: 20,
    points: sizePoints,
    detail:
      input.shares < 1
        ? 'The risk budget will not cover a single share at this stop distance.'
        : accRisk === null
          ? 'Account risk has not been calculated.'
          : `This trade puts ${round1(accRisk)}% of trading capital at risk against a ${input.maxAccountRiskPct}% limit.`,
  });
  if (input.shares < 1) hardGateFailures.push('Position size works out below one share.');
  if (accRisk !== null && accRisk > input.maxAccountRiskPct) {
    hardGateFailures.push(`Account risk of ${round1(accRisk)}% exceeds the ${input.maxAccountRiskPct}% limit.`);
  }

  // Portfolio room — 10.
  const pf = input.portfolioRiskPctAfter;
  let pfPoints = 0;
  if (pf !== null) {
    pfPoints = pf <= input.maxPortfolioRiskPct * 0.7 ? 10 : pf <= input.maxPortfolioRiskPct ? 7 : 0;
  }
  components.push({
    key: 'portfolio',
    label: 'Portfolio room',
    max: 10,
    points: pfPoints,
    detail:
      pf === null
        ? 'Open risk across trades has not been calculated.'
        : `With this trade added, total risk on the table is ${round1(pf)}% against a ${input.maxPortfolioRiskPct}% ceiling.`,
  });
  if (pf !== null && pf > input.maxPortfolioRiskPct) {
    hardGateFailures.push(`Adding this trade pushes total open risk to ${round1(pf)}%, above the ${input.maxPortfolioRiskPct}% ceiling.`);
  }

  // Event and liquidity risk — 10.
  let eventPoints = 10;
  const eventBits: string[] = [];
  if (input.stopDistanceInAtr !== null) {
    if (input.stopDistanceInAtr < 0.75) {
      eventPoints -= 4;
      eventBits.push('the stop is inside normal daily noise, so a shake-out is likely');
      warnings.push('Stop is tighter than one day of normal movement.');
    } else if (input.stopDistanceInAtr > 3) {
      eventPoints -= 2;
      eventBits.push('the stop is very wide, so the position has to be small');
    }
  }
  if (!input.earningsDataAvailable) {
    eventPoints -= 2;
    eventBits.push('earnings timing is unavailable on the current data plan');
  } else if (input.daysToEarnings !== null && input.daysToEarnings >= 0 && input.daysToEarnings <= 5) {
    eventPoints -= 5;
    eventBits.push(`earnings are due in ${input.daysToEarnings} day${input.daysToEarnings === 1 ? '' : 's'}, and a gap can jump straight past a stop`);
    warnings.push('Earnings land inside the planned holding period.');
  } else if (input.daysToEarnings !== null && input.daysToEarnings <= 14) {
    eventPoints -= 2;
    eventBits.push(`earnings are about ${input.daysToEarnings} days out`);
  }
  if (
    typeof input.avgDollarVolume === 'number' &&
    typeof input.positionValue === 'number' &&
    input.avgDollarVolume > 0 &&
    input.positionValue > input.avgDollarVolume * 0.01
  ) {
    eventPoints -= 3;
    eventBits.push('the position is large against the amount that trades daily');
    warnings.push('Thin trading volume relative to the planned position size.');
  }
  components.push({
    key: 'event',
    label: 'Event and liquidity risk',
    max: 10,
    points: Math.max(0, eventPoints),
    detail: eventBits.length ? `Points reduced because ${eventBits.join('; ')}.` : 'No event or liquidity problem found.',
  });

  const score = components.reduce((s, c) => s + c.points, 0);
  return { score: Math.max(0, Math.min(100, score)), components, hardGateFailures, warnings };
}
