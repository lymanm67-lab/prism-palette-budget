import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { guardrailFlags, money } from '@/lib/travel/travelFund';

export function TravelGuardrailCard() {
  const [state, setState] = useState({
    reduceRetirement: 0,
    retirementWithdrawal: 0,
    emergencyFundUse: 0,
    creditCardUse: 0,
  });

  const flags = guardrailFlags({ ...state, yearsToRetirement: 17, returnPct: 8 });
  const set = (k: keyof typeof state) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setState((s) => ({ ...s, [k]: Number(e.target.value) || 0 }));

  const fields: { key: keyof typeof state; label: string }[] = [
    { key: 'reduceRetirement', label: 'Reduce retirement contributions ($/mo)' },
    { key: 'retirementWithdrawal', label: 'Withdraw from retirement ($)' },
    { key: 'emergencyFundUse', label: 'Use emergency savings ($)' },
    { key: 'creditCardUse', label: 'Put travel on credit card ($)' },
  ];

  return (
    <Card className="prism-card-shine border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-prism-teal" /> Travel vs Retirement Guardrail
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Model the cost of funding travel the wrong way. This never blocks a decision — it shows the
          financial impact so the choice is informed.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label className="text-xs">{f.label}</Label>
              <Input type="number" min={0} value={state[f.key] || ''} onChange={set(f.key)} placeholder="0" />
            </div>
          ))}
        </div>

        {flags.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No conflicts. Travel is funded from the Travel Fund only — retirement, emergency reserves and
            debt payoff stay untouched.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-display font-bold tracking-wide text-prism-orange">REVIEW FUNDING PLAN</p>
            {flags.map((f) => (
              <Alert key={f.id} className="border-prism-orange/40 bg-prism-orange/5">
                <AlertTriangle className="h-4 w-4 text-prism-orange" />
                <AlertDescription className="text-xs">
                  <span className="font-semibold">{f.title}.</span> {f.impact}
                </AlertDescription>
              </Alert>
            ))}
            <p className="text-[11px] text-muted-foreground">
              Alternative: keep the {money(500)}/month travel cycle and shift the trip budget tier instead.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
