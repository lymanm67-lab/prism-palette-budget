import { describe, expect, it } from 'vitest';

import { assessConfidence, combineConfidence } from './confidence';
import { detectConflicts } from './conflicts';
import { fundamentalBand, scoreFundamentals } from './fundamentals';
import { scoreEtfQuality } from './etfQuality';
import { scoreRisk } from './riskScore';
import { assessOpenTrade, blendScores, computeHybridSignal, DEFAULT_HYBRID_WEIGHTS } from './hybrid';
import { candleBasis, entryZone, isExpired, priceOutsideZone, revalidateBeforeEntry, validUntil } from './signalLifecycle';
import { exitFill, simulateTrade } from './backtestExecution';
import type { Candle } from './types';

const soundRisk = {
  stopQuality: 'STRONG' as const,
  stopJustified: true,
  rewardRisk: 3,
  minimumRewardRisk: 2,
  shares: 25,
  accountRiskPct: 1,
  maxAccountRiskPct: 1,
  portfolioRiskPctAfter: 3,
  maxPortfolioRiskPct: 5,
  stopDistanceInAtr: 1.5,
  daysToEarnings: 40,
  earningsDataAvailable: true,
};

const baseHybrid = {
  symbol: 'TEST',
  assetType: 'STOCK' as const,
  technicalScore: 88,
  riskScore: 90,
  qualityScore: 82,
  confidence: 'HIGH' as const,
  setupReady: true,
};

describe('acceptance A — a clean setup reaches GO', () => {
  it('blends 82/88/90 to 86 and returns GO', () => {
    const result = computeHybridSignal(baseHybrid);
    expect(blendScores({ qualityScore: 82, technicalScore: 88, riskScore: 90 }, DEFAULT_HYBRID_WEIGHTS)).toBe(86);
    expect(result.hybridScore).toBe(86);
    expect(result.band).toBe('STRONG');
    expect(result.signal).toBe('GO');
    expect(result.checks.every((c) => c.passed)).toBe(true);
  });
});

describe('acceptance B — strong company, chart not ready', () => {
  it('returns WAIT, not GO, even when the blend clears the threshold', () => {
    const result = computeHybridSignal({ ...baseHybrid, qualityScore: 90, technicalScore: 60, riskScore: 85 });
    expect(result.hybridScore).toBeGreaterThanOrEqual(75);
    expect(result.signal).toBe('WAIT');
    expect(result.reasons.join(' ')).toContain('not ready');
  });

  it('drops to REVIEW when the chart is materially weak', () => {
    const result = computeHybridSignal({ ...baseHybrid, qualityScore: 92, technicalScore: 54 });
    expect(result.signal).toBe('REVIEW');
  });
});

describe('acceptance C — weak company, strong chart', () => {
  it('returns REVIEW because quality is below the minimum', () => {
    const result = computeHybridSignal({ ...baseHybrid, qualityScore: 48, technicalScore: 91, riskScore: 88 });
    expect(result.signal).toBe('REVIEW');
    const conflicts = detectConflicts({
      qualityScore: 48,
      technicalScore: 91,
      riskScore: 88,
      qualityMinimum: 65,
      technicalMinimum: 75,
      riskMinimum: 75,
    });
    expect(conflicts.some((c) => c.key === 'weak_company_strong_chart')).toBe(true);
  });
});

describe('acceptance D — a broken stop overrides every score', () => {
  it('returns STOP when the stop is not a valid invalidation level', () => {
    const risk = scoreRisk({ ...soundRisk, stopQuality: 'INVALID', stopJustified: false });
    expect(risk.hardGateFailures.length).toBeGreaterThan(0);
    const result = computeHybridSignal({
      ...baseHybrid,
      qualityScore: 95,
      technicalScore: 95,
      riskScore: risk.score,
      hardGateFailures: risk.hardGateFailures,
    });
    expect(result.signal).toBe('STOP');
  });

  it('blocks a trade whose reward to risk is under the house rule', () => {
    const risk = scoreRisk({ ...soundRisk, rewardRisk: 1.4 });
    expect(risk.hardGateFailures.join(' ')).toContain('Reward to risk');
  });
});

describe('acceptance E — thin data never masquerades as certainty', () => {
  it('reduces confidence with coverage and forces a REVIEW', () => {
    const confidence = assessConfidence({ coverage: 0.55, freshnessDays: 30, provider: 'PROVIDER', periodsAvailable: 3 });
    expect(confidence.level).toBe('LOW');
    expect(confidence.coveragePct).toBe(55);
    const result = computeHybridSignal({ ...baseHybrid, confidence: confidence.level });
    expect(result.signal).toBe('REVIEW');
  });

  it('never scores a missing category as zero', () => {
    const full = scoreFundamentals(
      {
        revenueGrowthYoY: 12,
        epsGrowthYoY: 20,
        operatingMargin: 25,
        netMargin: 18,
        returnOnEquity: 20,
        freeCashFlow: 500,
        freeCashFlowPrior: 400,
        operatingCashFlow: 700,
        netIncome: 450,
        debtToEquity: 30,
        currentRatio: 2.1,
        interestCoverage: 12,
        peRatio: 20,
        forwardPe: 18,
        sectorPe: 24,

      },
      { sector: 'Technology', provider: 'PROVIDER', freshnessDays: 20, periodsAvailable: 4 },
    );
    const partial = scoreFundamentals(
      { revenueGrowthYoY: 12, epsGrowthYoY: 20 },
      { sector: 'Technology', provider: 'PROVIDER', freshnessDays: 20, periodsAvailable: 2 },
    );
    expect(full.coverage).toBe(1);
    expect(full.score).toBeGreaterThan(70);
    expect(fundamentalBand(full.score)).not.toBe('NO DATA');
    expect(partial.coverage).toBeLessThan(1);
    // Only the categories with data are in the denominator, so the score stays high.
    expect(partial.score).toBeGreaterThan(70);
    expect(partial.confidence.level === 'LOW' || partial.confidence.level === 'INSUFFICIENT').toBe(true);
    expect(combineConfidence(['HIGH', 'LOW'])).toBe('LOW');
  });

  it('returns no score at all when nothing is available', () => {
    const none = scoreFundamentals({}, { provider: 'NONE' });
    expect(none.score).toBeNull();
    expect(none.confidence.level).toBe('INSUFFICIENT');
    expect(fundamentalBand(none.score)).toBe('NO DATA');
  });
});

describe('ETFs are never scored as companies', () => {
  it('scores fund quality on tradability and structure and flags geared products', () => {
    const plain = scoreEtfQuality(
      {
        avgDollarVolume: 400_000_000,
        spreadPct: 0.02,
        netAssets: 40_000_000_000,
        expenseRatio: 0.09,
        holdingsCount: 500,
        topTenWeightPct: 28,
        annualVolatilityPct: 16,
        trackingErrorPct: 0.1,
        fundAgeYears: 20,
        leveraged: false,
        inverse: false,
        singleStock: false,
      },
      { provider: 'PROVIDER', freshnessDays: 5 },
    );
    expect(plain.score).toBeGreaterThan(85);
    expect(plain.advancedProduct).toBe(false);

    const geared = scoreEtfQuality(
      { avgDollarVolume: 300_000_000, spreadPct: 0.05, netAssets: 3_000_000_000, expenseRatio: 0.95, leveraged: true, leverageFactor: 3 },
      { provider: 'PROVIDER', freshnessDays: 5 },
    );
    expect(geared.advancedProduct).toBe(true);
    expect(geared.advancedReasons.join(' ')).toContain('geared');
  });

  it('keeps a geared fund out of GO in beginner mode', () => {
    const result = computeHybridSignal({ ...baseHybrid, assetType: 'ETF', advancedProduct: true, beginnerMode: true });
    expect(result.signal).toBe('STOP');
  });
});

describe('signal lifecycle', () => {
  const candles: Candle[] = [
    { datetime: '2026-09-09T00:00:00Z', open: 10, high: 11, low: 9.5, close: 10.5, volume: 1000 },
    { datetime: '2026-09-10T00:00:00Z', open: 10.5, high: 11.5, low: 10.2, close: 11.2, volume: 1200 },
  ];

  it('separates the forming candle from completed history', () => {
    const basis = candleBasis(candles, '1day', new Date('2026-09-10T15:00:00Z'));
    expect(basis.developing).toBe(true);
    expect(basis.completed).toHaveLength(1);
    expect(basis.lastCompletedAt).toBe('2026-09-09T00:00:00Z');
  });

  it('expires a signal and blocks a stale entry', () => {
    const until = validUntil('2026-09-10T00:00:00Z', '1day', new Date('2026-09-10T12:00:00Z'));
    expect(isExpired(until, new Date('2026-09-10T12:00:00Z'))).toBe(false);
    expect(isExpired(until, new Date('2026-09-12T00:00:00Z'))).toBe(true);

    const zone = entryZone(44.5, 2);
    expect(priceOutsideZone(46, zone)).toBe(true);
    const check = revalidateBeforeEntry(
      {
        price: 46,
        entry: 44.5,
        stop: 42.5,
        target: 48.5,
        zone,
        shares: 25,
        rewardRisk: 2,
        minimumRewardRisk: 2,
        accountRiskPct: 1,
        maxAccountRiskPct: 1,
        portfolioRiskPctAfter: 3,
        maxPortfolioRiskPct: 5,
        signal: 'GO',
        validUntil: until,
      },
      new Date('2026-09-12T00:00:00Z'),
    );
    expect(check.ok).toBe(false);
    expect(check.failures).toHaveLength(2);
  });
});

describe('open trades and honest backtesting', () => {
  it('reads an open trade without ever moving the stop for fundamentals', () => {
    const held = assessOpenTrade({ price: 46, currentStop: 42.5, target: 48.5, hybrid: null, qualityDeteriorated: true });
    expect(held.signal).toBe('REVIEW_TRADE');
    expect(held.stopUnchangedNote).toContain('never moves your stop');
    expect(assessOpenTrade({ price: 42, currentStop: 42.5, target: 48.5, hybrid: null }).signal).toBe('STOP_TRIGGERED');
    expect(assessOpenTrade({ price: 49, currentStop: 42.5, target: 48.5, hybrid: null }).signal).toBe('TARGET_REACHED');
    expect(assessOpenTrade({ price: 45, currentStop: 42.5, target: 48.5, hybrid: null }).signal).toBe('HOLD_PLAN');
  });

  it('fills gaps at the open and assumes the loss on an ambiguous candle', () => {
    const gap: Candle = { datetime: 'd', open: 40, high: 41, low: 39, close: 40.5, volume: 100 };
    const fill = exitFill(gap, 42.5, 48.5);
    expect(fill?.kind).toBe('STOP');
    expect(fill?.gapped).toBe(true);
    expect(fill!.price).toBeLessThan(42.5);

    const both: Candle = { datetime: 'd', open: 44.6, high: 49, low: 42, close: 45, volume: 100 };
    expect(exitFill(both, 42.5, 48.5)?.kind).toBe('STOP');

    const trade = simulateTrade(
      [
        { datetime: 'd1', open: 44.5, high: 45, low: 44, close: 44.8, volume: 100 },
        { datetime: 'd2', open: 45, high: 49, low: 44.9, close: 48.8, volume: 100 },
      ],
      { entry: 44.5, stop: 42.5, target: 48.5, shares: 25 },
    );
    expect(trade?.kind).toBe('TARGET');
    expect(trade?.rMultiple).toBeGreaterThan(1.5);
  });
});
