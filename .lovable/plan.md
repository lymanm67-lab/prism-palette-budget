Scope: Tiny — single file (`src/pages/MoneyCoach.tsx`). No logic, no schema.

## 1. Default every card to closed

Currently `isOpenByDefault(card)` auto-opens cards when a moment tab (Today / This Week / This Month / Long Game) is selected. Change it to always return `false` so every card — across All Plays and every moment tab — starts collapsed. The two cards already hard-coded to `defaultOpen={false}` stay as-is. Users still expand any card by clicking it.

## 2. Unify card visual style

All cards already share the `CoachCard` component, so font sizes, weights, row layout, status dot, and chevron are identical. The only thing that differs today is the `iconColor` prop — each card passes its own accent (`text-prism-orange`, `-violet`, `-lime`, `-sky`, `-amber`, `-rose`, `-teal`).

Standardize every card's `iconColor` to a single token: **`text-prism-amber`** (the existing default in `CoachCard`). This makes every row icon render in the same color across All Plays, Today, This Week, This Month, and Long Game while keeping each card's distinct Lucide glyph (Eye, Calendar, Shield, etc.) so users can still tell cards apart at a glance.

Note: I'm keeping the per-card icon glyph (different shapes per card meaning). If you also want every card to use one identical icon glyph, say so and I'll swap them all to the same icon.

## Files

- `src/pages/MoneyCoach.tsx` — `isOpenByDefault` always returns `false`; replace all 12 `iconColor="text-prism-*"` props with `iconColor="text-prism-amber"`.
