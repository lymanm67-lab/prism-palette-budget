# Home Purchase Success Planner

A month-by-month project management workbook that adapts to the user's target closing date, enforces personal rules, tracks tasks/documents/risks, and produces professional exports.

## Where it lives
New tab **"Planner"** added to `/home-buying-checklist`, alongside AI Coach, Scenarios, Calculators, Loan Types, State Assistance, Home Search, Checklist.

Entry point: `src/components/home-buying/planner/PlannerRoot.tsx`, with sub-routes handled by an internal sub-tab bar (Dashboard | Timeline | Monthly | Worksheets | Scenarios | Rules | Exports).

## Database (single migration)

New tables (all household-scoped, RLS + GRANTs, `deleted_at` soft-delete, `updated_at` trigger):

- `hp_projects` — one active project per household. Fields: target_close_date, start_date, target_price, max_monthly_payment, down_payment_target, loan_type_preference, status.
- `hp_milestones` — auto-seeded from target date. Fields: project_id, month_index, month_label, title, status (pending|in_progress|complete|delayed|blocked), completion_pct, dependencies (uuid[]), due_date.
- `hp_tasks` — weekly action items under milestones. Fields: milestone_id, week_index (1–4), title, priority, estimated_hours, due_date, status, notes, completed_at.
- `hp_documents` — doc tracker. Fields: project_id, doc_type (enum: driver_license, pay_stubs, tax_returns, bank_statements, investment_statements, retirement_statements, settlement_letters, student_loan_statements, employment_verification, insurance_quotes, preapproval_letter, closing_disclosure, other), status (missing|uploaded|verified), storage_path, expiration_date, notes. Reuses existing `credit-documents` bucket with `home-purchase/{household_id}/` prefix.
- `hp_risks` — Fields: project_id, title, probability (low|med|high), impact (low|med|high), mitigation, owner, status.
- `hp_rules` — personal non-negotiables. Fields: project_id, rule_type (max_payment|min_emergency_fund|no_new_debt|max_hoa|min_retirement_contribution|custom), value_numeric, value_text, is_active. Seeded with defaults on project creation.
- `hp_scenarios` — Fields: project_id, name, inputs (jsonb: price, down_pct, rate, term, close_month_offset), computed (jsonb: monthly_payment, total_interest, cash_flow_impact, net_worth_10y, retirement_impact, risk_score).
- `hp_coach_narratives` — cached AI outputs. Fields: project_id, section_key (e.g. `month_5_narrative`, `decision_points`, `rules_review`), month_index, content_md, financial_snapshot_hash, generated_at.
- `hp_notes` — Fields: project_id, month_index (nullable = general), category (journal|lender|realtor|property|question), title, body.
- `hp_worksheets` — flexible KV store for the 18 special worksheets. Fields: project_id, worksheet_type, data (jsonb).

RLS: `is_household_member(auth.uid(), household_id)` on all. `service_role` all; `authenticated` CRUD.

## Timeline generator (client-side)

`src/lib/home-buying/planner/timeline-generator.ts` — given `target_close_date` and today, returns 12-ish month blocks with default titles + weekly task templates. The 13-month sequence (Financial Assessment → Debt Reduction → Credit Optimization → Documentation → Savings → Settlement Completion → Credit Verification → Mortgage Planning → Lender Shopping → Preapproval → Home Search → Offer & Due Diligence → Closing) compresses/expands proportionally to fit the user's horizon (min 3 months, max 24 months). On project create, seed `hp_milestones` + `hp_tasks` from this.

## UI structure

```
PlannerRoot.tsx
├── PlannerOnboarding.tsx        (first-run: target date, price, max payment, rules)
├── ExecutiveDashboard.tsx        (Page 1: countdown, scores, thermometer, next action)
├── MasterTimeline.tsx            (Gantt: recharts custom bars, status colors, dependencies)
├── MonthlyView.tsx               (month selector + all 10 sections A–J)
│   ├── SectionNarrative.tsx      (AI-cached)
│   ├── SectionGoals.tsx
│   ├── SectionWeeklyPlan.tsx     (Week 1–4 checklists)
│   ├── SectionFinancialDash.tsx  (line/bar/gauge from real Prism data)
│   ├── SectionMortgageReadiness.tsx
│   ├── SectionDocuments.tsx      (upload → credit-documents bucket)
│   ├── SectionRisks.tsx
│   ├── SectionDecisionPoints.tsx (AI reco)
│   ├── SectionMilestoneReview.tsx
│   └── SectionNotes.tsx
├── Worksheets/                   (18 worksheets, each a card w/ form + save)
│   ├── MortgageApprovalChecklist.tsx
│   ├── MortgageUnderwritingChecklist.tsx
│   ├── CreditImprovementTracker.tsx
│   ├── DebtSettlementTracker.tsx
│   ├── SavingsTracker.tsx
│   ├── DownPaymentTracker.tsx
│   ├── ClosingCostTracker.tsx
│   ├── MovingBudget.tsx
│   ├── UtilityTransferChecklist.tsx
│   ├── HomeInspectionWorksheet.tsx
│   ├── PropertyComparisonWorksheet.tsx
│   ├── OfferEvaluationWorksheet.tsx
│   ├── LoanEstimateComparison.tsx
│   ├── ClosingDisclosureReview.tsx
│   ├── FirstYearHomeownerBudget.tsx
│   ├── MaintenancePlanner.tsx
│   ├── WarrantyTracker.tsx
│   └── EmergencyFundPlanner.tsx
├── ScenarioPlanner.tsx           (extends existing HomeBuyingScenarios; adds retirement/net-worth impact)
├── PersonalRulesEngine.tsx       (CRUD rules; live violation banner throughout planner)
├── ProjectViews/
│   ├── KanbanView.tsx            (tasks by status)
│   ├── CalendarView.tsx          (tasks by due_date; react-day-picker)
│   └── CriticalPathView.tsx      (blocked/overdue/upcoming)
├── FinalDashboard.tsx            (last-mile summary)
└── ExportCenter.tsx              (6 export formats)
```

Reuses existing hooks: `useHomeBuyingMetrics`, `useSafeToSpend`, `useAccounts`, `useCreditAccounts`, `useFinancialGoals`, `useDebtItems`.

## AI Coach (auto-generate + cache)

Edge function `home-purchase-coach` (new):
- Inputs: `project_id`, `section_key`, `month_index`.
- Fetches project state, milestones, financial snapshot (income, obligations, DTI, savings, credit proxy, active rules).
- Computes `financial_snapshot_hash`; if cached row in `hp_coach_narratives` matches, returns cached.
- Else calls `google/gemini-2.5-flash` via Lovable AI Gateway with a section-specific system prompt (narrative / decision-points / rules-review / risk-commentary).
- Writes cache row.

Auto-trigger points (client-side `useEffect`):
- Month change on `MonthlyView`.
- Rules edit → invalidate `rules_review` cache.
- Material metric change (>5% delta in savings, income, DTI) → invalidate current-month narrative.

## Personal Rules Engine

- Rules stored per project, seeded with sensible defaults (max_payment=25% gross, min EF=6mo, no new debt, max HOA=$300).
- `useRuleViolations(project)` hook returns live array of violations across pages: dashboard banner, decision-point AI prompts include rule context, offer-evaluation worksheet flags red on breach.

## Exports (all 6 formats)

`src/lib/home-buying/planner/exports/`:
- `exportPlannerPdf.ts` — html2canvas + jsPDF, multi-page: exec dashboard, timeline, each month page, worksheets. Reuses existing `exportToPdf` pattern.
- `exportPlannerDocx.ts` — `docx` npm lib, structured document with headings, tables, checklists.
- `exportChecklistXlsx.ts` — `xlsx` npm lib (already indirectly used), tabs: Timeline, Tasks, Docs, Risks, Rules, Scenarios.
- `exportProjectPlan.ts` — MS Project–compatible XML (`.xml` MSProject 2003 schema) OR CSV fallback; tasks, dependencies, durations.
- `exportMonthlyReport.ts` — one-page PDF: current-month status, completed vs pending, financial snapshot, AI narrative.
- `exportLenderPacket.ts` — curated PDF: profile summary, income, debts, credit snapshot, doc index with links, preapproval letter placeholder.

Adds npm deps: `docx`, `xlsx` (if not already present).

## Executive Dashboard (Page 1) details
Real data pulled live:
- Countdown from `target_close_date`.
- Overall Readiness = weighted avg (checklist 20%, credit 20%, DTI 20%, savings 20%, docs 20%).
- Mortgage Approval Score = existing `mortgage-underwriter` edge function response, cached.
- Max Affordable Price = derived from max_monthly_payment rule + current rates.
- Cash Available / EF / DTI = existing hooks.
- Next Required Action = first pending task by due_date.

## Master Timeline (Gantt)
Custom recharts-free implementation: horizontal bars per milestone, colored by status, connected dependency arrows (SVG), current-week vertical line. Click bar → jump to that month.

## Scope estimate
- 1 migration (10 tables)
- 1 edge function (`home-purchase-coach`)
- 6 export utilities
- ~55 new component files
- 1 new bucket prefix reused (`credit-documents`)
- Hook additions: `use-hp-project`, `use-hp-milestones`, `use-hp-tasks`, `use-hp-documents`, `use-hp-risks`, `use-hp-rules`, `use-hp-scenarios`, `use-rule-violations`, `use-hp-coach`.

## Build order (single pass, one delivery)
1. Migration + types regen
2. Timeline generator + hooks
3. PlannerRoot + Onboarding + ExecutiveDashboard
4. MasterTimeline + MonthlyView (all 10 sections)
5. 18 Worksheets
6. Rules Engine + Scenario Planner extensions
7. Kanban/Calendar/Critical Path views
8. Coach edge function + cache wiring
9. 6 Exports
10. FinalDashboard, tab wiring into `HomeBuyingChecklist.tsx`

## Non-goals
- No real-time collaboration (household RLS only, no presence).
- No live rate feeds — user enters current rate; existing scenario math applies.
- Preapproval letter is a placeholder in the lender packet; no lender API integration.
- No mobile-specific redesign beyond responsive Tailwind.

## Credit warning
This is the largest single feature in the app to date. Expect substantial credit spend and multiple follow-up iterations for polish. Confirming "full build in one go" acknowledges this.
