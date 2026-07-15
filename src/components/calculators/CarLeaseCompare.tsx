import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Scale, Sparkles } from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';
import { cn } from '@/lib/utils';

interface Props {
  yearsHeld?: number; // ownership horizon for buying scenarios
}

/**
 * Side-by-side New vs Used vs Lease comparison.
 * Uses standard money-factor lease math and 5-year total cost of ownership
 * for buying so users can see the real trade-off.
 */
export default function CarLeaseCompare({ yearsHeld = 5 }: Props) {
  const { formatCurrency } = useCurrency();

  // Shared
  const [msrp, setMsrp] = useState(35000);
  const [taxPct, setTaxPct] = useState(7);
  const [horizon, setHorizon] = useState(yearsHeld);

  // Buy new
  const [newDown, setNewDown] = useState(5000);
  const [newRate, setNewRate] = useState(6.5);
  const [newTerm, setNewTerm] = useState(60);

  // Buy used
  const [usedPrice, setUsedPrice] = useState(24000);
  const [usedDown, setUsedDown] = useState(4000);
  const [usedRate, setUsedRate] = useState(7.5);
  const [usedTerm, setUsedTerm] = useState(48);

  // Lease
  const [leaseTerm, setLeaseTerm] = useState(36);
  const [residualPct, setResidualPct] = useState(58);
  const [moneyFactor, setMoneyFactor] = useState(0.00225); // ~5.4% APR-equivalent
  const [capReduction, setCapReduction] = useState(2500);
  const [acquisitionFee, setAcquisitionFee] = useState(695);
  const [dispositionFee, setDispositionFee] = useState(400);
  const [milesPerYear, setMilesPerYear] = useState(12000);

  const buy = (price: number, down: number, apr: number, months: number, y1DropPct: number) => {
    const otd = price * (1 + taxPct / 100);
    const loan = Math.max(0, otd - down);
    const r = apr / 100 / 12;
    const pmt = r > 0 ? (loan * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1) : loan / months;
    const totalPaid = pmt * months + down;
    const totalInterest = Math.max(0, pmt * months - loan);

    // Residual value at horizon
    const horizonMonths = horizon * 12;
    let value = price;
    for (let y = 1; y <= horizon; y++) value *= 1 - (y === 1 ? y1DropPct : 0.15);

    // Loan balance at horizon
    let bal = loan;
    for (let m = 0; m < Math.min(horizonMonths, months); m++) {
      const int = bal * r;
      bal = Math.max(0, bal - (pmt - int));
    }
    const equity = value - bal;
    // Effective net cost = cash outlaid - equity retained
    const cashOut = down + pmt * Math.min(horizonMonths, months);
    const netCost = cashOut - equity;

    return { price, monthly: pmt, otd, totalPaid, totalInterest, equityAtHorizon: equity, valueAtHorizon: value, balanceAtHorizon: bal, netCostAtHorizon: netCost };
  };

  const newBuy = useMemo(() => buy(msrp, newDown, newRate, newTerm, 0.20), [msrp, newDown, newRate, newTerm, taxPct, horizon]);
  const usedBuy = useMemo(() => buy(usedPrice, usedDown, usedRate, usedTerm, 0.12), [usedPrice, usedDown, usedRate, usedTerm, taxPct, horizon]);

  // Lease math: payment = depreciation fee + finance fee + tax
  const lease = useMemo(() => {
    const capCost = msrp - capReduction + acquisitionFee;
    const residual = msrp * (residualPct / 100);
    const depreciation = (capCost - residual) / leaseTerm;
    const finance = (capCost + residual) * moneyFactor;
    const baseMonthly = depreciation + finance;
    const monthly = baseMonthly * (1 + taxPct / 100);
    const drivenAway = capReduction + acquisitionFee + monthly; // first payment + drive-off
    const totalPaid = drivenAway + monthly * (leaseTerm - 1) + dispositionFee;

    // "APR equivalent" for context
    const aprEquiv = moneyFactor * 2400;

    // Cost per year over lease
    const perYear = totalPaid / (leaseTerm / 12);
    // At horizon: after lease ends you have nothing → need to re-lease or buy
    const cyclesPerHorizon = (horizon * 12) / leaseTerm;
    const netCostAtHorizon = totalPaid * cyclesPerHorizon;

    return { monthly, residual, aprEquiv, totalPaid, netCostAtHorizon, drivenAway, perYear };
  }, [msrp, capReduction, acquisitionFee, dispositionFee, residualPct, leaseTerm, moneyFactor, taxPct, horizon]);

  const options = [
    {
      key: 'new',
      label: 'Buy New',
      badge: 'Warranty · newest tech',
      badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
      monthly: newBuy.monthly,
      upfront: newDown,
      netCost: newBuy.netCostAtHorizon,
      equity: newBuy.equityAtHorizon,
      total: newBuy.totalPaid,
      extra: `${newTerm}-mo loan @ ${newRate}%`,
    },
    {
      key: 'used',
      label: 'Buy Used (2–3 yr)',
      badge: 'Best value · lowest depreciation',
      badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
      monthly: usedBuy.monthly,
      upfront: usedDown,
      netCost: usedBuy.netCostAtHorizon,
      equity: usedBuy.equityAtHorizon,
      total: usedBuy.totalPaid,
      extra: `${usedTerm}-mo loan @ ${usedRate}%`,
    },
    {
      key: 'lease',
      label: 'Lease',
      badge: 'Lowest monthly · no equity',
      badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
      monthly: lease.monthly,
      upfront: capReduction + acquisitionFee,
      netCost: lease.netCostAtHorizon,
      equity: 0,
      total: lease.totalPaid,
      extra: `${leaseTerm}-mo · APR≈${lease.aprEquiv.toFixed(2)}%`,
    },
  ];

  const cheapest = [...options].sort((a, b) => a.netCost - b.netCost)[0];

  return (
    <Card className="prism-card-shine border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Scale className="h-5 w-5 text-prism-sky" />
          New vs Used vs Lease — side-by-side
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Real math over a {horizon}-year horizon. Lease uses money-factor formula (dealer pricing).
          Buying nets equity you can sell; leasing does not.
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Shared */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">New/leased MSRP</Label>
            <Input type="number" value={msrp} onChange={e => setMsrp(+e.target.value || 0)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Sales tax (%)</Label>
            <Input type="number" step="0.1" value={taxPct} onChange={e => setTaxPct(+e.target.value || 0)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Time horizon (years)</Label>
            <Input type="number" min={1} max={10} value={horizon} onChange={e => setHorizon(+e.target.value || 5)} />
          </div>
        </div>

        {/* Per-option inputs (compact grid) */}
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-lg border border-border/40 p-3 space-y-2 bg-muted/10">
            <div className="text-xs font-semibold">Buy New</div>
            <Row label="Down"><Input className="h-8 text-xs" type="number" value={newDown} onChange={e => setNewDown(+e.target.value || 0)} /></Row>
            <Row label="APR %"><Input className="h-8 text-xs" type="number" step="0.1" value={newRate} onChange={e => setNewRate(+e.target.value || 0)} /></Row>
            <Row label="Term (mo)"><Input className="h-8 text-xs" type="number" value={newTerm} onChange={e => setNewTerm(+e.target.value || 60)} /></Row>
          </div>

          <div className="rounded-lg border border-border/40 p-3 space-y-2 bg-muted/10">
            <div className="text-xs font-semibold">Buy Used (2–3 yr)</div>
            <Row label="Price"><Input className="h-8 text-xs" type="number" value={usedPrice} onChange={e => setUsedPrice(+e.target.value || 0)} /></Row>
            <Row label="Down"><Input className="h-8 text-xs" type="number" value={usedDown} onChange={e => setUsedDown(+e.target.value || 0)} /></Row>
            <Row label="APR %"><Input className="h-8 text-xs" type="number" step="0.1" value={usedRate} onChange={e => setUsedRate(+e.target.value || 0)} /></Row>
            <Row label="Term (mo)"><Input className="h-8 text-xs" type="number" value={usedTerm} onChange={e => setUsedTerm(+e.target.value || 48)} /></Row>
          </div>

          <div className="rounded-lg border border-border/40 p-3 space-y-2 bg-muted/10">
            <div className="text-xs font-semibold">Lease</div>
            <Row label="Term (mo)"><Input className="h-8 text-xs" type="number" value={leaseTerm} onChange={e => setLeaseTerm(+e.target.value || 36)} /></Row>
            <Row label="Residual %"><Input className="h-8 text-xs" type="number" step="1" value={residualPct} onChange={e => setResidualPct(+e.target.value || 0)} /></Row>
            <Row label="Money factor"><Input className="h-8 text-xs" type="number" step="0.00025" value={moneyFactor} onChange={e => setMoneyFactor(+e.target.value || 0)} /></Row>
            <Row label="Cap reduction"><Input className="h-8 text-xs" type="number" value={capReduction} onChange={e => setCapReduction(+e.target.value || 0)} /></Row>
            <Row label="Miles / yr"><Input className="h-8 text-xs" type="number" value={milesPerYear} onChange={e => setMilesPerYear(+e.target.value || 0)} /></Row>
          </div>
        </div>

        {/* Comparison cards */}
        <div className="grid gap-3 lg:grid-cols-3">
          {options.map(o => {
            const isCheapest = o.key === cheapest.key;
            return (
              <div
                key={o.key}
                className={cn(
                  'relative rounded-xl border p-4 space-y-3',
                  isCheapest ? 'border-primary/60 bg-primary/5 shadow-lg shadow-primary/10' : 'border-border/40 bg-muted/10',
                )}
              >
                {isCheapest && (
                  <div className="absolute -top-2.5 left-3 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
                    <Sparkles className="h-3 w-3" /> Cheapest over {horizon}yr
                  </div>
                )}
                <div>
                  <div className="text-sm font-bold">{o.label}</div>
                  <Badge variant="outline" className={cn('text-[10px] mt-1', o.badgeClass)}>{o.badge}</Badge>
                </div>

                <div className="space-y-1.5 text-xs">
                  <ResultRow label="Monthly" value={formatCurrency(o.monthly)} bold />
                  <ResultRow label="Upfront cash" value={formatCurrency(o.upfront)} />
                  <ResultRow label={`Total paid (${o.key === 'lease' ? 'lease term' : 'over loan'})`} value={formatCurrency(o.total)} />
                  <ResultRow
                    label={`Equity at yr ${horizon}`}
                    value={formatCurrency(o.equity)}
                    accent={o.equity > 0 ? 'good' : undefined}
                  />
                  <ResultRow
                    label={`Net cost over ${horizon}yr`}
                    value={formatCurrency(o.netCost)}
                    accent={isCheapest ? 'good' : undefined}
                    bold
                  />
                  <p className="text-[10px] text-muted-foreground pt-1">{o.extra}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Guidance */}
        <div className="rounded-lg border border-border/40 bg-muted/20 p-3 text-xs space-y-1.5">
          <div className="font-semibold">Rules of thumb</div>
          <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
            <li><strong className="text-foreground">Buy used</strong> if you drive &gt;15k mi/yr, keep cars &gt;5 yrs, or want the lowest lifetime cost.</li>
            <li><strong className="text-foreground">Buy new</strong> if you need warranty coverage, the latest tech, or plan to keep it past 8 years.</li>
            <li><strong className="text-foreground">Lease</strong> only if you want a new car every 3 yrs, drive &lt;12k mi/yr, and can deduct it (business use).</li>
            <li>Lease APR equivalent = money factor × 2400. Money factor 0.00225 = ~5.4% APR.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-[10px] w-24 flex-shrink-0 text-muted-foreground">{label}</Label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function ResultRow({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: 'good' | 'warn' }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={cn(
        bold ? 'font-bold text-sm' : 'text-xs',
        accent === 'good' && 'text-emerald-600 dark:text-emerald-400',
        accent === 'warn' && 'text-destructive',
      )}>{value}</span>
    </div>
  );
}
