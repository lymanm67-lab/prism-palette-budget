import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Plus, Trash2, Landmark } from 'lucide-react';
import { money, NumField, SectionNote } from './shared';
import {
  DESTINATION_LABEL, releasedCash,
  type AssumptionState, type DebtRedirect, type RedirectDestination,
} from '@/lib/blueprint/model';

export function DebtFreedomEngine({
  state, patch,
}: { state: AssumptionState; patch: (p: Partial<AssumptionState>) => void }) {
  const setDebt = (i: number, d: Partial<DebtRedirect>) => {
    const debts = state.debts.map((x, ix) => (ix === i ? { ...x, ...d } : x));
    patch({ debts });
  };
  const totalBalance = state.debts.reduce((s, d) => s + d.balance, 0);
  const totalReleased = state.debts.reduce((s, d) => s + releasedCash(d), 0);
  const pslf = state.debts.find((d) => d.forgiveness);

  return (
    <div className="space-y-4">
      <Card className="wos-page">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Landmark className="h-4 w-4 text-prism-teal" /> Debt Freedom Engine — Debt-to-Wealth Conversion
          </CardTitle>
          <SectionNote>
            A payment that ends is not new spending money. Every payoff designates a destination so the
            released cash flow lands in the contribution timeline automatically.
          </SectionNote>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-[11px] uppercase text-muted-foreground">Total balance</p>
              <p className="text-lg font-bold tabular-nums">{money(totalBalance)}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-[11px] uppercase text-muted-foreground">Cash flow to release</p>
              <p className="text-lg font-bold tabular-nums text-prism-teal">{money(totalReleased)}/mo</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-[11px] uppercase text-muted-foreground">Redirected annually</p>
              <p className="text-lg font-bold tabular-nums">{money(totalReleased * 12)}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-primary/5 p-3 text-xs">
            <Badge variant="outline">Debt Payment</Badge><ArrowRight className="h-3 w-3" />
            <Badge variant="outline">Debt Paid Off</Badge><ArrowRight className="h-3 w-3" />
            <Badge variant="outline">Cash Flow Released</Badge><ArrowRight className="h-3 w-3" />
            <Badge className="bg-prism-teal text-background">Investment Redirect</Badge>
          </div>

          <div className="space-y-3">
            {state.debts.map((d, i) => (
              <div key={d.key} className="rounded-lg border border-border/60 p-3 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <Input
                    className="h-8 max-w-xs font-medium"
                    value={d.label}
                    onChange={(e) => setDebt(i, { label: e.target.value })}
                  />
                  <Button
                    size="icon" variant="ghost" className="h-8 w-8 print:hidden"
                    onClick={() => patch({ debts: state.debts.filter((_, ix) => ix !== i) })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  <div><Label className="text-[11px]">Balance</Label><NumField value={d.balance} onChange={(n) => setDebt(i, { balance: n })} /></div>
                  <div><Label className="text-[11px]">Rate %</Label><NumField value={d.ratePct} onChange={(n) => setDebt(i, { ratePct: n })} /></div>
                  <div><Label className="text-[11px]">Required / mo</Label><NumField value={d.requiredPayment} onChange={(n) => setDebt(i, { requiredPayment: n })} /></div>
                  <div><Label className="text-[11px]">Extra / mo</Label><NumField value={d.extraPayment} onChange={(n) => setDebt(i, { extraPayment: n })} /></div>
                  <div>
                    <Label className="text-[11px]">Est. payoff (YYYY-MM)</Label>
                    <Input className="h-9" value={d.payoffDate} onChange={(e) => setDebt(i, { payoffDate: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-[11px]">Actual payoff</Label>
                    <Input className="h-9" placeholder="—" value={d.actualPayoffDate || ''} onChange={(e) => setDebt(i, { actualPayoffDate: e.target.value || undefined })} />
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <Label className="text-[11px]">Cash flow released / mo</Label>
                    <NumField value={releasedCash(d)} onChange={(n) => setDebt(i, { releasedCashFlow: n })} />
                  </div>
                  <div>
                    <Label className="text-[11px]">Destination of released cash</Label>
                    <Select value={d.destination} onValueChange={(v) => setDebt(i, { destination: v as RedirectDestination })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(DESTINATION_LABEL) as RedirectDestination[]).map((k) => (
                          <SelectItem key={k} value={k}>{DESTINATION_LABEL[k]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {d.notes && <SectionNote>{d.notes}</SectionNote>}
              </div>
            ))}
          </div>

          <Button
            variant="outline" size="sm" className="print:hidden"
            onClick={() => patch({
              debts: [...state.debts, {
                key: `debt-${Date.now()}`, label: 'New debt', balance: 0, ratePct: 0,
                requiredPayment: 0, extraPayment: 0, payoffDate: '', destination: 'brokerage',
              }],
            })}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add debt
          </Button>
        </CardContent>
      </Card>

      {pslf?.forgiveness && (
        <Card className="wos-page">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Student Loan Forgiveness Pathway (PSLF / IDR)</CardTitle>
            <SectionNote>
              The balance stays a liability on the Net Worth dashboard until it is legally forgiven. The
              forgiveness pathway is tracked separately, and the released payment enters the investing timeline.
            </SectionNote>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div><Label className="text-[11px]">Loan balance</Label><NumField value={pslf.balance} onChange={(n) => setDebt(state.debts.indexOf(pslf), { balance: n })} /></div>
              <div><Label className="text-[11px]">Monthly qualifying payment</Label><NumField value={pslf.forgiveness.monthlyQualifyingPayment} onChange={(n) => setDebt(state.debts.indexOf(pslf), { forgiveness: { ...pslf.forgiveness!, monthlyQualifyingPayment: n } })} /></div>
              <div><Label className="text-[11px]">Payments completed</Label><NumField value={pslf.forgiveness.qualifyingPaymentsCompleted} onChange={(n) => setDebt(state.debts.indexOf(pslf), { forgiveness: { ...pslf.forgiveness!, qualifyingPaymentsCompleted: n } })} /></div>
              <div><Label className="text-[11px]">Payments remaining</Label><NumField value={pslf.forgiveness.qualifyingPaymentsRemaining} onChange={(n) => setDebt(state.debts.indexOf(pslf), { forgiveness: { ...pslf.forgiveness!, qualifyingPaymentsRemaining: n } })} /></div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>{pslf.forgiveness.qualifyingPaymentsCompleted} of {pslf.forgiveness.qualifyingPaymentsCompleted + pslf.forgiveness.qualifyingPaymentsRemaining} qualifying payments</span>
                <span>Est. forgiveness {pslf.forgiveness.forgivenessDate}</span>
              </div>
              <Progress
                value={
                  (pslf.forgiveness.qualifyingPaymentsCompleted /
                    Math.max(1, pslf.forgiveness.qualifyingPaymentsCompleted + pslf.forgiveness.qualifyingPaymentsRemaining)) * 100
                }
              />
            </div>
            <div className="rounded-lg bg-prism-teal/10 p-3 text-sm">
              At forgiveness, <strong>{money(pslf.forgiveness.monthlyQualifyingPayment)}/mo</strong> redirects to{' '}
              <strong>{DESTINATION_LABEL[pslf.destination]}</strong> — not to discretionary spending.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
