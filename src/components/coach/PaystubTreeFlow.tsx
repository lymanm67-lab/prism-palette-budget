import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Play, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AnimatedNumber from '@/components/AnimatedNumber';
import PaycheckSplitAnimation from '@/components/coach/PaycheckSplitAnimation';
import { useHouseholdProfile } from '@/hooks/use-household-profile';
import type { PaycheckDeployment } from '@/hooks/use-paycheck-deploy';

const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

// Itemized lines from Lyman's IU stub (08/31/2026). Any gap vs the profile's current gross/net shows as its own line.
const LYMAN_LINES = [
  { group: 'Taxes', label: 'Federal / Medicare / Social Security / Ohio', amount: 620.05 },
  { group: 'Before-tax', label: 'Medical, dental & accident', amount: 187.95 },
  { group: 'Before-tax', label: 'TDA + 457(b) + HSA', amount: 431.67 },
  { group: 'After-tax', label: 'Insurance (life, CI, LTD)', amount: 146.98 },
  { group: 'After-tax', label: 'Roth TDA + Roth 457(b)', amount: 275.0 },
];

type Who = 'lyman' | 'kateri';

export default function PaystubTreeFlow({ deployment }: { deployment: PaycheckDeployment }) {
  const { data: profile } = useHouseholdProfile();
  const reduce = useReducedMotion();
  const [who, setWho] = useState<Who>('lyman');
  const [run, setRun] = useState(0);

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
      label: isL ? 'Change since last itemized stub' : 'Not itemized — upload a stub to break this out',
      amount: gap,
    });
  }

  const step = reduce ? 0 : 0.35;
  const netDelay = (lines.length + 1) * step + 0.2;
  const treeDeployment = { ...deployment, net_amount: Math.round(net * 100) / 100 };

  return (
    <div className="space-y-3" key={run}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          {(['lyman', 'kateri'] as Who[]).map(w => (
            <Button key={w} size="sm" variant={who === w ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => { setWho(w); setRun(r => r + 1); }}>
              <span>{w === 'lyman' ? 'Lyman · Indiana University' : 'Kateri · State of Ohio – DODD'}</span>
            </Button>
          ))}
        </div>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setRun(r => r + 1)}>
          <span className="flex items-center gap-1"><Play className="h-3 w-3" /> Replay from paystub</span>
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: step || 0.01 }}
        className="mx-auto max-w-xl rounded-lg border border-border/60 bg-card/80 font-mono text-xs shadow-lg"
      >
        <div className="flex justify-between border-b border-dashed border-border/60 px-4 py-2">
          <span className="font-bold text-foreground">{isL ? 'INDIANA UNIVERSITY' : 'STATE OF OHIO – DODD'}</span>
          <span className="text-muted-foreground">{isL ? 'Monthly' : 'Semi-monthly'} · {deployment.pay_date}</span>
        </div>
        <div className="space-y-1 px-4 py-3">
          <div className="flex justify-between text-sm font-bold text-foreground">
            <span>Gross pay</span><span>{money(gross)}</span>
          </div>
          {lines.map((l, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: (i + 1) * step }}
              className="flex justify-between gap-3 text-muted-foreground">
              <span><span className="text-prism-rose">{l.group}</span> · {l.label}</span>
              <span className="text-prism-rose">−{money(l.amount)}</span>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: netDelay }}
          className="flex justify-between border-t border-dashed border-border/60 bg-prism-teal/10 px-4 py-2 text-sm font-bold text-prism-teal">
          <span>Net pay (take-home)</span>
          <AnimatedNumber value={net} from={0} duration={reduce ? 0 : 900} formatFn={money} />
        </motion.div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, y: [0, 6, 0] }} transition={{ delay: netDelay + 0.3, duration: 0.8 }}
        className="flex justify-center text-prism-teal">
        <ArrowDown className="h-5 w-5" />
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: netDelay + 0.6 }}>
        <PaycheckSplitAnimation deployment={treeDeployment} />
      </motion.div>
    </div>
  );
}
