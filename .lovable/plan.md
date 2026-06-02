## 1. Safe-to-Spend fix (engine)

**Problem:** STS shows $2,844 because it only subtracts bills + subscriptions, then applies the 20% buffer. It does NOT reserve money for Investing or Savings, so "safe to spend" overstates what's truly guilt-free.

**Fix:** In `src/hooks/use-safe-to-spend.ts`, subtract a **Deployment Reserve** from `baseMonthlySafe` *before* the buffer multiplier:

```
baseMonthlySafe = effectiveIncome
                  − effectiveExpenses
                  − deploymentReserve   ← NEW
                  − spentAdjustment
```

`deploymentReserve = (investments_pct + savings_pct) × effectiveIncome`, pulled from the new `paycheck_deployment_rules` row (defaults 10% + 10% = 20% of income → ~$1,708 reserved). Result: STS drops from $2,844 → ~$1,990, matching your math.

Return two new fields (`deploymentReserve`, `investingPct`, `savingsPct`) so `StsEquationView` can show the new line.

**StsEquationView:** add one row — *"− Investing + Savings reserve ($X)"* — between Expenses and Buffer.

## 2. Smart Allocation Card (Dashboard)

New component: `src/components/dashboard/SmartAllocationCard.tsx`, mounted at top of Personal dashboard.

**Trigger:** last paycheck-tagged income transaction (positive, category group = Income, payroll source) within last 7 days that has NO matching `paycheck_deployments` row with `status='applied'`.

**Display (Conscious Spending bands, matching Budgets pill):**

| Bucket | Range | Default | $ This Paycheck | Pill |
|---|---|---|---|---|
| Fixed Costs | 50–60% | 60% | $X | In Range |
| Investments | 5–10% | 10% | $X | In Range |
| Savings Goals | 5–10% | 10% | $X | In Range |
| Guilt-Free | 20–35% | 20% | $X | In Range |

Each row: bucket label, target $, range badge, zone-colored progress bar (same component family as Budgets pill). One **"Apply Plan"** button → calls existing `useBuildPaycheckDeployment` with `persist: true`, then for each non-zero bucket creates a `transfers` row (or `transactions` with `is_transfer=true`) from checking → mapped destination account (savings goal account / investment account). Marks deployment `status='applied'`.

**Empty / dismissed states:** "No paycheck detected yet" link to `/paycheck-deployment`; "Dismiss" hides for 24h via localStorage.

## 3. Paycheck Deployment Rules at `/coach` (Conscious Spending bands)

**New table** `paycheck_deployment_rules` (one row per household):

- `fixed_min`, `fixed_max`, `fixed_target` (default 50/60/60)
- `invest_min`, `invest_max`, `invest_target` (default 5/10/10)
- `savings_min`, `savings_max`, `savings_target` (default 5/10/10)
- `guiltfree_min`, `guiltfree_max`, `guiltfree_target` (default 20/35/20)
- `nag_enabled` (default true), `nag_hours` (default 24)
- destination account IDs: `savings_account_id`, `investment_account_id` (nullable)

RLS: household members CRUD; auto-seed defaults on first read.

**New page** `src/pages/PaycheckDeploymentRules.tsx` at route `/coach/deployment-rules`:

- 4 slider rows (one per bucket), each with min/max/target controls
- Live total check: targets must sum to 100% (warning pill if not)
- "In Range / Under / Over" preview using last paycheck
- Destination account pickers (savings, investment)
- Toggle: "Nag me within 24h if money hasn't moved"
- Link from Money Coach card "Paycheck Deployment" → add secondary "Edit rules" button

**Nag logic** — extend the existing nightly Money Coach cron (`money-coach-nudges` edge function):
- For each household with `nag_enabled=true`, find latest paycheck transaction in last 7d.
- If no `paycheck_deployments` row with `status='applied'` exists ≥ `nag_hours` after pay_date → insert a `notifications` row: *"Your $X paycheck from {date} hasn't been deployed. [Review plan]"*.

## Technical notes

- DB: 1 new table (`paycheck_deployment_rules`) with GRANTs + RLS + auto-update trigger. No schema changes to existing tables.
- Code changes: `use-safe-to-spend.ts` (+ reserve calc), `StsEquationView` (+1 row), new `SmartAllocationCard`, new `PaycheckDeploymentRules` page + route, `MoneyCoach.tsx` (link), `money-coach-nudges` edge function (nag branch), new hook `use-deployment-rules.ts`.
- No new secrets, no new connectors. All within existing Money Coach + STS infrastructure.

## Out of scope

- Auto-creating transfers on a schedule (only fires when user clicks "Apply Plan").
- Per-paycheck overrides (rules are household-level for now).
- Multi-earner separate band sets (single household ruleset).
