## Goal

Replace the unrealistic 6/7/8/9/10 cycle in the Mixed Returns scenario with **return patterns that actually match the last 50 years of US markets** — including down years, "lost decade" stretches, and >10% boom years. Keep horizons at 27 and 30 years.

## What changes

Convert the single hardcoded cycle into a **preset selector** with 3 historically grounded patterns. User picks one; everything else (chart, CAGR, sequence strip, tiles) updates.

### The 3 presets

All numbers are nominal S&P 500 total returns (with dividends), rounded to whole percents to keep the UI readable.

**1. "Historical Average" (default)** — 7-year repeating cycle that geo-means to ~10.5%, the long-run nominal S&P average:
`[-8, +22, +18, +12, -4, +28, +10]` → CAGR ≈ **10.4%**
Pattern: 2 down years, 1 modest year, 4 strong years — matches the rough 70/30 up-year ratio.

**2. "Realistic Volatile" (heavy sequence-of-returns risk)** — 10-year cycle approximating 2000–2019 (lost decade then recovery):
`[-9, -12, -22, +29, +11, +5, +16, +5, -37, +26]` → CAGR ≈ **+1.2%** for those 10, but cycled over 27–30 yrs blends in recoveries.
Pattern: lets the user see what happens if their retirement *starts* in a bad decade.

**3. "Strong Bull" (1980s–1990s style)** — 10-year cycle of the actual 1989–1998 sequence:
`[+31, -3, +30, +7, +10, +1, +37, +23, +33, +28]` → CAGR ≈ **+19%**
Pattern: shows the optimistic ceiling so the user sees they shouldn't bet on this.

### Sequence-of-returns toggle

Add a small **"Sequence" toggle**: `Cycle from year 1` vs `Reverse (bad years late)`. Same returns, opposite order. Demonstrates that ending in bad years hurts way more than starting in them when contributing — and the reverse when withdrawing. Educationally this is the single most important concept in retirement math and is currently absent.

### UI changes (single card, no new routes)

In `src/components/investment/MixedReturnsScenario.tsx`:

1. **Preset tabs** (replace the implicit cycle): `Historical Avg` | `Volatile` | `Strong Bull`.
2. **Sequence toggle** next to dollar-mode tabs: `Forward` | `Reverse`.
3. **Bar chart bars** become: Goal · Flat 7% · Flat 10% · Selected Mixed. (Swap "Flat 8%" for "Flat 10%" since 10% is the real historical benchmark.)
4. **Sequence strip** already shows year-by-year — keep, but color-code negatives in rose and >15% in emerald so the volatility is visually obvious.
5. **Headline copy** updates with the preset: "Modeled on the long-run S&P 500 average (~10.5% CAGR)" / "Modeled on the 2000–2019 'lost decade then recovery' sequence" / "Modeled on the 1989–1998 bull market — shown as an optimistic ceiling, not a forecast."
6. **Disclaimer** expands one line: "Past performance is not indicative of future results. Historical S&P 500 sequences are educational illustrations only."

### What stays the same

- `runProjection` already accepts `annualReturnsPct: number[]` — no engine changes needed.
- Card placement, horizon tabs (27/30), Today's $ / Nominal $ toggle, layout, gradient.
- `ReturnScenarioComparison` and `ScenarioComparison` cards are untouched.

## Files touched

- Edit: `src/components/investment/MixedReturnsScenario.tsx` (only file)

Scope: **Tiny** (1 file, no schema, no engine changes, all logic local to the component).
