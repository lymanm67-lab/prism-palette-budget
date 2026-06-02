# Plan: Monthly Budget Hygiene + Auto-Split Rules

## Goal
A scheduled job that runs on the 1st of each month and keeps your budget, forecast, and categorization clean for tax/accounting. Plus a rules engine for transaction auto-splits (e.g., international travel → Dove Love Travel + Personal).

## Part 1 — Auto-Split Rules Engine (new feature)

**New table: `auto_split_rules`** (household-scoped, RLS)
- `id`, `household_id`, `name` (e.g., "International Travel → Dove Love Travel")
- `match_type`: `merchant` | `category` | `description_keyword` | `mcc`
- `match_value` (text, e.g., "Delta", "Hilton", "airfare")
- `date_range_start`, `date_range_end` (nullable — e.g., Jan–Jun for Dove Love Travel trips)
- `amount_min`, `amount_max` (nullable, e.g., apply only > $200)
- `business_category_id` (FK), `business_split_pct` (e.g., 100, 50, 60)
- `personal_category_id` (FK)
- `business_profile_id` (FK → business_profiles)
- `is_active`, `priority`

**Trigger:** AFTER INSERT on `transactions` → match against active rules and auto-create `transaction_splits` rows (extends your existing `advance_recurring_next_due_date` pattern).

**Backfill UI:** "Apply rules to past transactions" button on `/settings/auto-split-rules` page — runs through historical transactions and creates splits where missing.

**Seed rule for Dove Love Travel:**
- Name: "International Travel — Dove Love Travel (Jan–Jun)"
- Match: category = Travel & Vacation (Flights + Hotels)
- Date range: 2026-01-01 → 2026-06-30
- Split: 100% → Dove Love Travel business profile (or % you specify)

## Part 2 — Monthly Hygiene Edge Function + Cron

**Edge function: `monthly-budget-hygiene`**
Runs 1st of every month at 06:00 UTC. For each household:

1. **Carry-forward income budgets** — if current month has no income budget line but previous month did, copy them forward (avoids the "income disappears" issue you hit with May→June).
2. **Detect duplicate categories** — same name + same group → flag in a `data_quality_issues` table (don't auto-merge; surface in UI for review).
3. **Detect orphaned budgets** — budget rows pointing to deleted/inactive categories → flag.
4. **Detect uncategorized transactions > $50 from prior month** → flag for review.
5. **Re-apply auto-split rules** to any prior-month transactions missing splits.
6. **Reconcile owner-contribution plan** — if Business Funding budget exists for the new month but no matching transfer transaction posted last month, surface a "Pending owner contribution" reminder.
7. **Notify** via existing notification system: "Monthly budget hygiene complete — N items need review."

**Cron:** `pg_cron` schedule on 1st of month 06:00 UTC, calls the function with `CRON_SECRET`.

## Part 3 — UI

**New page: `/settings/auto-split-rules`**
- List + Create/Edit/Delete rules
- Filter chips (active / inactive, by business profile)
- "Run now on past transactions" button
- Preview: shows the next 5 transactions that would match before saving

**New panel on `/budgets`:**
- "Budget Health" card surfacing the `data_quality_issues` flags with one-click resolve actions.

## Technical Detail

- Migration creates `auto_split_rules`, `data_quality_issues` tables with GRANTs + RLS by household.
- New trigger `apply_auto_split_rules()` on `transactions` AFTER INSERT, runs after `advance_recurring_next_due_date` (recurring takes precedence so existing splits aren't overwritten — check `NOT EXISTS` on transaction_splits).
- Edge function uses service role to bypass RLS and process all households.
- All splits respect existing pattern: 2-row `transaction_splits` summing to transaction amount, with notes "Auto-split via rule: {rule.name}".

## What I'll seed for you immediately

- Auto-split rule: **International Travel — Dove Love Travel (Jan–Jun 2026)** → 100% business (or whatever % you choose).
- Run the backfill once so your existing 2026 travel transactions get split correctly.

## Questions before I build

1. **Dove Love Travel split %** — is international travel 100% business, or some other split (e.g., 50/50 if your spouse travels with you for personal reasons)?
2. **Which business profile** does Dove Love Travel map to? (You have 3: FDC `29935430`, `b1db41b1`, and `e3626567` — I need the right one or I'll ask you to pick.)
3. **Other recurring split rules** to seed at the same time? Common ones:
   - Cell phone (e.g., 60% business / 40% personal)
   - Home office utilities (e.g., 15% business)
   - Vehicle (your memory already notes 40% Holdings / 60% Personal — want this as a rule too?)
4. **Hygiene flags** — auto-notify only, or also auto-fix the safe ones (carry-forward income, re-apply splits)? My recommendation: auto-fix the safe ones, notify on the rest.

Reply with the answers and I'll build it end to end.
