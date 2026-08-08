import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { Target, ArrowRight } from 'lucide-react';

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;
const EXP_KEY = 'prism.fire.annualExpenses';
const INC_KEY = 'prism.fire.guaranteedIncome';

interface Props {
  /** Investable / retirement assets that can fund withdrawals */
  investedAssets: number;
  /** Guaranteed lifetime income per month (Social Security, pensions) */
  guaranteedMonthly?: number;
}

type IncomeState = {
  scope: 'individual' | 'household';
  mySs: number;
  spouseSs: number;
  spousePension: number;
  other: number;
};

export default function FireNumberCard({ investedAssets, guaranteedMonthly = 0 }: Props) {
  const [annualExpenses, setAnnualExpenses] = useState<number>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(EXP_KEY) : null;
    const n = saved ? Number(saved) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 72000;
  });
  const [swr, setSwr] = useState(4);
  const [income, setIncome] = useState<IncomeState>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(INC_KEY) : null;
    if (saved) {
      try { return { scope: 'household', mySs: 0, spouseSs: 0, spousePension: 0, other: 0, ...JSON.parse(saved) }; } catch { /* ignore */ }
    }
    return { scope: 'household', mySs: 0, spouseSs: 0, spousePension: 0, other: guaranteedMonthly || 0 };
  });

  const setExpenses = (v: number) => {
    setAnnualExpenses(v);
    if (v > 0) window.localStorage.setItem(EXP_KEY, String(v));
  };

  const setInc = (patch: Partial<IncomeState>) => {
    setIncome(prev => {
      const next = { ...prev, ...patch };
      window.localStorage.setItem(INC_KEY, JSON.stringify(next));
      return next;
    });
  };

  const isHousehold = income.scope === 'household';
  const guaranteed = isHousehold
    ? income.mySs + income.spouseSs + income.spousePension + income.other
    : income.mySs + income.other;

  const r = useMemo(() => {
    const rate = (swr || 4) / 100;
    const monthly = annualExpenses / 12;
    const gateways = [
      { name: 'Stability', sub: 'Surviving', monthly: monthly * 0.6 },
      { name: 'Security', sub: 'Lifestyle', monthly },
      { name: 'Independence', sub: 'Replace income', monthly: monthly * 1.25 },
      { name: 'Freedom', sub: 'Assets fund life', monthly: monthly * 1.5 },
    ].map(g => {
      const grossTarget = (g.monthly * 12) / rate;
      const net = Math.max(0, g.monthly - guaranteed);
      const target = (net * 12) / rate;
      const coverage = g.monthly > 0 ? (((investedAssets * rate) / 12 + guaranteed) / g.monthly) * 100 : 0;
      return { ...g, grossTarget, target, coverage, progress: target > 0 ? Math.min(100, (investedAssets / target) * 100) : 100 };
    });
    const fireNumber = annualExpenses / rate;
    const adjusted = Math.max(0, (annualExpenses - guaranteed * 12)) / rate;
    const passedIdx = gateways.reduce((acc, g, i) => (g.coverage >= 100 ? i : acc), -1);
    return { fireNumber, adjusted, gateways, passedIdx, monthlyPassive: (investedAssets * rate) / 12 };
  }, [annualExpenses, swr, investedAssets, guaranteed]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> FIRE Number &amp; Financial Gateways</span>
          <Link to="/calculators" className="text-xs font-normal text-primary inline-flex items-center gap-1 hover:underline">
            Full calculator <ArrowRight className="h-3 w-3" />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Annual retirement expenses</Label>
            <Input type="number" value={annualExpenses} onChange={e => setExpenses(+e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Withdrawal rate %</Label>
            <Input type="number" step="0.25" value={swr} onChange={e => setSwr(+e.target.value)} />
          </div>
          <div className="rounded-lg bg-primary/10 p-3">
            <div className="text-[11px] text-muted-foreground">FIRE number</div>
            <div className="text-xl font-bold text-primary">{fmt(r.fireNumber)}</div>
            {guaranteedMonthly > 0 && (
              <div className="text-[10px] text-prism-teal">{fmt(r.adjusted)} after guaranteed income</div>
            )}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Invested assets {fmt(investedAssets)} produce <strong className="text-foreground">{fmt(r.monthlyPassive)}/mo</strong>
          {guaranteedMonthly > 0 && <> plus <strong className="text-foreground">{fmt(guaranteedMonthly)}/mo</strong> guaranteed</>} at {swr}%.
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {r.gateways.map((g, i) => (
            <div key={g.name} className={`rounded-lg border p-3 ${i === r.passedIdx + 1 ? 'border-primary/60 bg-primary/5' : 'border-border/60'}`}>
              <div className="text-[11px] text-muted-foreground">Gateway {i + 1} · {g.sub}</div>
              <div className="text-sm font-semibold">{g.name}</div>
              <div className="text-base font-bold text-primary mt-1">{fmt(g.target)}</div>
              {g.target < g.grossTarget && <div className="text-[10px] text-prism-teal">was {fmt(g.grossTarget)}</div>}
              <Progress value={g.progress} className="mt-2 h-1.5" />
              <div className="text-[10px] text-muted-foreground mt-1">{g.coverage >= 100 ? 'Covered' : `${g.progress.toFixed(0)}% funded`}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
