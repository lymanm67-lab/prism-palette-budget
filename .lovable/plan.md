# Legacy Real Estate & Community Impact Goal

A new module at `/legacy/real-estate` covering two long-term property ventures: **Medical Professional Housing** (furnished rentals for traveling nurses/residents) and the **Tiny Home Village** (affordable/community housing). Because the full spec is 12 tabs plus ~8 tables, it is built in three phases so each phase is usable on its own.

## Phase 1 — Foundation (build first)

1. **Overview dashboard** — vision statement, target launch window, combined capital needed vs. capital secured, progress ring, and an at-a-glance status for each of the two ventures.
2. **Property pipeline** — add candidate properties (address, city, purchase price, rehab estimate, units, target rent, status: watching / offer / under contract / owned). Each row shows a quick yield estimate.
3. **Funding tracker** — sources of capital (cash, HELOC, SBA, partner equity, grants, seller financing), amount targeted vs. committed, and gap to close.
4. **Feasibility calculator** — per property: cash-in, monthly rent, expenses, vacancy, cap rate, cash-on-cash, DSCR, and break-even occupancy. Warns when DSCR is below 1.25.

## Phase 2 — Execution tools

5. **Partner & stakeholder tracker** — hospitals, nurse staffing agencies, city/zoning contacts, nonprofits, lenders; role, status, last contact, next step.
6. **Milestone timeline** — phased roadmap (research → site control → financing → permits → build/rehab → lease-up), each with target date, owner, and completion.
7. **Tiny Home Village planner** — lot count, cost per unit, infrastructure line items, zoning/permit checklist, phased build schedule.
8. **Medical housing planner** — furnishing budget per unit, 13-week contract pricing model, occupancy assumptions, comparison against standard long-term rent.

## Phase 3 — Impact, integration, and reporting

9. **Community impact scoreboard** — people housed, affordable units created, workforce housing nights supplied, local jobs, projected annual community value.
10. **Legacy integration** — venture equity flows into Legacy Worth and the Wealth OS dashboard; ventures appear as a distinct asset class alongside the existing household roster.
11. **AI venture coach** — reviews pipeline, funding gap, and feasibility numbers, then returns prioritized next actions and risk flags (educational only).
12. **Printable binder** — one export covering vision, pipeline, feasibility, funding, milestones, and impact, in the same print style as the existing Executive Dashboard binder.

## Technical notes

- New tables (all household-scoped, RLS + GRANTs, soft-delete via `deleted_at`, `created_at`/`updated_at` with update trigger):
  `legacy_re_ventures`, `legacy_re_properties`, `legacy_re_funding_sources`, `legacy_re_partners`, `legacy_re_milestones`, `legacy_re_unit_plans`, `legacy_re_impact_metrics`, `legacy_re_scenarios`.
- Page: `src/pages/LegacyRealEstate.tsx`, lazy-routed at `/legacy/real-estate`; tab components under `src/components/legacy-real-estate/`.
- Calculation engine: `src/lib/legacy/realEstateFeasibility.ts` (cap rate, cash-on-cash, DSCR, break-even occupancy, phased build cash flow) — pure functions, unit-testable.
- Sidebar entry under **Legacy**; command palette entry; existing design tokens and glassmorphism, no hardcoded colors.
- AI coach as a new edge function `legacy-re-coach` using the AI gateway, grounded strictly in the stored venture rows.
- Legacy Worth integration reuses the existing manual-asset pattern so no double counting.

## Suggested order

Approve this and I will start with **Phase 1** (schema + overview, pipeline, funding, feasibility). Phases 2 and 3 follow as separate builds so credits stay predictable.
