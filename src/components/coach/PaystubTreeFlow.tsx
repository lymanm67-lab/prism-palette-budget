import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Play, ArrowDown, Building2, CalendarDays, Check, ChevronRight, CircleDollarSign, ReceiptText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AnimatedNumber from '@/components/AnimatedNumber';
import PaycheckSplitAnimation from '@/components/coach/PaycheckSplitAnimation';
import { useHouseholdProfile } from '@/hooks/use-household-profile';
import type { PaycheckDeployment } from '@/hooks/use-paycheck-deploy';

const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

// September 2026 IU payroll lines. Employer contributions are excluded because they do not reduce take-home pay.
const LYMAN_LINES = [
  { group: 'Taxes', label: 'Federal withholding', amount: 79.20 },
  { group: 'Taxes', label: 'Medicare', amount: 79.37 },
  { group: 'Taxes', label: 'Social Security', amount: 339.37 },
  { group: 'Taxes', label: 'Ohio withholding', amount: 132.06 },
  { group: 'Before-tax benefits', label: 'Medical, dental & accident', amount: 148.99 },
  { group: 'Before-tax investing', label: 'Tax Deferred Account', amount: 100.00 },
  { group: 'Before-tax investing', label: 'IU 457(b)', amount: 75.00 },
  { group: 'Before-tax investing', label: 'Health Savings Account', amount: 116.67 },
  { group: 'After-tax benefits', label: 'Life, critical illness & disability', amount: 146.07 },
  { group: 'After-tax investing', label: 'Roth TDA', amount: 85.00 },
  { group: 'After-tax investing', label: 'Roth 457(b)', amount: 75.00 },
];

type Who = 'lyman' | 'kateri';

export default function PaystubTreeFlow({ deployment }: { deployment: PaycheckDeployment }) {
  const { data: profile } = useHouseholdProfile();
  const reduce = useReducedMotion();
  const [who, setWho] = useState<Who>('lyman');
  const [run, setRun] = useState(0);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);

  const isL = who === 'lyman';
  const checks = isL ? 1 : 2;
  const gross = Number(isL ? profile?.lyman_gross_monthly : profile?.kateri_gross_monthly) / checks || 0;
  const net = Number(isL ? profile?.lyman_net_monthly : profile?.kateri_net_monthly) / checks || 0;
  if (gross <= 0 || net <= 0) return null;

  const base = isL ? LYMAN_LINES : [];
  const listed = base.reduce((s, l) => s + l.amount, 0);
  const gap = Math.round((gross - net - listed) * 100) / 100;
  const lines = [...base];
  if (Math.abs(gap) >= 0.01) {
    lines.push({
      group: isL ? 'Adjustment' : 'Taxes & deductions',
      label: isL ? 'Other September payroll adjustments' : 'Not itemized — upload a stub to break this out',
      amount: gap,
    });
  }

  const step = reduce ? 0 : 0.35;
  const netDelay = (lines.length + 1) * step + 0.2;
  const treeDeployment = { ...deployment, net_amount: Math.round(net * 100) / 100 };
  const deductions = Math.max(0, gross - net);
  const takeHomePct = Math.min(100, Math.max(0, (net / gross) * 100));

  const replay = () => {
    setSelectedLine(null);
    setRun(r => r + 1);
  };

  return (
    <div className="space-y-3" key={run}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          {(['lyman', 'kateri'] as Who[]).map(w => (
            <Button key={w} size="sm" variant={who === w ? 'default' : 'outline'} className="h-8 text-xs" onClick={() => { setWho(w); setSelectedLine(null); setRun(r => r + 1); }}>
              <span>{w === 'lyman' ? 'Lyman · Indiana University' : 'Kateri · State of Ohio – DODD'}</span>
            </Button>
          ))}
        </div>
        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={replay}>
          <span className="flex items-center gap-1"><Play className="h-3 w-3" /> Replay from paystub</span>
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: step || 0.01 }}
        className="group/paystub relative mx-auto max-w-2xl py-2 sm:px-3"
      >
        <div className="absolute inset-3 translate-x-2 translate-y-2 rounded-lg border border-border/30 bg-muted/30 transition-transform duration-500 group-hover/paystub:translate-x-3 group-hover/paystub:translate-y-3" />
        <div className="absolute inset-2 rounded-lg bg-prism-teal/10 blur-xl transition-opacity duration-500 group-hover/paystub:opacity-80" />
        <div className="relative overflow-hidden rounded-lg border border-prism-teal/30 bg-card/95 font-mono text-xs shadow-xl transition-transform duration-500 group-hover/paystub:-translate-y-1">
          <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-prism-teal/10 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-md border border-prism-teal/25 bg-prism-teal/10 text-prism-teal">
                <Building2 className="h-4 w-4" />
              </span>
              <div>
                <p className="font-bold text-foreground">{isL ? 'INDIANA UNIVERSITY' : 'STATE OF OHIO – DODD'}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <ReceiptText className="h-3 w-3" /> {isL ? 'September 2026 earnings statement' : 'Earnings statement'}
                </p>
              </div>
            </div>
            <div className="text-right text-muted-foreground">
              <p className="font-semibold text-foreground">{isL ? 'Monthly' : 'Semi-monthly'}</p>
              <p className="mt-0.5 flex items-center justify-end gap-1 text-[10px]"><CalendarDays className="h-3 w-3" /> {deployment.pay_date}</p>
            </div>
          </div>

          <div className="relative px-4 py-4 sm:px-5">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Gross earnings</p>
                <p className="mt-1 text-xl font-bold text-foreground">{money(gross)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase text-muted-foreground">Taxes & deductions</p>
                <p className="mt-1 font-semibold text-prism-rose">−{money(deductions)}</p>
              </div>
            </div>

            <div className="mb-4 overflow-hidden rounded-full bg-muted/70" aria-label={`${Math.round(takeHomePct)} percent of gross pay is take-home pay`}>
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${takeHomePct}%` }} transition={{ delay: netDelay / 2, duration: reduce ? 0 : 0.9, ease: 'easeOut' }}
                className="h-2 bg-prism-teal"
              />
            </div>

            <p className="mb-2 text-[10px] uppercase text-muted-foreground">Tap a deduction to inspect it</p>
            <div className="space-y-1.5">
              {lines.map((l, i) => {
                const selected = selectedLine === i;
                return (
                  <motion.button
                    type="button"
                    key={`${l.group}-${l.label}`}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: (i + 1) * step }}
                    onClick={() => setSelectedLine(selected ? null : i)}
                    className={`w-full rounded-md border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? 'border-prism-rose/35 bg-prism-rose/10' : 'border-transparent hover:border-border/60 hover:bg-muted/40'}`}
                    aria-expanded={selected}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 font-semibold text-foreground">
                          <ChevronRight className={`h-3 w-3 shrink-0 text-prism-rose transition-transform ${selected ? 'rotate-90' : ''}`} />
                          {l.group}
                        </span>
                        <span className={`mt-1 block pl-4.5 text-[10px] leading-relaxed text-muted-foreground ${selected ? '' : 'truncate'}`}>{l.label}</span>
                      </span>
                      <span className="shrink-0 font-semibold text-prism-rose">−{money(l.amount)}</span>
                    </span>
                    {selected && (
                      <motion.span initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2 flex items-center gap-1.5 border-t border-prism-rose/20 pt-2 pl-4.5 text-[10px] text-muted-foreground">
                        <Check className="h-3 w-3 text-prism-teal" /> Included in this paystub's gross-to-net calculation
                      </motion.span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: netDelay }}
            className="relative flex flex-wrap items-center justify-between gap-3 border-t border-prism-teal/25 bg-prism-teal/10 px-4 py-3 sm:px-5">
            <span className="flex items-center gap-2 font-sans text-sm font-bold text-prism-teal">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-prism-teal/15"><CircleDollarSign className="h-4 w-4" /></span>
              Net pay ready to deploy
            </span>
            <span className="text-xl font-bold text-prism-teal">
              <AnimatedNumber value={net} from={0} duration={reduce ? 0 : 900} formatFn={money} />
            </span>
          </motion.div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: netDelay + 0.25 }}
        className="relative mx-auto flex h-16 max-w-2xl items-center justify-center overflow-hidden text-prism-teal">
        <span className="absolute top-0 h-full w-px bg-prism-teal/35" />
        {!reduce && [0, 1, 2].map(i => (
          <motion.span key={i} className="absolute top-0 h-2 w-2 rounded-full bg-prism-teal"
            animate={{ y: [0, 56], opacity: [0, 1, 0] }} transition={{ duration: 1.25, repeat: Infinity, delay: i * 0.38, ease: 'easeInOut' }} />
        ))}
        <span className="absolute bottom-0 flex items-center gap-1 rounded-full border border-prism-teal/25 bg-card px-3 py-1 font-sans text-[10px] font-semibold uppercase">
          Deploying take-home <ArrowDown className="h-3 w-3" />
        </span>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: netDelay + 0.6 }}>
        <PaycheckSplitAnimation deployment={treeDeployment} />
      </motion.div>
    </div>
  );
}
