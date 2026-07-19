# Credit Repair Upgrades — Build Plan (Items 1, 2, 3, 5)

Scope: Large. 4 features, ~14 files, 1 schema migration, 1 new edge function.

---

## 1. Escalation Cadence Engine

Auto-schedule dispute rounds and escalation channels based on submission date and bureau response.

**Schema (migration):**
- Add columns to `credit_disputes`: `round` (int, default 1), `escalation_channel` (text: 'bureau'|'creditor'|'cfpb'|'state_ag'|'arbitration'), `next_action_date` (date), `next_action_type` (text), `parent_dispute_id` (uuid, self-ref)
- New table `dispute_escalation_log` (dispute_id, round, action, sent_date, notes) with GRANTs + RLS by household

**Files:**
- `src/lib/credit-repair/escalation-engine.ts` — computes next action: Round 1 (day 0), Round 2 MOV letter (day 35 if unresolved), Round 3 CFPB/AG complaint (day 65), Arbitration prep (day 95)
- `src/components/capital/EscalationCadence.tsx` — timeline card per dispute showing rounds + "Advance to Round N" buttons
- Wire into `src/pages/capital/DisputeManager.tsx`

## 2. Goodwill + Pay-for-Delete Letter Library

**Files:**
- `src/lib/credit-repair/letter-templates.ts` — 18 templates in 4 categories:
  - Creditor-direct: Goodwill (late payment), Goodwill (charge-off), PFD offer 25/50/100%, Debt validation (FDCPA §809), Cease-and-desist
  - Bureau: MOV (Method of Verification), Reinvestigation demand, 15-day follow-up, Estoppel by silence
  - Escalation: CFPB complaint template, State AG template, BBB complaint, Arbitration notice
  - Specialty: Medical debt (HIPAA), Identity theft (FCRA §605B), Duplicate account, Re-aging violation
- `src/components/capital/LetterLibrary.tsx` — searchable/filterable browser with variable substitution (name, address, account #, amount, date)
- `src/components/capital/LetterGenerator.tsx` — form → merged text + copy/print/PDF export
- Add "Letters" tab to `DisputeManager.tsx`

## 3. Inquiry Dispute Workflow

**Schema:**
- New table `credit_inquiries` (id, household_id, bureau, inquiry_date, creditor_name, inquiry_type ['hard'|'soft'], is_authorized bool, dispute_status, notes) + GRANTs + RLS

**Files:**
- `src/hooks/use-credit-inquiries.ts` — CRUD hook
- `src/components/capital/InquiryDisputes.tsx` — list all hard inquiries, "Dispute unauthorized" button that auto-generates FCRA §604 letter, tracks 30-day removal window
- Add to `CreditHealthIssues.tsx` as new section
- Auto-extract inquiries from parsed credit reports in `parse-credit-report/index.ts`

## 5. Bureau Response Letter Ingestion (OCR)

**Files:**
- `supabase/functions/parse-dispute-response/index.ts` — new edge function using Lovable AI Gateway (Gemini vision) to OCR uploaded response letters, detect outcomes: verified/deleted/updated/frivolous/no-response, extract stall tactics ("results of investigation", "you have already disputed")
- `src/components/capital/ResponseUpload.tsx` — drag-drop uploader tied to a specific dispute; stores in existing `credit-documents` bucket; auto-updates dispute status and triggers next escalation round via engine from #1
- Wire into each dispute card in `DisputeManager.tsx` and `EscalationCadence.tsx`

---

## Integration Points
- Escalation engine reads response outcomes from #5 to advance rounds
- Letter Library (#2) auto-selects template based on current round + response type
- Inquiry disputes (#3) use the same escalation cadence as tradeline disputes
- All flows persist to `credit_disputes` / `credit_inquiries` with household RLS

## Deliverable
After approval: 1 migration → edge function → 12 UI/logic files → wire into DisputeManager + CreditHealthIssues. Prism credit score moves from 88 → ~95, effectively surpassing Dispute Beast in automation while retaining Prism's household/budget integration.

Approve to build.
