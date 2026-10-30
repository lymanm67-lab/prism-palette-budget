# Monthly Budget Balancing

## What changes
- Add an editable **Previous month’s surplus** opening-money line. October starts with the confirmed **$387** from September. It is available funding, not a new paycheck or bank deposit.
- Remove supplemental **Retirement & HSA** bucket funding; keep all payroll retirement and HSA contributions intact.
- Set the **Deductibles & Emergency current balance to $607**, replacing $1,200. This is an opening balance, not October funding or income.
- Automatically replace each month’s remaining bucket allocations with what that month can afford, preserving all bills, debt payments, and actual transactions.
- **Cover expenses first.** Only the money left after expenses may fund savings buckets.
- **Fund Deductibles & Emergency first**, toward its existing **$7,000 target**. The proposed waterfall sends all affordable funding there until the target is reached. Any remainder after that goes to Vacation, Housing, and Guilt-Free in their existing relative proportions (**37.5% / 37.5% / 25%**), with exact cent rounding. Approving this plan approves this waterfall.
- Show received income, opening carryover, expense plan, and bucket funding separately. Keep real shortfalls visible when income cannot cover bills before savings.

## Monthly rules
- For a future month, use its saved planned income and expenses. For the current month, count received income plus only the unpaid remainder of confirmed expected income—not received and planned income added together. Completed past months use actual received income.
- Carryover must be confirmed or edited; do not assume last month’s planned savings or bank balance is spare income. Count the $387 once in October only. Do not automatically roll already-assigned bucket money into next month again.
- Recalculate when income, confirmed carryover, or expense plans change. Replace saved bucket amounts, including zero amounts when necessary; never append extra funding on refresh.
- Other buckets may show zero while Emergency is the priority. Retirement & HSA supplemental funding is zero and removed from the bucket display. If bills already exceed available funding, all bucket contributions become zero and the genuine expense shortfall remains visible.
- Use confirmed Emergency balance and earlier planned contributions separately when calculating future target progress; never count the same prior allocation twice or mark it deposited. Show target completion as projected until contributions are confirmed.

## October example
Using the amounts reviewed in this conversation:
- Income received: **$5,457.00**
- Confirmed September carryover: **$387.00**
- Available money: **$5,844.00**
- Expense plan: **$5,289.83**
- Affordable bucket funding: **$554.17**

| Bucket | October allocation |
|---|---:|
| Emergency | $554.17 |
| Vacation | $0.00 |
| Housing | $0.00 |
| Guilt-Free | $0.00 |
| **Total** | **$554.17** |

These are planned contributions, not confirmed deposits. The Emergency Fund starts at the confirmed $607; contributions are not added to its actual balance until received.

## Technical implementation
- Reuse the existing bucket category rows and bulk budget upsert, with a pure cents-based monthly balancing calculation. Zero supplemental Retirement & HSA rows for October and later; preserve historical contributions and payroll deductions.
- Update the editable Emergency opening balance and growth chart to $607 for this household without treating the correction as income or a new deposit.
- Save opening carryover as a distinct budget income category; identify it explicitly and exclude it from earned-income and bank-deposit totals.
- Use a single guarded monthly balancing controller. Compare desired amounts against saved amounts before writing; household/month-scoped updates must be retry-safe and avoid refetch loops or concurrent stale writes.
- Invalidate shared budget queries after saving so Budget summaries, Months Ahead, and linked Five-Bucket growth read the same saved allocations.
- Add regression tests for expenses-before-savings, Emergency-first funding toward $7,000, the $387 carryover, $607 Emergency balance, zero supplemental retirement funding with unchanged payroll, exact October Emergency allocation of $554.17, repeated runs, future planned income, unpaid income remainder, zero-funding shortfalls, and exclusion of payroll/reimbursed/HSA/transfer spending.
- Verify October end-to-end while signed in: edit carryover, save, reload, confirm unchanged bills and exact bucket totals, then check a future month’s balancing.

## Boundaries
No changes to bank transactions, current debt balances, paycheck amounts, or automatic background bank transfers. Genuine bill shortfalls cannot be eliminated by reducing savings alone.