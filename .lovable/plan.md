
## Goal
Keep one hub for both, but make "Bills" first-class with due-date reminders + autopay tracking, while subscriptions keep cancellation tools.

## What's already there (no work needed)
- Two tables already exist: `subscriptions` (cancellation) and `recurring_transactions` (bills with `next_due_date`, `autopay_enabled`, `reminder_days`, `last_paid_date`, `biller_url`).
- `SubscriptionsHub` (`/subscriptions`) already has two tabs: Subscriptions + Recurring Bills.
- Weekly digest edge function exists (`weekly-digest`) — can extend with bill reminders.

## Changes

### 1. Coach tile rename (tiny)
`src/components/coach/wizard-steps/Step01.tsx`
- Tile title: "Bills" → "Bills & Subscriptions"
- Manage link already routes to `/subscriptions` ✓
- Update descriptive copy.

### 2. Bills quick-filter chip on hub (tiny)
`src/pages/SubscriptionsHub.tsx`
- Add chips above the tabs: **All / Bills only / Subscriptions only**.
- "Bills only" → switches to Recurring tab.
- "Subscriptions only" → switches to Subscriptions tab.
- Default "All" shows current tab UI.
(Tabs already do the filtering; the chips are a friendlier entry point.)

### 3. Autopay + reminder UI on bills (medium)
`src/pages/Recurring.tsx`
- Add columns/badges to the bill row: **Autopay** toggle, **Remind X days before** input.
- Add same fields to Add/Edit dialogs (`autopay_enabled` boolean switch, `reminder_days` number input 0–14, default 3).
- Show "Due in N days" pill that turns amber ≤ `reminder_days`, red if overdue.
- No schema change — columns already exist.

### 4. Due-date reminder logic (medium)
Extend `supabase/functions/weekly-digest/index.ts`:
- For each household, query `recurring_transactions` where `is_active=true`, `autopay_enabled=false`, `next_due_date BETWEEN today AND today + max(reminder_days, 7)`.
- Add a "Bills due this week" section to the email (merchant, amount, due date, biller_url link if present).
- Autopay-enabled bills get a separate "Autopay scheduled" section (informational).

### 5. Memory update
Update `mem://features/subscription-management` to note the unified hub + bills-vs-subscriptions split.

## Technical notes
- No database migration required — `recurring_transactions` already has `autopay_enabled`, `reminder_days`, `last_paid_date`, `biller_url`.
- Reminder delivery rides existing weekly digest (no new cron, no notifications table).
- Cancellation tools stay on the Subscriptions tab only; bills don't get the cancellation flow.

## Out of scope
- Per-bill push notifications (would need a new daily cron + notifications table).
- SMS reminders.
- Auto-marking bills paid from bank transactions (could be a follow-up using the existing `advance_recurring_next_due_date` trigger).
