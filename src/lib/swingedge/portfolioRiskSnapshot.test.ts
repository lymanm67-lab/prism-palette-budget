import { describe, expect, it } from 'vitest';
import {
  buildRiskSnapshot,
  diversificationRead,
  reviewTrade,
  themeFor,
  DEFAULT_RISK_LIMITS,
  type RiskTradeInput,
} from './portfolioRiskSnapshot';

const t = (over: Partial<RiskTradeInput>): RiskTradeInput => ({
  id: over.id ?? Math.random().toString(36).slice(2),
  symbol: 'XLE',
  status: 'FILLED',
  entry: 100,
  stop: 96,
  target: 108,
  shares: 25,
  atr: 2,
  ...over,
});

describe('themes', () => {
  it('buckets energy and oil together and semis with technology', () => {
    expect(themeFor('XLE')).toBe('ENERGY');
    expect(themeFor('USO')).toBe('ENERGY');
    expect(themeFor('SMH')).toBe('TECHNOLOGY_GROWTH');
    expect(themeFor('QQQ')).toBe('TECHNOLOGY_GROWTH');
    expect(themeFor('GLD')).toBe('PRECIOUS_METALS');
  });

  it('never guesses a theme for an unknown symbol', () => {
    expect(themeFor('ZZZZ')).toBe('UNCLASSIFIED');
  });
});

describe('reviewTrade', () => {
  it('computes risk, reward and ratio', () => {
    const row = reviewTrade(t({}), DEFAULT_RISK_LIMITS);
    expect(row.riskPerShare).toBe(4);
    expect(row.riskDollars).toBe(100);
    expect(row.rewardDollars).toBe(200);
    expect(row.rewardRisk).toBe(2);
    expect(row.flags).not.toContain('REWARD_RISK_BELOW_TARGET');
  });

  it('flags reversed stop and target', () => {
    const row = reviewTrade(t({ stop: 104, target: 95 }), DEFAULT_RISK_LIMITS);
    expect(row.flags).toContain('REVERSED_LEVELS');
  });

  it('flags a stop that is unusually tight or wide against ATR', () => {
    expect(reviewTrade(t({ stop: 99, atr: 4 }), DEFAULT_RISK_LIMITS).flags).toContain(
      'STOP_TOO_TIGHT',
    );
    expect(reviewTrade(t({ stop: 88, atr: 2 }), DEFAULT_RISK_LIMITS).flags).toContain(
      'STOP_UNUSUALLY_WIDE',
    );
  });

  it('says the stop was not checked when ATR is unknown', () => {
    expect(reviewTrade(t({ atr: null }), DEFAULT_RISK_LIMITS).flags).toContain(
      'STOP_BELOW_SUPPORT_UNCHECKED',
    );
  });

  it('flags risk above the conviction ceiling', () => {
    expect(reviewTrade(t({ shares: 100 }), DEFAULT_RISK_LIMITS).flags).toContain(
      'RISK_ABOVE_CONVICTION',
    );
  });
});

describe('active vs pending risk', () => {
  it('keeps filled, conditional and attached-exit rows separate', () => {
    const s = buildRiskSnapshot([
      t({ id: 'a', symbol: 'XLE', status: 'FILLED' }),
      t({ id: 'b', symbol: 'QQQ', status: 'WAIT_COND' }),
      t({ id: 'c', symbol: 'QQQ', status: 'WAIT_TRG' }),
      t({ id: 'd', symbol: 'GLD', status: 'CLOSED' }),
    ]);
    expect(s.activeRisk).toBe(100);
    expect(s.pendingRisk).toBe(100);
    expect(s.maxRisk).toBe(200);
    expect(s.rows).toHaveLength(3);
    expect(s.conditionalOrderCount).toBe(1);
  });

  it('flags theme risk above the limit and gives an action', () => {
    const s = buildRiskSnapshot([
      t({ id: 'a', symbol: 'XLE' }),
      t({ id: 'b', symbol: 'XOP' }),
      t({ id: 'c', symbol: 'USO', status: 'WAIT_COND' }),
    ]);
    const energy = s.themes.find((x) => x.theme === 'ENERGY');
    expect(energy?.max).toBe(300);
    expect(energy?.overLimit).toBe(true);
    expect(s.nextActions[0]).toMatch(/energy/i);
  });

  it('warns when maximum risk passes the high-risk level', () => {
    const rows = Array.from({ length: 9 }, (_, i) =>
      t({ id: `x${i}`, symbol: ['XLE', 'QQQ', 'GLD'][i % 3], status: 'FILLED' }),
    );
    const s = buildRiskSnapshot(rows);
    expect(s.maxRisk).toBe(900);
    expect(s.warnings.some((w) => w.severity === 'CRITICAL')).toBe(true);
  });

  it('reports no risk to manage on an empty book', () => {
    const s = buildRiskSnapshot([]);
    expect(s.maxRisk).toBe(0);
    expect(s.nextActions[0]).toMatch(/no open positions/i);
  });
});

describe('diversificationRead', () => {
  it('shows combined risk when the theme is already represented', () => {
    const s = buildRiskSnapshot([t({ id: 'a', symbol: 'XLE' })]);
    const read = diversificationRead({ symbol: 'XOP', risk: 200 }, s);
    expect(read.adds).toBe(false);
    expect(read.combinedRisk).toBe(300);
    expect(read.overThemeLimit).toBe(true);
  });

  it('says a new theme genuinely adds', () => {
    const s = buildRiskSnapshot([t({ id: 'a', symbol: 'XLE' })]);
    const read = diversificationRead({ symbol: 'XLV', risk: 100 }, s);
    expect(read.adds).toBe(true);
    expect(read.label).toBe('Healthcare');
  });
});
