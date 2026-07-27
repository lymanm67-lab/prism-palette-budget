import { motion } from 'framer-motion';
import { NAVY, GOLD, EMERALD } from '@/lib/investment/crossoverEngine';

/** Speedometer-style gauge, 0–100 */
export function Speedometer({
  value,
  label,
  caption,
}: {
  value: number;
  label: string;
  caption?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const angle = -90 + (pct / 100) * 180;
  const R = 80;
  const cx = 100;
  const cy = 100;
  const arc = (from: number, to: number) => {
    const p = (deg: number) => [
      cx + R * Math.cos(((deg - 90) * Math.PI) / 180),
      cy + R * Math.sin(((deg - 90) * Math.PI) / 180),
    ];
    const [x1, y1] = p(from);
    const [x2, y2] = p(to);
    return `M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2}`;
  };

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 120" className="w-full max-w-[260px]">
        <path d={arc(-90, 90)} fill="none" stroke="#E2E8F0" strokeWidth={14} strokeLinecap="round" />
        <path d={arc(-90, -30)} fill="none" stroke="#2563EB" strokeWidth={14} strokeLinecap="round" opacity={0.35} />
        <path d={arc(-28, 30)} fill="none" stroke={EMERALD} strokeWidth={14} strokeLinecap="round" opacity={0.45} />
        <path d={arc(32, 90)} fill="none" stroke={GOLD} strokeWidth={14} strokeLinecap="round" opacity={0.55} />
        <motion.line
          x1={cx}
          y1={cy}
          x2={cx}
          y2={cy - R + 12}
          stroke={NAVY}
          strokeWidth={4}
          strokeLinecap="round"
          style={{ originX: '100px', originY: '100px' }}
          initial={{ rotate: -90 }}
          animate={{ rotate: angle }}
          transition={{ type: 'spring', stiffness: 60, damping: 14 }}
        />
        <circle cx={cx} cy={cy} r={7} fill={NAVY} />
      </svg>
      <div className="-mt-2 text-center">
        <div className="text-2xl font-bold" style={{ color: NAVY }}>
          {Math.round(pct)}%
        </div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
        {caption && <div className="mt-1 text-xs text-slate-500">{caption}</div>}
      </div>
    </div>
  );
}

/** Flywheel that spins faster as the portfolio grows */
export function Flywheel({ speed = 1, caption }: { speed?: number; caption?: string }) {
  const duration = Math.max(2, 14 / Math.max(0.25, speed));
  return (
    <div className="flex flex-col items-center">
      <motion.svg
        viewBox="0 0 200 200"
        className="w-full max-w-[240px]"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, ease: 'linear', duration }}
      >
        <circle cx="100" cy="100" r="86" fill="none" stroke={NAVY} strokeWidth="6" opacity={0.9} />
        <circle cx="100" cy="100" r="60" fill="none" stroke={GOLD} strokeWidth="4" opacity={0.8} />
        <circle cx="100" cy="100" r="18" fill={NAVY} />
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * Math.PI * 2) / 8;
          return (
            <line
              key={i}
              x1={100 + 18 * Math.cos(a)}
              y1={100 + 18 * Math.sin(a)}
              x2={100 + 84 * Math.cos(a)}
              y2={100 + 84 * Math.sin(a)}
              stroke={i % 2 === 0 ? GOLD : EMERALD}
              strokeWidth="5"
              strokeLinecap="round"
            />
          );
        })}
      </motion.svg>
      {caption && <div className="mt-2 text-center text-xs text-slate-500">{caption}</div>}
    </div>
  );
}

/** Two arrows crossing — contributions declining in share, growth rising */
export function CrossingArrows({
  leftLabel = 'Annual Retirement Contributions',
  rightLabel = 'Annual Investment Growth',
  title = 'The Compounding Crossover™',
}: {
  leftLabel?: string;
  rightLabel?: string;
  title?: string;
}) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: '#E2E8F0', background: '#F8FAFC' }}>
      <svg viewBox="0 0 400 190" className="w-full">
        <defs>
          <marker id="arrowNavy" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 z" fill={NAVY} />
          </marker>
          <marker id="arrowGold" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 z" fill={GOLD} />
          </marker>
        </defs>
        <line x1="30" y1="160" x2="380" y2="160" stroke="#CBD5E1" strokeWidth="2" />
        <line x1="30" y1="20" x2="30" y2="160" stroke="#CBD5E1" strokeWidth="2" />
        <motion.line
          x1="40" y1="50" x2="360" y2="120"
          stroke={NAVY} strokeWidth="5" markerEnd="url(#arrowNavy)"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1 }}
        />
        <motion.line
          x1="40" y1="145" x2="360" y2="35"
          stroke={GOLD} strokeWidth="5" markerEnd="url(#arrowGold)"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, delay: 0.2 }}
        />
        <circle cx="205" cy="86" r="8" fill={EMERALD} />
        <circle cx="205" cy="86" r="15" fill="none" stroke={EMERALD} strokeWidth="2" opacity={0.5} />
        <text x="215" y="80" fontSize="12" fontWeight="700" fill={EMERALD}>
          Crossover
        </text>
        <text x="44" y="42" fontSize="11" fontWeight="600" fill={NAVY}>
          {leftLabel}
        </text>
        <text x="180" y="178" fontSize="11" fontWeight="600" fill={GOLD}>
          {rightLabel}
        </text>
      </svg>
      <div className="text-center text-sm font-semibold" style={{ color: NAVY }}>
        {title}
      </div>
    </div>
  );
}
