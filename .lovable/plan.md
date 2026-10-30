# Monthly Budget Balancing

## What changes
- Add an editable **Previous month’s surplus** opening-money line. October starts with the confirmed **$387** from September. It is available funding, not a new paycheck or bank deposit.
- Automatically replace each month’s Five-Bucket allocations with what that month can afford, preserving all bills, debt payments, and actual transactions.
- Split available savings **40% Emergency / 20% Retirement / 15% Vacation / 15% Housing / 10% Guilt-Free**, including October, with exact cent rounding.
- Show received income, opening carryover, expense plan, and bucket funding separately. Keep real shortfalls visible when income cannot cover bills before savings.

## Monthly rules
- For a future month, use its saved planned income and expenses. For the current month, count received income plus only the unpaid remainder of confirmed expected income—not received and planned income added together. Completed past months use actual received income.
- Carryover must be confirmed or edited; do not assume last month’s planned savings or bank balance is spare income. Count the $387 once in October only. Do not automatically roll already-assigned bucket money into next month again.
- Recalculate when income, confirmed carryover, or expense plans change. Replace saved bucket amounts, including zero amounts when necessary; never append extra funding on refresh.
- All five buckets receive money when sufficient funding exists. If bills already exceed available funding, bucket contributions become zero and the genuine expense shortfall remains visible.

## October example
Using the amounts reviewed in this conversation:
- Income received: **$5,457.00**
- Confirmed September carryover: **$387.00**
- Available money: **$5,844.00**
- Expense plan: **$5,289.83**
- Affordable bucket funding: **$554.17**

| Bucket | October allocation |
|---|---:|
| Emergency | $221.67 |
| Retirement | $110.83 |
| Vacation | $83.13 |
| Housing | $83.12 |
| Guilt-Free | $55.42 |
| **Total** | **$554.17** |

These are planned contributions, not confirmed deposits. Account balances are unchanged.

## Technical implementation
- Reuse the existing Five-Bucket category rows and bulk budget upsert, with a pure cents-based monthly balancing calculation.
- Save opening carryover as a distinct budget income category; identify it explicitly and exclude it from earned-income and bank-deposit totals.
- Use a single guarded monthly balancing controller. Compare desired amounts against saved amounts before writing; household/month-scoped updates must be retry-safe and avoid refetch loops or concurrent stale writes.
- Invalidate shared budget queries after saving so Budget summaries, Months Ahead, and linked Five-Bucket growth read the same saved allocations.
- Add regression tests for the $387 carryover, exact October allocations, repeated runs, future planned income, unpaid income remainder, zero-funding shortfalls, and exclusion of payroll/reimbursed/HSA/transfer spending.
- Verify October end-to-end while signed in: edit carryover, save, reload, confirm unchanged bills and exact bucket totals, then check a future month’s balancing.

## Boundaries
No changes to bank transactions, current debt balances, paycheck amounts, or automatic background bank transfers. Genuine bill shortfalls cannot be eliminated by reducing savings alone.