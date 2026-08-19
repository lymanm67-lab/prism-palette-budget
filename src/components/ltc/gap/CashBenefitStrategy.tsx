import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { LtcHousehold, LtcPolicy } from '@/lib/ltc/model';
import {
  waterfallAt, eliminationPlan, STACK_LABEL, usd, type GapStrategyState, type StackMode,
} from '@/lib/ltc/gapstrategy';

export function CashBenefitStrategy({ h, g, patchG, policy }: {
  h: LtcHousehold; g: GapStrategyState; patchG: (p: Partial<GapStrategyState>) => void; policy?: LtcPolicy;
}) {
  const age = g.stress.claimAge;
  const w = waterfallAt(h, g, age, g.weeklyHours, policy, { includeCash: false });
  const elim = eliminationPlan(h, g, age, g.weeklyHours, policy);
  const cashPct = policy?.cashBenefitPct ?? 25;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{cashPct}% cash benefit strategy</CardTitle>
          <p className="text-xs text-muted-foreground">
            A flexible resource, not a guaranteed addition to the reimbursement maximum. Confirm the contract before
            assuming both are payable in the same month.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs">Cash benefit stacks with reimbursement?</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {(['yes', 'no', 'unknown'] as StackMode[]).map((m) => (
                <Button key={m} size="sm" variant={g.stackCash === m ? 'default' : 'outline'} onClick={() => patchG({ stackCash: m })}>
                  {STACK_LABEL[m]}
                </Button>
              ))}
            </div>
            {g.stackCash === 'unknown' && (
              <p className="text-[11px] text-muted-foreground mt-2">
                Treated separately — the reimbursement gap is not reduced by the cash benefit until stacking is confirmed.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {[
              ['Plan maximum at age ' + age, `${usd(w.planMax)}/mo`],
              [`${cashPct}% cash benefit`, `${usd(w.cashBenefit)}/mo`],
              ['Gap before cash', `${usd(w.monthlyCost - w.reimbursement)}/mo`],
              ['Gap if cash stacks', `${usd(Math.max(0, w.monthlyCost - w.reimbursement - w.cashBenefit))}/mo`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-md border p-2">
                <div className="text-[11px] text-muted-foreground">{k}</div>
                <div className="font-semibold">{v}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">First {elim.days} days — elimination period strategy</CardTitle>
          <p className="text-xs text-muted-foreground">Normal reimbursement is not assumed during the wait.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Switch checked={g.cashPaysDuringElimination} onCheckedChange={(v) => patchG({ cashPaysDuringElimination: v })} />
            <span className="text-sm">Cash benefit is payable from day one (verify the rider)</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {[
              ['Care cost in window', usd(elim.careCost)],
              ['Support costs (25%)', usd(elim.supportCost)],
              ['Total self-funding requirement', usd(elim.total)],
              ['Cash benefit available', usd(elim.cashAvailable)],
              ['Retirement income available', usd(elim.incomeAvailable)],
              ['HSA balance needed', usd(elim.hsaNeeded)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-md border p-2">
                <div className="text-[11px] text-muted-foreground">{k}</div>
                <div className="font-semibold">{v}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={elim.covered ? 'text-prism-positive' : 'text-destructive'}>
              {elim.covered ? 'HSA covers the elimination period' : 'HSA short of the elimination period'}
            </Badge>
            <span className="text-xs text-muted-foreground">Projected HSA at claim: {usd(elim.hsaAvailable)}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Monthly retirement income available for LTC</Label>
              <Input type="number" value={g.retirementIncomeForLtc} onChange={(e) => patchG({ retirementIncomeForLtc: Number(e.target.value) })} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
