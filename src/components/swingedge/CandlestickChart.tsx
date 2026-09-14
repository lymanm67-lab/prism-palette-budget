import { useEffect, useMemo, useState } from 'react';
import { Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Candle } from '@/lib/swingedge/types';
import { buildDirectionStrip, type StripDirection } from '@/lib/swingedge/directionStrip';
import { buildTrendLines, movingAverages, type TrendLine } from '@/lib/swingedge/trendLines';

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
}

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const fmtDate = (iso: string) => iso.slice(0, 10);

/**
 * The chart itself — candles, volume pane, levels, averages, trend lines.
 * Rendered inline and again inside the enlarge dialog at a bigger size.
 */
function ChartBody({ shown, strip, trendLines, maSeries, levels, height, showDirectionStrip }: BodyProps) {
  const [hover, setHover] = useState<number | null>(null);

  const W = 800;
  const H = height;
  const volH = Math.round(H * 0.18);
  const stripH = showDirectionStrip ? 14 : 0;
  const priceH = H - volH - stripH - 24; // 24px date strip
  const volTop = priceH + stripH;
  const padL = 8;
  const padR = 56; // room for price labels
  const plotW = W - padL - padR;

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
        {/* grid lines at min / mid / max */}
        {[lo, (lo + hi) / 2, hi].map((p) => (
          <g key={p}>
            <line x1={padL} x2={W - padR} y1={y(p)} y2={y(p)} stroke="hsl(var(--border))" strokeDasharray="2 4" />
            <text x={W - padR + 6} y={y(p) + 3} fontSize={10} className="fill-muted-foreground">
              {fmt(p)}
            </text>
          </g>
        ))}

        {/* level lines */}
        {activeLevels.map((l) => (
          <g key={l.label}>
            <line x1={padL} x2={W - padR} y1={y(l.value)} y2={y(l.value)} stroke={l.color} strokeWidth={1.25} strokeDasharray="6 3" />
            <text x={padL + 2} y={y(l.value) - 3} fontSize={9} fill={l.color}>
              {l.label} {fmt(l.value)}
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
                x={x2 - 4}
                y={y(t.endPrice) + (t.kind === 'RESISTANCE' ? -4 : 10)}
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
}: Props) {
  const [visibleCount, setVisibleCount] = useState(visible);
  const [expanded, setExpanded] = useState(false);

  // Reset zoom when the caller changes the default window (e.g. timeframe switch).
  useEffect(() => {
    setVisibleCount(visible);
  }, [visible, candles]);

  const maxVisible = candles.length;
  const clamped = Math.min(visibleCount, maxVisible);
  const canZoomIn = clamped > MIN_VISIBLE;
  const canZoomOut = clamped < maxVisible;

  const shown = useMemo(() => candles.slice(-clamped), [candles, clamped]);

  const strip = useMemo(
    () => (showDirectionStrip ? buildDirectionStrip(shown) : []),
    [shown, showDirectionStrip],
  );

  // Averages are computed on the full history, then trimmed, so the visible
  // window starts with a value instead of a gap.
  const maSeries = useMemo(
    () =>
      showMovingAverages
        ? movingAverages(candles).map((s) => ({ ...s, values: s.values.slice(-clamped) }))
        : [],
    [candles, clamped, showMovingAverages],
  );

  const trendLines = useMemo(
    () => (showTrendLines ? buildTrendLines(shown) : []),
    [shown, showTrendLines],
  );

  if (!shown.length) {
    return <p className="p-4 text-sm text-muted-foreground">No price history to chart yet.</p>;
  }

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-end gap-1">
        <span className="mr-1 text-[11px] text-muted-foreground" aria-live="polite">
          Showing {shown.length} of {candles.length}
        </span>
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
        levels={levels}
        height={height}
        showDirectionStrip={showDirectionStrip}
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
            levels={levels}
            height={600}
            showDirectionStrip={showDirectionStrip}
          />
          <p className="text-xs text-muted-foreground">
            Use the zoom buttons behind this window to show more or fewer candles. Press Escape or the close button to return.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
