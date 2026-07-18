
# Home Buying Decision System — Build Plan

**Scope: Large.** ~15 new files + wiring into existing `HomeBuyingChecklist.tsx` and `HomeSearchPanel.tsx`. All localStorage-based (no DB churn) to match the existing home-search pattern.

## Architecture

```
src/lib/home-buying/decision/
  preferences.ts        # tier types, defaults (preloaded list), CRUD, LS
  walkthrough-defs.ts   # all checklist sections (basement, roof, foundation,
                        # plumbing, electrical, HVAC, windows, attic,
                        # neighborhood, insurance, disclosure) + risk levels
  walkthrough-store.ts  # per-property state, photos (base64), notes, LS
  repair-store.ts       # per-property repair estimates + totals
  decision-engine.ts    # scoring rules, recommendation status, deal-breaker
                        # logic, all-in payment (reuses mortgage-math.ts)
  export-pdf.ts         # print/PDF helpers (reuse export-utils)

src/components/home-buying/decision/
  DecisionRoot.tsx           # tab shell (Must-Haves / Walk-Through /
                             # Scorecard / Comparison) + property picker
  MustHavesTab.tsx           # tier lists, drag/drop, move-tier, add custom
  PreferenceRow.tsx          # checkbox, edit, delete, move, note
  AddCustomForm.tsx          # validation, duplicate warning
  WalkThroughTab.tsx         # section accordion, property selector,
                             # "Needs Verification" panel
  WalkThroughItem.tsx        # status, risk, note, photo upload, repair $,
                             # seller response, inspector flag, questions
  ScenarioAlerts.tsx         # 6 scenario warnings (fresh basement, air
                             # freshener, hidden walls, flip, low price /
                             # high tax, seller silent)
  DecisionScorecard.tsx      # per-property score, recommendation, all-in
                             # PITI, repair exposure, reserve after close
  DecisionComparison.tsx     # cross-property table + mobile swipe cards
  InspectorQuestions.tsx     # printable list
  SellerQuestions.tsx        # printable list
```

## Tabs

**1. Must-Haves** — Three tier columns (red/yellow/green). Preloaded items across 7 categories (Home Style, Beds/Baths, Parking, Interior, Exterior, Condition, Location). Drag-drop between tiers via `@dnd-kit` (already in project). Add-custom form with duplicate + blank guards. Reset / Clear buttons with confirm dialog.

**2. Property Walk-Through** — Property picker (pulls from existing favorites in `HomeSearchPanel`). Sections rendered as accordions. Each item has: Good / Minor / Major / Unknown / N/A / Needs Pro Inspection status, risk level auto-assigned from `walkthrough-defs`, note, photo (base64 in LS with size cap warning), estimated repair (low/expected/high), seller response, verification source, date. "Needs Verification" panel aggregates all Unknown items. Auto-elevated risks (horizontal cracks, bowing walls, FPE panel, active knob-and-tube, etc.) enforced in defs. Scenario warning cards render conditionally.

**3. Scorecard** — Reuses `mortgage-math.ts` for all-in PITI (P&I + tax + ins + PMI/MIP + HOA + flood). Applies scoring:
- Must-Have present +10 / missing −25 / unknown 0 + flag
- Like-to-Have +5, Wish +2
- Critical −40, High −20, Moderate −5
- Pro inspection done +5, seller repair verified +5
- In budget +10, over −20, reserve breach −25

Recommendation status derived per rules (Strong Match blocked when any critical unresolved, must-have missing, unverified flooding/foundation/insurance/FHA, reserve breach, or payment over max).

**4. Comparison** — Column-per-property table (all fields from spec). Status icons (✓ ✗ ? 🔍 ⚠ 🛑). Mobile: swipeable cards via existing carousel pattern.

## Data (all localStorage — no DB migration)

- `homeBuyingPreferences` — tiers + items
- `propertyWalkthrough_<id>` — per-property checklist
- `propertyRepairEstimate_<id>` — repair line items
- `propertyNeighborhoodReview_<id>` — neighborhood observations
- `propertyDecision_<id>` — final recommendation + timestamp
- `propertyPreferenceScore_<id>` — cached score (recomputed on any change via a shared hook)

Property IDs come from the favorites list already stored by `HomeSearchPanel`; users can also add manual "off-market" properties for evaluation.

## Wiring

- New "Decision" tab added to `HomeBuyingChecklist.tsx` tabs array (7th tab).
- Existing `PropertyScorecard.tsx` (Home Search) gets a small badge showing decision status if a walk-through exists — no logic change to that file beyond a read-only lookup.
- Existing `PropertyComparison.tsx` untouched; new `DecisionComparison.tsx` is a richer separate view.
- Print/PDF uses existing `exportToPdf` from `src/lib/export-utils.ts`.

## Accessibility & Mobile

- All status uses icon + text label (not color alone).
- Accordions collapse on mobile; sticky sub-tab nav; large tap targets; photo upload via `<input capture>`.

## Acceptance criteria mapping

All 15 criteria covered by the components above. Nothing in existing Home Search, Planner, or Calculators is modified beyond the new tab entry.

## Out of scope (call out now)

- No new Supabase tables — everything client-side per project convention for search/preferences. If you want cross-device sync, that's a follow-up migration.
- Photos stored as base64 in localStorage with a 2MB/property soft cap; if you want a real photo bucket, that's a follow-up.
- Crime data feed not included — the neighborhood section captures observations only; live crime API would be a separate integration.

Confirm and I'll build it in one pass, or tell me to drop/defer any section.
