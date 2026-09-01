// Buffer ledger math (PrismMoney Session 2)
//
// Rule: only the ENDING buffer balance counts toward a month's allocation.
// One-time expenses (settlement fees, annual bills) are drawn from the buffer
// and are never shown as monthly debt payments.

export interface BufferOneTime {
  id?: string;
  label: string;
  amount: number;
  /** YYYY-MM-DD */
  dueDate: string;
}

export interface BufferMonthInput {
  month: string; // YYYY-MM
  startingBalance: number;
  additions: number;
  withdrawals: number;
  oneTimes: BufferOneTime[];
}

export type BufferStatus = 'healthy' | 'caution' | 'tight' | 'critical';

export interface BufferThresholds {
  healthy_min: number;
  caution_min: number;
  tight_min: number;
}

export interface BufferMonthResult {
  month: string;
  startingBalance: number;
  additions: number;
  withdrawals: number;
  oneTimeTotal: number;
  oneTimes: BufferOneTime[];
  endingBalance: number;
  status: BufferStatus;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function bufferStatus(ending: number, t: BufferThresholds): BufferStatus {
  if (ending >= t.healthy_min) return 'healthy';
  if (ending >= t.caution_min) return 'caution';
  if (ending >= t.tight_min) return 'tight';
  return 'critical';
}

export const BUFFER_STATUS_LABEL: Record<BufferStatus, string> = {
  healthy: 'Healthy',
  caution: 'Caution',
  tight: 'Tight',
  critical: 'Critical',
};

export function computeBufferMonth(
  input: BufferMonthInput,
  thresholds: BufferThresholds,
): BufferMonthResult {
  const oneTimes = input.oneTimes.filter((o) => (o.dueDate || '').slice(0, 7) === input.month);
  const oneTimeTotal = round2(oneTimes.reduce((s, o) => s + Number(o.amount || 0), 0));
  const ending = round2(
    Number(input.startingBalance || 0) +
      Number(input.additions || 0) -
      Number(input.withdrawals || 0) -
      oneTimeTotal,
  );

  return {
    month: input.month,
    startingBalance: round2(Number(input.startingBalance || 0)),
    additions: round2(Number(input.additions || 0)),
    withdrawals: round2(Number(input.withdrawals || 0)),
    oneTimeTotal,
    oneTimes,
    endingBalance: ending,
    status: bufferStatus(ending, thresholds),
  };
}

/** Rolls a series of months forward, carrying each ending balance into the next. */
export function rollBuffer(
  months: BufferMonthInput[],
  thresholds: BufferThresholds,
): BufferMonthResult[] {
  const out: BufferMonthResult[] = [];
  let carry: number | null = null;

  for (const m of [...months].sort((a, b) => a.month.localeCompare(b.month))) {
    const starting = carry ?? m.startingBalance;
    const res = computeBufferMonth({ ...m, startingBalance: starting }, thresholds);
    out.push(res);
    carry = res.endingBalance;
  }

  return out;
}
