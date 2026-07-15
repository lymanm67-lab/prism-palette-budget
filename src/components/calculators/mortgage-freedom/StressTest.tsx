import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Shield, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/use-currency';

interface StressTestProps {
  helocRate: number;
  helocBalance: number;    // current HELOC draw
  monthlySurplus: number;
  monthlyExpenses: number;
}

// Simulates 3 axes of HELOC risk:
//  - rate shock (Fed hikes)
//  - income drop (job loss / reduction)
//  - expense spike (medical / repairs)
// Emits payoff-time delta, worst-month cash flow, and a survivability score.
export default function StressTest({ helocRate, helocBalance, monthlySurplus, monthlyExpenses }: StressTestProps) {
  const { formatCurrency } = useCurrency();
  const [rateShock, setRateShock] = useState(2.0);      // +percent
  const [incomeDrop, setIncomeDrop] = useState(0);      // % drop
  const [expenseSpike, setExpenseSpike] = useState(0);  // $/mo added
  const [shockMonths, setShockMonths] = useState(6);

  const result = useMemo(() => {
    const shockedRate = helocRate + rateShock;
    const shockedSurplus = monthlySurplus * (1 - incomeDrop / 100) - expenseSpike;
    const baseInterest = (helocBalance * (helocRate / 100)) / 12;
    const shockedInterest = (helocBalance * (shockedRate / 100)) / 12;
    const extraInterestPerMo = shockedInterest - baseInterest;
    const cashFlowGap = shockedSurplus - shockedInterest;
    const shockCost = (shockedInterest - baseInterest) * shockMonths + (monthlySurplus - shockedSurplus) * shockMonths;

    // Survivability: 100 if surplus still positive at peak stress; scale down.
    const buffer = monthlyExpenses > 0 ? cashFlowGap / monthlyExpenses : 0;
    let survivability = 100;
    if (cashFlowGap < 0) survivability = Math.max(0, 100 + (buffer * 100));
    else if (cashFlowGap < monthlyExpenses * 0.25) survivability = 60 + (buffer / 0.25) * 40;

    return {
      shockedRate,
      shockedSurplus,
      shockedInterest,
      extraInterestPerMo,
      cashFlowGap,
      shockCost,
      survivability: Math.round(survivability),
      severity: survivability >= 80 ? 'safe' : survivability >= 50 ? 'caution' : 'danger',
    };
  }, [helocRate, helocBalance, monthlySurplus, monthlyExpenses, rateShock, incomeDrop, expenseSpike, shockMonths]);

  const severityStyle = {
    safe:    'border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400',
    caution: 'border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400',
    danger:  'border-rose-500/40 bg-rose-500/5 text-rose-700 dark:text-rose-400',
  }[result.severity];

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-amber-500" /> HELOC Stress Test
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          What happens if rates spike, you lose income, or a big expense hits? Simulate the worst before it happens.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <StressSlider
              label="Rate shock (+%)"
              value={rateShock} min={0} max={6} step={0.25}
              display={`+${rateShock.toFixed(2)}%  →  ${result.shockedRate.toFixed(2)}%`}
              onChange={setRateShock}
              hint="Prime + margin. 2008: +5%. 2022: +4.25%."
            />
            <StressSlider
              label="Income drop"
              value={incomeDrop} min={0} max={100} step={5}
              display={`-${incomeDrop}%`}
              onChange={setIncomeDrop}
              hint="Job loss = 100%. Furlough / reduction = 20–50%."
            />
            <StressSlider
              label="Expense spike ($/mo)"
              value={expenseSpike} min={0} max={5000} step={100}
              display={`+${formatCurrency(expenseSpike)}`}
              onChange={setExpenseSpike}
              hint="Medical, roof, HVAC, family emergency."
            />
            <StressSlider
              label="Shock duration (months)"
              value={shockMonths} min={1} max={24} step={1}
              display={`${shockMonths} mo`}
              onChange={setShockMonths}
            />
          </div>

          <div className="space-y-3">
            <div className={cn('rounded-2xl border p-4', severityStyle)}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase tracking-wider">Survivability</div>
                {result.severity === 'safe' ? <Shield className="h-4 w-4" /> :
                 result.severity === 'caution' ? <TrendingUp className="h-4 w-4" /> :
                 <AlertTriangle className="h-4 w-4" />}
              </div>
              <div className="text-4xl font-bold">{result.survivability}/100</div>
              <div className="text-xs mt-1">
                {result.severity === 'safe' && 'You could absorb this shock without breaking the plan.'}
                {result.severity === 'caution' && 'Cash flow gets tight — need reserves to bridge the shock.'}
                {result.severity === 'danger' && 'This shock would break the plan — you\'d bleed reserves fast.'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <MiniStat label="New HELOC int/mo" value={formatCurrency(result.shockedInterest)} />
              <MiniStat label="Extra int/mo" value={formatCurrency(result.extraInterestPerMo)} bad={result.extraInterestPerMo > 0} />
              <MiniStat label="Post-shock surplus" value={formatCurrency(result.shockedSurplus)} bad={result.shockedSurplus < 0} />
              <MiniStat label="Cash-flow gap" value={formatCurrency(result.cashFlowGap)} bad={result.cashFlowGap < 0} />
            </div>

            <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-xs">
              <div className="font-semibold mb-1">Total shock cost over {shockMonths} mo</div>
              <div className="text-lg font-bold text-rose-500">{formatCurrency(Math.max(0, result.shockCost))}</div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Combined extra interest + lost surplus. Keep this much (or more) in liquid reserves before using a HELOC aggressively.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StressSlider({ label, value, min, max, step, display, onChange, hint }: any) {
  return (
    <div className="space-y-2">
      <Label className="text-xs flex justify-between">
        <span>{label}</span>
        <span className="text-primary font-mono">{display}</span>
      </Label>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} />
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function MiniStat({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className={cn('rounded-lg border p-2', bad ? 'border-rose-500/40 bg-rose-500/5' : 'border-border/50 bg-card/50')}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn('font-semibold mt-0.5', bad && 'text-rose-500')}>{value}</div>
    </div>
  );
}
