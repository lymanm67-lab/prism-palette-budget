Scope: Large data-visibility fix because this touches backend access rules plus the app’s household-selection logic.

Findings:
- Your imported data is not deleted. The database still has 27 accounts, 1,027 transactions, 388 budgets, and 3 recurring transactions.
- The real household with the data is `22b0f75a-82f2-4b56-85b9-1db72b95da1b`.
- The app is currently failing to read household memberships because the backend denies access to the `is_household_member` helper function.
- Because that membership lookup fails, `HouseholdContext` treats it like “no household exists” and repeatedly creates new empty households, making the app look blank.

Plan:
1. Fix backend access rules
   - Grant authenticated app users permission to run the household helper functions used by RLS.
   - Keep household access scoped to actual household membership.

2. Stop accidental empty household creation
   - Update `src/contexts/HouseholdContext.tsx` so it does not create a new household when the membership query errors.
   - Order memberships so the original data-bearing household is chosen first.
   - Add a fallback guard so empty households are not created repeatedly during transient permission/read failures.

3. Restore the visible household
   - Point the user’s active membership selection back to the household containing the imported data.
   - Remove only the auto-created empty households that have no accounts, transactions, budgets, recurring transactions, or categories.
   - Do not touch the real household or imported financial records.

4. Verify recovery
   - Re-check counts for accounts, transactions, budgets, recurring transactions, and bill-pay-related tables after the fix.
   - Confirm the app can read household membership without the permission error.

Technical notes:
- The key error is: `permission denied for function is_household_member`.
- The bad behavior is in `HouseholdContext.tsx`: it ignores the membership query error and enters the create-household branch.
- This should be handled as a recovery/fix first; the Investment Planning module should stay paused until your existing data is visible again.