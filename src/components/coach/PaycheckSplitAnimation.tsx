import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import AnimatedNumber from '@/components/AnimatedNumber';
import { Button } from '@/components/ui/button';
import type { PaycheckDeployment } from '@/hooks/use-paycheck-deploy';
import { usePaycheckTree } from '@/components/coach/usePaycheckTree';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export default function PaycheckSplitAnimation({ deployment, compact = false }: { deployment: PaycheckDeployment; compact?: boolean }) {
  const [run, setRun] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const reduce = useReducedMotion();
  const { net, pillars, expTotal } = usePaycheckTree(deployment, { all: showAll });
  if (net <= 0 || pillars.length === 0) return null;

  const n = pillars.length;
  const W = 1000, H = compact ? 110 : 150, topY = 6, botY = H - 4;
  const xs = pillars.map((_, i) => ((i + 0.5) / n) * W);
  const maxV = Math.max(1, ...pillars.map(p => p.value));
  const d = (s: number) => (reduce ? 0 : s);
  const trunkEnd = topY + (botY - topY) * 0.35;

  return (
    <div className="relative rounded-lg border border-border/40 bg-background/40 p-3 overflow-hidden" key={run}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
          Paycheck money tree
        </span>
        <div className="flex items-center gap-1">
          {!compact && (
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => setShowAll(s => !s)}>
              <span>{showAll ? 'Show fewer' : 'Show all bills & debts'}</span>
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => setRun(r => r + 1)}>
            <span className="flex items-center gap-1"><RotateCcw className="h-3 w-3" /> Replay</span>
          </Button>
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between rounded-md border border-prism-amber/40 bg-prism-amber/10 px-3 py-1.5">
        <span className="text-xs font-semibold text-foreground">Total expenses (bills + debt + business)</span>
        <span className="font-mono text-sm font-bold text-prism-amber">{fmt(expTotal)}</span>
      </div>

      <div className="overflow-x-auto">
        <div className={compact ? '' : 'min-w-[640px]'}>
          {/* Root: the paycheck */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [0.5, 1.12, 1], opacity: 1 }}
            transition={{ duration: d(0.7), ease: 'easeOut' }}
            className="relative mx-auto w-fit rounded-full border border-prism-teal/50 bg-prism-teal/10 px-5 py-1.5 shadow-[0_0_28px_hsl(var(--prism-teal)/0.4)]"
          >
            {!reduce && (
              <motion.span
                className="absolute inset-0 rounded-full border border-prism-teal/50"
                initial={{ scale: 1, opacity: 0.7 }}
                animate={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
              />
            )}
            <AnimatedNumber from={0} duration={reduce ? 0 : 900} value={net} formatFn={fmt} className="font-mono text-lg font-bold text-prism-teal" />
          </motion.div>

          {/* Trunk + six main branches */}
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full !bg-transparent" preserveAspectRatio="none" style={{ height: compact ? 70 : 100 }}>
            <motion.path
              d={`M ${W / 2} ${topY} L ${W / 2} ${trunkEnd}`}
              stroke="hsl(var(--prism-teal))" strokeWidth={14} strokeLinecap="round" fill="none"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: d(0.35), delay: d(0.3) }}
            />
            {pillars.map((p, i) => {
              const path = `M ${W / 2} ${trunkEnd} C ${W / 2} ${(trunkEnd + botY) / 2}, ${xs[i]} ${(trunkEnd + botY) / 2}, ${xs[i]} ${botY}`;
              const w = 3 + (p.value / maxV) * (compact ? 8 : 12);
              return (
                <g key={p.label}>
                  <path d={path} fill="none" stroke={`hsl(${p.color} / 0.12)`} strokeWidth={w} strokeLinecap="round" />
                  <motion.path
                    d={path} fill="none" stroke={`hsl(${p.color})`} strokeWidth={w} strokeLinecap="round"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                    transition={{ duration: d(0.8), delay: d(0.6 + i * 0.1), ease: 'easeInOut' }}
                  />
                  {!reduce && p.value > 0 && [0, 0.8, 1.6].map(off => (
                    <circle key={off} r={4} fill={`hsl(${p.color})`} opacity={0.9}>
                      <animateMotion dur="2.4s" begin={`${1.4 + i * 0.1 + off}s`} repeatCount="indefinite" path={path} />
                    </circle>
                  ))}
                </g>
              );
            })}
          </svg>

          {/* Pillars with side branches */}
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
            {pillars.map((p, i) => {
              const pct = Math.round((p.takeHome / net) * 100);
              const base = 1.2 + i * 0.1;
              return (
                <div key={p.label} className="flex flex-col items-stretch">
                  <motion.div
                    initial={{ y: 14, opacity: 0, scale: 0.85 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 16, delay: d(base) }}
                    className="rounded-md border-2 bg-card/70 px-1.5 py-1.5 text-center"
                    style={{ borderColor: `hsl(${p.color} / 0.55)`, boxShadow: `0 0 18px hsl(${p.color} / 0.18)` }}
                  >
                    <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-bold leading-tight">{p.label}</div>
                    <div className="font-mono text-xs sm:text-sm font-bold" style={{ color: `hsl(${p.color})` }}>
                      <AnimatedNumber from={0} value={p.value} duration={reduce ? 0 : 900} formatFn={fmt} />
                    </div>
                    {!compact && <div className="text-[9px] text-muted-foreground">{pct}% of take-home{p.value > p.takeHome ? ' + payroll' : ''}</div>}
                  </motion.div>

                  {!compact && p.leaves.length > 0 && (
                    <div className="relative mt-1 ml-3 pl-0">
                      {/* Stem */}
                      <motion.div
                        className="absolute left-0 top-0 w-[2px] rounded-full origin-top"
                        style={{ background: `hsl(${p.color} / 0.7)`, height: 'calc(100% - 12px)' }}
                        initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                        transition={{ duration: d(0.5), delay: d(base + 0.35) }}
                      />
                      <div className="space-y-1.5 pt-1.5">
                        {p.leaves.map((l, j) => {
                          const delay = d(base + 0.5 + j * 0.15);
                          return (
                            <div key={l.label + j} className="relative flex items-center">
                              {/* Twig */}
                              <motion.div
                                className="h-[2px] w-3 shrink-0 origin-left"
                                style={{ background: `hsl(${p.color} / 0.7)` }}
                                initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                                transition={{ duration: d(0.25), delay }}
                              />
                              <motion.div
                                initial={{ opacity: 0, x: -6, scale: 0.9 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: d(Number(delay) + 0.15) }}
                                className={`min-w-0 flex-1 rounded border bg-background/60 px-1.5 py-1 ${/other (bills|debts)/i.test(l.label) ? 'cursor-pointer hover:bg-muted/40 underline decoration-dotted' : ''}`}
                                style={{ borderColor: `hsl(${p.color} / 0.3)` }}
                                onClick={/other (bills|debts)/i.test(l.label) ? () => setShowAll(true) : undefined}
                                role={/other (bills|debts)/i.test(l.label) ? 'button' : undefined}
                                title={/other (bills|debts)/i.test(l.label) ? 'Tap to show each one' : undefined}
                              >
                                <div className="truncate text-[9px] sm:text-[10px] text-muted-foreground leading-tight" title={l.label}>{l.label}</div>
                                <div className="font-mono text-[10px] sm:text-[11px] font-semibold" style={{ color: `hsl(${p.color})` }}>
                                  <AnimatedNumber from={0} value={l.value} duration={reduce ? 0 : 700} formatFn={fmt} />
                                </div>
                              </motion.div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
