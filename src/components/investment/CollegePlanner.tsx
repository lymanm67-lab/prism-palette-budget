import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { GraduationCap } from 'lucide-react';
import { collegeProjection, tradeoffSlider } from '@/lib/investment/college';

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

export function CollegePlanner() {
  const [childAge, setChildAge] = useState(8);
  const [annualCost, setAnnualCost] = useState(35_000);
  const [savings, setSavings] = useState(15_000);
  const [monthly, setMonthly] = useState(400);
  const proj = useMemo(() => collegeProjection({
    childCurrentAge: childAge, annualCostToday: annualCost,
    currentSavings: savings, monthlyContribution: monthly,
  }), [childAge, annualCost, savings, monthly]);

  const [available, setAvailable] = useState(1000);
  const [allocPct, setAllocPct] = useState([30]);
  const tradeoff = useMemo(() => tradeoffSlider({ totalMonthlyAvailable: available, collegeAllocPct: allocPct[0] }), [available, allocPct]);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" /> College / 529 Planner</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Funding projection</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Child's current age</Label><Input type="number" value={childAge} onChange={(e) => setChildAge(+e.target.value)} /></div>
            <div><Label>Annual cost today</Label><Input type="number" value={annualCost} onChange={(e) => setAnnualCost(+e.target.value)} /></div>
            <div><Label>Current 529 balance</Label><Input type="number" value={savings} onChange={(e) => setSavings(+e.target.value)} /></div>
            <div><Label>Monthly contribution</Label><Input type="number" value={monthly} onChange={(e) => setMonthly(+e.target.value)} /></div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Projected: {fmt(proj.projected)}</span>
              <span>Total cost: {fmt(proj.totalCost)}</span>
            </div>
            <Progress value={proj.coveragePct} />
            <div className="text-xs text-muted-foreground text-center">{proj.coveragePct.toFixed(0)}% funded</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-destructive/10 p-3"><div className="text-xs text-muted-foreground">Shortfall</div><div className="text-xl font-bold">{fmt(proj.shortfall)}</div></div>
            <div className="rounded-lg bg-primary/10 p-3"><div className="text-xs text-muted-foreground">Monthly to fully fund</div><div className="text-xl font-bold text-primary">{fmt(proj.monthlyNeeded)}</div></div>
          </div>
        </div>

        <div className="space-y-4 border-t pt-4">
          <h3 className="font-semibold text-sm">Retirement vs college trade-off</h3>
          <p className="text-xs text-muted-foreground">Fund retirement first — students can borrow for college; you can't borrow for retirement.</p>
          <div><Label>Total monthly available</Label><Input type="number" value={available} onChange={(e) => setAvailable(+e.target.value)} /></div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Retirement: {fmt(tradeoff.retirementMonthly)}</span>
              <span>College: {fmt(tradeoff.collegeMonthly)}</span>
            </div>
            <Slider value={allocPct} onValueChange={setAllocPct} max={100} step={5} />
            <div className="text-xs text-muted-foreground text-center">{allocPct[0]}% to college</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
