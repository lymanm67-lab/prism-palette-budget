import { expect, it } from 'vitest';
import { splitBudgetIncome } from './incomeSummary';

it('keeps the $4,363.52 paycheck separate from $789.72 other deposits', () => {
  expect(splitBudgetIncome([
    { name: 'Salary', planned: 4363.52, received: 0 },
    { name: 'Deposit', planned: 389.72, received: 389.72 },
    { name: 'Other Income', planned: 200, received: 20 },
    { name: 'Reimbursement', planned: 200, received: 200 },
  ])).toEqual({ paycheck: 4363.52, paycheckReceived: 0, other: 789.72 });
});