# Northeast Ohio Medical Housing Market Planner

A new module under the Legacy Real Estate & Community Impact section at `/legacy/real-estate/medical-housing`. It turns the spec into a working market-research and acquisition-planning workbench for Akron (pilot) and Cleveland (phase two).

Note: the parent Legacy Real Estate section does not exist yet, so this build also creates the section shell and its sidebar entry, with the Medical Housing Market Planner as its first fully built module.

## Tab 1 — Market Dashboard

- Primary recommendation banner (Akron pilot near Summa Health / Akron Children's, 2–3BR, off-street parking, laundry, startup under ~$80k) and the secondary Cleveland Heights phase-two recommendation.
- Market priority panel: Akron as primary launch market with its listed advantages; Cleveland / Cleveland Heights as secondary expansion with its advantages and its cautions (price, taxes, competition, furnishing standards, complexity).
- Summary cards: Best Current Market, Target Purchase Price, Startup Capital Needed, Target Monthly Rent, Est. Annual Gross Income, Est. Annual Net Cash Flow, Available Reserves, Funding Gap, Properties Under Review, Referral Partners Contacted, Hospital Systems Served, Allocated to Tiny Home Village. Values roll up from the other tabs.

## Tab 2 — Market Comparison

Editable market cards, seeded with the six areas exactly as specified: Highland Square / 44302, Downtown Akron & Hospital Corridor, West Akron, Cuyahoga Falls, Cleveland Heights, University Circle. Each card holds classification notes, purchase-price low/high targets, and furnished rent low / expected / strong estimates where given. University Circle carries the default "not a first pilot market" recommendation. All fields user-editable; new markets can be added.

## Tab 3 — Hospital & Employer Directory

Editable directory with all specified fields (name, address, city, employees, residency, fellowship, med-school affiliation, travel-nurse demand, contract demand, estimated housing demand, contact person, referral status, notes). Seeded with the ten listed categories/systems. Referral status drives the "Referral Partners Contacted" and "Hospital Systems Served" cards.

## Tab 4 — Property Targets & Scoring

- Preferred First Property profile with all listed default criteria, editable.
- Property scorecard: the 15 listed categories scored 1–5, auto-computing total score, financial score, market-demand score, risk score, and a recommended decision (Strong Candidate / Review Further / Negotiate Price / High Risk / Reject).
- Multiple candidate properties can be saved and compared side by side.

## Tab 5 — Startup Capital Calculator

All 22 listed inputs, auto-computing down payment, total closing expenses, total preparation cost, total furnishing cost, total reserve requirement, and total startup investment. Three seeded scenarios — Akron Entry ($150k), Highland Square ($184k), Cleveland Heights ($235k) — with the stated ranges shown as a planning band, all assumptions editable.

## Tab 6 — Income Projections

- Full income calculator with every listed income and expense line, auto-computing monthly/annual gross, monthly/annual operating expenses, net monthly/annual cash flow, cash-on-cash return, break-even occupancy, and DSCR.
- Akron whole-property scenarios (Conservative $1,800 / Expected $2,100 / Strong $2,300) with the $0–$6,000 net annual range and the equity/depreciation/validation note.
- Room-by-room 3BR model ($850 / $950 / $1,050 per room) with the $4,000–$10,000 net range and the operational-burden warning list.
- Cleveland Heights scenarios ($2,000 / $2,400 / $2,700) with the higher-cost caution.

## Tab 7 — Hybrid Duplex Strategy

Two-unit tracker (furnished medical unit + long-term unit): per-unit rent, lease type, occupancy, expenses, net cash flow, tenant type, lease expiration, maintenance cost, plus combined property totals and the listed benefits.

## Tab 8 — Deal Guardrails

Automatic warning engine evaluating all 14 listed conditions against the current property, market, startup, and income inputs. Each warning shows severity and the specific number that triggered it.

## Tab 9 — Pilot Goal & Milestones

"Launch First Montgomery Medical Housing Property" goal with its description, all seven default financial targets, and the 22-task checklist with completion tracking and progress bar.

## Tab 10 — Growth Forecast & Village Link

- Portfolio forecast across 1 / 2 / 3 / 5 / 10 properties over 3 / 5 / 10 / 15 years, projecting gross revenue, net cash flow, equity, debt, reserves, and portfolio value from editable averages.
- Tiny Home Village funding link: choose 5 / 10 / 15 / 20 percent or a custom allocation of annual profit; track annual profit, amount allocated, village fund balance, funding goal, remaining gap, and projected goal date. Includes the closing statement about the village serving young adults aging out of foster care.

## Technical notes

- New household-scoped tables with RLS, GRANTs, `deleted_at` soft delete, and `updated_at` triggers: `mh_markets`, `mh_employers`, `mh_properties`, `mh_property_scores`, `mh_startup_scenarios`, `mh_income_scenarios`, `mh_duplex_units`, `mh_milestones`, `mh_forecast_settings`, `mh_village_allocation`. Seed rows are inserted per household on first visit, not hardcoded in migrations.
- Page `src/pages/legacy/MedicalHousingPlanner.tsx`, lazy route, tabs in `src/components/medical-housing/`.
- Pure calculation engine `src/lib/legacy/medicalHousing.ts`: startup totals, income/expense rollups, cash-on-cash, break-even occupancy, DSCR, scorecard weighting, guardrail evaluation, portfolio forecast, village funding projection.
- Data hook `src/hooks/use-medical-housing.ts` following existing patterns (react-query + `useRealtimeRefresh`).
- Sidebar entry under Legacy, command palette entry, `PageOverview` header, existing design tokens only.
- All figures are planning defaults the user can edit; the module presents estimates for education/planning, not investment advice.

## Build order

Given the size, this ships in two passes: schema + Tabs 1–6 first (market, employers, property scoring, startup, income), then Tabs 7–10 (hybrid duplex, guardrails, milestones, forecast + village link). Approve and I'll start with pass one.
