// SwingEdge — Directional Bias calibration.
//
// Being right about direction is not the same as being honest about probability.
// If SwingEdge said roughly 70% UP, price should have finished in the UP band
// about 70% of the time. This module measures that gap so an impressive-looking
// number cannot pass for a useful one.

export interface BiasOutcomeRecord {
  /** The up percentage the engine displayed at the time. */
  predictedUpPct: number;
  /** What actually happened, classified the same way the engine classified it. */
  actualClassification: 'UP' | 'SIDEWAYS' | 'DOWN';
  forwardPeriod: number;
  independentSampleSize?: number | null;
  methodologyVersion?: string | null;
}

export type CalibrationBandKey = '50_59' | '60_69' | '70_79' | '80_PLUS';

export interface CalibrationBand {
  key: CalibrationBandKey;
  label: string;
  predictedUpPct: number | null;
  actualUpPct: number | null;
  sampleSize: number;
  /** Actual minus predicted, in percentage points. */
  differencePct: number | null;
}

export type CalibrationVerdict = 'INSUFFICIENT_DATA' | 'WELL_CALIBRATED' | 'SOMEWHAT_OFF' | 'POORLY_CALIBRATED';

export interface CalibrationResult {
  bands: CalibrationBand[];
  totalSample: number;
  verdict: CalibrationVerdict;
  /** Largest absolute gap across bands with a usable sample. */
  worstGapPct: number | null;
  message: string;
}

const BANDS: { key: CalibrationBandKey; label: string; min: number; max: number }[] = [
  { key: '50_59', label: '50 to 59%', min: 50, max: 59.999 },
  { key: '60_69', label: '60 to 69%', min: 60, max: 69.999 },
  { key: '70_79', label: '70 to 79%', min: 70, max: 79.999 },
  { key: '80_PLUS', label: '80% and above', min: 80, max: 100 },
];

const round1 = (n: number) => Math.round(n * 10) / 10;
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);

/** Minimum records in a band before its gap is treated as meaningful. */
export const CALIBRATION_MIN_BAND_SAMPLE = 10;

export function assessCalibration(
  records: BiasOutcomeRecord[],
  opts: { minBandSample?: number } = {},
): CalibrationResult {
  const minBand = opts.minBandSample ?? CALIBRATION_MIN_BAND_SAMPLE;

  const bands: CalibrationBand[] = BANDS.map((b) => {
    const rows = records.filter((r) => r.predictedUpPct >= b.min && r.predictedUpPct <= b.max);
    if (!rows.length) {
      return { key: b.key, label: b.label, predictedUpPct: null, actualUpPct: null, sampleSize: 0, differencePct: null };
    }
    const predicted = round1(mean(rows.map((r) => r.predictedUpPct)));
    const actual = round1((rows.filter((r) => r.actualClassification === 'UP').length / rows.length) * 100);
    return {
      key: b.key,
      label: b.label,
      predictedUpPct: predicted,
      actualUpPct: actual,
      sampleSize: rows.length,
      differencePct: round1(actual - predicted),
    };
  });

  const usable = bands.filter((b) => b.sampleSize >= minBand && b.differencePct !== null);
  const worstGapPct = usable.length ? Math.max(...usable.map((b) => Math.abs(b.differencePct as number))) : null;

  let verdict: CalibrationVerdict;
  if (!usable.length) verdict = 'INSUFFICIENT_DATA';
  else if ((worstGapPct as number) <= 7) verdict = 'WELL_CALIBRATED';
  else if ((worstGapPct as number) <= 15) verdict = 'SOMEWHAT_OFF';
  else verdict = 'POORLY_CALIBRATED';

  const message =
    verdict === 'INSUFFICIENT_DATA'
      ? 'There are not enough scored bias readings yet to judge whether the percentages are honest.'
      : verdict === 'WELL_CALIBRATED'
        ? `The stated percentages have matched real outcomes within ${worstGapPct} points, so they are behaving like real probabilities.`
        : verdict === 'SOMEWHAT_OFF'
          ? `The stated percentages are off by up to ${worstGapPct} points. Treat them as rough leanings, not measurements.`
          : `Poor calibration: the stated percentages are off by up to ${worstGapPct} points. The numbers look more confident than the results justify.`;

  return { bands, totalSample: records.length, verdict, worstGapPct, message };
}
