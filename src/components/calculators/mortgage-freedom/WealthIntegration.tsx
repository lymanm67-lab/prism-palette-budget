import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { PiggyBank, Scale } from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface WealthProps {
  monthlySurplus: number;
  mortgageRate: number;
  yearsToPayoff: number;         // remaining years on mortgage
  currentAge: number;
  retirementAge: number;
}

// Compare directing surplus to (a) mortgage payoff vs (b) tax-advantaged investing.
// Uses simple compounding — this is a *decision tool*, not a financial plan.
export default function WealthIntegration({ monthlySurplus, mortgageRate, yearsToPayoff, currentAge, retirementAge }: WealthProps) {
  const { formatCurrency } = useCurrency();
  const [allocationPct, setAllocationPct] = useState(50); // % of surplus to mortgage; rest to investing
  const [investReturn, setInvestReturn] = useState(7);    // conservative real return
  const [taxBracket, setTaxBracket] = useState(24);       // marginal federal + state
  const [itemizes, setItemizes] = useState(true);         // deduct mortgage interest?
  const horizonYears = Math.max(1, retirementAge - currentAge);

  // Effective mortgage rate after tax deduction
  const effectiveMortgageRate = itemizes ? mortgageRate * (1 - taxBracket / 100) : mortgageRate;

  const result = useMemo(() => {
    const surplus = Math.max(0, monthlySurplus);
    const toMortgage = surplus * (allocationPct / 100);
    const toInvest   = surplus - toMortgage;

    const mortgageYears = Math.min(yearsToPayoff, horizonYears);
    const mR = effectiveMortgageRate / 100 / 12;
    const mN = mortgageYears * 12;
    const mortgageFV = mR === 0 ? toMortgage * mN : toMortgage * ((Math.pow(1 + mR, mN) - 1) / mR);

    const iR = investReturn / 100 / 12;
    const iN = horizonYears * 12;
    const investFV = iR === 0 ? toInvest * iN : toInvest * ((Math.pow(1 + iR, iN) - 1) / iR);

    const combined = mortgageFV + investFV;

    const allMortgageFV = mR === 0 ? surplus * mN : surplus * ((Math.pow(1 + mR, mN) - 1) / mR);
    const allInvestFV   = iR === 0 ? surplus * iN : surplus * ((Math.pow(1 + iR, iN) - 1) / iR);

    return { toMortgage, toInvest, mortgageFV, investFV, combined, allMortgageFV, allInvestFV };
  }, [monthlySurplus, allocationPct, effectiveMortgageRate, investReturn, yearsToPayoff, horizonYears]);

  const chartData = [
    { name: 'All to mortgage', Mortgage: result.allMortgageFV, Investing: 0 },
    { name: 'Your mix', Mortgage: result.mortgageFV, Investing: result.investFV },
    { name: 'All to investing', Mortgage: 0, Investing: result.allInvestFV },
  ];

  const spread = investReturn - effectiveMortgageRate;
  const advice =
    spread >= 2 ? 'Investing has a meaningful edge over your effective mortgage rate — don\'t over-allocate to payoff.'
    : spread <= -1 ? 'Your effective mortgage rate beats expected returns — payoff wins the math.'
    : 'It\'s a coin flip on the math — pick based on risk tolerance and liquidity needs.';


  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Scale className="h-5 w-5 text-primary" /> Wealth Integration
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Mortgage payoff vs. investing — the classic tradeoff. Where should your surplus go?
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs flex justify-between">
                <span>Surplus split</span>
                <span className="text-primary font-mono">{allocationPct}% mortgage · {100 - allocationPct}% invest</span>
              </Label>
              <Slider value={[allocationPct]} min={0} max={100} step={5} onValueChange={(v) => setAllocationPct(v[0])} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs flex justify-between">
                <span>Expected investment return %/yr</span>
                <span className="text-primary font-mono">{investReturn.toFixed(1)}%</span>
              </Label>
              <Slider value={[investReturn]} min={2} max={12} step={0.5} onValueChange={(v) => setInvestReturn(v[0])} />
              <p className="text-[10px] text-muted-foreground">S&amp;P 500 long-term real ≈ 7%. Bonds ≈ 3–4%.</p>
            </div>

            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Tax deduction adjustment</Label>
                <button
                  type="button"
                  onClick={() => setItemizes(!itemizes)}
                  className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full border transition',
                    itemizes ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border'
                  )}
                >
                  {itemizes ? 'Itemizing' : 'Standard deduction'}
                </button>
              </div>
              {itemizes && (
                <div className="space-y-1">
                  <Label className="text-[10px] flex justify-between">
                    <span>Marginal tax bracket</span>
                    <span className="text-primary font-mono">{taxBracket}%</span>
                  </Label>
                  <Slider value={[taxBracket]} min={0} max={45} step={1} onValueChange={(v) => setTaxBracket(v[0])} />
                </div>
              )}
              <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                <span className="font-semibold text-foreground">Effective mortgage rate: </span>
                <span className="font-mono text-primary">{effectiveMortgageRate.toFixed(2)}%</span>
                {itemizes && <span> (was {mortgageRate.toFixed(2)}% before deduction)</span>}
                {!itemizes && <span className="block mt-0.5">Standard deduction means no mortgage-interest write-off — rate is unchanged.</span>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <Split label="To mortgage" value={formatCurrency(result.toMortgage)} sub="per month" />
              <Split label="To investing" value={formatCurrency(result.toInvest)} sub="per month" />
              <Split label="Mortgage FV" value={formatCurrency(result.mortgageFV)} sub={`${Math.min(yearsToPayoff, horizonYears).toFixed(0)}y at ${effectiveMortgageRate.toFixed(2)}%`} />
              <Split label="Investing FV" value={formatCurrency(result.investFV)} sub={`${horizonYears}y at ${investReturn}%`} />
            </div>


            <div className={cn(
              'rounded-lg border p-3 text-xs',
              spread >= 2 ? 'border-emerald-500/40 bg-emerald-500/5' :
              spread <= -1 ? 'border-primary/40 bg-primary/5' :
              'border-amber-500/40 bg-amber-500/5'
            )}>
              <div className="flex items-center gap-1.5 font-semibold mb-1">
                <PiggyBank className="h-3.5 w-3.5" /> Rate spread: {spread >= 0 ? '+' : ''}{spread.toFixed(1)}%
              </div>
              {advice}
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-card/50 p-3">
            <div className="text-xs font-semibold mb-2">Wealth at retirement (age {retirementAge})</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <RTooltip formatter={(v: any) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Mortgage" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Investing" stackId="a" fill="hsl(var(--emerald-500, 160 84% 39%))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-center text-xs">
              <span className="text-muted-foreground">Your mix total: </span>
              <span className="font-bold text-primary">{formatCurrency(result.combined)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Split({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/50 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-semibold mt-0.5">{value}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}
