import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { projectDebtToWealth, formatCurrencyFull } from '@/lib/investment/projection';
import { DisclaimerBlock } from './DisclaimerBlock';
import { TrendingUp } from 'lucide-react';

export function DebtToWealthTool({ defaultPayment = 500, yearsAfter = 15, returnPct = 7 }) {
  const [payment, setPayment] = useState(defaultPayment);
  const [redirect, setRedirect] = useState(100);
  const [years, setYears] = useState(yearsAfter);
  const [rt, setRt] = useState(returnPct);

  const r = useMemo(
    () => projectDebtToWealth({ debtPayment: payment, redirectPct: redirect, yearsAfterPayoff: years, returnPct: rt }),
    [payment, redirect, years, rt]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> Debt Freedom → Wealth Builder
        </CardTitle>
        <p className="text-xs text-muted-foreground">When debt ends, wealth-building begins. Keep the payment working for your future.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Debt payment ($)" value={payment} onChange={setPayment} />
          <Field label="Redirect (%)" value={redirect} onChange={setRedirect} />
          <Field label="Years after payoff" value={years} onChange={setYears} />
          <Field label="Expected return (%)" value={rt} onChange={setRt} />
        </div>

        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
          <Metric label="Monthly invest" value={formatCurrencyFull(r.monthly)} />
          <Metric label="Total contributions" value={formatCurrencyFull(r.totalContrib)} />
          <Metric label="Projected value" value={formatCurrencyFull(r.futureValue)} highlight />
        </div>

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
