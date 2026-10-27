export function splitBudgetIncome(rows: { name: string; planned: number; received: number }[]) {
  let paycheck = 0;
  let paycheckReceived = 0;
  let other = 0;
  for (const row of rows) {
    if (/salary|payroll|paycheck|wages|net pay/i.test(row.name)) {
      paycheck += row.planned;
      paycheckReceived += row.received;
    } else other += row.planned;
  }
  return { paycheck: Math.round(paycheck * 100) / 100, paycheckReceived: Math.round(paycheckReceived * 100) / 100, other: Math.round(other * 100) / 100 };
}