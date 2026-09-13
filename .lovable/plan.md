# Stock Analyzer — chart directional bars

Add direction indicators to the Analyzer price chart: a colored direction strip under the candles plus a current-direction arrow.

## What you'll see

- A thin colored band directly under the price candles (above the volume pane), split into time segments:
  - Green segment = price moving up in that window
  - Red segment = moving down
  - Amber/neutral segment = sideways
- A direction arrow chip at the top-right of the chart card showing the current Directional Bias engine result: ↑ UP / → SIDEWAYS / ↓ DOWN with its confidence label.
- Hovering a strip segment shows that window's dates and direction.

## How it works (technical)

- `src/lib/swingedge/directionStrip.ts` (new): split the visible candles into ~24 equal windows; for each window run the existing `trendAlignment` logic from `framework.ts` (20 EMA vs 50 SMA + price position) to classify UP / SIDEWAYS / DOWN. Pure function, unit-tested.
- `src/components/swingedge/CandlestickChart.tsx`: new optional prop `showDirectionStrip` (default false so other charts are untouched). Renders the strip as a row of SVG rects between the price pane and volume pane, with hover tooltips. Keeps the existing SVG text fix (`fill` classes, no dark-mode artifacts).
- `src/pages/swingedge/StockAnalyzer.tsx`: pass `showDirectionStrip`; add the arrow chip in the chart card header driven by the existing `directionalBias` result (falls back to the strip's last segment if bias isn't computed for that view).
- Colors come from existing semantic tokens (`--prism-lime`, `--destructive`, muted) — no hardcoded colors.
- `directionStrip.test.ts`: tests for up/down/sideways classification, short-history handling, and stable segment counts.

## Not changing

No changes to signals, scoring, other pages, or any data. The strip is display-only and off by default everywhere except the Analyzer chart.
