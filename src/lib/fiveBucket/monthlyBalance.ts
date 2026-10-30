export const CARRYOVER_NAME = 'Previous month’s surplus';
export const EMERGENCY_OPENING = 607;
export const EMERGENCY_TARGET = 7000;
const cents = (n: number) => Math.round(n * 100);

export function monthlyIncome(month: string, currentMonth: string, lines: { planned: number; received: number; expected?: boolean; carryover?: boolean }[]) {
  return lines.reduce((sum, line) => sum + (line.carryover ? cents(line.planned)
    : month > currentMonth ? cents(line.planned)
    : month < currentMonth ? cents(line.received)
    : cents(line.received) + (line.expected ? Math.max(0, cents(line.planned) - cents(line.received)) : 0)), 0) / 100;
}

export function monthlyBalance(income: number, expenses: number, emergencyBalance = EMERGENCY_OPENING, priorPlannedEmergency = 0) {
  const remaining = cents(income) - cents(expenses);
  const available = Math.max(0, remaining);
  const emergency = Math.min(available, Math.max(0, cents(EMERGENCY_TARGET) - cents(emergencyBalance) - cents(priorPlannedEmergency)));
  const rest = available - emergency;
  const shares = [37.5, 37.5, 25].map((weight, index) => ({ index, amount: Math.floor(rest * weight / 100), remainder: rest * weight % 100 }));
  let left = rest - shares.reduce((sum, s) => sum + s.amount, 0);
  for (const s of [...shares].sort((a, b) => b.remainder - a.remainder || a.index - b.index)) {
    if (left <= 0) break;
    s.amount++; left--;
  }
  return { available: available / 100, shortfall: Math.max(0, -remaining) / 100,
    emergency: emergency / 100, retire: 0, vacation: shares[0].amount / 100, housing: shares[1].amount / 100, guilt: shares[2].amount / 100 };
}