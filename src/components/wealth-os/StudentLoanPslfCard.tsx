import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, Info } from 'lucide-react';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

/**
 * Student Loan & PSLF tracking.
 * Keeps the full legal balance as a net-worth liability while showing the
 * projected remaining cash-flow cost to reach 120 qualifying payments.
 */
export function StudentLoanPslfCard() {
  const [balance, setBalance] = useState(107000);
  const [monthlyPayment, setMonthlyPayment] = useState(390);
  const [completed, setCompleted] = useState(55);
  const [required, setRequired] = useState(120);

  const m = useMemo(() => {
    const remaining = Math.max(required - completed, 0);
    const exposure = remaining * monthlyPayment;
    const pctDone = required > 0 ? (completed / required) * 100 : 0;
    return {
      remaining,
      exposure,
      years: Math.floor(remaining / 12),
      months: remaining % 12,
      pctDone,
      pctLeft: 100 - pctDone,
    };
  }, [balance, monthlyPayment, completed, required]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="h-4 w-4" /> Student Loan &amp; PSLF Tracking
          </CardTitle>
          <Badge variant="outline" className="border-prism-teal/40 text-prism-teal bg-prism-teal/10">
            {m.remaining === 0 ? 'PSLF Complete' : 'PSLF In Progress'}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Program type: Public Service Loan Forgiveness (PSLF)
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Inputs */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs">Current balance</Label>
            <Input type="number" value={balance} onChange={(e) => setBalance(+e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Monthly payment</Label>
            <Input type="number" value={monthlyPayment} onChange={(e) => setMonthlyPayment(+e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Qualifying payments completed</Label>
            <Input type="number" value={completed} onChange={(e) => setCompleted(+e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Total required payments</Label>
            <Input type="number" value={required} onChange={(e) => setRequired(+e.target.value)} />
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{completed} of {required} qualifying payments</span>
            <span>{m.pctDone.toFixed(1)}% complete · {m.pctLeft.toFixed(1)}% remaining</span>
          </div>
          <Progress value={m.pctDone} className="h-2" />
        </div>

        {/* Two views */}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">A. Net worth liability</p>
            <p className="text-2xl font-bold text-destructive mt-1">{money(balance)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Student loan balance — counted as a liability until forgiveness is approved and discharged.
            </p>
          </div>
          <div className="rounded-lg border border-prism-teal/30 bg-prism-teal/5 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">B. Cash-flow exposure</p>
            <p className="text-2xl font-bold text-prism-teal mt-1">{money(m.exposure)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Estimated remaining PSLF payment exposure — {m.remaining} payments × {money(monthlyPayment)}.
              Projected obligation, not the loan balance.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 text-sm">
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Remaining qualifying payments</p>
            <p className="font-semibold">{m.remaining}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Estimated remaining time</p>
            <p className="font-semibold">
              {m.remaining} months (~{m.years}y {m.months}m)
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Current monthly payment</p>
            <p className="font-semibold">{money(monthlyPayment)}</p>
          </div>
        </div>

        {/* Alert logic */}
        <div className="rounded-lg border border-prism-amber/30 bg-prism-amber/5 p-3 text-sm">
          {m.remaining > 0
            ? 'Continue tracking qualifying employment and payment certification.'
            : 'Ready for PSLF forgiveness review and discharge submission.'}
        </div>

        <div className="flex gap-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <p>
            Because this loan is being managed under Public Service Loan Forgiveness, the full loan balance
            should remain listed as a liability until forgiveness is officially approved. The estimated
            remaining payment exposure reflects the projected cash-flow cost to reach {required} qualifying
            payments, based on the current monthly payment.
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Planning status:</strong> Projected forgiveness after {required} qualifying
          PSLF payments, subject to qualifying employment, payment count verification, repayment plan compliance,
          income recertification, and final PSLF discharge approval.
        </p>
      </CardContent>
    </Card>
  );
}
