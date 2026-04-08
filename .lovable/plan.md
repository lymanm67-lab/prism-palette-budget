## Plan

### 1. Smart Purchase Rules (Guardrail Extension)
Extend the existing Spend Guardrails system with two new rule types:

**Database changes:**
- Add columns to `guardrail_settings`: `cooling_off_threshold` (numeric, nullable — dollar amount that triggers 48h wait), `cooling_off_hours` (integer, default 48)
- New table `guardrail_pending_purchases`: tracks items in the cooling-off period (amount, description, created_at, expires_at, status, multi_use_score)

**UI changes:**
- Add "Cooling-Off Rule" section to `GuardrailSettingsDialog` — set the $ threshold and wait period
- Add "Multi-Use Check" toggle — when enabled, the intervention modal asks "How many uses will this item get?" with a 1-5 scale before allowing purchase
- Update `GuardrailInterventionModal` to show cooling-off countdown and multi-use prompt for qualifying purchases
- Add a "Pending Purchases" mini-list on the Dashboard showing items in their waiting period with countdown timers

### 2. Currency Exchange Calculator
Add a new calculator to the Calculators page, inspired by Revolut's clean converter:

**Features:**
- Two-currency selector with 30+ currencies (USD, EUR, GBP, JPY, CAD, AUD, CHF, INR, BRL, MXN, etc.)
- Live exchange rates via a free API (frankfurter.app — no key needed)
- Swap button to reverse conversion direction
- Amount input with real-time conversion
- Rate comparison: show mid-market rate vs typical bank/card markup (3%) so user sees savings
- "Travel wallet" quick-reference: enter a budget, see equivalent in destination currency
- Historical rate sparkline (last 30 days) so user can see if timing is good
- Integrated into the existing calculator grid as a new "Travel" category entry

**No database changes needed** — this is a pure client-side calculator using a public API.

### Files to create/modify
- `supabase migration` — add cooling-off columns + pending_purchases table
- `src/components/guardrails/GuardrailSettingsDialog.tsx` — add cooling-off & multi-use settings
- `src/components/guardrails/GuardrailInterventionModal.tsx` — add multi-use prompt + countdown
- `src/components/guardrails/PendingPurchasesList.tsx` — new widget
- `src/components/calculators/CurrencyExchangeCalculator.tsx` — new calculator
- `src/pages/Calculators.tsx` — register new calculator
- `src/pages/Dashboard.tsx` — add pending purchases widget
