## Goal
Import the full BetrLink LLC account activity (Mar 2024 – Jun 2026) as a new manual account in your ledger, with every deposit, fee, and creditor payment posted as a transaction. The monthly $888 ACH from your IU Credit Union checking will be linked as a transfer.

## Approach

### 1. Create the BetrLink account
- **Name:** BetrLink Settlement (#54138865)
- **Institution:** BetrLink LLC
- **Type:** depository / checking (escrow-style)
- **Provider:** manual
- **Starting balance:** $0.00 (auto-adjusts as transactions post; statement ending balance is $150.15)

### 2. Post every statement line as a transaction
All ~130 rows from the PDF go in with proper sign convention:
- **Deposits (ACH from you + creditor refunds + advances)** → positive amount
- **Customer Fees** (Gitmeid Legal Fee, Settlement Fee, Advance Repayment) → negative, category **BetrLink Debt Settlement**
- **Transaction Fees** (Monthly Service Charge, Phone Pay COM, Account Setup, Second Day Check Payment) → negative, category **Bank & Merchant Fees**
- **Creditor Payments** (Second Round LP, Capital One Bank, NetCredit, USAA Savings Bank, Javitch Block LLC, Blitt and Gaines, Discover Financial) → negative, category **BetrLink Debt Settlement**, merchant = creditor name
- **Withdrawal (ACH out)** → negative

### 3. Link the monthly ACH deposits as transfers
For each ACH deposit into BetrLink, I'll mark `is_transfer = true` and (where a matching outflow exists in **SIMPLE CHECKING** at IU Credit Union on the same date and amount) wire them together via `transfer_pair_id` so they're excluded from spending totals on both sides.

If no matching outflow exists in checking yet for some deposits, those will still be flagged `is_transfer = true` on the BetrLink side so they don't inflate "income."

### 4. Skip exact duplicates
Before insert, I'll check for existing transactions on the BetrLink account with same date + amount + merchant to avoid double-posting if you re-run this.

## One thing to confirm
You said IU Credit Union Checking is the source. The closest match in your accounts is **SIMPLE CHECKING** (IU Credit Union). If that's wrong, tell me which account to use for the transfer-pair side; otherwise I'll use SIMPLE CHECKING.

## Result
- New BetrLink Settlement account showing the full payment/fee history
- Creditor payments and fees properly categorized for Debt Payoff and reporting
- ACH funding flows treated as transfers (not double-counted as expenses)
