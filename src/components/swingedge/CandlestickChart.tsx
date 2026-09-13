import { useMemo, useState } from 'react';
import type { Candle } from '@/lib/swingedge/types';

const UP = 'hsl(var(--prism-lime))';
const DOWN = 'hsl(var(--destructive))';
const WICK = 'hsl(var(--muted-foreground))';

export interface ChartLevel {
  label: string;
  value: number | null | undefined;
  color: string; // css color, e.g. 'hsl(var(--prism-teal))'
}

interface Props {
  candles: Candle[];
  /** How many of the most recent candles to show. */
  visible?: number;
  height?: number;
  levels?: ChartLevel[];
}

/**
 * Lightweight SVG candlestick chart with a volume pane and optional
 * horizontal level lines (support, resistance, estimated entry/stop/target).
 * No chart library — candles are simple rects so theme tokens apply.
 */
export default function CandlestickChart({ candles, visible = 120, height = 320, levels = [] }: Props) {
  const shown = useMemo(() => candles.slice(-visible), [candles, visible]);
  const [hover, setHover] = useState<number | null>(null);

  const W = 800;
  const H = height;
  const volH = Math.round(H * 0.18);
  const priceH = H - volH - 24; // 24px date strip
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
    if (hi - lo < 1e-9) hi = lo + 1;
    return { lo, hi, maxVol, activeLevels };
  }, [shown, levels]);

  if (!shown.length) {
    return <p className="p-4 text-sm text-muted-foreground">No price history to chart yet.</p>;
  }

  const y = (price: number) => ((hi - price) / (hi - lo)) * priceH;
  const slot = plotW / shown.length;
  const bodyW = Math.max(2, Math.floor(slot * 0.6));
  const last = shown[shown.length - 1];
  const hovered = hover !== null ? shown[hover] : null;

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
  const fmtDate = (iso: string) => iso.slice(0, 10);

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

        {/* volume pane */}
        {shown.map((c, i) => {
          const x = padL + i * slot + (slot - bodyW) / 2;
          const vh = maxVol ? (c.volume / maxVol) * (volH - 4) : 0;
          const color = c.close >= c.open ? UP : DOWN;
          return (
            <rect
              key={`v-${c.datetime}`}
              x={x}
              y={priceH + (volH - 4) - vh}
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
      {WICK /* keep token referenced for future wick styling */}
    </div>
  );
}
