import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import AnimatedNumber from '@/components/AnimatedNumber';
import { Button } from '@/components/ui/button';
import type { PaycheckDeployment } from '@/hooks/use-paycheck-deploy';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

// The five Cash Flow Pillars.
const BUCKETS = [
  { label: 'Bills & Essentials', keys: ['bills_amount'], color: 'var(--prism-sky)' },
  { label: 'Debt Freedom', keys: ['min_debt_amount', 'extra_debt_amount'], color: 'var(--prism-rose)' },
  { label: 'Savings & Buffer', keys: ['savings_amount', 'buffer_amount'], color: 'var(--prism-teal)' },
  { label: 'Wealth & Investing', keys: ['investment_amount'], color: 'var(--prism-lime)' },
  { label: 'Guilt-Free Spend', keys: ['safe_to_spend_amount'], color: 'var(--prism-amber)' },
] as const;

export default function PaycheckSplitAnimation({ deployment, compact = false }: { deployment: PaycheckDeployment; compact?: boolean }) {
  const [run, setRun] = useState(0);
  const reduce = useReducedMotion();
  const net = Number(deployment.net_amount) || 0;
  // Always show all five pillars, even when a pillar is $0 this paycheck.
  const buckets = BUCKETS.map(b => ({
    ...b,
    value: b.keys.reduce((s, k) => s + Number((deployment as any)[k] || 0), 0),
  }));
  const n = buckets.length;
  if (!n || net <= 0) return null;

  const W = 600, H = compact ? 150 : 200, topY = 34, botY = H - 8;
  const xs = buckets.map((_, i) => ((i + 0.5) / n) * W);
  const maxV = Math.max(...buckets.map(b => b.value));
  const d = (s: number) => (reduce ? 0 : s);

  return (
    <div className="relative rounded-lg border border-border/40 bg-background/40 p-3 overflow-hidden" key={run}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Paycheck split</span>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => setRun(r => r + 1)}>
          <span className="flex items-center gap-1"><RotateCcw className="h-3 w-3" /> Replay</span>
        </Button>
      </div>

      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 16, duration: d(0.5) }}
        className="mx-auto w-fit rounded-full border border-prism-teal/40 bg-prism-teal/10 px-4 py-1 shadow-[0_0_24px_hsl(var(--prism-teal)/0.35)]"
      >
        <AnimatedNumber from={0} duration={reduce ? 0 : 900} value={net} formatFn={fmt} className="font-mono text-base font-bold text-prism-teal" />
      </motion.div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full -mt-2 !bg-transparent" preserveAspectRatio="none" style={{ height: compact ? 90 : 130 }}>
        {buckets.map((b, i) => {
          const path = `M ${W / 2} ${topY} C ${W / 2} ${(topY + botY) / 2}, ${xs[i]} ${(topY + botY) / 2}, ${xs[i]} ${botY}`;
          const w = 2 + (b.value / maxV) * (compact ? 8 : 12);
          return (
            <g key={b.label}>
              <path d={path} fill="none" stroke={`hsl(${b.color} / 0.12)`} strokeWidth={w} strokeLinecap="round" />
              <motion.path
                d={path}
                fill="none"
                stroke={`hsl(${b.color})`}
                strokeWidth={w}
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0.9 }}
                animate={{ pathLength: 1, opacity: 0.85 }}
                transition={{ duration: d(0.9), delay: d(0.4 + i * 0.12), ease: 'easeInOut' }}
              />
              {!reduce && (
                <circle r={3} fill={`hsl(${b.color})`}>
                  <animateMotion dur="2.4s" begin={`${1.3 + i * 0.12}s`} repeatCount="indefinite" path={path} />
                </circle>
              )}
            </g>
          );
        })}
      </svg>

      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {buckets.map((b, i) => {
          const pct = Math.round((b.value / net) * 100);
          return (
            <motion.div
              key={b.label}
              initial={{ y: 12, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18, delay: d(1.1 + i * 0.12) }}
              className="rounded-md border bg-card/60 px-1 py-1.5 text-center"
              style={{ borderColor: `hsl(${b.color} / 0.4)` }}
            >
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold truncate">{b.label}</div>
              <div className="font-mono text-[11px] font-bold" style={{ color: `hsl(${b.color})` }}>
                <AnimatedNumber from={0} value={b.value} duration={reduce ? 0 : 900} formatFn={fmt} />
              </div>
              {!compact && <div className="text-[9px] text-muted-foreground">{pct}%</div>}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
