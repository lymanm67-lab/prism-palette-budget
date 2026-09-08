# Freed Cash Engine: Savings Reality upgrade

Goal: make it impossible to confuse savings already realized, savings happening every month now, and savings that are only projected or still coming.

Nothing is rebuilt. The current page, tabs, sources, verification, redirects and reports all stay; this adds a clear headline layer and fills the gaps.

## Already in place (reused, not rewritten)

- Date-based realized savings per source, month-by-month history, run rate, created-this-month, YTD and lifetime realized.
- Conversion rate (money actually moved) vs capture rate (money assigned), execution gap, unallocated.
- Leakage tracking, forward look with known expirations, cohorts, top wins, vendor history, monthly review.
- Frozen month snapshots so past months never rewrite themselves.

## What gets added

### 1. "Your Freed Cash Snapshot" headline
A single strip at the very top with seven numbers: Realized savings YTD, Current monthly run rate, Forward annualized savings, Future pipeline, Projected future run rate, Actually redirected, Needs a job. Each with a plain-language explanation on hover.

### 2. Savings Reality section
Replaces the two existing stat rows with three clearly separated bands:
- Already happened: created this month, realized this month, realized YTD, realized lifetime.
- Happening now: current monthly run rate, forward annualized savings (labelled "Projected full-year savings at current run rate", with the helper text that it is not money already saved).
- Still coming: pipeline monthly, projected future run rate (run rate + pipeline), projected future annualized.

### 3. Pipeline savings
New calculation for sources whose effective date is in the future (BetrLink, Affirm, next policy cycle) — kept out of realized savings and out of the run rate until their date arrives.

### 4. Future run rate timeline
Date-ordered list of upcoming events: date, source, amount freed, resulting new monthly run rate and new annualized run rate. Existing forward-look expirations are folded in so the timeline shows both additions and losses.

### 5. Realized savings by month
Extends the existing year report table with the requested columns — New savings created, Realized, Run rate, Pipeline, Redirected, Unallocated — plus a year selector (each year with activity, and All years).

### 6. Realized savings chart
Line chart under the table: realized savings, monthly run rate, redirected — with an optional Pipeline series toggle.

### 7. Savings Story card
Auto-written paragraph for the selected year explaining why realized savings is lower than the forward rate, using live numbers.

### 8. Source-level realized table
One row per source: monthly savings, effective date, realized YTD, lifetime realized, annualized value, pipeline yes/no, redirected yes/no. Future-dated sources show $0 realized.

### 9. Confidence view filter
Top-of-page selector: All / Verified only / Reconciled only / Estimated. Only Verified and Reconciled count toward confirmed realized savings; Estimated is shown separately rather than mixed in.

### 10. Billing-cycle accuracy
Optional original billing day and next avoided payment date per source. When present, a partial first month counts only if the avoided charge actually fell in that month; when absent the month is labelled "estimated" instead of silently assuming a full month.

### 11. Double-count guard
Validation that flags two reductions against the same original expense (BetrLink $888 → $583, then $583 → $0) so the total can never exceed the original payment eliminated. Overlaps appear as a warning with the corrected figure.

### 12. What if I never cut these costs?
Comparison card: original vs current recurring spending trajectory, realized savings this year, next-year projected full-year savings, and 5 / 10 year avoided spending.

### 13. Wealth potential from freed cash
Calculator: monthly amount redirected, start date, years, expected return, annual increase, and optional toggles for future debt payoffs, pay raises and tax-refund redirects. Outputs contributions, growth, ending balance — labelled as a projection, not a promise.

### 14. Language cleanup
"Annual savings" on its own is removed everywhere on the page in favour of Realized YTD, Realized lifetime, Forward annualized, Projected future annualized.

### 15. Leakage refinement
Unallocated money is only called leakage after the month has closed with no destination assigned; guilt-free spending is subtracted first.

## Technical notes

- New calculation modules under `src/lib/freed-cash/` for pipeline, confidence filtering, billing-cycle realization, overlap detection and the investment projection; existing modules are extended rather than replaced.
- New components under `src/components/freed-cash/` for the snapshot headline, Savings Reality bands, future run-rate timeline, monthly table + chart, savings story, source realized table and the wealth calculator.
- Two optional columns added to the freed cash sources table for billing day and next avoided payment date; snapshots gain the verified / estimated / reconciled splits. No existing data is changed or deleted.
- Redirect destinations extended to cover the full requested list (Buffer, Emergency Savings, Debt Reduction, Retirement, HSA, Investments, Sinking Fund, Travel Fund, Business Reserve, Guilt-Free Spending, Other) with planned amount, actual amount and date completed.
- Everything continues to respect the Personal / Business / Everything scope filter.
