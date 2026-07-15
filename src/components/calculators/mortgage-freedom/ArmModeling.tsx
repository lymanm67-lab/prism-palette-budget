import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Activity, AlertTriangle, TrendingUp } from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend } from 'recharts';
import { cn } from '@/lib/utils';

interface ArmModelingProps {
  loanAmount?: number;
  fixedRate?: number;
  term?: number; // years
}

/**
 * Adjustable-Rate Mortgage modeler.
 * Compares a fixed-rate loan against a hybrid ARM (e.g. 5/1, 7/1, 10/1)
 * with configurable index, margin, initial/periodic/lifetime caps, and
 * a worst-case rate-shock path.
 */
export default function ArmModeling({
  loanAmount = 350000,
  fixedRate = 6.5,
  term = 30,
}: ArmModelingProps) {
  const { formatCurrency } = useCurrency();

  const [balance, setBalance] = useState(loanAmount);
  const [fixed, setFixed] = useState(fixedRate);
  const [years, setYears] = useState(term);

  const [initialFixedYears, setInitialFixedYears] = useState(7); // 5/1, 7/1, 10/1
  const [teaserRate, setTeaserRate] = useState(5.75);
  const [indexRate, setIndexRate] = useState(4.5); // e.g. SOFR
  const [margin, setMargin] = useState(2.75);
  const [initialCap, setInitialCap] = useState(2);   // first-adjustment cap
  const [periodicCap, setPeriodicCap] = useState(1); // per-year cap thereafter
  const [lifetimeCap, setLifetimeCap] = useState(5); // over start rate
  const [shock, setShock] = useState([2]); // index shock scenario (pts up over initial fixed period)

  const result = useMemo(() => {
    const N = years * 12;
    const fixedR = fixed / 100 / 12;
    const fixedPmt = fixedR > 0
      ? (balance * fixedR * Math.pow(1 + fixedR, N)) / (Math.pow(1 + fixedR, N) - 1)
      : balance / N;

    // ARM schedule
    const fullyIndexed = indexRate + margin + shock[0];
    const lifetimeMaxRate = teaserRate + lifetimeCap;
    let curRate = teaserRate;
    let bal = balance;
    let totalInterest = 0;
    let totalPaid = 0;
    let maxPaymentSeen = 0;

    const rows: {
      year: number;
      rate: number;
      payment: number;
      balance: number;
      interestYear: number;
    }[] = [];

    for (let y = 1; y <= years; y++) {
      // Determine rate at start of this year
      if (y === initialFixedYears + 1) {
        // First adjustment — target fully-indexed capped by initial cap
        const target = Math.min(fullyIndexed, teaserRate + initialCap);
        curRate = Math.min(lifetimeMaxRate, Math.max(margin, target));
      } else if (y > initialFixedYears + 1) {
        // Annual adjustment — move toward fully-indexed, limited by periodic cap
        const target = fullyIndexed;
        const delta = Math.max(-periodicCap, Math.min(periodicCap, target - curRate));
        curRate = Math.min(lifetimeMaxRate, Math.max(margin, curRate + delta));
      }

      const remainingMonths = (years - y + 1) * 12;
      const r = curRate / 100 / 12;
      const pmt = r > 0
        ? (bal * r * Math.pow(1 + r, remainingMonths)) / (Math.pow(1 + r, remainingMonths) - 1)
        : bal / remainingMonths;

      let intYear = 0;
      for (let m = 0; m < 12 && bal > 0.01; m++) {
        const int = bal * r;
        const prin = Math.max(0, pmt - int);
        bal = Math.max(0, bal - prin);
        intYear += int;
        totalInterest += int;
        totalPaid += pmt;
      }
      maxPaymentSeen = Math.max(maxPaymentSeen, pmt);
      rows.push({ year: y, rate: curRate, payment: pmt, balance: bal, interestYear: intYear });
    }

    const fixedTotalInterest = fixedPmt * N - balance;

    return {
      fixedPmt,
      fixedTotalInterest,
      armInitialPmt: rows[0]?.payment ?? 0,
      armMaxPmt: maxPaymentSeen,
      armTotalInterest: totalInterest,
      armTotalPaid: totalPaid,
      lifetimeMaxRate,
      fullyIndexed,
      rows,
    };
  }, [balance, fixed, years, initialFixedYears, teaserRate, indexRate, margin, initialCap, periodicCap, lifetimeCap, shock]);

  const paymentJumpPct = ((result.armMaxPmt - result.armInitialPmt) / result.armInitialPmt) * 100;
  const armWinsInterest = result.armTotalInterest < result.fixedTotalInterest;
  const shockLabel = shock[0] === 0 ? 'flat' : `+${shock[0].toFixed(1)} pts`;

  const chartData = result.rows.map(r => ({
    year: r.year,
    'ARM rate': +r.rate.toFixed(2),
    'Fixed rate': +fixed.toFixed(2),
    'Lifetime cap': +result.lifetimeMaxRate.toFixed(2),
  }));

  return (
    <Card className="prism-card-shine border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-prism-amber" />
          ARM Modeling — 5/1, 7/1, 10/1 hybrid
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Compare a fixed-rate mortgage to an adjustable-rate loan with real index/margin/caps. See the worst-case payment
          jump if rates spike after your fixed period ends.
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Loan basics */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Loan amount</Label>
            <Input type="number" value={balance} onChange={e => setBalance(+e.target.value || 0)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Fixed comparison rate (%)</Label>
            <Input type="number" step="0.125" value={fixed} onChange={e => setFixed(+e.target.value || 0)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Term (years)</Label>
            <Input type="number" value={years} onChange={e => setYears(+e.target.value || 30)} />
          </div>
        </div>

        {/* ARM structure */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Initial fixed period</Label>
            <div className="flex gap-1">
              {[5, 7, 10].map(y => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setInitialFixedYears(y)}
                  className={cn(
                    'flex-1 h-9 rounded-md border text-xs font-medium transition-colors',
                    initialFixedYears === y ? 'border-primary bg-primary/10 text-primary' : 'border-border/40 hover:bg-muted/40',
                  )}
                >
                  {y}/1
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Teaser rate (%)</Label>
            <Input type="number" step="0.125" value={teaserRate} onChange={e => setTeaserRate(+e.target.value || 0)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Index (SOFR, %)</Label>
            <Input type="number" step="0.125" value={indexRate} onChange={e => setIndexRate(+e.target.value || 0)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Margin (%)</Label>
            <Input type="number" step="0.125" value={margin} onChange={e => setMargin(+e.target.value || 0)} />
          </div>
        </div>

        {/* Caps */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Initial cap (pts)</Label>
            <Input type="number" step="0.5" value={initialCap} onChange={e => setInitialCap(+e.target.value || 0)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Periodic cap (pts/yr)</Label>
            <Input type="number" step="0.5" value={periodicCap} onChange={e => setPeriodicCap(+e.target.value || 0)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Lifetime cap (pts over start)</Label>
            <Input type="number" step="0.5" value={lifetimeCap} onChange={e => setLifetimeCap(+e.target.value || 0)} />
          </div>
        </div>

        {/* Shock */}
        <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
              Rate shock over the fixed period
            </Label>
            <Badge variant="outline" className="text-[10px]">{shockLabel}</Badge>
          </div>
          <Slider min={0} max={5} step={0.25} value={shock} onValueChange={setShock} />
          <p className="text-[11px] text-muted-foreground">
            Fully-indexed at reset: <strong>{result.fullyIndexed.toFixed(2)}%</strong> (index {indexRate}% + margin {margin}% + shock {shock[0]} pts).
            Lifetime max: <strong>{result.lifetimeMaxRate.toFixed(2)}%</strong>.
          </p>
        </div>

        {/* Summary tiles */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Tile label="Fixed payment" value={formatCurrency(result.fixedPmt)} sub={`@ ${fixed}%`} />
          <Tile label="ARM initial payment" value={formatCurrency(result.armInitialPmt)} sub={`@ ${teaserRate}%`} accent />
          <Tile
            label="ARM worst-case payment"
            value={formatCurrency(result.armMaxPmt)}
            sub={`+${paymentJumpPct.toFixed(0)}% jump`}
            warn={paymentJumpPct > 25}
          />
          <Tile
            label="Total interest diff"
            value={formatCurrency(Math.abs(result.armTotalInterest - result.fixedTotalInterest))}
            sub={armWinsInterest ? 'ARM saves' : 'Fixed saves'}
            good={armWinsInterest}
            warn={!armWinsInterest}
          />
        </div>

        {/* Chart */}
        <div className="rounded-lg border border-border/40 bg-muted/20 p-2">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v: number) => `${v}%`}
              />
              <RTooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }}
                formatter={(v: number) => `${(+v).toFixed(2)}%`}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="stepAfter" dataKey="ARM rate" stroke="hsl(var(--prism-amber))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Fixed rate" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="4 2" dot={false} />
              <Line type="monotone" dataKey="Lifetime cap" stroke="hsl(var(--destructive))" strokeWidth={1} strokeDasharray="2 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Warning */}
        {paymentJumpPct > 25 && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs">
            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-destructive">Payment shock risk</div>
              Your ARM payment could jump {paymentJumpPct.toFixed(0)}% — from {formatCurrency(result.armInitialPmt)} to{' '}
              {formatCurrency(result.armMaxPmt)}. Only choose an ARM if you're confident you'll refinance, sell, or pay off
              the loan before the fixed period ends, or if your income can absorb the reset.
            </div>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">
          ARMs typically start 0.5–1.0% below fixed rates. The trade-off is uncertainty after the initial fixed period.
          Conforming ARMs are capped by CFPB rules; jumbo/non-QM ARMs can have wider caps.
        </p>
      </CardContent>
    </Card>
  );
}

function Tile({
  label, value, sub, accent, warn, good,
}: { label: string; value: string; sub?: string; accent?: boolean; warn?: boolean; good?: boolean }) {
  return (
    <div className={cn(
      'rounded-lg border p-3',
      accent && 'border-primary/40 bg-primary/5',
      warn && 'border-destructive/40 bg-destructive/5',
      good && 'border-emerald-500/40 bg-emerald-500/5',
      !accent && !warn && !good && 'border-border/40 bg-muted/20',
    )}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn('text-lg font-bold', accent && 'text-primary', warn && 'text-destructive', good && 'text-emerald-600')}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
