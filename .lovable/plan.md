# Retirement What-If Lab (Boldin-style features)

Add one new **What-If Lab** tab to the Retirement Hub with three sections. Calculations only run in your browser and nothing is saved, so your real plan and budget stay exactly as they are.

## 1. What-If Timeline Sliders
- Sliders for **your retirement age (55–70)**, **Kateri's retirement age**, **life expectancy (85–100, starts at 100)** and **Social Security claim age (62/67/70)**.
- Compare up to 3 scenarios side by side, for example 62, 65 and 67. Each scenario shows a lifetime chart of income vs spending, the portfolio balance by age, the age the money would run out (if it does) and the balance left at the end.
- Starts from your confirmed figures: the $184,602 portfolio, the SSA estimates ($1,799 at 62, $2,784 at 67, $3,540 at 70), and both spouses' ages worked out from their birthdays.

## 2. Spending Phases (Go-Go / Slow-Go / No-Go)
- You set the age ranges (default 62–74, 75–84, 85+) and the spending for each phase as a % of your base retirement spending (default 110% / 85% / 75%).
- Medical costs get their own line that grows faster and rises in the No-Go years.
- The chart shades each phase, and every scenario uses these phases.

## 3. State Relocation Tax Comparison
- Compare Ohio with Florida, Texas, Tennessee, Pennsylvania, North Carolina and others you can pick.
- Each state shows its income tax on pensions, retirement withdrawals and Social Security, plus a property-tax estimate.
- Results show the yearly and lifetime after-tax difference and the change to the money-runs-out age.
- The state tax rates are simplified 2026 estimates and are labeled "estimate — verify with a tax advisor".

## Technical details
- New pure engine at `src/lib/retirement/whatIf.ts` that does a year-by-year projection (contributions, returns, SS, phase spending, state tax).
- New state tax table at `src/lib/retirement/stateTax.ts`.
- New `src/pages/RetirementWhatIf.tsx`, registered as `?tab=what-if` in `RetirementHub.tsx`.
- Tests in `whatIf.test.ts`: phase multipliers, the SS claim-age amounts, Ohio vs Florida tax difference, and the depletion age moving later when retirement is delayed.
- Add one rule to AGENTS.md for the what-if engine. No database changes.

This is a large change (4–5 new files).
