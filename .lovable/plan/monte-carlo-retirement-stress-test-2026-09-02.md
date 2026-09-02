# Monte Carlo Retirement Stress Test

A new module that tests whether the retirement plan survives thousands of market, inflation, healthcare, longevity, and shock scenarios — instead of one fixed average return.

## Where it lives

- New page at `/planning/stress-test`, labeled **Retirement Stress Test** in the sidebar under **Grow Wealth** (next to Investment Planning and Retirement Tax Center).
- Cross-links: a "Stress test this plan" button on Investment Planning and a success-probability mini-stat on the Retirement Hub.

## Engine

A new simulation engine extending the existing seeded Monte Carlo helper already in the app (`src/lib/investment/risk.ts`), upgraded to model year-by-year:

- Random annual returns from expected return + volatility (never a fixed return)
- Separate inflation tracks: general, housing, healthcare, LTC, travel
- Accumulation with employee + employer + HSA contributions and contribution growth
- Retirement withdrawals with withdrawal growth, Social Security COLA, pension COLA, taxes
- Guaranteed income kept separate from portfolio withdrawals; emergency cash excluded from invested assets; HSA tracked as its own sleeve inside total retirement resources
- Run counts: 1,000 / 5,000 / 10,000 (default 10,000, run in a Web Worker so the UI stays responsive)

## Sections on the page

1. **Success Probability** — big gauge with bands (95–100 Very Strong, 85–94 Strong, 75–84 Monitor, under 75 Adjustment Recommended), plus depletion, legacy, income-floor and spending-cut probabilities, and a note that a near-100% score can mean underspending.
2. **Monte Carlo Projection + Outcome Percentiles** — fan chart (10th/25th/median/75th/90th) and a balance table at ages 62, 65, 67, 70, 75, 80, 85, 90 and life expectancy.
3. **Sequence Risk** — 20/30/40% declines occurring 5 years before retirement, at retirement, and 3 and 5 years after; shows longevity, legacy, withdrawal, recovery-time and probability impact.
4. **Historical Crisis Scenarios** — Depression-style, 1970s inflation, dot-com, 2008, 2020, high-inflation/low-return (labeled scenario models, not predictions).
5. **Inflation Stress Test** — 2/3/4/5% presets with healthcare running independently higher.
6. **Long-Term Care Stress Test** — none / home care / assisted living / nursing, with start age, duration, annual cost, inflation, insurance benefit, HSA offset and out-of-pocket gap; reuses existing LTC plan data where available.
7. **Income Floor Analysis** — guaranteed vs portfolio income and a Guaranteed Income Coverage Ratio against essential retirement expenses.
8. **Retirement Timing** — one-click 62 / 65 / 67 / 70 / custom comparison.
9. **Contribution Sensitivity** — −$250 / base / +$250 / +$500 / +$1,000 / custom, with marginal impact per dollar.
10. **Spending Sensitivity** — −10% / −5% / base / +5% / +10%.
11. **Dynamic Guardrails** — suggested discretionary cuts or safe lifestyle increases; recommendations only, nothing auto-applied.
12. **Worst-Case Mode ("What Could Break My Plan?")** — stack multiple shocks, then report the most damaging assumption, the age the plan turns vulnerable, lowest balance, and whether the legacy target survives.
13. **Top Risks** — ranked by projected dollar impact.
14. **Scenario Comparison** — save and compare at least four scenarios (Base, Conservative, Moderate, Aggressive) side by side.
15. **What Improves the Plan Most?** — actions ranked by impact, suppressed when the plan is already strong.
16. **Annual Review** — snapshot history chart of probability, balance, contributions and assumptions over time.
17. **Technical details** (collapsible) and the required disclaimer that Monte Carlo illustrates ranges and guarantees nothing.

## Data wiring

All assumptions pre-fill from existing Prism data — active investment plan (balances, employee/employer contributions, expected return, retirement age), HSA settings, retirement allocation settings, Social Security and pension estimates, debts, Emergency Fund and Travel Fund reserves, investment accounts, and the legacy target. Every field is overridable for what-if testing; overrides only touch the master plan if you explicitly click Save to Plan.

Default success test: **reach or maintain $4,000,000 by age 85**, editable, alongside the other goal types (never depleted, minimum floor, minimum annual income, preserve principal, fund LTC, or several at once).

## Technical notes

- `src/lib/retirement/stressTest.ts` — engine (paths, percentiles, goal evaluation, sensitivity grids, shock overlays, risk ranking).
- `src/workers/stressTest.worker.ts` — runs 10,000-path simulations off the main thread.
- `src/hooks/use-stress-test.ts` — loads plan data, manages overrides, runs the worker, saves scenarios/snapshots.
- `src/pages/RetirementStressTest.tsx` plus components under `src/components/stress-test/`.
- Two new household-scoped tables with RLS and GRANTs, soft delete: `stress_test_scenarios` (assumptions + results JSON) and `stress_test_snapshots` (annual review history).
- Charts via Recharts, semantic design tokens only, existing DisclaimerBlock reused.
