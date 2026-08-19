import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, ShieldCheck } from 'lucide-react';
import type { LtcPolicy, LtcHousehold } from '@/lib/ltc/model';
import {
  dualGap, partnershipProtection, protectionBand, PROTECTION_LABEL, PROTECTION_NOTE,
  usd, type GapStrategyState,
} from '@/lib/ltc/gapstrategy';

const LAYER_TONE: Record<string, string> = {
  cost: 'bg-muted/60',
  reimbursement: 'bg-primary/10 border-primary/30',
  cash: 'bg-primary/5 border-primary/20',
  hsa: 'bg-prism-positive/10 border-prism-positive/30',
  income: 'bg-accent/40',
  portfolio: 'bg-destructive/10 border-destructive/30',
};

export function FundingWaterfall({ h, g, policy }: { h: LtcHousehold; g: GapStrategyState; policy?: LtcPolicy }) {
  const age = g.stress.claimAge;
  const { conservative, optimistic, showBoth } = dualGap(h, g, age, g.weeklyHours, policy);
  const primary = g.stackCash === 'yes' ? optimistic : conservative;
  const band = protectionBand(primary);
  const partner = partnershipProtection(policy, h, age, g.careMonths / 12);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Funding waterfall — age {age}, {g.weeklyHours} hrs/week</CardTitle>
          <p className="text-xs text-muted-foreground">
            Insurance first. HSA second. Income third. Portfolio last.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {primary.layers.map((l, i) => (
            <div key={l.key}>
              <div className={`rounded-md border p-3 flex flex-wrap items-baseline justify-between gap-2 ${LAYER_TONE[l.key] || ''}`}>
                <div>
                  <div className="text-sm font-medium">
                    {i > 0 && i < primary.layers.length ? `Layer ${i}: ` : ''}{l.label}
                  </div>
                  {l.note && <div className="text-[11px] text-muted-foreground">{l.note}</div>}
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">{usd(l.amount)}<span className="text-xs font-normal text-muted-foreground">/mo</span></div>
                  {l.key !== 'cost' && l.key !== 'portfolio' && (
                    <div className="text-[11px] text-muted-foreground">remaining {usd(l.remaining)}</div>
                  )}
                </div>
              </div>
              {i < primary.layers.length - 1 && (
                <div className="flex justify-center py-0.5"><ArrowDown className="h-3.5 w-3.5 text-muted-foreground" /></div>
              )}
            </div>
          ))}

          <div className="flex justify-center py-0.5"><ArrowDown className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4 text-primary" /> Layer 6: Partnership protection (asset protection backstop)
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {partner.qualified
                ? `${usd(partner.benefitsPaid)} of benefits paid could support a matching Ohio asset disregard of ${usd(partner.assetDisregard)}. Not monthly income.`
                : 'Current policy is not flagged Partnership-qualified.'}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Conservative gap (cash benefit excluded)</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-destructive">{usd(conservative.portfolioGap)}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
            <p className="text-xs text-muted-foreground mt-1">True portfolio gap after reimbursement, HSA and allocated income.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Optimistic gap (cash benefit stacks)</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-prism-positive">{usd(optimistic.portfolioGap)}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
            <p className="text-xs text-muted-foreground mt-1">
              {showBoth ? 'Shown for comparison only — stacking is unconfirmed.' : 'Cash benefit applied on top of reimbursement.'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Executive KPIs</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          {[
            ['Monthly care cost', usd(primary.monthlyCost)],
            ['LTC reimbursement', usd(primary.reimbursement)],
            ['Potential cash benefit', usd(primary.cashBenefit)],
            ['HSA support', usd(primary.hsaSupport)],
            ['Retirement income support', usd(primary.incomeSupport)],
            ['True portfolio gap', usd(primary.portfolioGap)],
            ['HSA balance at claim', usd(primary.hsaBalance)],
            ['Risk transferred to insurance', `${primary.insurancePct.toFixed(0)}%`],
            ['Partnership asset protection', usd(partner.assetsProtected)],
          ].map(([k, v]) => (
            <div key={k as string} className="rounded-md border p-2">
              <div className="text-[11px] text-muted-foreground">{k}</div>
              <div className="font-semibold">{v}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <Badge variant="outline">{PROTECTION_LABEL[band]}</Badge>
          <span className="text-sm text-muted-foreground">{PROTECTION_NOTE[band]}</span>
        </CardContent>
      </Card>
    </div>
  );
}
