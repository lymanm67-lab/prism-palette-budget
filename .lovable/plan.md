# Populate the Assumption Center with Real Numbers

Right now the Money Blueprint has never been saved — there is no stored assumption record, so every tab is running on built-in placeholder defaults. This plan writes your real numbers in, wires the Spending Plan to your live budget, brings in your real asset roster, and saves the scenarios you asked for.

## What gets set

**Ages and horizon**
- Current age 59, spouse 55, retirement age **85** (matching your active Investment Plan), RMD age 75.

**Income**
- Salary: $70,940.04/yr ($5,911.67/mo) from your IU paystub, plus $7,700/yr consulting — labeled CURRENT / VERIFIED.
- Employer retirement contribution 9% ($532.05/mo), your payroll contributions $451.66/mo, plus the $250/mo Wealth Accelerator starting Jan 2028.
- Social Security: **$4,035/mo starting at age 70**, 2% COLA.
- Spouse pension (OPERS): **$6,559/mo starting at age 62**, 2% COLA, 50% survivor.
- Kateri's take-home $4,227.72/mo now, rising to $6,304 when the Chapter 13 garnishment releases April 2027.

**Portfolio and returns**
- Balance $184,113.61 (retirement $181,504.70 + self-directed $2,608.91).
- Primary return 8%, stretch 10%, scenario band 6/7/8/9/10%, inflation 3%, healthcare inflation 5%.

**Debts** (already in your debt records, synced into the Blueprint so payoff dates release cash flow)
- Student loans $107,000, $390/mo IDR from Jan 2027, PSLF forgiveness July 2033 (79 of 120 payments left).
- SBA $48,000 at $158/mo, Consumer $2,606.04, Vacation loans $5,049.30.

## Real assets

The Net Worth tab will read your actual asset roster instead of a placeholder: business equity $535,000, OPERS account $328,948.74, intellectual property $175,000, the three Cambridge/Allies Street real estate interests, both vehicles, jewelry, firearms, HSA, and all retirement and cash accounts. Pension and Social Security stay out of net worth — they are income streams only, as your rules require.

Duplicate account rows currently inflate this list (four identical "SoFi Self-directed" rows, four identical "SoFi Traditional IRA" rows, two "Kikoff" rows). I will flag these in the Integrity tab rather than silently deleting them, so you can confirm which to keep.

## Monthly budget — live

The Spending Plan tab will read your **budgets table month by month** instead of holding typed-in numbers, so it never goes stale. Foundation, Wealth Engine, Future Fund and Freedom Spending are derived from your real category budgets for the month you are viewing, with income lines and payroll deductions excluded from the outflow buckets and the 15% Buffer calculated on top of Foundation rows.

## Saved scenarios

Three comparison sets, saved so you can toggle between them:
1. **Retire at 75 / 80 / 85** — work-stop age sensitivity on the same portfolio.
2. **6% / 8% / 10% returns** — conservative, base and stretch outcomes.
3. **PSLF forgiven vs. paid in full** — the $107,000 either disappearing in 2033 or being repaid.

Each scenario shows projected balance at retirement, at the legacy window (age 70–85), and the resulting sustainable monthly income.

## Technical notes

- Seed the real values into `defaultAssumptions()` in `src/lib/blueprint/model.ts` so a fresh household starts correct, then write one `blueprint_assumptions` row for your household via the existing save hook. No schema change needed.
- Add the three scenario sets as `SavedScenario` entries in the same state (`overrides` are sparse patches, so no new engine logic).
- `NetWorthPanel` already reads `useWealthOSData`; verify its bucket mapping covers business equity, IP and partial real estate interests, and extend the mapping if any asset is landing in the wrong bucket.
- Point the Spending Plan's bucket rows at the existing budgets query in `use-money-blueprint.ts` (it already fetches `budgets`), keyed on the selected month, with income/payroll category groups filtered out.
- Extend `dataIntegrityIssues()` with a duplicate-account check so the SoFi and Kikoff repeats surface as warnings.
