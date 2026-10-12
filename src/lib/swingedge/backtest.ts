// SwingEdge Phase 4 — Historical Testing.
// Deterministic: the same candles and settings always produce the same trades.
// Long-only, one trade at a time, completed candles only (no look-ahead).

import type { Candle } from './types';
import { ema, sma, atr } from './indicators';
import { analyzeLiquidity } from './liquidity';
import { simulateTrade, DEFAULT_EXECUTION, type SimulatedTrade } from './backtestExecution';

export interface BacktestSettings {
  atrStopMult: number; // stop = entry - mult * ATR14
  targetR: number; // 1.5..3, Beginner 2
  riskPerTrade: number; // dollars
  slippagePct: number;
}

export const DEFAULT_BACKTEST: BacktestSettings = { atrStopMult: 1.5, targetR: 2, riskPerTrade: 250, slippagePct: 0.05 };

export interface BacktestTrade extends SimulatedTrade {
  signalDate: string;
  stop: number;
  target: number;
  sample: 'IN' | 'OUT';
}

export interface Skipped {
  date: string;
  reason: string;
}

export interface BacktestStats {
  trades: number;
  wins: number;
  losses: number;
  winRate: number | null;
  avgWin: number | null;
  avgLoss: number | null;
  netPl: number;
  avgR: number | null;
  maxDrawdown: number;
  profitFactor: number | null;
}

export interface BacktestRun {
  trades: BacktestTrade[];
  skipped: Skipped[];
  stats: BacktestStats;
  inSample: BacktestStats;
  outSample: BacktestStats;
  equity: { date: string; equity: number }[];
}

const WARMUP = 60;

export function computeStats(trades: BacktestTrade[]): BacktestStats {
  const closed = trades.filter((t) => t.netPl != null);
  const wins = closed.filter((t) => (t.netPl ?? 0) > 0);
  const losses = closed.filter((t) => (t.netPl ?? 0) <= 0);
  const sum = (a: BacktestTrade[]) => a.reduce((s, t) => s + (t.netPl ?? 0), 0);
  let eq = 0;
  let peak = 0;
  let dd = 0;
  for (const t of closed) {
    eq += t.netPl ?? 0;
    peak = Math.max(peak, eq);
    dd = Math.max(dd, peak - eq);
  }
  const rs = closed.map((t) => t.rMultiple).filter((r): r is number => r != null);
  const grossLoss = Math.abs(sum(losses));
  return {
    trades: closed.length,
    wins: wins.length,
    losses: losses.length,
    winRate: closed.length ? wins.length / closed.length : null,
    avgWin: wins.length ? sum(wins) / wins.length : null,
    avgLoss: losses.length ? sum(losses) / losses.length : null,
    netPl: Math.round(sum(closed) * 100) / 100,
    avgR: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null,
    maxDrawdown: Math.round(dd * 100) / 100,
    profitFactor: grossLoss > 0 ? sum(wins) / grossLoss : wins.length ? null : null,
  };
}

/**
 * Entry rule (price structure first): uptrend (close > 20 EMA > 50 SMA), the
 * candle pulled back to within 1% of the 20 EMA, and closed green above it.
 * Entry is planned at the signal close and filled on the next candle.
 */
export function runBacktest(candles: Candle[], s: BacktestSettings, useLiquidity: boolean): BacktestRun {
  const closes = candles.map((c) => c.close);
  const e20 = ema(closes, 20);
  const s50 = sma(closes, 50);
  const a14 = atr(candles, 14);
  const split = Math.floor(candles.length * 0.7);
  const exec = { ...DEFAULT_EXECUTION, slippagePct: s.slippagePct };
  const trades: BacktestTrade[] = [];
  const skipped: Skipped[] = [];

  let i = WARMUP;
  while (i < candles.length - 1) {
    const c = candles[i];
    const ema20 = e20[i];
    const sma50 = s50[i];
    const a = a14[i];
    const signal =
      ema20 != null && sma50 != null && a != null &&
      c.close > ema20 && ema20 > sma50 && c.low <= ema20 * 1.01 && c.close > c.open;
    if (!signal) { i += 1; continue; }

    if (useLiquidity) {
      const read = analyzeLiquidity(candles.slice(0, i + 1));
      if (read.grade === 'THIN') { skipped.push({ date: c.datetime, reason: 'Thin trading' }); i += 1; continue; }
      if (read.state === 'SELLERS_IN_CONTROL' || read.state === 'SELLERS_LEANING') {
        skipped.push({ date: c.datetime, reason: 'Sellers in control' }); i += 1; continue;
      }
    }

    const entry = c.close;
    const stop = Math.round((entry - s.atrStopMult * (a as number)) * 100) / 100;
    const risk = entry - stop;
    const target = Math.round((entry + s.targetR * risk) * 100) / 100;
    const shares = Math.floor(s.riskPerTrade / risk);
    if (shares < 1) { i += 1; continue; }

    const sim = simulateTrade(candles.slice(i + 1), { entry, stop, target, shares }, exec);
    if (!sim) { i += 1; continue; }
    trades.push({ ...sim, signalDate: c.datetime, stop, target, sample: i < split ? 'IN' : 'OUT' });
    if (!sim.exitDate) break;
    const exitIdx = candles.findIndex((k) => k.datetime === sim.exitDate);
    i = exitIdx > i ? exitIdx + 1 : i + 1;
  }

  let eq = 0;
  const equity = trades
    .filter((t) => t.exitDate && t.netPl != null)
    .map((t) => ({ date: (t.exitDate as string).slice(0, 10), equity: Math.round((eq += t.netPl as number) * 100) / 100 }));

  return {
    trades,
    skipped,
    stats: computeStats(trades),
    inSample: computeStats(trades.filter((t) => t.sample === 'IN')),
    outSample: computeStats(trades.filter((t) => t.sample === 'OUT')),
    equity,
  };
}

/** Flags results that held up in the first 70% but fell apart on later data. */
export function overfitWarning(run: BacktestRun): string | null {
  const a = run.inSample;
  const b = run.outSample;
  if (a.trades < 3 || b.trades < 3) return 'Too few trades in one half to judge whether the result holds up on later data.';
  if ((a.avgR ?? 0) > 0 && (b.avgR ?? 0) <= 0) return 'Worked on earlier data but lost money on later data — possible overfitting.';
  if (a.winRate != null && b.winRate != null && a.winRate - b.winRate > 0.2) return 'Win rate dropped sharply on later data — treat the result with caution.';
  return null;
}
