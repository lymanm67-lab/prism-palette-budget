# Plan: Balance Business + Consolidate Categories

## Part B — Fund Business Shortfall (Owner Capital Contribution)

**Method (keeps IRS / commingling clean):** Budget-only entries that mirror a real bank-to-bank transfer you'll make from your personal account to your business checking. No co-mingled cards. Each transfer should be documented in your records as "Owner Capital Contribution."

**Budget changes (2026):**
- Business side — add **Owner Capital Contribution** income line:
  - Jan, Feb, Apr, May, Jul, Aug, Oct, Nov: **+$954**
  - (Mar, Jun, Sep, Dec already net positive — skip)
- Personal side — add matching **Owner Contribution to Business** expense line under a new "Business Funding" group (so personal Safe-to-Spend reflects the outflow):
  - Same months, same amounts
- Notes on every line: "Owner capital contribution — transfer personal→business; not a loan; record in business equity ledger."

**Result:** Business months net to ~$0; personal monthly surplus drops from ~$1,672 → ~$718 in those 8 months.

## Part C — Category Consolidation

**Confirmed duplicates within personal scope (same group, same name — keep one, merge transactions/budgets into survivor, delete others):**

| Category | Count | Action |
|---|---|---|
| Food & Drink → Groceries | 3 | Merge into 1 |
| Food & Drink → Restaurants | 3 | Merge into 1 |
| Health → Doctor | 3 | Merge into 1 |
| Health → Pharmacy | 3 | Merge into 1 |
| Entertainment → Movies & Games | 2 | Merge into 1 |
| Entertainment → Subscriptions | 2 | Merge into 1 |
| Housing (flexible) → Rent/Mortgage | 2 | Merge into 1 |
| Housing (flexible) → Utilities | 2 | Merge into 1 |
| Shopping → Clothing | 2 | Merge into 1 |
| Shopping → Electronics | 2 | Merge into 1 |
| Income → Salary | 2 | Merge into 1 |
| Income → Freelance | 2 | Merge into 1 |

**Structural overlaps to resolve (need your call):**

1. **Housing fixed vs flexible** — "Housing (fixed)" has both **Mortgage** AND **Rent** AND **Utilities**, while "Housing (flexible)" also has **Rent/Mortgage** and **Utilities**. → Recommend: keep fixed Housing for Mortgage + Utilities (your real recurring bills); delete the flexible "Rent/Mortgage" and "Utilities" duplicates; delete fixed "Rent" (you have a mortgage, not rent).
2. **Personal Spending group vs Shopping group** — both hold Clothing + Electronics. → Recommend: delete "Personal Spending" group, keep "Shopping".
3. **Personal Insurance → "Home" vs "Home Insurance"** — same thing. → Merge into "Home Insurance".
4. **Personal Subscriptions & Services** (Apple, Audible, YouTube, VidIQ, Cloud Storage, AI Services, Memberships) vs **Entertainment → Subscriptions** — overlap. → Recommend: keep itemized fixed subs in "Personal Subscriptions & Services"; "Entertainment → Subscriptions" becomes the catch-all for streaming/games only.
5. **Household Spending** (Cleaning Supplies, Decor, Home Maintenance items, Household goods) vs **Housing → House Supplies** — overlap. → Recommend: collapse "House Supplies" into "Household Spending → Cleaning Supplies" or "Household goods"; or fold all of Household Spending into Housing. Your call.

**Business side:** The 3× duplication of every business category is **intentional** — one per LLC profile (Multi-Business Accounting). Will NOT touch those.

## Execution order

1. Show you the proposed survivor IDs + merge map for confirmation.
2. For each merge: UPDATE transactions, transaction_splits, budgets, categorization_rules, recurring_transactions, subscriptions, recovery_plans, guardrail_category_limits → point to survivor.
3. DELETE the duplicate category rows.
4. Apply Part B budget inserts.

## Questions before I execute

1. Approve the duplicate merges in the table above (yes/no)?
2. For each numbered structural overlap (1–5), confirm my recommendation or give a different call?
3. Approve Part B as described (owner contribution both sides, $954 × 8 months)?

I'll wait for your answers before any database writes.
