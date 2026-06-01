import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { projectAllRedirects, type RedirectDestination } from '@/lib/wealth-projection';
import { TrendingUp, Flame, ShieldCheck, HeartPulse, PiggyBank, LineChart, Target } from 'lucide-react';

const ICONS: Record<RedirectDestination, any> = {
  debt: Flame,
  ef: ShieldCheck,
  hsa: HeartPulse,
  roth: TrendingUp,
  brokerage: LineChart,
  savings: PiggyBank,
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

interface Props {
  initialMonthly?: number;
  label?: string;
}

export function WealthRedirector({ initialMonthly = 50, label = 'Redirect amount' }: Props) {
  const [monthly, setMonthly] = useState(initialMonthly);
  const projections = useMemo(() => projectAllRedirects(monthly || 0), [monthly]);
  const best = projections.reduce((a, b) => (b.threeYear > a.threeYear ? b : a), projections[0]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-prism-lime" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">$
          <Input
            type="number"
            value={monthly}
            onChange={e => setMonthly(Math.max(0, Number(e.target.value) || 0))}
            className="h-7 w-24 font-mono"
          />
          <span>/mo</span>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {projections.map(p => {
          const Icon = ICONS[p.destination];
          const isBest = p.destination === best.destination && monthly > 0;
          return (
            <Card key={p.destination} className={`p-2.5 bg-background/40 border-border/40 ${isBest ? 'border-prism-lime/40 bg-prism-lime/5' : ''}`}>
              <div className="flex items-start gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-background/60 border border-border/40">
                  <Icon className={`h-3.5 w-3.5 ${isBest ? 'text-prism-lime' : 'text-prism-teal'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold truncate">{p.label}</span>
                    {isBest && (
                      <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-prism-lime/10 border-prism-lime/30 text-prism-lime">
                        Strongest 3-yr
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="font-mono text-sm font-bold">{fmt(p.threeYear)}</span>
                    <span className="text-[10px] text-muted-foreground">in 3 yrs · {(p.apr * 100).toFixed(1)}% APR</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">1-yr: {fmt(p.oneYear)}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground italic">
        Projections assume consistent monthly contribution and listed average APR. Educational only — actual returns vary.
      </p>
    </div>
  );
}
