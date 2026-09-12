// SwingEdge Hybrid Signal Engine — conflict detection.
// A blended score can hide a disagreement. When the three layers point in
// different directions the trader is told in words, and the signal is held back
// rather than averaged into a comfortable-looking number.

export type ConflictSeverity = 'NOTE' | 'HOLD' | 'BLOCK';

export interface SignalConflict {
  key: string;
  label: string;
  explanation: string;
  severity: ConflictSeverity;
}

export interface ConflictInputs {
  qualityScore: number | null;
  technicalScore: number;
  riskScore: number;
  qualityMinimum: number;
  technicalMinimum: number;
  riskMinimum: number;
  fundamentalTrend?: 'IMPROVING' | 'STABLE' | 'DETERIORATING' | 'INSUFFICIENT_DATA';
  criticalRedFlag?: boolean;
  earningsInsideHold?: boolean;
  extendedFromAverage?: boolean;
  volumeWeak?: boolean;
  marketAgainst?: boolean;
  sectorAgainst?: boolean;
}

/** Named disagreements, most serious first. */
export function detectConflicts(input: ConflictInputs): SignalConflict[] {
  const out: SignalConflict[] = [];
  const q = input.qualityScore;

  if (q !== null && q >= input.qualityMinimum && input.technicalScore < input.technicalMinimum) {
    out.push({
      key: 'good_company_weak_chart',
      label: 'Sound business, chart is not ready',
      explanation:
        'The company or fund scores well but the chart has not set up. That is a reason to wait for a setup, not a reason to buy early.',
      severity: 'HOLD',
    });
  }
  if (q !== null && q < input.qualityMinimum && input.technicalScore >= input.technicalMinimum) {
    out.push({
      key: 'weak_company_strong_chart',
      label: 'Strong chart, weak underlying quality',
      explanation:
        'The chart looks good but the business or fund quality is below the minimum. Moves like this can reverse quickly on bad news.',
      severity: 'HOLD',
    });
  }
  if (input.riskScore < input.riskMinimum) {
    out.push({
      key: 'risk_below_minimum',
      label: 'The risk side is not sound',
      explanation: 'Stop placement, reward against risk or sizing does not meet your own rules, whatever the other scores say.',
      severity: 'BLOCK',
    });
  }
  if (input.criticalRedFlag) {
    out.push({
      key: 'critical_red_flag',
      label: 'A serious warning sign in the figures',
      explanation:
        'A critical red flag is present in the reported numbers. This is a reason to review the idea, not an instruction to move a stop.',
      severity: 'HOLD',
    });
  }
  if (input.fundamentalTrend === 'DETERIORATING' && input.technicalScore >= input.technicalMinimum) {
    out.push({
      key: 'deteriorating_but_rising',
      label: 'Price rising while the figures weaken',
      explanation: 'The chart is strong but revenue, earnings, margins or cash flow are heading the wrong way.',
      severity: 'NOTE',
    });
  }
  if (input.earningsInsideHold) {
    out.push({
      key: 'earnings_inside_hold',
      label: 'Earnings land inside the trade',
      explanation: 'A report inside the holding period can gap price straight past a stop, so the planned loss is not guaranteed.',
      severity: 'HOLD',
    });
  }
  if (input.marketAgainst) {
    out.push({
      key: 'market_against',
      label: 'The wider market is against this',
      explanation: 'The broad market is weak, which lowers the odds that any long setup follows through.',
      severity: 'NOTE',
    });
  }
  if (input.sectorAgainst) {
    out.push({
      key: 'sector_against',
      label: 'The sector is lagging',
      explanation: 'The symbol is rising while its sector is not, so the move has less support behind it.',
      severity: 'NOTE',
    });
  }
  if (input.extendedFromAverage) {
    out.push({
      key: 'extended',
      label: 'Price is stretched from its average',
      explanation: 'A sensible stop would have to be wide from here, which shrinks the position and the reward on offer.',
      severity: 'NOTE',
    });
  }
  if (input.volumeWeak && input.technicalScore >= input.technicalMinimum) {
    out.push({
      key: 'weak_volume',
      label: 'The move lacks volume',
      explanation: 'A breakout without participation reverses easily.',
      severity: 'NOTE',
    });
  }
  return out;
}

export function worstSeverity(conflicts: SignalConflict[]): ConflictSeverity | null {
  if (conflicts.some((c) => c.severity === 'BLOCK')) return 'BLOCK';
  if (conflicts.some((c) => c.severity === 'HOLD')) return 'HOLD';
  if (conflicts.length) return 'NOTE';
  return null;
}
