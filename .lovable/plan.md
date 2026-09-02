# Cost Basis, Lots, Dividends & Gain/Loss for the Five Investment Roles

Four related additions so your role positions carry real purchase data instead of placeholders.

## 1. Gain/Loss report by role

New tab on `/investing/strategy`: every position listed under its role (CORE, MOMENTUM, GUARDRAIL, CONVICTION, CATALYST) with shares, total cost basis, current value, dollar gain/loss, percent gain/loss, and dividends received YTD. Role subtotals plus a portfolio total row, a positive/negative color treatment, and a CSV export. Positions with no cost basis are flagged "basis missing" rather than shown as a 100% gain.

## 2. Lot-level CSV import (purchase prices)

Upgrade of the existing cost-basis import so a broker export creates individual **lots** instead of one blended number:

- Paste or upload CSV/TSV from Schwab, Fidelity, SoFi, or a generic export.
- Column auto-detection for ticker, trade date, shares, price per share, fees, and total cost.
- Preview table showing each detected lot, which role position it matches, and unmatched tickers.
- On confirm: lots are saved, and each position's shares and total cost basis are recalculated from its lots (sum of shares, sum of shares x price + fees). Manual basis stays available for positions with no lots.
- Re-importing the same file does not duplicate lots (matched on ticker + date + shares + price).
- Holding period per lot (short vs long term) feeds the existing tax panel.

## 3. Dividend & income tracker

New tab where you record each payment: ticker, pay date, amount, type (dividend, qualified dividend, interest, capital gain distribution), and account. The tracker rolls payments up per position and per role, and the "Dividends received YTD" field in Add/Edit a position becomes derived from recorded payments for the current year (with a manual override if you'd rather type a figure). Yearly totals and a per-role income summary are shown, plus CSV export for tax prep.

## 4. Charles Schwab via SnapTrade

The connect flow already exists on Accounts. What gets added:

- Remove SoFi-specific brokerage wording (SoFi Invest is not supported by SnapTrade) and present Schwab as the supported path; SoFi stays available for manual balances and cash linking.
- After you authorize Schwab, a sync pulls accounts, holdings, quantities, and cost basis into Investments, then offers to apply that basis to matching role positions in the same preview-and-confirm step used by the CSV import (brokerage basis wins over placeholder basis; your manually entered basis is never overwritten without confirmation).
- Note: the SnapTrade tier allows one connected user, so connecting Schwab replaces any earlier connection. You must enter Schwab credentials yourself — I never see them.

## Technical details

New household-scoped tables with RLS, GRANTs, and soft deletes:

- `inv_position_lots` — position_id, ticker, trade_date, shares, price_per_share, fees, total_cost, source (csv / brokerage / manual), external_id for dedupe.
- `inv_dividends` — position_id, ticker, pay_date, amount, income_type, account_type, source.

`inv_role_positions.cost_basis` and `shares` become derived from lots when lots exist (computed in a shared module, not by trigger, so manual entry still works). New `src/lib/investing/lots.ts` for lot parsing, basis rollup, and holding-period math; `src/lib/investing/gainLoss.ts` for role-grouped gain/loss rows.

UI: `GainLossPanel.tsx`, `DividendTracker.tsx`, and an extended `CostBasisImport.tsx` (lot mode + Schwab sync), all mounted as tabs in `src/pages/InvestmentStrategy.tsx`. `use-investing.ts` gains lot and dividend hooks with realtime refresh. Schwab sync reuses the existing SnapTrade edge functions; no new market-data provider.

No trades are ever placed and no money moves. All imports require explicit confirmation.
