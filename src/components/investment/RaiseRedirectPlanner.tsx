import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { projectRaiseRedirect, formatCurrencyFull } from '@/lib/investment/projection';
import { DisclaimerBlock } from './DisclaimerBlock';

export function RaiseRedirectPlanner({ defaultIncome = 5000, yearsToRetirement = 25, returnPct = 7 }) {
  const [income, setIncome] = useState(defaultIncome);
  const [raise, setRaise] = useState(3);
  const [investPct, setInvestPct] = useState(100);
  const [years, setYears] = useState(yearsToRetirement);
  const [rt, setRt] = useState(returnPct);

  const result = useMemo(
    () => projectRaiseRedirect({ currentMonthlyIncome: income, raisePct: raise, investPct, yearsToRetirement: years, returnPct: rt }),
    [income, raise, investPct, years, rt]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Raise Redirect Planner</CardTitle>
        <p className="text-xs text-muted-foreground">
          Commit future raises to investments before lifestyle spending absorbs the increase.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Current monthly income ($)" value={income} onChange={setIncome} />
          <Field label="Expected raise (%)" value={raise} onChange={setRaise} />
          <Field label="Years to retirement" value={years} onChange={setYears} />
          <Field label="Expected return (%)" value={rt} onChange={setRt} />
        </div>

        <div>
          <Label className="text-xs">Percent of raise to invest</Label>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {[100, 75, 50, 25].map((p) => (
              <Button key={p} size="sm" variant={investPct === p ? 'default' : 'outline'} onClick={() => setInvestPct(p)}>
                {p}%
              </Button>
            ))}
            <Input
              type="number"
              className="w-24 h-9"
              value={investPct}
              onChange={(e) => setInvestPct(parseFloat(e.target.value || '0'))}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
          <Metric label="Monthly raise" value={formatCurrencyFull(result.monthlyRaise)} />
          <Metric label="Redirected/mo" value={formatCurrencyFull(result.redirected)} />
          <Metric label="Added at retirement" value={formatCurrencyFull(result.futureValue)} highlight />
        </div>

        <p className="text-sm rounded-lg bg-primary/10 border border-primary/20 p-3 text-foreground">
          Keeping lifestyle flat and investing future raises could add about{' '}
          <strong>{formatCurrencyFull(result.futureValue)}</strong> to your retirement projection.
        </p>

        <DisclaimerBlock variant="short" />
      </CardContent>
    </Card>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type="number" value={value} onChange={(e) => onChange(parseFloat(e.target.value || '0'))} />
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? 'bg-primary/15 border border-primary/30' : 'bg-muted/30'}`}>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
