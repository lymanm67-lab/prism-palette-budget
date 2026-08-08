import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, DoorOpen, Sparkles } from 'lucide-react';

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

interface Props {
  /** Annual lifestyle expenses (from the FIRE calculator) */
  annualExpenses: number;
  /** Safe withdrawal rate, in percent */
  swr: number;
  /** Current invested assets */
  current: number;
  /** Monthly contribution */
  monthlySave: number;
  /** Expected annual return, percent */
  returnPct: number;
}

type Gate = {
  key: string;
  name: string;
  subtitle: string;
  monthlyNeed: number;
  blurb: string;
};

function monthsToReach(target: number, current: number, monthly: number, annualReturn: number) {
  if (current >= target) return 0;
  const m = annualReturn / 100 / 12;
  let bal = current;
  let months = 0;
  const MAX = 12 * 60;
  while (bal < target && months < MAX) {
    bal = bal * (1 + m) + monthly;
    months++;
  }
  return months < MAX ? months : null;
}

export default function GatewaysLadder({ annualExpenses, swr, current, monthlySave, returnPct }: Props) {
  const [takeHome, setTakeHome] = useState<number>(() => Math.round((annualExpenses / 12) * 1.25));
  const [essentialsPct, setEssentialsPct] = useState(60);
  const [freedomMultiple, setFreedomMultiple] = useState(1.25);

  const rate = (swr || 4) / 100;
  const monthlyLifestyle = annualExpenses / 12;

  const gates: Gate[] = useMemo(() => [
    {
      key: 'stability',
      name: 'Financial Stability',
      subtitle: 'Surviving',
      monthlyNeed: monthlyLifestyle * (essentialsPct / 100),
      blurb: 'Housing, utilities, food, insurance, transportation and minimum debt payments are covered without earned income.',
    },
    {
      key: 'security',
      name: 'Financial Security',
      subtitle: 'Lifestyle',
      monthlyNeed: monthlyLifestyle,
      blurb: 'Essentials plus your current discretionary lifestyle — dining, travel, subscriptions, giving.',
    },
    {
      key: 'independence',
      name: 'Financial Independence',
      subtitle: 'Replace income',
      monthlyNeed: takeHome || monthlyLifestyle,
      blurb: 'Portfolio income fully replaces your take-home pay. Work becomes optional.',
    },
    {
      key: 'freedom',
      name: 'Financial Freedom',
      subtitle: 'Assets fund your life',
      monthlyNeed: (takeHome || monthlyLifestyle) * freedomMultiple,
      blurb: 'Your assets fund an expanded, chosen lifestyle with margin on top.',
    },
  ], [monthlyLifestyle, essentialsPct, takeHome, freedomMultiple]);

  const rows = gates.map(g => {
    const annualNeed = g.monthlyNeed * 12;
    const target = rate > 0 ? annualNeed / rate : 0;
    const passiveMonthly = (current * rate) / 12;
    const coverage = g.monthlyNeed > 0 ? (passiveMonthly / g.monthlyNeed) * 100 : 0;
    const progress = target > 0 ? Math.min(100, (current / target) * 100) : 0;
    const gap = Math.max(0, target - current);
    const months = monthsToReach(target, current, monthlySave, returnPct);
    return { ...g, annualNeed, target, coverage, progress, gap, months, passiveMonthly };
  });

  const passedIdx = rows.reduce((acc, r, i) => (r.coverage >= 100 ? i : acc), -1);
  const currentGate = passedIdx >= 0 ? rows[passedIdx] : null;
  const nextGate = rows[passedIdx + 1] ?? null;
  const multiple = rate > 0 ? 1 / rate : 25;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DoorOpen className="h-5 w-5 text-primary" /> Four Financial Gateways
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-primary/10 p-4">
          <div className="text-sm text-muted-foreground">
            {currentGate ? `You've passed Gateway ${passedIdx + 1} of 4` : 'You have not yet cleared Gateway 1'}
          </div>
          <div className="text-2xl font-bold text-primary">
            {currentGate ? currentGate.name : 'Financial Stability in progress'}
          </div>
          {nextGate && (
            <div className="text-sm mt-1">
              Next: <strong>{nextGate.name}</strong> — {fmt(nextGate.target)} target, {fmt(nextGate.gap)} to go
              {nextGate.months != null && <> · about {(nextGate.months / 12).toFixed(1)} years at {fmt(monthlySave)}/mo</>}
            </div>
          )}
          <div className="text-xs text-muted-foreground mt-2">
            Every gateway uses the same math: monthly need × 12 ÷ {swr}% = annual need × {multiple.toFixed(1)}.
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <Label>Monthly take-home pay</Label>
            <Input type="number" value={takeHome} onChange={e => setTakeHome(+e.target.value)} />
          </div>
          <div>
            <Label>Essentials as % of lifestyle</Label>
            <Input type="number" value={essentialsPct} onChange={e => setEssentialsPct(+e.target.value)} />
          </div>
          <div>
            <Label>Freedom lifestyle multiple</Label>
            <Input type="number" step="0.05" value={freedomMultiple} onChange={e => setFreedomMultiple(+e.target.value)} />
          </div>
        </div>

        <div className="space-y-3">
          {rows.map((r, i) => {
            const passed = r.coverage >= 100;
            const isNext = !passed && i === passedIdx + 1;
            return (
              <div
                key={r.key}
                className={`rounded-lg border p-4 ${
                  isNext ? 'border-primary/60 bg-primary/5' : passed ? 'border-border bg-muted/30' : 'border-border/50 opacity-80'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {passed ? <CheckCircle2 className="h-5 w-5 text-prism-teal" />
                      : isNext ? <Sparkles className="h-5 w-5 text-prism-amber" />
                      : <Circle className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground">Gateway {i + 1}</span>
                      <h3 className="text-sm font-semibold">{r.name}</h3>
                      <Badge variant="outline" className="text-[10px]">{r.subtitle}</Badge>
                      {isNext && <Badge className="text-[10px] bg-prism-amber text-black">Next</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{r.blurb}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">
                      <div><div className="text-muted-foreground">Monthly need</div><div className="font-semibold">{fmt(r.monthlyNeed)}</div></div>
                      <div><div className="text-muted-foreground">Annual need</div><div className="font-semibold">{fmt(r.annualNeed)}</div></div>
                      <div><div className="text-muted-foreground">Target number</div><div className="font-semibold text-primary">{fmt(r.target)}</div></div>
                      <div><div className="text-muted-foreground">Years away</div><div className="font-semibold">{r.months === 0 ? 'Reached' : r.months == null ? '> 60' : (r.months / 12).toFixed(1)}</div></div>
                    </div>
                    <Progress value={r.progress} className="mt-3" />
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {r.progress.toFixed(1)}% funded · income covers {Math.min(999, r.coverage).toFixed(0)}% of this gateway · {fmt(r.gap)} to go
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
          Portfolio income at {swr}% today: <strong className="text-foreground">{fmt((current * rate) / 12)}/mo</strong>.
          Adding $500/mo would reach {nextGate ? nextGate.name : 'Financial Freedom'} in{' '}
          <strong className="text-foreground">
            {(() => {
              const g = nextGate ?? rows[3];
              const m = monthsToReach(g.target, current, monthlySave + 500, returnPct);
              return m == null ? '> 60 years' : `${(m / 12).toFixed(1)} years`;
            })()}
          </strong>.
        </div>
      </CardContent>
    </Card>
  );
}
