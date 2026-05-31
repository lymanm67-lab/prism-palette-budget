
# Home-Buying Readiness — Full Redesign

Turn the current 8-card checklist into a tabbed workspace where users can run scenarios, get AI coaching, estimate every cost, compare loan types, look up state programs, and search listings — with the existing checklist preserved as one tab.

## New page structure (`/home-buying`)

Top-of-page **Readiness Hero** (always visible): one big composite score derived from
- Checklist completion (existing)
- Credit score (pulled from `credit_health` if present)
- DTI (income vs debt from finance hooks)
- Down-payment progress (a new goal)
- Emergency fund coverage

Below the hero: **7 tabs**.

### 1. AI Coach (`AiHomeBuyingCoach`)
Guided conversational questionnaire powered by Lovable AI (Gemini, no API key from user). Asks ~10 adaptive questions (target city/state, household income, monthly debts, current savings, target purchase price, timeline, first-time buyer y/n, credit range, employment type, family plans). Streams back a personalized readiness report with:
- Strengths / gaps
- Recommended next 3 actions
- Suggested loan type
- Suggested DPA programs (links to State tab)
Stored in a new `home_buying_coach_sessions` table so users can revisit.

### 2. Scenarios (`HomeBuyingScenarios`)
Side-by-side comparator — up to 3 scenarios at once. Each scenario card has:
- Purchase price, down %, rate, term, property tax %, insurance %, HOA, PMI
- Auto-populates property tax + insurance from `STATE_DATA` (already in repo)
- Outputs: monthly PITI, total interest, break-even vs renting, 5/10/30-yr equity curve (Recharts)
Save scenarios to `home_buying_scenarios` table.

### 3. Calculators (`HomeBuyingCalculators`) — 4 stacked tools
- **Down Payment Planner** — target price × down %, current savings, monthly contribution → months to goal, with a "Saving Techniques" accordion (automatic transfers, side income, windfalls, employer programs, IRA first-home withdrawal rules)
- **Closing Cost Estimator** — itemized: lender fees, title, escrow, taxes, prepaid insurance, recording. State-aware via `STATE_DATA`
- **Hidden Cost & Repair Budget** — annual maintenance (1–3% of price), utilities, HOA, lawn, pest, roof/HVAC/water-heater reserve sliders
- **Credit & Debt Impact** — pulls user's credit score and debts, shows estimated rate by FICO band, total interest savings per +20 pt score; "Pay off X first → save $Y" suggestions

### 4. Loan Types (`LoanTypeComparator`)
Card grid comparing Conventional, FHA, VA, USDA, Jumbo, Owner-Financed, Land Contract, Rent-to-Own. Each card: min down, min credit, pros, cons, best-for, mortgage-insurance rules, balloon/risk warnings. Plus a 4-column comparison table and a "Best fit for me" highlight based on AI Coach answers.

### 5. State Assistance (`StateAssistancePicker`)
Dropdown of all 50 states + DC (reuse `STATE_DATA` keys). Static curated dataset (`src/lib/home-buying/state-dpa-programs.ts`) of first-time-buyer / DPA programs per state — name, agency, max assistance, income limits, link. ~3–6 programs per state, sourced from official state housing-finance-agency sites. Includes federal programs (FHA, VA, USDA, HomeReady, Home Possible, Good Neighbor Next Door).

### 6. Home Search (`HomeSearchPanel`)
Filters: city/ZIP, price range, beds, baths, garage, basement, sqft, style (ranch/colonial/etc.), lot size. Results show address, price, beds/baths/sqft, link to listing.

**Data source: not Zillow.** Zillow blocks scraping and forbids it in ToS. Instead:
- **Firecrawl connector** (already documented in this project) to scrape **Redfin / Realtor.com public listing pages** on demand.
- Edge function `home-listings-search` accepts filters, builds a Redfin search URL, calls Firecrawl `scrape` with `formats: [{ type: 'json', schema }]` for structured extraction, returns normalized listings.
- Falls back gracefully with an empty state + "Connect Firecrawl" CTA if the connector isn't linked.

### 7. Readiness Checklist (existing 8 questions, unchanged)
Move current page contents into `HomeBuyingChecklistTab.tsx` — zero behavior change.

## New files

```
src/pages/HomeBuyingChecklist.tsx                    (gutted → becomes Tabs shell)
src/components/home-buying/
  ReadinessHero.tsx
  AiHomeBuyingCoach.tsx
  HomeBuyingScenarios.tsx
  ScenarioCard.tsx
  HomeBuyingCalculators.tsx
  DownPaymentPlanner.tsx
  ClosingCostEstimator.tsx
  HiddenCostBudget.tsx
  CreditDebtImpact.tsx
  LoanTypeComparator.tsx
  StateAssistancePicker.tsx
  HomeSearchPanel.tsx
  HomeBuyingChecklistTab.tsx          (existing checklist)
src/lib/home-buying/
  mortgage-math.ts                    (PITI, amortization, break-even)
  state-dpa-programs.ts               (curated DPA data)
  loan-types.ts                       (loan type metadata)
supabase/functions/home-buying-coach/index.ts
supabase/functions/home-listings-search/index.ts
```

## Database (one migration)

```sql
-- AI coach sessions
CREATE TABLE public.home_buying_coach_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  user_id uuid NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  report jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_buying_coach_sessions TO authenticated;
GRANT ALL ON public.home_buying_coach_sessions TO service_role;
ALTER TABLE public.home_buying_coach_sessions ENABLE ROW LEVEL SECURITY;
-- household-scoped policies (same pattern as homebuyer_checklist)

-- Saved scenarios
CREATE TABLE public.home_buying_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  inputs jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_buying_scenarios TO authenticated;
GRANT ALL ON public.home_buying_scenarios TO service_role;
ALTER TABLE public.home_buying_scenarios ENABLE ROW LEVEL SECURITY;
```

## External services

- **Lovable AI** (Gemini `google/gemini-3-flash-preview`) — coach questionnaire + report. No user key needed.
- **Firecrawl connector** — for listing search. I'll add a "Connect Firecrawl" CTA inside the Home Search tab; if absent, the tab still renders with a helpful empty state. No upfront secret request.
- **No Zillow.** Their ToS forbids it and they block scrapers.

## Design notes

- Reuse existing tokens: `prism-teal`, `prism-amber`, `prism-card-shine`, glassmorphism.
- Tabs use existing `@/components/ui/tabs` shadcn component.
- Charts via Recharts (already in project).
- Mobile: tabs become a horizontally scrollable strip; calculators stack.
- Trademark: keep PrismMoney™ usage where present.

## What I am NOT doing in this build (out of scope unless you say otherwise)
- No real-time MLS feed (requires paid IDX license).
- No mortgage pre-approval submission (regulated activity).
- No automatic Zillow scrape.
- No new connector setup wizard outside the Home Search tab.

## Implementation order
1. Migration + DB grants
2. `mortgage-math.ts`, `loan-types.ts`, `state-dpa-programs.ts`
3. Tabs shell + `ReadinessHero` + move existing checklist into tab
4. Calculators (4 components)
5. Scenarios + Loan Types + State Assistance
6. AI Coach + edge function
7. Home Search + edge function (last, depends on Firecrawl)

Approve and I'll switch to build mode and ship in this order.
