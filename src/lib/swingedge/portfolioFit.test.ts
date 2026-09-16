import { describe, it, expect } from 'vitest';
import {
  assessPortfolioFit,
  finalStatusWithFit,
  rankCorrelatedCandidates,
  type FitLimits,
} from './portfolioFit';
import { familyFor, familiesRelated, groupByFamily } from './exposureFamily';

const LIMITS: FitLimits = {
  tradingCapital: 5000,
  maxPortfolioHeatPct: 5,
  maxFamilyHeatPct: 2.5,
};

describe('exposure families', () => {
  it('groups energy and oil funds as one driver', () => {
    expect(familyFor('XLE')).toBe('ENERGY');
    expect(familyFor('XOP')).toBe('ENERGY');
    expect(familyFor('FENY')).toBe('ENERGY');
    expect(familyFor('USO')).toBe('OIL_COMMODITY');
    expect(familiesRelated('ENERGY', 'OIL_COMMODITY')).toBe(true);
  });

  it('never guesses a family for an unknown symbol', () => {
    expect(familyFor('ZZZZ')).toBeNull();
    expect(familyFor('ZZZZ', 'Unclassified')).toBeNull();
    expect(groupByFamily([{ symbol: 'ZZZZ', family: null, risk: 50 }])).toHaveLength(0);
  });

  it('falls back to the sector when the symbol is unlisted', () => {
    expect(familyFor('SOMEOIL', 'Energy')).toBe('ENERGY');
  });
});

describe('acceptance test A — sector heat exceeded', () => {
  it('grades poor fit and downgrades a GO to review', () => {
    const fit = assessPortfolioFit({
      candidate: { symbol: 'XLE', risk: 25 },
      openPositions: [
        { symbol: 'XOP', risk: 60 },
        { symbol: 'FENY', risk: 50 },
      ],
      limits: LIMITS,
      beginner: true,
    });

    expect(fit.familyHeat?.before).toBe(110);
    expect(fit.familyHeat?.after).toBe(135);
    expect(fit.familyHeat?.afterPct).toBe(2.7);
    expect(fit.familyHeat?.exceeded).toBe(true);
    expect(fit.state).toBe('POOR_FIT');
    expect(fit.blocksGo).toBe(true);
    expect(fit.overrideAllowed).toBe(false);

    const final = finalStatusWithFit('GO', fit);
    expect(final.status).toBe('REVIEW');
    expect(final.changedByPortfolio).toBe(true);
  });
});

describe('acceptance test B — portfolio heat exceeded', () => {
  it('blocks the trade and stops it', () => {
    const fit = assessPortfolioFit({
      candidate: { symbol: 'ZZZZ', risk: 60 },
      openPositions: [
        { symbol: 'AAA', risk: 100 },
        { symbol: 'BBB', risk: 100 },
      ],
      limits: LIMITS,
      beginner: true,
    });

    expect(fit.portfolio.after).toBe(260);
    expect(fit.portfolio.limitDollars).toBe(250);
    expect(fit.state).toBe('BLOCKED');
    expect(finalStatusWithFit('GO', fit).status).toBe('STOP');
  });
});

describe('acceptance test C — diversified addition', () => {
  it('reads acceptable or strong fit', () => {
    const fit = assessPortfolioFit({
      candidate: { symbol: 'XLV', risk: 40 },
      openPositions: [{ symbol: 'XLE', risk: 40 }],
      limits: LIMITS,
      correlationBand: 'LOW',
      correlatedPositionCount: 0,
      beginner: true,
    });

    expect(['ACCEPTABLE', 'STRONG_FIT']).toContain(fit.state);
    expect(fit.blocksGo).toBe(false);
    expect(finalStatusWithFit('GO', fit).status).toBe('GO');
  });
});

describe('acceptance test D — correlated group', () => {
  it('ranks one preferred candidate instead of three independent GOs', () => {
    const ranked = rankCorrelatedCandidates([
      { symbol: 'XLE', readiness: 88, rewardToRisk: 2, stopQuality: 0.9, targetPathClear: true, liquidityScore: 1, eventSevere: false, fit: 'CAUTION' },
      { symbol: 'XOP', readiness: 84, rewardToRisk: 2, stopQuality: 0.6, targetPathClear: false, liquidityScore: 0.8, eventSevere: false, fit: 'POOR_FIT' },
      { symbol: 'FENY', readiness: 82, rewardToRisk: 1.8, stopQuality: 0.7, targetPathClear: true, liquidityScore: 0.7, eventSevere: false, fit: 'POOR_FIT' },
    ]);

    expect(ranked[0].symbol).toBe('XLE');
    expect(ranked.filter((r) => r.preferred)).toHaveLength(1);
    expect(ranked[1].rank).toBe(2);
  });
});

describe('the four-position energy book', () => {
  it('reads 2.68% and refuses a new energy GO', () => {
    const fit = assessPortfolioFit({
      candidate: { symbol: 'OIH', risk: 20 },
      openPositions: [
        { symbol: 'FENY', risk: 21.25 },
        { symbol: 'XLE', risk: 39.35 },
        { symbol: 'XOP', risk: 30.71 },
        { symbol: 'USO', risk: 42.73 },
      ],
      limits: LIMITS,
      beginner: true,
    });

    expect(fit.familyHeat?.before).toBe(134.04);
    expect(fit.familyHeat?.beforePct).toBe(2.68);
    expect(fit.similarSymbols).toEqual(['FENY', 'XLE', 'XOP', 'USO']);
    expect(fit.commonDriver).toMatch(/oil/i);
    expect(fit.blocksGo).toBe(true);
    expect(finalStatusWithFit('GO', fit).status).not.toBe('GO');
  });
});

describe('no double counting', () => {
  it('records one finding per dimension and grades on the worst', () => {
    const fit = assessPortfolioFit({
      candidate: { symbol: 'XLE', risk: 25 },
      openPositions: [
        { symbol: 'XOP', risk: 60 },
        { symbol: 'FENY', risk: 50 },
      ],
      limits: LIMITS,
      correlationBand: 'VERY_HIGH',
      correlatedPositionCount: 2,
      eventConcentrated: true,
      eventDetail: 'Oil inventory report affects three open positions.',
      beginner: true,
    });

    const dims = fit.findings.map((f) => f.dimension);
    expect(new Set(dims).size).toBe(dims.length);
    // Family heat and correlation are both POOR_FIT; the grade is still POOR_FIT.
    expect(fit.state).toBe('POOR_FIT');
  });
});

describe('missing inputs', () => {
  it('reports insufficient data instead of a pass', () => {
    const fit = assessPortfolioFit({
      candidate: { symbol: 'XLE', risk: null },
      openPositions: [],
      limits: LIMITS,
      beginner: true,
    });
    expect(fit.state).toBe('INSUFFICIENT_DATA');
    expect(fit.blocksGo).toBe(false);
    expect(finalStatusWithFit('GO', fit).status).toBe('GO');
  });
});

describe('advanced mode override', () => {
  it('keeps the status when an override is recorded, but not when blocked', () => {
    const poor = assessPortfolioFit({
      candidate: { symbol: 'XLE', risk: 25 },
      openPositions: [
        { symbol: 'XOP', risk: 60 },
        { symbol: 'FENY', risk: 50 },
      ],
      limits: LIMITS,
      beginner: false,
    });
    expect(poor.overrideAllowed).toBe(true);
    expect(finalStatusWithFit('GO', poor, { overrideRecorded: true }).status).toBe('GO');

    const blocked = assessPortfolioFit({
      candidate: { symbol: 'ZZZZ', risk: 60 },
      openPositions: [{ symbol: 'AAA', risk: 200 }],
      limits: LIMITS,
      beginner: false,
    });
    expect(blocked.overrideAllowed).toBe(false);
    expect(finalStatusWithFit('GO', blocked, { overrideRecorded: true }).status).toBe('STOP');
  });
});
