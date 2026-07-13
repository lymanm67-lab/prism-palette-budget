import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Rocket, TrendingDown, Calendar, Zap, Home, Repeat } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import AnimatedNumber from '@/components/AnimatedNumber';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ── Payoff simulators ─────────────────────────────────────────────────────────
type Point = { month: number; balance: number };
type Result = { months: number; totalInterest: number; totalPaid: number; series: Point[] };

function payoffFixed(principal: number, annualRate: number, monthlyPayment: number, cap = 720): Result {
  const r = annualRate / 100 / 12;
  let balance = principal;
  let totalInterest = 0;
  const series: Point[] = [{ month: 0, balance }];
  for (let m = 1; m <= cap; m++) {
    const interest = balance * r;
    const principalPaid = Math.min(balance, monthlyPayment - interest);
    if (principalPaid <= 0) return { months: Infinity, totalInterest: NaN, totalPaid: NaN, series };
    balance = Math.max(0, balance - principalPaid);
    totalInterest += interest;
    series.push({ month: m, balance });
    if (balance <= 0.01) return { months: m, totalInterest, totalPaid: totalInterest + principal, series };
  }
  return { months: Infinity, totalInterest: NaN, totalPaid: NaN, series };
}

function biWeeklyPayoff(principal: number, annualRate: number, monthlyPayment: number, cap = 720): Result {
  // Bi-weekly = 26 half-payments/yr = 13 monthly payments/yr. Model as monthly with 13/12 payment.
  const equivalentMonthly = monthlyPayment * (13 / 12);
  return payoffFixed(principal, annualRate, equivalentMonthly, cap);
}

// HELOC "all-in-one": paycheck deposits, expenses drawn, interest on avg daily balance
function payoffHeloc(principal: number, annualRate: number, monthlyIncome: number, monthlyExpenses: number, cap = 720): Result {
  const r = annualRate / 100 / 12;
  const net = monthlyIncome - monthlyExpenses;
  const series: Point[] = [{ month: 0, balance: principal }];
  if (net <= 0) return { months: Infinity, totalInterest: NaN, totalPaid: NaN, series };
  let balance = principal;
  let totalInterest = 0;
  for (let m = 1; m <= cap; m++) {
    const avg = Math.max(0, balance - net / 2);
    const interest = avg * r;
    balance = balance + interest - net;
    totalInterest += interest;
    if (balance <= 0) {
      series.push({ month: m, balance: 0 });
      return { months: m, totalInterest, totalPaid: totalInterest + principal, series };
    }
    series.push({ month: m, balance });
  }
  return { months: Infinity, totalInterest: NaN, totalPaid: NaN, series };
}

// ── Component ────────────────────────────────────────────────────────────────
interface Props {
  principal: number;
  mortgageRate: number;
  termYears: number;
  helocRate: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  formatCurrency: (n: number) => string;
}

export default function PayoffAccelerator({
  principal, mortgageRate, termYears, helocRate, monthlyIncome, monthlyExpenses, formatCurrency,
}: Props) {
  const [extraPrincipal, setExtraPrincipal] = useState(250);

  const strategies = useMemo(() => {
    const baseline = payoffFixed(principal, mortgageRate, 0);
    // Compute baseline monthly first using formula
    const r = mortgageRate / 100 / 12;
    const n = termYears * 12;
    const basePayment = r === 0 ? principal / n : (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const base = payoffFixed(principal, mortgageRate, basePayment);
    const extra = payoffFixed(principal, mortgageRate, basePayment + extraPrincipal);
    const biweekly = biWeeklyPayoff(principal, mortgageRate, basePayment);
    const heloc = payoffHeloc(principal, helocRate, monthlyIncome, monthlyExpenses);
    return { base, extra, biweekly, heloc, basePayment };
  }, [principal, mortgageRate, termYears, helocRate, monthlyIncome, monthlyExpenses, extraPrincipal]);

  const { base, extra, biweekly, heloc, basePayment } = strategies;
  const bestNonBase = [
    { key: 'extra', label: `+${formatCurrency(extraPrincipal)}/mo extra`, r: extra },
    { key: 'biweekly', label: 'Bi-weekly payments', r: biweekly },
    { key: 'heloc', label: '1st-lien HELOC', r: heloc },
  ].filter(s => isFinite(s.r.months)).sort((a, b) => a.r.totalInterest - b.r.totalInterest)[0];

  // Race chart — sample each series every ~step months
  const raceData = useMemo(() => {
    const maxMonths = Math.max(
      base.months,
      isFinite(extra.months) ? extra.months : 0,
      isFinite(biweekly.months) ? biweekly.months : 0,
      isFinite(heloc.months) ? heloc.months : 0,
    );
    const step = Math.max(1, Math.floor(maxMonths / 80));
    const at = (s: Point[], m: number) => {
      const p = s.find(x => x.month >= m);
      if (p) return p.balance;
      const last = s[s.length - 1];
      return last?.balance ?? null;
    };
    const rows: any[] = [];
    for (let m = 0; m <= maxMonths; m += step) {
      rows.push({
        month: m,
        'Baseline 30-yr': m <= base.months ? at(base.series, m) : 0,
        'Extra principal': isFinite(extra.months) ? (m <= extra.months ? at(extra.series, m) : 0) : null,
        'Bi-weekly': isFinite(biweekly.months) ? (m <= biweekly.months ? at(biweekly.series, m) : 0) : null,
        '1st-lien HELOC': isFinite(heloc.months) ? (m <= heloc.months ? at(heloc.series, m) : 0) : null,
      });
    }
    return rows;
  }, [base, extra, biweekly, heloc]);

  const fmtYrs = (months: number) => isFinite(months) ? `${(months / 12).toFixed(1)} yrs` : '—';
  const savedYears = (r: Result) => isFinite(r.months) ? (base.months - r.months) / 12 : 0;
  const savedInterest = (r: Result) => isFinite(r.totalInterest) ? base.totalInterest - r.totalInterest : 0;

  return (
    <div className="space-y-6 rounded-2xl border-2 border-prism-amber/30 bg-gradient-to-br from-prism-amber/5 to-transparent p-5">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-prism-amber/15">
          <Rocket className="w-5 h-5 text-prism-amber" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Payoff Accelerator</h3>
          <p className="text-sm text-muted-foreground">
            Four ways to beat a traditional 30-year mortgage — compared head-to-head against your actual balance and rate.
          </p>
        </div>
      </div>

      {/* Hero comparison card */}
      {bestNonBase && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="grid md:grid-cols-3 gap-4 rounded-xl border border-prism-lime/30 bg-prism-lime/5 p-4"
        >
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Best strategy</div>
            <div className="text-xl font-bold text-prism-lime">{bestNonBase.label}</div>
            <div className="text-xs text-muted-foreground mt-1">vs Baseline 30-yr mortgage</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Years saved</div>
            <div className="text-2xl font-bold text-foreground">
              {savedYears(bestNonBase.r).toFixed(1)} <span className="text-sm text-muted-foreground font-normal">yrs</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Debt-free in {fmtYrs(bestNonBase.r.months)}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Interest saved</div>
            <div className="text-2xl font-bold text-prism-lime">
              <AnimatedNumber value={savedInterest(bestNonBase.r)} formatFn={formatCurrency} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              vs {formatCurrency(base.totalInterest)} on the 30-yr
            </div>
          </div>
        </motion.div>
      )}

      {/* Extra-payment slider */}
      <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Label className="flex items-center gap-2 text-sm">
            <TrendingDown className="w-4 h-4 text-prism-amber" />
            Extra principal payment per month
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">$</span>
            <Input
              type="number"
              value={extraPrincipal}
              onChange={(e) => setExtraPrincipal(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-28 h-8 text-right"
            />
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={2000}
          step={25}
          value={extraPrincipal}
          onChange={(e) => setExtraPrincipal(parseFloat(e.target.value))}
          className="w-full accent-prism-amber"
        />
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>$0</span><span>$500</span><span>$1,000</span><span>$1,500</span><span>$2,000</span>
        </div>
        {isFinite(extra.months) && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-border/40">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">New payoff</div>
              <div className="text-base font-bold text-foreground">{fmtYrs(extra.months)}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Years saved</div>
              <div className="text-base font-bold text-prism-lime">{savedYears(extra).toFixed(1)} yrs</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Interest saved</div>
              <div className="text-base font-bold text-prism-lime">{formatCurrency(savedInterest(extra))}</div>
            </div>
          </div>
        )}
      </div>

      {/* Strategy comparison table */}
      <div className="rounded-xl border border-border/40 bg-muted/10 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border/40 bg-muted/30">
          <h4 className="text-sm font-semibold text-foreground">Strategy comparison</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/20 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">Strategy</th>
                <th className="text-right px-4 py-2 font-semibold">Monthly</th>
                <th className="text-right px-4 py-2 font-semibold">Payoff</th>
                <th className="text-right px-4 py-2 font-semibold">Total interest</th>
                <th className="text-right px-4 py-2 font-semibold">vs 30-yr</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              <tr>
                <td className="px-4 py-2.5"><span className="inline-flex items-center gap-2"><Home className="w-3.5 h-3.5 text-muted-foreground" /> Baseline 30-yr mortgage</span></td>
                <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(basePayment)}</td>
                <td className="px-4 py-2.5 text-right">{fmtYrs(base.months)}</td>
                <td className="px-4 py-2.5 text-right font-mono text-prism-rose">{formatCurrency(base.totalInterest)}</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground">—</td>
              </tr>
              <StrategyRow
                icon={<TrendingDown className="w-3.5 h-3.5 text-prism-amber" />}
                label={`+${formatCurrency(extraPrincipal)}/mo extra principal`}
                monthly={basePayment + extraPrincipal}
                r={extra} base={base} formatCurrency={formatCurrency} fmtYrs={fmtYrs}
              />
              <StrategyRow
                icon={<Repeat className="w-3.5 h-3.5 text-prism-teal" />}
                label="Bi-weekly payments (½ every 2 wks)"
                monthly={basePayment * (13 / 12)}
                r={biweekly} base={base} formatCurrency={formatCurrency} fmtYrs={fmtYrs}
                subtitle="≈ 1 extra full payment per year"
              />
              <StrategyRow
                icon={<Zap className="w-3.5 h-3.5 text-prism-amber" />}
                label="1st-lien HELOC (all-in-one)"
                monthly={Math.max(0, monthlyIncome - monthlyExpenses)}
                monthlyLabel={`${formatCurrency(Math.max(0, monthlyIncome - monthlyExpenses))} surplus`}
                r={heloc} base={base} formatCurrency={formatCurrency} fmtYrs={fmtYrs}
                unavailable={monthlyIncome - monthlyExpenses <= 0 ? 'Needs positive monthly surplus' : undefined}
              />
            </tbody>
          </table>
        </div>
      </div>

      {/* Payoff race chart */}
      <div className="rounded-xl border border-border/40 bg-muted/10 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-prism-amber" />
          <h4 className="text-sm font-semibold text-foreground">Payoff race — balance to zero</h4>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <LineChart data={raceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
                tickFormatter={(m) => `${(m / 12).toFixed(0)}y`}
                label={{ value: 'Years', position: 'insideBottom', offset: -4, fontSize: 11 }}
              />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <RTooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                formatter={(v: number) => v == null ? '—' : formatCurrency(v)}
                labelFormatter={(m: number) => `Month ${m} (${(m / 12).toFixed(1)} yrs)`}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Baseline 30-yr" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Extra principal" stroke="hsl(var(--prism-amber))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Bi-weekly" stroke="hsl(var(--prism-teal))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="1st-lien HELOC" stroke="hsl(var(--prism-lime))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Lower and faster to zero = better. Every strategy uses your entered balance ({formatCurrency(principal)}) and rates.
        </p>
      </div>
    </div>
  );
}

function StrategyRow({
  icon, label, monthly, monthlyLabel, r, base, formatCurrency, fmtYrs, subtitle, unavailable,
}: {
  icon: React.ReactNode;
  label: string;
  monthly: number;
  monthlyLabel?: string;
  r: Result;
  base: Result;
  formatCurrency: (n: number) => string;
  fmtYrs: (months: number) => string;
  subtitle?: string;
  unavailable?: string;
}) {
  if (unavailable) {
    return (
      <tr className="opacity-60">
        <td className="px-4 py-2.5">
          <span className="inline-flex items-center gap-2">{icon} {label}</span>
          <div className="text-[11px] text-prism-rose mt-0.5">{unavailable}</div>
        </td>
        <td className="px-4 py-2.5 text-right text-muted-foreground">—</td>
        <td className="px-4 py-2.5 text-right text-muted-foreground">—</td>
        <td className="px-4 py-2.5 text-right text-muted-foreground">—</td>
        <td className="px-4 py-2.5 text-right text-muted-foreground">—</td>
      </tr>
    );
  }
  const yearsSaved = isFinite(r.months) ? (base.months - r.months) / 12 : 0;
  const interestSaved = isFinite(r.totalInterest) ? base.totalInterest - r.totalInterest : 0;
  return (
    <tr>
      <td className="px-4 py-2.5">
        <span className="inline-flex items-center gap-2">{icon} {label}</span>
        {subtitle && <div className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</div>}
      </td>
      <td className="px-4 py-2.5 text-right font-mono">{monthlyLabel ?? formatCurrency(monthly)}</td>
      <td className="px-4 py-2.5 text-right">{fmtYrs(r.months)}</td>
      <td className="px-4 py-2.5 text-right font-mono text-prism-rose">{isFinite(r.totalInterest) ? formatCurrency(r.totalInterest) : '—'}</td>
      <td className={cn('px-4 py-2.5 text-right font-semibold', interestSaved > 0 ? 'text-prism-lime' : 'text-muted-foreground')}>
        {interestSaved > 0 ? `−${formatCurrency(interestSaved)} · ${yearsSaved.toFixed(1)}y sooner` : '—'}
      </td>
    </tr>
  );
}
