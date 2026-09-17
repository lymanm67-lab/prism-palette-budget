import { describe, it, expect } from 'vitest';
import { parseBrokerOrders } from './brokerOrderPaste';

describe('parseBrokerOrders', () => {
  it('reads a comma separated bracket order', () => {
    const { rows } = parseBrokerOrders('XLE, WAIT COND, 40, 88.50, 86.25, 93.00');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      symbol: 'XLE',
      status: 'WAIT_COND',
      shares: 40,
      entry: 88.5,
      stop: 86.25,
      target: 93,
    });
    expect(rows[0].missing).toEqual([]);
  });

  it('maps Thinkorswim status words', () => {
    const { rows } = parseBrokerOrders(
      ['SMH FILLED 10 250.10 240.00 270.00', 'TLT WAIT TRG 5 90.10 88.00 95.00', 'GLD WORKING 8 190.5 185.5 200.5'].join('\n'),
    );
    expect(rows.map((r) => r.status)).toEqual(['FILLED', 'WAIT_TRG', 'WORKING']);
  });

  it('defaults to a resting conditional order when no status is printed', () => {
    const { rows } = parseBrokerOrders('QQQ 12 480.25 470.00 500.75');
    expect(rows[0].status).toBe('WAIT_COND');
  });

  it('reports missing values instead of guessing them', () => {
    const { rows } = parseBrokerOrders('USO WAIT COND 20 74.50');
    expect(rows[0].entry).toBe(74.5);
    expect(rows[0].stop).toBeNull();
    expect(rows[0].missing).toEqual(['stop', 'target']);
  });

  it('skips headers and unreadable lines', () => {
    const { rows, skipped } = parseBrokerOrders(
      ['Symbol,Qty,Status,Price', 'XLE, WAIT COND, 40, 88.50, 86.25, 93.00', '   ', '12345 99.9'].join('\n'),
    );
    expect(rows).toHaveLength(1);
    expect(skipped.map((s) => s.line)).toEqual([1, 4]);
  });
});
