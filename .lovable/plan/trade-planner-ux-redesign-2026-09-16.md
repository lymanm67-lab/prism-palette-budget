# Trade Planner UX Redesign

Rebuild the Trade Planner screen around five decisions instead of ten stacked steps. No trading logic changes: every existing calculation, gate, warning and save rule stays exactly as it is.

## The five stages

1. **What am I trading?** — symbol, setup (pullback / breakout / none), the loaded price snapshot line.
2. **What proves me wrong?** — invalidation sentence (with the suggest button) plus the stop: method, buffer/ATR multiple, stop price, stop quality verdict and the tighten confirmation.
3. **How much can I risk?** — risk per share, account risk limit, share count, position value and dollar risk, all computed automatically and shown as read-only figures.
4. **Where will I take profit?** — target method, target price, reward-to-risk against the minimum rule.
5. **Does the trade qualify?** — the verdict, the reasons it does or does not qualify, override fields when advanced mode is on, and the save button.

Each stage is one card. Only the active stage is expanded; completed stages collapse to a one-line summary (for example "Stop $32.51 · risk $1.83/share · quality Acceptable") and reopen on click. On mobile the stages become an accordion, one open at a time.

## Sticky summary bar

A compact bar pinned at the top of the screen, always visible: symbol, entry, stop, target, risk per share, dollar risk, shares, R:R, and the verdict badge. It is the single place numbers are repeated — the individual stages stop restating them.

## Reducing crowding

- Teaching text (stop-rule explainer, worked example, method blurbs, "How to use this screen") moves into collapsed panels labelled plainly, closed by default.
- Warnings are deduplicated: the guardrail banner keeps the serious ones; a stage shows only the warning that belongs to its own decision.
- Supporting cards — multi-timeframe, rule checklist, portfolio risk and heat, event risk, AI mentor, saved plans, Thinkorswim guide — move to the right column (below the stages on mobile), each collapsible, with the blocking ones (heat, rules) open when they block.
- The primary button reflects status: "Finish stage 3", "Qualify the trade", "Save this plan", or the blocked reason.

## Technical notes

- Work stays inside `src/pages/swingedge/TradePlanner.tsx` plus small presentational components (a `PlannerStage` wrapper and a `PlannerSummaryBar`).
- All existing state, memos (`risk`, `quality`, `structure`, `qualification`, `heatGate`, `guardrails`, `ruleChecks`, `mtf`) and `handleSave` validation are reused untouched — only the JSX layout changes.
- Stage completion is derived from existing values (entry > 0, stop valid, shares ≥ 1, target > entry, verdict computed), not new stored state.
- Reuse `CollapsibleSection` for teaching panels and the existing `Card`, `Accordion` and `Badge` primitives; keep current design tokens.

## Out of scope

No changes to stop quality, sizing, heat, earnings or readiness engines; no changes to what saves to the database.
