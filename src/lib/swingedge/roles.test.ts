import { describe, it, expect } from 'vitest';
import { pipelineBreakdown, roleBreakdown, suggestStatus } from './roles';

describe('dual watchlist', () => {
  it('promotes a qualifying name to Qualified trade', () => {
    const s = suggestStatus({ symbol: 'QQQ', current: 'PULLBACK_WATCH', verdict: 'QUALIFIES', setup: 'PULLBACK' });
    expect(s?.to).toBe('QUALIFIED_TRADE');
    expect(s?.direction).toBe('promote');
  });

  it('routes a forming breakout to Breakout watch', () => {
    const s = suggestStatus({ symbol: 'QQQ', current: 'SCAN_UNIVERSE', verdict: 'WATCH', setup: 'BREAKOUT' });
    expect(s?.to).toBe('BREAKOUT_WATCH');
  });

  it('drops a failed setup back to the radar', () => {
    const s = suggestStatus({ symbol: 'QQQ', current: 'QUALIFIED_TRADE', verdict: 'DOES_NOT_QUALIFY', setup: 'NONE' });
    expect(s?.to).toBe('SCAN_UNIVERSE');
    expect(s?.direction).toBe('downgrade');
  });

  it('never overrides an open trade from a scan', () => {
    expect(
      suggestStatus({ symbol: 'QQQ', current: 'IN_TRADE', verdict: 'DOES_NOT_QUALIFY', setup: 'NONE' }),
    ).toBeNull();
  });

  it('summarises roles and pipeline stages', () => {
    const rows = [
      { symbol: 'QQQ', portfolio_role: 'MOMENTUM', trading_status: 'QUALIFIED_TRADE' },
      { symbol: 'SPY', portfolio_role: 'CORE', trading_status: 'SCAN_UNIVERSE' },
    ];
    expect(roleBreakdown(rows).map((r) => r.value)).toEqual(['CORE', 'MOMENTUM']);
    const pipeline = pipelineBreakdown(rows);
    expect(pipeline.find((p) => p.stage === 'Ready')?.symbols).toEqual(['QQQ']);
    expect(pipeline.find((p) => p.stage === 'Watching')?.symbols).toEqual(['SPY']);
  });
});
