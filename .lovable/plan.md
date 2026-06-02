## Goal

Keep monthly Lovable / app-dev spending under **$100** and **400 build credits**, whichever comes first. Soft guardrails only — warnings, recommendations, and an admin-approved override flow. No real charges are blocked (we can't), but PrismMoney surfaces the limit everywhere it matters.

---

## Data model (1 migration)

**`app_dev_limits`** — one row per household
- `id`, `household_id` (unique), `monthly_spend_limit` numeric default `100`
- `monthly_credit_limit` int default `400`
- `period_start` date (1st of current month)
- `is_enabled` bool default true
- `updated_at`

**`app_dev_credit_log`** — manual credit-use entries
- `id`, `household_id`, `date`, `credits_used` int, `note` text, `created_by`, `created_at`, `deleted_at`

**`app_dev_overrides`** — admin-approved emergency unlocks
- `id`, `household_id`, `requested_by`, `approved_by` (nullable), `reason` text, `status` ('pending'|'approved'|'denied'), `expires_at` (default now+24h), `created_at`

All three: RLS scoped by `is_household_member`, plus full GRANT block. Admin approval gated by `has_role(auth.uid(), 'admin')`.

---

## Spend source

- **Auto $:** sum `transactions` where category name matches `/lovable|app dev/i` (or a configurable `category_id` set in limits row), `deleted_at IS NULL`, `is_transfer=false`, `date >= period_start`.
- **Manual credits:** sum `app_dev_credit_log` for current period.
- **Override:** user can edit either value inline on the dashboard card (writes a manual adjustment row, never mutates transactions).

---

## UI

**1. Settings → new section "App-Dev Cutoff"** (`src/pages/Settings.tsx` tab or inline card)
- Edit `monthly_spend_limit`, `monthly_credit_limit`, pick the tracked category, enable/disable, manual reset button.

**2. Dashboard card** `src/components/dashboard/AppDevCutoffCard.tsx`
- Two progress bars (spend $ / credits), green→yellow (≥70%)→red (≥100%).
- "Log credits used" quick action.
- "Request override" button when at/over limit.
- Status copy: under 70% silent praise, 70–99% warning, ≥100% red banner with the three canned messages from your spec.

**3. Override modal** `src/components/app-dev/OverrideRequestModal.tsx`
- Reason textarea, submit → row in `app_dev_overrides` status=pending.
- Admins see pending requests on the same card and can approve/deny inline.

**4. Coach tile** on `/coach` when ≥70% — links to the dashboard card.

---

## Logic

**Hook** `src/hooks/use-app-dev-cutoff.ts`
- Loads limits row, current-period transactions matching tracked category, credit log sum, active approved override.
- Returns `{ spendUsed, spendLimit, creditsUsed, creditLimit, spendPct, creditPct, status: 'ok'|'warn'|'over', overrideActive, daysLeft }`.
- Memoized; subscribes via `useRealtimeRefresh` to all three tables.

**Recommendation strings** (static map in the hook, no AI in v1):
- `over` → "You've reached your monthly limit. New requests are locked until next month."
- `warn` → "You're close to your monthly limit. Finish planning before purchasing more credits."
- `nice_to_have` (any new credit log when status=warn/over) → "This request appears nice-to-have. Move it to next month's backlog."

---

## Monthly auto-reset (pg_cron + edge fn)

- New edge fn `supabase/functions/app-dev-cutoff-reset/index.ts` — CRON_SECRET-protected, updates every `app_dev_limits` row to set `period_start = date_trunc('month', now())`. Soft-resets counters (computed off period_start, so this is the actual reset).
- pg_cron job: `0 0 1 * *` UTC → POSTs to the edge fn with anon key + CRON_SECRET header.
- Inserted via `supabase--insert` (per cron-job convention).

---

## Files

**New**
- `supabase/functions/app-dev-cutoff-reset/index.ts`
- `src/hooks/use-app-dev-cutoff.ts`
- `src/components/dashboard/AppDevCutoffCard.tsx`
- `src/components/app-dev/OverrideRequestModal.tsx`
- `src/components/app-dev/CreditLogQuickEntry.tsx`
- `src/components/settings/AppDevCutoffSettings.tsx`

**Edited**
- `src/pages/Dashboard.tsx` — mount card
- `src/pages/Settings.tsx` — mount settings section
- `src/pages/MoneyCoach.tsx` — conditional tile at ≥70%

**Migration**
- 3 tables + RLS + GRANTs + triggers for `updated_at`

---

## Memory updates (after build)

- New memory file `mem://features/app-dev-cutoff` describing limits, override flow, reset cron.
- Add line to Core: "App-dev cutoff: $100 / 400 credits per month, soft guardrail, admin override 24h."

---

## Out of scope (v1)

- AI recommendation engine (nice-to-have detection, postpone suggestions)
- Locking manual entry forms
- Multi-month historical chart
- Per-category limits beyond app-dev
- Notifications/email at 70%/100% (can add later via existing notification system)

---

## Risks

- Auto $ tracking depends on transactions being tagged to the right category. Settings exposes the category picker so you can correct it.
- Credit usage is fully manual — no Lovable API. The quick-entry button on the dashboard keeps friction low.
- Override approval reuses `app_role='admin'`. If you're the only admin, the "friction" is effectively self-approval — flag if you want to add a typed-confirmation phrase as extra friction.