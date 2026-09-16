import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Maximize2, Minimize2, SlidersHorizontal, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Candle } from '@/lib/swingedge/types';
import { buildDirectionStrip, type StripDirection } from '@/lib/swingedge/directionStrip';
import { buildTrendLines, movingAverages, type TrendLine } from '@/lib/swingedge/trendLines';
import {
  CHART_MODES,
  CHART_MODE_ORDER,
  loadChartPrefs,
  saveChartPrefs,
  type ChartMode,
  type PriceScaleSide,
} from '@/lib/swingedge/chartModes';

const UP = 'hsl(var(--prism-lime))';
const DOWN = 'hsl(var(--destructive))';
const SIDEWAYS = 'hsl(var(--muted-foreground))';

const STRIP_COLOR: Record<StripDirection, string> = { UP, DOWN, SIDEWAYS };

const MA_COLOR = ['hsl(var(--prism-teal))', 'hsl(var(--prism-amber))'];
const TREND_COLOR = { RESISTANCE: 'hsl(var(--destructive))', SUPPORT: 'hsl(var(--prism-lime))' } as const;

/** Smallest candle window the zoom control will show. */
const MIN_VISIBLE = 20;

export interface ChartLevel {
  label: string;
  value: number | null | undefined;
  color: string; // css color, e.g. 'hsl(var(--prism-teal))'
  /** Short code shown on the price scale, e.g. ENT / STP / TGT. */
  short?: string;
}

export interface ChartTimeframeOption {
  value: string;
  label: string;
}

interface Props {
  candles: Candle[];
  /** How many of the most recent candles to show before any zooming. */
  visible?: number;
  height?: number;
  levels?: ChartLevel[];
  /** Show a direction strip (up / down / sideways segments) under the price pane. */
  showDirectionStrip?: boolean;
  /** Draw sloping trend lines fitted through recent swing highs and lows. */
  showTrendLines?: boolean;
  /** Draw the 20 EMA and 50 SMA curves over the candles. */
  showMovingAverages?: boolean;
  // ---- compact toolbar (all optional; omitted parts are simply not shown) ----
  symbol?: string;
  assetName?: string;
  price?: number | null;
  change?: number | null;
  changePercent?: number | null;
  /** Short signal / status text, e.g. "GO" or "WATCH". */
  status?: string | null;
  /** Confidence text shown next to the status. */
  confidence?: string | null;
  timeframes?: ChartTimeframeOption[];
  activeTimeframe?: string;
  onTimeframeChange?: (value: string) => void;
  /** Compact multi-timeframe strip rendered under the toolbar. */
  mtfStrip?: ReactNode;
}

interface MaSeries {
  label: string;
  values: (number | null)[];
}

interface BodyProps {
  shown: Candle[];
  strip: ReturnType<typeof buildDirectionStrip>;
  trendLines: TrendLine[];
  maSeries: MaSeries[];
  levels: ChartLevel[];
  height: number;
  showDirectionStrip: boolean;
  scaleSide: PriceScaleSide;
}

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const fmtDate = (iso: string) => iso.slice(0, 10);

/** Short code for the price scale, so labels stay narrow and readable. */
const shortCode = (l: ChartLevel) =>
  l.short ??
  l.label
    .replace(/^est\.?\s*/i, '')
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 3);

/**
 * The chart itself — candles, volume pane, levels, averages, trend lines.
 * Rendered inline and again inside the enlarge dialog at a bigger size.
 */
function ChartBody({
  shown,
  strip,
  trendLines,
  maSeries,
  levels,
  height,
  showDirectionStrip,
  scaleSide,
}: BodyProps) {
  const [hover, setHover] = useState<number | null>(null);

  const W = 800;
  const H = height;
  const volH = Math.round(H * 0.18);
  const stripH = showDirectionStrip ? 14 : 0;
  const priceH = H - volH - stripH - 24; // 24px date strip
  const volTop = priceH + stripH;
  // The price scale sits on one side only; the other side keeps a hair of padding
  // so candles never touch the frame.
  const scaleW = 70;
  const padL = scaleSide === 'LEFT' ? scaleW : 8;
  const padR = scaleSide === 'RIGHT' ? scaleW : 8;
  const plotW = W - padL - padR;
  const scaleX = scaleSide === 'RIGHT' ? W - padR + 5 : padL - 5;
  const scaleAnchor = scaleSide === 'RIGHT' ? 'start' : 'end';

  const { lo, hi, maxVol, activeLevels } = useMemo(() => {
    if (!shown.length) return { lo: 0, hi: 0, maxVol: 0, activeLevels: [] as (ChartLevel & { value: number })[] };
    let lo = Infinity;
    let hi = -Infinity;
    let maxVol = 0;
    for (const c of shown) {
      if (c.low < lo) lo = c.low;
      if (c.high > hi) hi = c.high;
      if (c.volume > maxVol) maxVol = c.volume;
    }
    const activeLevels = levels.filter(
      (l): l is ChartLevel & { value: number } => typeof l.value === 'number' && Number.isFinite(l.value),
    );
    // widen the range so visible levels are inside the chart
    for (const l of activeLevels) {
      if (l.value < lo) lo = l.value;
      if (l.value > hi) hi = l.value;
    }
    // keep fitted trend lines inside the pane too
    for (const t of trendLines) {
      for (const p of [t.startPrice, t.endPrice]) {
        if (p < lo) lo = p;
        if (p > hi) hi = p;
      }
    }
    if (hi - lo < 1e-9) hi = lo + 1;
    return { lo, hi, maxVol, activeLevels };
  }, [shown, levels, trendLines]);

  const y = (price: number) => ((hi - price) / (hi - lo)) * priceH;
  const slot = plotW / shown.length;

  // Keep text labels inside the price pane so they never get clipped by the SVG
  // view box, especially labels attached to lines near the top or bottom edge.
  const clampY = (n: number) => Math.max(10, Math.min(priceH - 4, n));

  // Spread stacked labels apart so nearby text never overlaps. Lines stay at
  // their true price; only the text moves, to just below the previous label.
  const spreadLabels = (items: { key: string; y: number }[], minGap = 12) => {
    // Clamp first, then push down: clamping afterwards would stack every label
    // that sits near the top edge back on top of each other.
    const sorted = items
      .map((it) => ({ ...it, y: clampY(it.y) }))
      .sort((a, b) => a.y - b.y);
    let last = -Infinity;
    for (const it of sorted) {
      if (it.y < last + minGap) it.y = last + minGap;
      last = it.y;
    }
    return new Map(sorted.map((it) => [it.key, Math.min(it.y, priceH - 2)]));
  };
  const lastClose = shown[shown.length - 1].close;
  // Scale labels (current price first, then the levels) are centred on their
  // line and nudged apart so two nearby prices stay readable.
  // Grid prices, the last price and every level share one scale, so they are
  // spaced together — no two prices can ever print on top of each other.
  const gridPrices = [hi, lo];
  const scaleLabelY = spreadLabels(
    [
      ...gridPrices.map((p, i) => ({ key: `__grid${i}`, y: y(p) + 3 })),
      { key: '__last', y: y(lastClose) + 3 },
      ...activeLevels.map((l) => ({ key: l.label, y: y(l.value) + 3 })),
    ],
    11,
  );
  const trendLabelY = spreadLabels(
    trendLines.map((t) => ({
      key: t.kind,
      y: y(t.endPrice) + (t.kind === 'RESISTANCE' ? -4 : 10),
    })),
  );
  const bodyW = Math.max(2, Math.floor(slot * 0.6));
  const last = shown[shown.length - 1];
  const hovered = hover !== null ? shown[hover] : null;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Candlestick chart, ${shown.length} sessions, last close ${fmt(last.close)}`}
        onMouseLeave={() => setHover(null)}
      >
        {/* price scale: a thin divider plus grid prices, on the chosen side only */}
        <line
          x1={scaleSide === 'RIGHT' ? W - padR : padL}
          x2={scaleSide === 'RIGHT' ? W - padR : padL}
          y1={0}
          y2={priceH}
          stroke="hsl(var(--border))"
        />
        <line
          x1={padL}
          x2={W - padR}
          y1={y((lo + hi) / 2)}
          y2={y((lo + hi) / 2)}
          stroke="hsl(var(--border))"
          strokeDasharray="2 4"
        />
        {gridPrices.map((p, i) => (
          <g key={`grid-${i}`}>
            <line x1={padL} x2={W - padR} y1={y(p)} y2={y(p)} stroke="hsl(var(--border))" strokeDasharray="2 4" />
            <text
              x={scaleX}
              y={scaleLabelY.get(`__grid${i}`) ?? clampY(y(p) + 3)}
              fontSize={9}
              textAnchor={scaleAnchor}
              className="fill-muted-foreground"
            >
              {fmt(p)}
            </text>
          </g>
        ))}

        {/* current price — subtle, and clearly not one of the plan levels */}
        <line
          x1={padL}
          x2={W - padR}
          y1={y(lastClose)}
          y2={y(lastClose)}
          stroke="hsl(var(--foreground))"
          strokeWidth={1}
          strokeDasharray="1 3"
          opacity={0.5}
        />
        <text
          x={scaleX}
          y={scaleLabelY.get('__last') ?? clampY(y(lastClose) + 3)}
          fontSize={9}
          fontWeight={600}
          textAnchor={scaleAnchor}
          className="fill-foreground"
        >
          LAST {fmt(lastClose)}
        </text>

        {/* plan levels: thin dashed lines, compact labels parked on the scale */}
        {activeLevels.map((l) => (
          <g key={l.label}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y(l.value)}
              y2={y(l.value)}
              stroke={l.color}
              strokeWidth={1}
              strokeDasharray="6 4"
              opacity={0.85}
            >
              <title>{`${l.label} ${fmt(l.value)}`}</title>
            </line>
            <text
              x={scaleX}
              y={scaleLabelY.get(l.label) ?? clampY(y(l.value) + 3)}
              fontSize={9}
              textAnchor={scaleAnchor}
              fill={l.color}
            >
              {shortCode(l)} {fmt(l.value)}
            </text>
          </g>
        ))}

        {/* candles */}
        {shown.map((c, i) => {
          const x = padL + i * slot + (slot - bodyW) / 2;
          const up = c.close >= c.open;
          const color = up ? UP : DOWN;
          const top = y(Math.max(c.open, c.close));
          const bot = y(Math.min(c.open, c.close));
          return (
            <g key={c.datetime} onMouseEnter={() => setHover(i)}>
              <line x1={x + bodyW / 2} x2={x + bodyW / 2} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth={1} />
              <rect x={x} y={top} width={bodyW} height={Math.max(1, bot - top)} fill={color} rx={0.5}>
                <title>{`${fmtDate(c.datetime)}  O ${fmt(c.open)}  H ${fmt(c.high)}  L ${fmt(c.low)}  C ${fmt(c.close)}  Vol ${c.volume.toLocaleString()}`}</title>
              </rect>
            </g>
          );
        })}

        {/* moving average curves */}
        {maSeries.map((s, si) => {
          const pts: string[] = [];
          s.values.forEach((v, i) => {
            if (typeof v !== 'number' || !Number.isFinite(v)) return;
            pts.push(`${(padL + i * slot + slot / 2).toFixed(2)},${y(v).toFixed(2)}`);
          });
          if (pts.length < 2) return null;
          return (
            <polyline
              key={s.label}
              points={pts.join(' ')}
              fill="none"
              stroke={MA_COLOR[si % MA_COLOR.length]}
              strokeWidth={1.5}
              opacity={0.9}
            >
              <title>{s.label}</title>
            </polyline>
          );
        })}

        {/* sloping trend lines fitted through recent swing highs / lows */}
        {trendLines.map((t) => {
          const x1 = padL + t.startIndex * slot + slot / 2;
          const x2 = padL + t.endIndex * slot + slot / 2;
          const label =
            t.direction === 'RISING' ? 'rising' : t.direction === 'FALLING' ? 'falling' : 'flat';
          return (
            <g key={t.kind}>
              <line
                x1={x1}
                x2={x2}
                y1={y(t.startPrice)}
                y2={y(t.endPrice)}
                stroke={TREND_COLOR[t.kind]}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                opacity={0.9}
              >
                <title>{`${t.kind === 'RESISTANCE' ? 'Upper' : 'Lower'} trend line, ${label}, through ${t.pivots} swing points`}</title>
              </line>
              <text
                x={Math.max(padL + 4, Math.min(x2 - 4, W - padR - 4))}
                y={trendLabelY.get(t.kind) ?? clampY(y(t.endPrice) + (t.kind === 'RESISTANCE' ? -4 : 10))}
                fontSize={9}
                textAnchor="end"
                fill={TREND_COLOR[t.kind]}
              >
                {t.kind === 'RESISTANCE' ? 'Upper' : 'Lower'} trend ({label})
              </text>
            </g>
          );
        })}

        {/* direction strip: one segment per window, up / down / sideways */}
        {strip.map((s, i) => {
          const x = padL + s.startIndex * slot;
          const w = Math.max(1, (s.endIndex - s.startIndex + 1) * slot);
          return (
            <rect
              key={`d-${i}`}
              x={x}
              y={priceH + 3}
              width={w}
              height={stripH - 6}
              fill={STRIP_COLOR[s.direction]}
              opacity={s.direction === 'SIDEWAYS' ? 0.35 : 0.8}
              rx={1}
            >
              <title>{`${s.startDate.slice(0, 10)} → ${s.endDate.slice(0, 10)}: ${
                s.direction === 'UP' ? 'moving up' : s.direction === 'DOWN' ? 'moving down' : 'sideways'
              }`}</title>
            </rect>
          );
        })}

        {/* volume pane */}
        {shown.map((c, i) => {
          const x = padL + i * slot + (slot - bodyW) / 2;
          const vh = maxVol ? (c.volume / maxVol) * (volH - 4) : 0;
          const color = c.close >= c.open ? UP : DOWN;
          return (
            <rect
              key={`v-${c.datetime}`}
              x={x}
              y={volTop + (volH - 4) - vh}
              width={bodyW}
              height={Math.max(1, vh)}
              fill={color}
              opacity={0.45}
            />
          );
        })}

        {/* date strip: first / middle / last */}
        {[0, Math.floor(shown.length / 2), shown.length - 1].map((i) => (
          <text
            key={i}
            x={padL + i * slot}
            y={H - 8}
            fontSize={9}
            className="fill-muted-foreground"
            textAnchor={i === 0 ? 'start' : i === shown.length - 1 ? 'end' : 'middle'}
            transform={i === shown.length - 1 ? `translate(${slot},0)` : undefined}
          >
            {fmtDate(shown[i].datetime)}
          </text>
        ))}
      </svg>

      <p className="mt-1 text-xs text-muted-foreground" aria-live="polite">
        {hovered
          ? `${fmtDate(hovered.datetime)} — open ${fmt(hovered.open)}, high ${fmt(hovered.high)}, low ${fmt(
              hovered.low,
            )}, close ${fmt(hovered.close)}, volume ${hovered.volume.toLocaleString()}`
          : `Last session: close ${fmt(last.close)}. Hover a candle for its open, high, low, close and volume.`}
      </p>
    </div>
  );
}

/**
 * Lightweight SVG candlestick chart with a volume pane and optional
 * horizontal level lines (support, resistance, estimated entry/stop/target).
 * No chart library — candles are simple rects so theme tokens apply.
 *
 * Zoom works by showing fewer candles (each candle, and all labels, get
 * bigger). The expand button opens the same chart in a large pop-out view.
 */
export default function CandlestickChart({
  candles,
  visible = 120,
  height = 320,
  levels = [],
  showDirectionStrip = false,
  showTrendLines = false,
  showMovingAverages = false,
  symbol,
  assetName,
  price,
  change,
  changePercent,
  status,
  confidence,
  timeframes,
  activeTimeframe,
  onTimeframeChange,
  mtfStrip,
}: Props) {
  const [visibleCount, setVisibleCount] = useState(visible);
  const [expanded, setExpanded] = useState(false);

  // Saved view preferences (mode + which side the price scale sits on).
  const [prefs, setPrefs] = useState(loadChartPrefs);
  const mode = prefs.mode;
  const modeConfig = CHART_MODES[mode];

  const setMode = (next: ChartMode) => setPrefs((p) => ({ ...p, mode: next }));
  const setScaleSide = (next: PriceScaleSide) => setPrefs((p) => ({ ...p, scaleSide: next }));
  useEffect(() => saveChartPrefs(prefs), [prefs]);

  // Overlay visibility — the mode sets the defaults, the user can still tweak.
  const [showMas, setShowMas] = useState(showMovingAverages && modeConfig.movingAverages);
  const [showTrends, setShowTrends] = useState(showTrendLines && modeConfig.trendLines);
  const [showLevels, setShowLevels] = useState(modeConfig.levels);
  const [showStrip, setShowStrip] = useState(showDirectionStrip && modeConfig.directionStrip);

  // Reset zoom when the caller changes the default window (e.g. timeframe switch).
  useEffect(() => {
    setVisibleCount(visible);
  }, [visible, candles]);

  // Re-apply the mode defaults whenever the mode, or what the chart offers, changes.
  useEffect(() => {
    const cfg = CHART_MODES[mode];
    setShowMas(showMovingAverages && cfg.movingAverages);
    setShowTrends(showTrendLines && cfg.trendLines);
    setShowLevels(cfg.levels);
    setShowStrip(showDirectionStrip && cfg.directionStrip);
  }, [mode, showMovingAverages, showTrendLines, showDirectionStrip]);

  const maxVisible = candles.length;
  const clamped = Math.min(visibleCount, maxVisible);
  const canZoomIn = clamped > MIN_VISIBLE;
  const canZoomOut = clamped < maxVisible;

  const shown = useMemo(() => candles.slice(-clamped), [candles, clamped]);

  const strip = useMemo(
    () => (showDirectionStrip && showStrip ? buildDirectionStrip(shown) : []),
    [shown, showDirectionStrip, showStrip],
  );

  // Averages are computed on the full history, then trimmed, so the visible
  // window starts with a value instead of a gap.
  const maSeries = useMemo(
    () =>
      showMovingAverages && showMas
        ? movingAverages(candles).map((s) => ({ ...s, values: s.values.slice(-clamped) }))
        : [],
    [candles, clamped, showMovingAverages, showMas],
  );

  const trendLines = useMemo(
    () => (showTrendLines && showTrends ? buildTrendLines(shown) : []),
    [shown, showTrendLines, showTrends],
  );

  const visibleLevels = showLevels ? levels : [];
  // The lines menu also holds the price-scale side, so it is always available.
  const overlayCount = 1;

  if (!shown.length) {
    return <p className="p-4 text-sm text-muted-foreground">No price history to chart yet.</p>;
  }

  const changeTone =
    typeof change === 'number' || typeof changePercent === 'number'
      ? (change ?? changePercent ?? 0) >= 0
        ? 'text-prism-lime'
        : 'text-destructive'
      : 'text-muted-foreground';

  return (
    <div className="w-full">
      {/* Compact toolbar: who, what price, which mode. */}
      {(symbol || typeof price === 'number' || status || timeframes?.length) && (
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-1.5">
          {symbol && <span className="text-sm font-bold tracking-tight">{symbol}</span>}
          {assetName && (
            <span className="max-w-[14rem] truncate text-[11px] text-muted-foreground">{assetName}</span>
          )}
          {typeof price === 'number' && <span className="text-sm font-semibold">{fmt(price)}</span>}
          {(typeof change === 'number' || typeof changePercent === 'number') && (
            <span className={cn('text-[11px] font-semibold', changeTone)}>
              {typeof change === 'number' ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}` : ''}
              {typeof changePercent === 'number'
                ? ` ${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`
                : ''}
            </span>
          )}
          {status && (
            <Badge variant="outline" className="text-[10px] font-semibold">
              {status}
              {confidence ? <span className="ml-1 text-muted-foreground">· {confidence}</span> : null}
            </Badge>
          )}

          <span className="ml-auto flex items-center gap-1" role="group" aria-label="Chart mode">
            {CHART_MODE_ORDER.map((m) => (
              <Button
                key={m}
                type="button"
                size="sm"
                variant={mode === m ? 'default' : 'ghost'}
                className="h-6 px-2 text-[11px]"
                onClick={() => setMode(m)}
                title={CHART_MODES[m].description}
              >
                {CHART_MODES[m].label}
              </Button>
            ))}
          </span>
        </div>
      )}

      {timeframes && timeframes.length > 0 && (
        <div className="mb-1 flex flex-wrap items-center gap-1" role="group" aria-label="Chart timeframe">
          {timeframes.map((t) => (
            <Button
              key={t.value}
              type="button"
              size="sm"
              variant={activeTimeframe === t.value ? 'secondary' : 'outline'}
              className="h-6 px-2 text-[11px]"
              onClick={() => onTimeframeChange?.(t.value)}
            >
              {t.label}
            </Button>
          ))}
        </div>
      )}

      {mtfStrip ? <div className="mb-2">{mtfStrip}</div> : null}

      <div className="mb-1 flex items-center justify-end gap-1">
        <span className="mr-1 text-[11px] text-muted-foreground" aria-live="polite">
          Showing {shown.length} of {candles.length}
        </span>
        {overlayCount > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Choose which chart lines to show"
                title="Chart lines"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-3">
              <p className="mb-2 text-xs font-medium">Chart lines</p>
              <div className="space-y-2">
                {showMovingAverages && (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={showMas} onCheckedChange={(v) => setShowMas(v === true)} />
                    20 EMA &amp; 50 SMA averages
                  </label>
                )}
                {showTrendLines && (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={showTrends} onCheckedChange={(v) => setShowTrends(v === true)} />
                    Trend lines
                  </label>
                )}
                {levels.length > 0 && (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={showLevels} onCheckedChange={(v) => setShowLevels(v === true)} />
                    Level lines (support, entry, stop, target)
                  </label>
                )}
                {showDirectionStrip && (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={showStrip} onCheckedChange={(v) => setShowStrip(v === true)} />
                    Direction strip
                  </label>
                )}
              </div>
              <p className="mb-1.5 mt-3 text-xs font-medium">Price scale</p>
              <div className="flex items-center gap-1">
                {(['LEFT', 'RIGHT'] as PriceScaleSide[]).map((side) => (
                  <Button
                    key={side}
                    type="button"
                    size="sm"
                    variant={prefs.scaleSide === side ? 'secondary' : 'outline'}
                    className="h-6 flex-1 px-2 text-[11px]"
                    onClick={() => setScaleSide(side)}
                  >
                    {side === 'LEFT' ? 'Left' : 'Right'}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setVisibleCount((v) => Math.max(MIN_VISIBLE, Math.round(v / 1.5)))}
          disabled={!canZoomIn}
          aria-label="Zoom in — show fewer candles, larger"
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setVisibleCount((v) => Math.min(maxVisible, Math.round(v * 1.5)))}
          disabled={!canZoomOut}
          aria-label="Zoom out — show more candles"
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setExpanded(true)}
          aria-label="Open the chart in a large pop-out view"
          title="Enlarge chart"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      <ChartBody
        shown={shown}
        strip={strip}
        trendLines={trendLines}
        maSeries={maSeries}
        levels={visibleLevels}
        height={height}
        showDirectionStrip={showDirectionStrip && showStrip}
        scaleSide={prefs.scaleSide}
      />

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-[95vw] w-[95vw] sm:max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>Price chart — enlarged view</DialogTitle>
          </DialogHeader>
          <ChartBody
            shown={shown}
            strip={strip}
            trendLines={trendLines}
            maSeries={maSeries}
            levels={visibleLevels}
            height={600}
            showDirectionStrip={showDirectionStrip && showStrip}
            scaleSide={prefs.scaleSide}
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Use the zoom buttons behind this window to show more or fewer candles.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setExpanded(false)}
              aria-label="Return to the chart on the main page"
            >
              <Minimize2 className="mr-2 h-4 w-4" />
              Return to chart
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
