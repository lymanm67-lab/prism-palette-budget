## Goal

Add a **Cleanup Hub** at `/cleanup` with four one-click flows. Each previews changes before applying — nothing auto-writes.

## Page structure

`src/pages/Cleanup.tsx` — four collapsible cards, each with a count badge + "Review" button:

1. Transfer Detection
2. Needs-Review Queue
3. Duplicate Budget Merger
4. Merchant Re-Categorization (Lovable fix)

Sidebar item under Settings + a CTA tile on `/coach` when any count > 0.

---

## Flow 1 — Mark transfers as transfers

**Detection:** uncategorized + `is_transfer=false` + `deleted_at IS NULL`; merchant matches `/^(to|from)\s+(checking|savings|credit|loan|card)/i` or `/transfer|xfer|zelle to self/i`. Pair same-day opposite-sign equal-abs-amount rows; pre-fill `transfer_pair_id`.

**UI:** checkbox table (all checked). **Action:** bulk `UPDATE transactions SET is_transfer=true, transfer_pair_id=...`.

---

## Flow 2 — Bulk-clear needs-review

**Detection:** `needs_review=true AND deleted_at IS NULL`, grouped:
- **Refund pairs** — same merchant + day + opposite signs + equal abs(amount)
- **Interest / ACH fee** — merchant matches `/interest credit|ach return|nsf fee|overdraft/i`
- **Other** — manual review

**UI:** three buckets, "Approve bucket" + per-row toggle. **Action:** `UPDATE transactions SET needs_review=false WHERE id IN (...)`.

---

## Flow 3 — Merge duplicate budget categories

**Detection:** group `categories` by normalized name within same `group_id` (lowercase, strip punctuation, expand `acc.→accident`, `ins.→insurance`, `ret→retirement`, alias `hsa↔health savings account`).

**Preview:** survivor radio (default = most transactions), shows each duplicate's planned_amount and transaction count; sum-of-budgets becomes survivor's new amount.

**Apply order (per merge):**
1. `UPDATE transactions SET category_id=<survivor> WHERE category_id IN (<losers>)`
2. `UPDATE transaction_splits SET category_id=<survivor> WHERE category_id IN (<losers>)`
3. Per month: sum `planned_amount`, UPSERT into survivor's budget, delete loser budget rows
4. Delete loser `categories` (only after verify reference count = 0)

---

## Flow 4 — Merchant re-categorization + alias rules

**Real issue confirmed:** the bank/Plaid feed is mis-reading "Lovable" as "Movable Feast" on some statements. All 18 "Movable Feast" transactions in your data are actually Lovable App Development charges. Some are already in the Lovable category (10), some leaked into Restaurants (8).

**Solution = two parts:**

### 4a. Merchant alias map (the fix)

A small `MERCHANT_ALIASES` array in `src/lib/cleanup-rules.ts`:

```ts
{ pattern: /^movable\s+feast/i,     canonical: 'Lovable', category: 'Lovable' }
{ pattern: /^lovable(\s+dover)?\b/i, canonical: 'Lovable', category: 'Lovable' }
```

Extensible — easy to add more aliases later (e.g. "AMZN MKTP" → Amazon).

### 4b. Detection + apply

For each alias, find transactions whose `merchant` matches `pattern` AND whose current `category_id` ≠ the target Lovable category id.

**UI:** one card per canonical merchant, e.g.:
> **Lovable (App Development)** — 8 transactions currently in **Restaurants**, $130 total. Also normalizes display name from "Movable Feast" → "Lovable".
> [Preview list] [Apply all] [Skip]

**Action per row:**
- `UPDATE transactions SET category_id=<lovable_id>, merchant=<canonical_name>, normalized_merchant=<canonical_lower> WHERE id IN (...)`
- Skip rows with existing `transaction_splits` (surfaced in "Skipped" list).

### 4c. Prevent recurrence

Also write the alias map server-side so future imports auto-correct. Two options shown in the plan; pick one at build time:

- **Lightweight (chosen):** add a check in the existing transaction import path (wherever Plaid/MX writes rows) — apply `MERCHANT_ALIASES` before insert. Same constant file shared between client and edge function via duplicated literal (no new table).
- **Heavy (deferred):** new `merchant_aliases` table with full CRUD UI — not in this build.

Files touched for 4c: whichever edge function ingests Plaid/MX transactions (TBD during build — will read `supabase/functions/` first).

---

## Files

- `src/pages/Cleanup.tsx`
- `src/components/cleanup/TransferCleanup.tsx`
- `src/components/cleanup/NeedsReviewCleanup.tsx`
- `src/components/cleanup/DuplicateBudgetMerger.tsx`
- `src/components/cleanup/MerchantRecategorize.tsx`
- `src/hooks/use-cleanup-candidates.ts`
- `src/lib/cleanup-rules.ts` — `MERCHANT_ALIASES`
- `supabase/functions/<existing-import-fn>/index.ts` — apply aliases on insert (Flow 4c)
- `src/App.tsx` — add `/cleanup` route (lazy)
- `src/components/AppSidebar.tsx` — sidebar entry with badge
- `src/pages/MoneyCoach.tsx` — "Data cleanup ready" tile when any count > 0

## Out of scope

- Refresh stale Plaid feed (separate flow)
- User-editable alias table (deferred — hard-coded for now)
- Scheduled auto-cleanup
- Undo history

## Risks / safeguards

- Two-step confirm on every flow (Preview → Apply).
- No hard transaction deletes anywhere.
- Flow 3 deletes loser categories only after reference-count verify.
- Flow 4 skips transactions with existing splits.
- Every apply ends with a toast showing exact row count changed.