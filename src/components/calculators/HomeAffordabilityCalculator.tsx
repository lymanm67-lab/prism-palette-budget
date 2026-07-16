import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Home } from 'lucide-react';

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

function maxPrincipalFromPayment(monthly: number, aRate: number, months: number) {
  if (monthly <= 0) return 0;
  if (aRate === 0) return monthly * months;
  const r = aRate / 100 / 12;
  return monthly * (Math.pow(1 + r, months) - 1) / (r * Math.pow(1 + r, months));
}

export default function HomeAffordabilityCalculator() {
  const [income, setIncome] = useState(120000);
  const [monthlyDebts, setMonthlyDebts] = useState(600);
  const [down, setDown] = useState(50000);
  const [rate, setRate] = useState(6.75);
  const [term, setTerm] = useState(30);
  const [taxRate, setTaxRate] = useState(1.1); // % of home value
  const [insRate, setInsRate] = useState(0.35);
  const [dti, setDti] = useState(36); // target back-end DTI

  const r = useMemo(() => {
    const monthlyIncome = income / 12;
    const maxAllDebt = monthlyIncome * (dti / 100);
    const availableForHousing = Math.max(0, maxAllDebt - monthlyDebts);
    // availableForHousing = P&I + tax + insurance
    // Solve iteratively: tax + insurance depend on home value
    // Guess home value; refine
    let homeValue = (availableForHousing * 12) / 0.1; // start with rough 10% of home value / yr
    for (let i = 0; i < 20; i++) {
      const taxMonthly = homeValue * (taxRate / 100) / 12;
      const insMonthly = homeValue * (insRate / 100) / 12;
      const availPI = Math.max(0, availableForHousing - taxMonthly - insMonthly);
      const maxLoan = maxPrincipalFromPayment(availPI, rate, term * 12);
      const newHome = maxLoan + down;
      if (Math.abs(newHome - homeValue) < 100) { homeValue = newHome; break; }
      homeValue = newHome;
    }
    const loan = Math.max(0, homeValue - down);
    return { homeValue, loan, availableForHousing, monthlyIncome, dtiTarget: maxAllDebt };
  }, [income, monthlyDebts, down, rate, term, taxRate, insRate, dti]);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Home className="h-5 w-5 text-primary" /> Home Affordability</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Annual household income</Label><Input type="number" value={income} onChange={e => setIncome(+e.target.value)} /></div>
          <div><Label>Other monthly debts</Label><Input type="number" value={monthlyDebts} onChange={e => setMonthlyDebts(+e.target.value)} /></div>
          <div><Label>Down payment</Label><Input type="number" value={down} onChange={e => setDown(+e.target.value)} /></div>
          <div><Label>Target back-end DTI %</Label><Input type="number" value={dti} onChange={e => setDti(+e.target.value)} /></div>
          <div><Label>Mortgage rate %</Label><Input type="number" step="0.125" value={rate} onChange={e => setRate(+e.target.value)} /></div>
          <div><Label>Term (years)</Label><Input type="number" value={term} onChange={e => setTerm(+e.target.value)} /></div>
          <div><Label>Property tax rate %/yr</Label><Input type="number" step="0.1" value={taxRate} onChange={e => setTaxRate(+e.target.value)} /></div>
          <div><Label>Insurance rate %/yr</Label><Input type="number" step="0.05" value={insRate} onChange={e => setInsRate(+e.target.value)} /></div>
        </div>

        <div className="rounded-lg bg-primary/10 p-4">
          <div className="text-sm text-muted-foreground">Estimated max home price</div>
          <div className="text-3xl font-bold text-primary">{fmt(r.homeValue)}</div>
          <div className="text-xs text-muted-foreground mt-1">Loan amount: {fmt(r.loan)} · Housing budget: {fmt(r.availableForHousing)}/mo</div>
        </div>

        <div className="text-xs text-muted-foreground">
          Uses back-end DTI (housing + all debts ≤ {dti}% of gross monthly income). Lenders may allow up to 43–50% for FHA/VA. This estimate excludes HOA and PMI — subtract them from housing budget for a stricter number.
        </div>
      </CardContent>
    </Card>
  );
}
