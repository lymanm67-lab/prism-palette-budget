# Live SoFi Balances + Excess-Cash Redirect

Three connected pieces: make Emergency Cash follow a real linked SoFi bank account, make the SoFi Investments card read real brokerage balances, and turn the redirect percentages into an actual tracked transfer plan.

## 1. Emergency Cash reads a real SoFi account

- Add a "Link account" control on the SoFi Emergency Cash card that lets you pick any connected bank account (SoFi checking/savings) from your existing accounts list.
- Once linked, the card's balance comes from that account's live balance instead of the manually typed number. A small badge shows the institution and last-updated time; if the feed goes stale (>48h) it shows a warning and falls back to the last known value.
- Manual entry stays available as an override for accounts you don't want linked.
- If SoFi isn't connected yet, the card shows a "Connect SoFi" action that opens the existing Plaid link flow.

## 2. Real SoFi investment balances

- The SoFi Investments card switches from a static figure to reading from your investment accounts/positions data.
- You'll be able to tag which investment accounts belong to SoFi, and the card totals those (market value, cash, day change) with a link through to the Investments page.
- Brokerage linking uses your existing SnapTrade connection flow. Important constraint: your SnapTrade tier allows only one connected user, so connecting SoFi Investments there may displace the currently connected brokerage. To avoid that, the card also supports adding SoFi investment accounts and positions manually (with a value-update field) so it reflects real balances without touching the existing connection.

## 3. Redirect Excess Cash → SoFi Investments

Implemented as a **tracked plan**, not automated money movement (real ACH transfers would need payment rails and separate consent — not part of this build).

- Each month, after the Emergency Fund floor ($2,000 stage 1 / $5,000 primary) is protected, any cash above the floor is split by your saved percentages (default 60% Investments / 40% other).
- A "Redirect this month" panel shows: available excess, dollar amount to each destination, and a one-click "Mark transferred" that writes reserve transactions (out of Emergency Cash, into SoFi Investments) so history and balances stay accurate.
- Guardrail: nothing is proposed while the fund is below its floor, or while contributions are paused.
- The dashboard's resilience section reflects the redirect so Build Wealth totals include redirected dollars.

## Technical notes

- `reserve_funds.account_id` already exists (FK to `accounts`) — wire it up in `useReserveFunds` / `EmergencyFundCard.tsx` and derive `market_value` from the linked account's balance when set.
- SoFi investment tagging: reuse `investment_accounts`/`investment_positions` via `use-investment-data.ts`; add an institution filter for the card in `SofiInvestmentsCard.tsx`.
- Redirect logic goes in `src/lib/reserves/emergencyFund.ts` (floor-first waterfall) with the panel in a new `RedirectExcessPanel.tsx`; posting a redirect writes two `reserve_transactions` rows.
- No new tables needed; possible small migration only if we add a `provider_institution` flag for tagging SoFi investment accounts.

## Out of scope

- Initiating real bank/brokerage transfers.
- Changing your existing SnapTrade connection without explicit confirmation.
