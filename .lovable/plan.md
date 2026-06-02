## Goal

Re-record the June 2, 2026 "Lovable Top-Off" reconciliation transfers so each transfer row matches the date and amount of an actual Lovable charge on the same account.

## Current state

5 transfers all dated 2026-06-02, totaling $5,772.10. Only 2 match Lovable charge totals; 3 do not.

## What I'll do (one migration / data update)

1. **Soft-delete the 5 existing lump-sum transfers** (set `deleted_at = now()`). This safely reverses their balance adjustment via the existing `adjust_account_balance` trigger.

2. **Insert one new transfer row per Lovable charge**, per account, with:
   - `date` = the charge date
   - `amount` = the charge amount (positive — top-off is income side; same direction as today's lump sums which are positive)
   - `merchant` = "Lovable Top-Off"
   - `is_transfer` = true (keeps them out of spending totals)
   - `notes` = "Reconciliation: top-off for Lovable charge on {date}"
   - Same `account_id`, `household_id`, `category_id` as the current lump sum on that account

3. **Account-by-account result:**

```text
BUSINESSFREE        60 charges  →  60 transfers   ($1,451.00 total, unchanged)
SoFi Checking      110 charges  → 110 transfers   ($1,950.00 total, unchanged)
MEMBERSHIP SAVINGS 158 charges  → 158 transfers   ($2,651.10 total, +$355.00 vs old $2,296.10)
SoFi Self-directed   1 charge   →   1 transfer    ($15.00 total, -$15.00 vs old $30.00)
SIMPLE CHECKING      0 charges  →   0 transfers   ($0 total, -$45.00 vs old $45.00)
```

Net change to combined balances: **+$355 − $15 − $45 = +$295** across the 5 accounts. (The originals didn't fully reconcile; new rows do.)

## Technical details

- Single `supabase--insert` call: one `UPDATE` for soft-delete + one `INSERT ... SELECT` that joins each Lovable charge to its account's current top-off row to copy `account_id`, `household_id`, `category_id`.
- `is_transfer=true` preserved → no impact on Safe-to-Spend or spending reports.
- `adjust_account_balance` trigger handles balance math automatically on both delete and insert.
- No schema changes, no code changes.

## Verification

After running, I'll query:
- Sum of new transfers per account = sum of Lovable charges per account ✓
- Old 5 rows have `deleted_at IS NOT NULL` ✓
- New row count = 329 (60 + 110 + 158 + 1)
