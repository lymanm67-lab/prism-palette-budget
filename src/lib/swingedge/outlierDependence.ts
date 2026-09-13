// SwingEdge — Outlier dependence.
//
// A system can look profitable because of one or two unusually large winners.
// Strip those out and the edge sometimes disappears. This measures how much of
// the total profit came from the very best trades, so a lucky streak is never
// mistaken for a durable process.

import type { RTrade } from './expectancy';

export type ConcentrationVerdict = 'INSUFFICIENT_DATA' | 'BROADLY_SPREAD' | 'SOMEWHAT_CONCENTRATED' | 'HIGHLY_CONCENTRATED';

export interface OutlierDependenceResult {
  trades: number;
  totalR: number;
  /** Percent of total net profit produced by the largest 1, 3 and 5 trades. */
  top1Pct: number | null;
  top3Pct: number | null;
  top5Pct: number | null;
  top1R: number;
  top3R: number;
  top5R: number;
  /** Total R with the largest three winners removed. */
  totalRExcludingTop3: number;
  stillProfitableWithoutTop3: boolean;
  verdict: ConcentrationVerdict;
  headline: string;
  lines: string[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

export function outlierDependence(trades: RTrade[], opts: { minTrades?: number } = {}): OutlierDependenceResult {
  const minTrades = opts.minTrades ?? 10;
  const rows = trades.filter((t) => Number.isFinite(t.r));
  const totalR = round2(rows.reduce((s, t) => s + t.r, 0));
  const sorted = [...rows].sort((a, b) => b.r - a.r);
  const sumTop = (n: number) => round2(sorted.slice(0, n).reduce((s, t) => s + Math.max(0, t.r), 0));
  const top1R = sumTop(1);
  const top3R = sumTop(3);
  const top5R = sumTop(5);

  const share = (part: number) => (totalR > 0 ? round1((part / totalR) * 100) : null);
  const top1Pct = share(top1R);
  const top3Pct = share(top3R);
  const top5Pct = share(top5R);

  const totalRExcludingTop3 = round2(totalR - top3R);
  const stillProfitableWithoutTop3 = totalRExcludingTop3 > 0;

  let verdict: ConcentrationVerdict;
  if (rows.length < minTrades || totalR <= 0) verdict = 'INSUFFICIENT_DATA';
  else if ((top3Pct ?? 0) >= 70) verdict = 'HIGHLY_CONCENTRATED';
  else if ((top3Pct ?? 0) >= 50) verdict = 'SOMEWHAT_CONCENTRATED';
  else verdict = 'BROADLY_SPREAD';

  const headline =
    verdict === 'INSUFFICIENT_DATA'
      ? 'Not enough profitable history yet to judge whether results depend on a few trades.'
      : verdict === 'HIGHLY_CONCENTRATED'
        ? 'RESULTS HIGHLY CONCENTRATED'
        : verdict === 'SOMEWHAT_CONCENTRATED'
          ? 'Results lean on a small number of trades'
          : 'Results are spread across many trades';

  const lines: string[] = [];
  if (verdict !== 'INSUFFICIENT_DATA') {
    lines.push(`Total profit: ${totalR > 0 ? '+' : ''}${totalR}R across ${rows.length} trades.`);
    lines.push(`Largest trade: +${top1R}R${top1Pct !== null ? ` (${top1Pct}% of all profit)` : ''}.`);
    lines.push(`Largest three: +${top3R}R${top3Pct !== null ? ` (${top3Pct}%)` : ''}.`);
    lines.push(`Largest five: +${top5R}R${top5Pct !== null ? ` (${top5Pct}%)` : ''}.`);
    lines.push(
      stillProfitableWithoutTop3
        ? `Without the three biggest winners the process still made ${totalRExcludingTop3}R.`
        : `Without the three biggest winners the process is ${totalRExcludingTop3}R, so the profit came from those trades.`,
    );
    if (verdict === 'HIGHLY_CONCENTRATED') {
      lines.push('More testing is needed before calling this trading system durable.');
    }
  }

  return {
    trades: rows.length,
    totalR,
    top1Pct,
    top3Pct,
    top5Pct,
    top1R,
    top3R,
    top5R,
    totalRExcludingTop3,
    stillProfitableWithoutTop3,
    verdict,
    headline,
    lines,
  };
}
