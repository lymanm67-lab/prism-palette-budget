# Master Household Profile: one place for key numbers

## Goal
Enter each core number once, in one place: birthdays and ages, gross and net income, investments, budget expenses and debts. The Money Blueprint, the calculators and the budget tools then all read that same number.

## Current state (checked)
- The Money Blueprint keeps its own ages, salary and portfolio balance in its saved assumptions. The ages are wrong: 53 and 51.
- The calculators' "Financial profile" (income, debts, expenses, home value) is saved only in this browser, so other devices and screens can't see it.

## What gets built
1. **A saved Household Profile.** It stores Lyman's birthday (6/25/1967) and Kateri's (8/25/1970), each person's gross and net monthly pay, and the Oct 2026 net pay of $4,363.00. Ages are always worked out from the birthdays: 59 and 56 today.
2. **Live numbers pulled in automatically, never typed twice:**
   - Investments come from your investment accounts ($184,602.31 split into retirement vs self-directed).
   - Debts and minimum payments come from your debt list, including the BetrLink 63/37 schedule.
   - Monthly expenses come from the Budget total for the month.
3. **One Profile card** on Step 1 of the Money Blueprint. It shows every number, where each one comes from and when it was last updated. You can edit the ones you type yourself. If something is missing, it says so; nothing is guessed.
4. **Linked screens:**
   - Money Blueprint: ages, salary and portfolio balance come from the Profile. Assumptions keeps only planning choices like return rates, inflation and COLA.
   - Calculators' Financial profile: income, debts and expenses are prefilled from the Profile. You can still type over them for a one-off what-if.
   - 50% Plan: net pay default comes from the Profile.
5. **One-time move:** the correct ages and your current values carry over into the Profile, so nothing is lost.

## Not included (ask separately)
- Retirement, longevity and LTC pages that ask for age on their own form. They get a "use profile age" default in a later pass.
- Changing any of your budget line amounts.

## Technical details
- New `household_profile` table: one row per household, with household RLS, GRANTs and soft-delete. Columns: lyman_dob, kateri_dob, gross/net monthly per person, net_pay_effective_from, updated_at.
- `useHouseholdProfile()` hook. It combines the table row with the existing investment, debt and budget hooks and adds a realtime refresh.
- `defaultAssumptions()` merge in `use-blueprint-assumptions.ts`: currentAge, spouseCurrentAge, salaryAnnual and portfolioBalance come from the profile, and the fields are read-only in AssumptionCenter with a "from Profile" badge.
- `useFinancialProfile` falls back to profile values when the local value is blank.
- DEFAULT_NET_PAY in use-monthly-commitments reads the profile.
- About 7–9 files plus 1 migration. Estimated at roughly 4–7 credits in one pass.
