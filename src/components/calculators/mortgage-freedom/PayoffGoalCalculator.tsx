import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingDown, Zap, AlertTriangle, CheckCircle2, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFinancialProfile, profileNumbers } from '@/hooks/use-financial-profile';
import { useCurrency } from '@/hooks/use-currency';
import AnimatedNumber from '@/components/AnimatedNumber';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { simulateHelocAccel, simulateTraditional } from '@/lib/mortgage-freedom/simulators';

// ─── Math helpers ───────────────────────────────────────────────────────────

/** Monthly payment required to fully amortize `balance` at annual rate `apr%` in `months`. */
function requiredPayment(balance: number, apr: number, months: number) {
  const r = apr / 100 / 12;
  if (r === 0) return balance / months;
  return (balance * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

/** Simulate extra-principal payoff, return months to zero. */
function payoffMonths(balance: number, apr: number, monthlyPayment: number, maxMonths = 720) {
  const r = apr / 100 / 12;
  let bal = balance;
  for (let m = 1; m <= maxMonths; m++) {
    const interest = bal * r;
    const principal = monthlyPayment - interest;
    if (principal <= 0) return Infinity; // payment can't cover interest
    bal = Math.max(0, bal - principal);
    if (bal <= 0.01) return m;
  }
  return Infinity;
}

/** Total interest paid for extra-principal payoff. */
function totalInterestPaid(balance: number, apr: number, monthlyPayment: number, maxMonths = 720) {
  const r = apr / 100 / 12;
  let bal = balance;
  let total = 0;
  for (let m = 1; m <= maxMonths; m++) {
    const interest = bal * r;
    const principal = monthlyPayment - interest;
    if (principal <= 0) return Infinity;
    total += interest;
    bal = Math.max(0, bal - principal);
    if (bal <= 0.01) return total;
  }
  return total;
}

// ─── Component ──────────────────────────────────────────────────────────────

interface Props {
  /** Optional overrides — otherwise defaults come from the financial profile. */
  initialBalance?: number;
  initialRate?: number;
}

export default function PayoffGoalCalculator({ initialBalance, initialRate }: Props = {}) {
  const { profile } = useFinancialProfile();
  const p = profileNumbers(profile);
  const { formatCurrency } = useCurrency();

  // ── Inputs
  const [balance, setBalance] = useState(initialBalance ?? p.mortgageBalance ?? 350000);
  const [rate, setRate] = useState(initialRate ?? 6.5);
  const [currentPayment, setCurrentPayment] = useState<number>(0);
  const [helocRate, setHelocRate] = useState(8.5);
  const [surplus, setSurplus] = useState<number>(0);
  const [targetYears, setTargetYears] = useState(7);

  // Seed payment + surplus from profile once
  useEffect(() => {
    if (currentPayment === 0) {
      const r = rate / 100 / 12;
      const n = 30 * 12;
      const est = Math.round((balance * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
      setCurrentPayment(est);
    }
    if (surplus === 0 && p.netSurplus > 0) setSurplus(Math.round(p.netSurplus));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const targetMonths = targetYears * 12;

  // ── Method A: Extra Principal
  const methodA = useMemo(() => {
    const required = requiredPayment(balance, rate, targetMonths);
    const extraNeeded = Math.max(0, required - currentPayment);
    const gap = extraNeeded - surplus;
    const achievableWithSurplus = surplus >= extraNeeded;
    const totalInterest = totalInterestPaid(balance, rate, required);
    return {
      requiredPayment: required,
      extraNeeded,
      gap,
      achievableWithSurplus,
      totalInterest,
      years: targetYears,
    };
  }, [balance, rate, targetMonths, currentPayment, surplus, targetYears]);

  // ── Method B: HELOC 2nd-lien acceleration
  // Find smallest surplus that hits target using the existing chunking simulator.
  const methodB = useMemo(() => {
    const surplusNeeded = solveHelocSurplus(balance, rate, currentPayment, helocRate, targetMonths);
    const scenario = runHelocScenario(balance, rate, currentPayment, helocRate, surplus);
    return {
      surplusNeeded,
      surplusGap: Math.max(0, surplusNeeded - surplus),
      achievableWithSurplus: surplus >= surplusNeeded,
      currentSurplusPayoffYears: scenario.years,
      totalInterest: scenario.totalInterest,
      years: scenario.years,
    };
  }, [balance, rate, currentPayment, helocRate, surplus, targetMonths]);

  // ── Baseline: what you'd pay with only current payment
  const baseline = useMemo(() => ({
    months: payoffMonths(balance, rate, currentPayment),
    totalInterest: totalInterestPaid(balance, rate, currentPayment),
  }), [balance, rate, currentPayment]);

  // ── Winner
  const winner: 'A' | 'B' | 'tie' =
    methodA.totalInterest < methodB.totalInterest * 0.98 ? 'A'
    : methodB.totalInterest < methodA.totalInterest * 0.98 ? 'B'
    : 'tie';

  // ── Chart: three balance curves
  const chartData = useMemo(() => {
    const step = 3;
    const maxMonths = Math.max(targetMonths, 120);
    // Baseline schedule
    const rMo = rate / 100 / 12;
    const baseSched: number[] = [];
    let b = balance;
    for (let m = 0; m <= maxMonths; m++) {
      baseSched.push(b);
      const i = b * rMo;
      b = Math.max(0, b - (currentPayment - i));
      if (b <= 0) break;
    }
    // Extra principal schedule (required payment)
    const extraSched: number[] = [];
    let be = balance;
    for (let m = 0; m <= maxMonths; m++) {
      extraSched.push(be);
      const i = be * rMo;
      be = Math.max(0, be - (methodA.requiredPayment - i));
      if (be <= 0) break;
    }
    // HELOC schedule (at current surplus)
    const helocSched = runHelocScheduleOnly(balance, rate, currentPayment, helocRate, surplus, maxMonths);

    const out: any[] = [];
    for (let m = 0; m <= maxMonths; m += step) {
      out.push({
        year: (m / 12).toFixed(1),
        'Current pace': baseSched[m] ?? 0,
        'Extra Principal': extraSched[m] ?? 0,
        'HELOC': helocSched[m] ?? 0,
      });
    }
    return out;
  }, [balance, rate, currentPayment, helocRate, surplus, methodA.requiredPayment, targetMonths]);

  return (
    <Card className="glass-card border-primary/40 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Target className="h-6 w-6 text-primary" />
          Payoff Goal Calculator
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Pick your target — <span className="font-semibold text-foreground">"pay off in {targetYears} years"</span> — and see exactly how much extra cash it takes, comparing extra-principal vs HELOC acceleration.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ── Inputs ── */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <NumInput label="Current mortgage balance" prefix="$" value={balance} onChange={setBalance} />
            <div className="grid grid-cols-2 gap-3">
              <NumInput label="Rate %" step={0.125} value={rate} onChange={setRate} />
              <NumInput label="Monthly payment" prefix="$" value={currentPayment} onChange={setCurrentPayment} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumInput label="Monthly surplus" prefix="$" value={surplus} onChange={setSurplus} hint="Free cash after all bills" />
              <NumInput label="HELOC rate %" step={0.25} value={helocRate} onChange={setHelocRate} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Target payoff</Label>
                <span className="text-3xl font-bold text-primary tabular-nums">{targetYears} yr</span>
              </div>
              <Slider min={3} max={30} step={1} value={[targetYears]} onValueChange={(v) => setTargetYears(v[0])} />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>3 yr (aggressive)</span><span>15 yr</span><span>30 yr</span>
              </div>
            </div>

            <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Do nothing extra — payoff:</span>
                <span className="font-mono">
                  {isFinite(baseline.months) ? `${(baseline.months / 12).toFixed(1)} yr` : '—'}
                  {' · '}
                  {isFinite(baseline.totalInterest) ? formatCurrency(baseline.totalInterest) : '—'} int
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Two methods side by side ── */}
        <div className="grid md:grid-cols-2 gap-4">
          <MethodCard
            title="Method A: Extra Principal"
            subtitle="Add cash to your monthly payment"
            icon={TrendingDown}
            iconColor="text-emerald-500"
            gradient="from-emerald-500/10 to-transparent"
            isWinner={winner === 'A'}
            metrics={[
              { label: 'Payment needed', value: formatCurrency(methodA.requiredPayment), highlight: true },
              { label: 'Extra above current', value: formatCurrency(methodA.extraNeeded) },
              { label: 'Total interest', value: formatCurrency(methodA.totalInterest) },
              {
                label: 'Cash surplus check',
                value: methodA.achievableWithSurplus ? '✓ You have it' : `Need ${formatCurrency(methodA.gap)}/mo more`,
                good: methodA.achievableWithSurplus,
                bad: !methodA.achievableWithSurplus,
              },
            ]}
            verdict={
              methodA.achievableWithSurplus
                ? `Redirect ${formatCurrency(methodA.extraNeeded)}/mo of your ${formatCurrency(surplus)} surplus → mortgage. Simple, zero variable-rate risk.`
                : `You're short ${formatCurrency(methodA.gap)}/mo. Either extend the timeline, raise income, or cut expenses.`
            }
          />

          <MethodCard
            title="Method B: HELOC Acceleration"
            subtitle="2nd-lien HELOC chunks against principal"
            icon={Zap}
            iconColor="text-amber-500"
            gradient="from-amber-500/10 to-transparent"
            isWinner={winner === 'B'}
            metrics={[
              { label: 'Surplus needed', value: formatCurrency(methodB.surplusNeeded), highlight: true },
              { label: 'Your surplus', value: formatCurrency(surplus) },
              { label: 'Total interest', value: formatCurrency(methodB.totalInterest) },
              {
                label: `Payoff w/ ${formatCurrency(surplus)}/mo`,
                value: isFinite(methodB.currentSurplusPayoffYears) ? `${methodB.currentSurplusPayoffYears.toFixed(1)} yr` : '—',
                good: methodB.achievableWithSurplus,
                bad: !methodB.achievableWithSurplus && surplus > 0,
              },
            ]}
            verdict={
              methodB.achievableWithSurplus
                ? `Your ${formatCurrency(surplus)}/mo surplus sweeps a HELOC chunk against principal every ~4–6 months. Faster than raw extra-principal when done with discipline.`
                : `To hit ${targetYears} years you need ${formatCurrency(methodB.surplusNeeded)}/mo. You're ${formatCurrency(methodB.surplusGap)}/mo short.`
            }
          />
        </div>

        {/* ── Recommendation banner ── */}
        <div className={cn(
          'rounded-xl border p-4 flex items-start gap-3',
          !isFinite(methodA.requiredPayment) || methodA.extraNeeded > surplus * 3
            ? 'border-rose-500/40 bg-rose-500/5'
            : winner === 'A'
              ? 'border-emerald-500/40 bg-emerald-500/5'
              : winner === 'B'
                ? 'border-amber-500/40 bg-amber-500/5'
                : 'border-primary/40 bg-primary/5'
        )}>
          {(!isFinite(methodA.requiredPayment) || methodA.extraNeeded > surplus * 3) ? (
            <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
          ) : (
            <Trophy className={cn('h-5 w-5 shrink-0 mt-0.5', winner === 'A' ? 'text-emerald-500' : winner === 'B' ? 'text-amber-500' : 'text-primary')} />
          )}
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm">
              {!isFinite(methodA.requiredPayment) || methodA.extraNeeded > surplus * 3
                ? `${targetYears}-year payoff isn't realistic with today's numbers`
                : `Recommended: ${winner === 'A' ? 'Method A · Extra Principal' : winner === 'B' ? 'Method B · HELOC Acceleration' : 'Either method works'}`}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {!isFinite(methodA.requiredPayment) || methodA.extraNeeded > surplus * 3
                ? `To pay off ${formatCurrency(balance)} in ${targetYears} years you need ~${formatCurrency(methodA.extraNeeded)}/mo extra, but you only have ${formatCurrency(surplus)} surplus. Try 10–15 years, or grow surplus first.`
                : winner === 'A'
                  ? `Extra Principal saves ${formatCurrency(methodB.totalInterest - methodA.totalInterest)} vs HELOC — with zero variable-rate risk. Do this unless you're highly disciplined.`
                  : winner === 'B'
                    ? `HELOC Acceleration edges out by ${formatCurrency(methodA.totalInterest - methodB.totalInterest)} — but only if you keep surplus flowing and rates stay reasonable.`
                    : `Both methods land within 2% of each other. Pick Extra Principal for simplicity, HELOC for flexibility.`}
            </div>
          </div>
        </div>

        {/* ── Chart ── */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-4">
          <div className="text-sm font-semibold mb-2">Balance over time</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} label={{ value: 'Years', position: 'insideBottom', offset: -2, fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <RTooltip formatter={(v: any) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Current pace" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                <Line type="monotone" dataKey="Extra Principal" stroke="hsl(160 84% 39%)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="HELOC" stroke="hsl(38 92% 50%)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Break-even readout ── */}
        <BreakEvenLine
          balance={balance}
          mortgageRate={rate}
          currentPayment={currentPayment}
          surplus={surplus}
          helocRate={helocRate}
          methodATotalInterest={methodA.totalInterest}
        />
      </CardContent>
    </Card>
  );
}

// ─── Break-even helper ─────────────────────────────────────────────────────
function BreakEvenLine({ balance, mortgageRate, currentPayment, surplus, helocRate, methodATotalInterest }: {
  balance: number; mortgageRate: number; currentPayment: number; surplus: number; helocRate: number; methodATotalInterest: number;
}) {
  const { formatCurrency } = useCurrency();
  // Sweep HELOC rate downward from a very high value; find the rate at which HELOC total interest
  // first crosses below extra-principal total interest at the same surplus.
  const breakEven = useMemo(() => {
    if (surplus <= 0 || !isFinite(methodATotalInterest)) return null;
    let last = { rate: 20, interest: Infinity };
    for (let hr = 20; hr >= 1; hr -= 0.25) {
      const s = runHelocScenario(balance, mortgageRate, currentPayment, hr, surplus);
      if (s.totalInterest < methodATotalInterest) {
        // Crossover between hr (winner) and last.rate (loser)
        return { helocRate: hr, spread: mortgageRate - hr };
      }
      last = { rate: hr, interest: s.totalInterest };
    }
    return null;
  }, [balance, mortgageRate, currentPayment, surplus, methodATotalInterest]);

  if (!breakEven) {
    return (
      <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Break-even:</span> At your surplus of {formatCurrency(surplus)}/mo, HELOC never beats extra-principal for this loan — the discipline risk isn't worth it.
      </div>
    );
  }

  const spreadNote = breakEven.spread >= 0
    ? `HELOC only wins when its rate is at or below ${breakEven.helocRate.toFixed(2)}% (i.e., ≤ your mortgage rate).`
    : `HELOC needs to be ${Math.abs(breakEven.spread).toFixed(2)}% higher than your mortgage to still beat extra-principal — unusual, but possible via paycheck-parking discipline.`;

  const helocOk = helocRate <= breakEven.helocRate;
  return (
    <div className={cn(
      'rounded-lg border p-3 text-xs',
      helocOk ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-amber-500/40 bg-amber-500/5'
    )}>
      <div className="font-semibold text-foreground mb-0.5">
        Break-even: HELOC beats Extra Principal at {breakEven.helocRate.toFixed(2)}% or lower
      </div>
      <div className="text-muted-foreground">
        Your HELOC rate is <span className="font-mono">{helocRate.toFixed(2)}%</span> · Mortgage rate <span className="font-mono">{mortgageRate.toFixed(2)}%</span>.
        {' '}{spreadNote}
      </div>
    </div>
  );
}



// ─── Sub-components ─────────────────────────────────────────────────────────

function NumInput({ label, value, onChange, step = 1, prefix, hint }: { label: string; value: number; onChange: (v: number) => void; step?: number; prefix?: string; hint?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        {prefix && <span className="absolute left-2.5 top-2 text-xs text-muted-foreground">{prefix}</span>}
        <Input
          type="number"
          step={step}
          value={value || ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={cn('h-9', prefix && 'pl-6')}
        />
      </div>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

interface Metric { label: string; value: string; highlight?: boolean; good?: boolean; bad?: boolean; }
function MethodCard({ title, subtitle, icon: Icon, iconColor, gradient, isWinner, metrics, verdict }: {
  title: string; subtitle: string; icon: any; iconColor: string; gradient: string;
  isWinner: boolean; metrics: Metric[]; verdict: string;
}) {
  return (
    <div className={cn(
      'rounded-2xl border p-4 bg-gradient-to-br relative space-y-3',
      gradient,
      isWinner ? 'border-primary/60 shadow-lg shadow-primary/10' : 'border-border/50'
    )}>
      {isWinner && (
        <Badge className="absolute -top-2 -right-2 bg-primary text-primary-foreground gap-1">
          <Trophy className="h-3 w-3" /> Best value
        </Badge>
      )}
      <div>
        <div className="flex items-center gap-2">
          <Icon className={cn('h-5 w-5', iconColor)} />
          <div className="font-semibold">{title}</div>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <div className="space-y-1.5">
        {metrics.map((m, i) => (
          <div key={i} className={cn(
            'flex justify-between text-sm py-1 border-b border-border/30 last:border-0',
            m.highlight && 'py-1.5'
          )}>
            <span className="text-muted-foreground text-xs">{m.label}</span>
            <span className={cn(
              'font-mono font-semibold',
              m.highlight && 'text-base',
              m.good && 'text-emerald-500',
              m.bad && 'text-rose-500'
            )}>
              {m.good && <CheckCircle2 className="h-3 w-3 inline mr-1" />}
              {m.value}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{verdict}</p>
    </div>
  );
}

// ─── Solvers ────────────────────────────────────────────────────────────────

/** Binary search: smallest surplus $/mo that lets HELOC strategy pay off in ≤ targetMonths. */
function solveHelocSurplus(balance: number, mortgageRate: number, monthlyPayment: number, helocRate: number, targetMonths: number): number {
  const baseline = simulateTraditional({
    mortgageBalance: balance, mortgageRate, remainingMonths: 360,
    monthlyPayment, monthlySurplus: 0, homeValue: balance * 1.4,
  });
  let lo = 0, hi = 20000;
  for (let i = 0; i < 26; i++) {
    const mid = (lo + hi) / 2;
    const r = simulateHelocAccel({
      mortgageBalance: balance, mortgageRate, remainingMonths: 360,
      monthlyPayment, monthlySurplus: mid, homeValue: balance * 1.4,
      helocRate, helocSweepPct: 100,
    }, baseline);
    if (r.months <= targetMonths) hi = mid; else lo = mid;
  }
  return Math.ceil(hi / 25) * 25;
}

function runHelocScenario(balance: number, mortgageRate: number, monthlyPayment: number, helocRate: number, surplus: number) {
  const baseline = simulateTraditional({
    mortgageBalance: balance, mortgageRate, remainingMonths: 360,
    monthlyPayment, monthlySurplus: 0, homeValue: balance * 1.4,
  });
  const r = simulateHelocAccel({
    mortgageBalance: balance, mortgageRate, remainingMonths: 360,
    monthlyPayment, monthlySurplus: surplus, homeValue: balance * 1.4,
    helocRate, helocSweepPct: 100,
  }, baseline);
  return { years: r.years, totalInterest: r.totalInterest };
}

function runHelocScheduleOnly(balance: number, mortgageRate: number, monthlyPayment: number, helocRate: number, surplus: number, maxMonths: number): number[] {
  const baseline = simulateTraditional({
    mortgageBalance: balance, mortgageRate, remainingMonths: 360,
    monthlyPayment, monthlySurplus: 0, homeValue: balance * 1.4,
  });
  const r = simulateHelocAccel({
    mortgageBalance: balance, mortgageRate, remainingMonths: 360,
    monthlyPayment, monthlySurplus: surplus, homeValue: balance * 1.4,
    helocRate, helocSweepPct: 100,
  }, baseline);
  const out: number[] = [balance];
  for (let m = 0; m < Math.min(r.schedule.length, maxMonths); m++) {
    out.push(r.schedule[m].balance);
  }
  return out;
}
