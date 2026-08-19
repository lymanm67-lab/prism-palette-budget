import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import type { LtcHousehold, LtcPolicy } from '@/lib/ltc/model';
import {
  strategyVerdict, waterfallAt, PROTECTION_LABEL, PROTECTION_NOTE, usd, type GapStrategyState,
} from '@/lib/ltc/gapstrategy';
import { targetAgencyRate } from '@/lib/ltc/careplan';

export function GapRecommendation({ h, g, policy }: { h: LtcHousehold; g: GapStrategyState; policy?: LtcPolicy }) {
  const age = g.stress.claimAge;
  const v = strategyVerdict(h, g, age, g.weeklyHours, policy);
  const w = waterfallAt(h, g, age, g.weeklyHours, policy);

  const actions = [
    `Keep the compound inflation rider — it protects the coverage ratio, not just the dollar benefit.`,
    `Shop agencies at or below ${usd(targetAgencyRate(g.weeklyHours, w.planMax), 2)}/hr so ${g.weeklyHours} hrs/week fits the plan maximum.`,
    g.hsa.strategy === 'reserve'
      ? 'Continue investing the HSA as a future care reserve rather than spending it on current medical costs.'
      : 'Shift the HSA toward the reserve strategy so more of it compounds for future care.',
    'Confirm in writing whether the cash benefit is payable alongside reimbursement and during the elimination period.',
    v.moreInsuranceNeeded
      ? 'Consider a modest benefit increase — the projected portfolio exposure outweighs investing the premium difference.'
      : 'Additional insurance is not indicated; the HSA and income layers cover the residual more efficiently.',
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            {v.band === 'strong' || v.band === 'solid'
              ? <CheckCircle2 className="h-4 w-4 text-prism-positive" />
              : <AlertTriangle className="h-4 w-4 text-destructive" />}
            Are we protected?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{PROTECTION_LABEL[v.band]}</Badge>
            <span className="text-sm text-muted-foreground">{PROTECTION_NOTE[v.band]}</span>
          </div>
          <ul className="space-y-1 text-sm">
            {v.reasons.map((r) => (
              <li key={r} className="flex gap-2"><span className="text-primary">•</span><span>{r}</span></li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Action steps</CardTitle></CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm list-decimal pl-5">
            {actions.map((a) => <li key={a}>{a}</li>)}
          </ol>
          <p className="text-[11px] text-muted-foreground italic mt-3">
            Educational planning output, not insurance, tax or legal advice. Verify policy terms with the carrier, HSA
            and tax treatment with a tax professional, and Medicaid or Partnership rules with an elder-law attorney.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
