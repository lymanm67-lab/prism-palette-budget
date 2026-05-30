# Method Financial Bill Pay Integration

Adds real ACH bill payment on top of the existing reminder-based Bill Pay tab. Method handles biller directory (15k+), liability linking, and payment rails. PrismMoney™ stays the UI + scheduling layer.

## Scope (large — schema + edge functions + UI)

### 1. Secrets & setup
- Add `METHOD_API_KEY` and `METHOD_ENV` (`dev` / `production`) via secrets tool.
- User signs Method MSA + funding source agreement (off-platform).
- Confirm Method account is provisioned for ACH disbursement (not just data).

### 2. Database (one migration)
New tables, all household-scoped with RLS + GRANTs:

- `method_entities` — one per end-user (KYC'd person who owns the bills)
  - `household_id`, `user_id`, `method_entity_id`, `status`, `capabilities` (jsonb)
- `method_accounts` — funding sources (the user's checking account that money pulls from)
  - `household_id`, `entity_id`, `method_account_id`, `account_id` (FK to existing `accounts`), `type` (ach), `status`
- `method_liabilities` — payable bills (credit cards, loans, utilities) linked via Method
  - `household_id`, `entity_id`, `method_liability_id`, `merchant_name`, `mch_id` (Method merchant id), `mask`, `balance`, `next_payment_due_date`, `recurring_transaction_id` (FK, nullable — links Method liability ↔ existing reminder row)
- `method_payments` — every payment attempt
  - `household_id`, `method_payment_id`, `source_id`, `destination_id`, `amount`, `status` (pending/processing/sent/failed/reversed), `estimated_completion_date`, `error_code`, `transaction_id` (FK to created `transactions` row), `idempotency_key`
- `method_autopay_rules` — per-liability autopay config
  - `liability_id`, `strategy` (statement_balance | minimum | fixed_amount), `fixed_amount`, `lead_days` (default 3), `enabled`, `max_amount_cap`

### 3. Edge functions
All `verify_jwt = true`, household-scoped, idempotent.

- `method-create-entity` — POST KYC payload to Method, store `entity_id`.
- `method-link-source` — link existing Plaid account as ACH source (reuses Plaid processor token).
- `method-connect-liability` — Method Element / Connect flow to discover bills; persist to `method_liabilities`.
- `method-create-payment` — body: `{liability_id, amount}`. Validates cap, creates idempotency key, calls Method, writes `method_payments` row, creates pending `transactions` row.
- `method-webhook` — receives `payment.update`, `liability.update`, `entity.update`. Updates statuses, marks transaction cleared/failed, advances `next_due_date` on success (reuses existing trigger).
- `method-autopay-cron` — daily 06:00 UTC. Finds liabilities where `next_payment_due_date - lead_days = today` and `autopay_rules.enabled`, calls `method-create-payment`.

### 4. UI changes (additive to existing `BillPayPanel`)
- **Setup wizard** (`MethodOnboarding.tsx`): KYC form → create entity → pick funding account → "Connect bills" Method Element.
- **BillPayPanel enhancements**:
  - New "Auto-pay" toggle per row → opens `AutopayRuleDialog` (strategy, cap, lead days).
  - "Pay now" button (replaces "Mark paid" when liability is Method-linked) → calls `method-create-payment`, optimistic pending state.
  - Status chip: Scheduled / Processing / Sent / Failed (+ retry).
  - Banner if Method entity not set up: "Enable real auto-pay" CTA.
- **`MethodPaymentHistory.tsx`**: ledger of attempts with statuses and reversal info.

### 5. Safety rails (non-negotiable)
- Hard cap per payment (user-set, default $2,500).
- 24h cooling-off on first payment to any new liability.
- 2-factor confirm (re-enter password or biometric) for payments > cap.
- All autopay runs logged + emailed via existing Resend digest.
- Compliance copy: "PrismMoney™ initiates payments via Method Financial, a licensed money transmitter. Funds move from your linked account to the biller via ACH."

### 6. Rollout
- Phase 1 (week 1–2): schema + entity/source/liability link only — read-only "Method-verified" badge on existing bills.
- Phase 2 (week 3): manual "Pay now" via Method.
- Phase 3 (week 4): autopay rules + cron + webhook reconciliation.
- Phase 4: gate behind Premium / Business Pro tier (per `subscription-plans` memory).

## Out of scope
- Bill negotiation (already exists).
- Card-to-card transfers (use Astra if ever needed).
- International / non-US billers (Method is US-only).

## Estimated effort
~12–16 build messages across 3–4 sessions. Heaviest cost is webhook + autopay cron testing.

Reply **"go phase 1"** when you have Method credentials and want me to start with schema + entity creation. Or **"revise"** with changes.