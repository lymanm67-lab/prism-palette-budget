import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BadgeCheck, Banknote, CalendarClock, HelpCircle, Info, ShieldCheck } from 'lucide-react';
import {
  NW, NW_CARRIER, NW_PRODUCT, NW_FEATURES, NW_CASH_INDEMNITY_ADVANTAGES,
  NW_CASH_INDEMNITY_TOOLTIP, NW_DECISION_SUMMARY, NW_REDUCED_PAID_UP,
  nwEliminationBridge,
} from '@/lib/ltc/nationwide';
import { money, money2, StatCard } from '../shared';
import { IllustrationTag, PlanningNotice } from './PlanningNotice';

export function NationwidePolicyTab() {
  const bridge = nwEliminationBridge(85);

  return (
    <div className="space-y-4">
      {/* ---------------- Dashboard card ---------------- */}
      <Card className="border-prism-amber/30 bg-gradient-to-br from-card to-prism-amber/[0.04]">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{NW_CARRIER}</p>
              <CardTitle className="text-xl">{NW_PRODUCT}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Linked life insurance and Long-Term Care policy · Joint coverage for Lyman and Kateri · Flexible shared
                LTC benefit pool · Cash indemnity claims
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge className="bg-prism-lime/15 text-prism-lime border-prism-lime/30" variant="outline">
                ACTIVE LTC STRATEGY
              </Badge>
              <Badge variant="outline" className="text-[10px]">Portfolio Protection Layer</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm font-semibold">Protect the Wealth We Are Building</p>
          <p className="text-xs text-muted-foreground">
            LTC insurance absorbs risk so long-term assets can remain focused on retirement, healthcare, family, and legacy.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Combined monthly premium" value={money2(NW.monthlyPremium)} sub={`${money2(NW.annualPremium)} per year · guaranteed`} tone="good" />
            <StatCard label="Initial monthly benefit (each)" value={money(NW.monthlyBenefitEach)} sub={`${NW.maxFullPayments} full monthly payments max`} />
            <StatCard label="Initial total LTC benefit" value={money(NW.initialTotalBenefit)} sub="Shared between both insureds" />
            <StatCard label="Inflation protection" value={`${NW.inflationPct}% compound`} sub="For life" tone="info" />
            <StatCard label="Illustrated benefit at age 85" value={money(NW.illustratedMonthlyAt85)} sub={`${money(NW.illustratedTotalAt85)} total illustrated benefits`} tone="info" />
            <StatCard label="Initial specified amount" value={`≈ ${money(NW.initialSpecifiedAmount)}`} sub="Life insurance component" />
            <StatCard label="Guaranteed minimum death benefit" value={`≈ ${money(NW.guaranteedMinimumDeathBenefit)}`} sub="Subject to policy terms" />
            <StatCard label="Elimination period" value={`${NW.eliminationDays} days`} sub={NW.premiumPayPeriod} />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {NW_FEATURES.map((f) => (
              <Badge key={f} variant="secondary" className="text-[10px] font-normal">{f}</Badge>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            All future values shown across this dashboard are illustrated guaranteed policy values based on the Nationwide
            proposal and policy assumptions.
          </p>
        </CardContent>
      </Card>

      {/* ---------------- Cash indemnity ---------------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Banknote className="h-4 w-4 text-prism-lime" /> Cash Indemnity Advantage
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button type="button" aria-label="What is cash indemnity?"><HelpCircle className="h-3.5 w-3.5 text-muted-foreground" /></button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">{NW_CASH_INDEMNITY_TOOLTIP}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Once an LTC claim has been approved and policy requirements are satisfied, Nationwide pays available LTC
            benefits directly to the policyowner.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-prism-lime/40 bg-prism-lime/10 text-prism-lime">Nationwide: Cash Indemnity</Badge>
            <span className="text-xs text-muted-foreground">instead of</span>
            <Badge variant="outline" className="text-muted-foreground">Traditional LTC: Reimbursement</Badge>
          </div>
          <ul className="space-y-1.5">
            {NW_CASH_INDEMNITY_ADVANTAGES.map((a) => (
              <li key={a} className="flex gap-2 text-sm">
                <BadgeCheck className="h-4 w-4 mt-0.5 shrink-0 text-prism-lime" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* ---------------- Elimination period ---------------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-prism-sky" /> How the 90-Day Waiting Period Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            The Nationwide structure provides retroactive benefits after the elimination period is completed, according to
            the policy illustration. Care costs during the first 90 days are funded by the household.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Monthly LTC benefit (age 85)" value={`≈ ${money(bridge.monthly)}`} sub="Per insured" tone="info" />
            <StatCard label="Retroactive months" value={`${bridge.retroMonths} months`} sub="90-day wait, then retroactive" />
            <StatCard label="Illustrative Retroactive Initial Payment" value={`≈ ${money(bridge.firstPayment)}`} sub={`${money(bridge.monthly)} × ${bridge.retroMonths}`} tone="good" />
          </div>
          <p className="text-xs text-muted-foreground flex gap-2">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            Actual claim payments are governed by the issued policy and the approved claim.
          </p>
        </CardContent>
      </Card>

      {/* ---------------- Decision summary ---------------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-prism-amber" /> Why This Policy Is in Our Wealth Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {NW_DECISION_SUMMARY.split('\n\n').map((p) => (
            <p key={p.slice(0, 24)} className="text-sm text-muted-foreground">{p}</p>
          ))}
        </CardContent>
      </Card>

      {/* ---------------- Reduced paid-up ---------------- */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">{NW_REDUCED_PAID_UP.title}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{NW_REDUCED_PAID_UP.body}</p>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Electing reduced paid-up coverage may reduce</p>
            <div className="flex flex-wrap gap-1.5">
              {NW_REDUCED_PAID_UP.reduces.map((r) => (
                <Badge key={r} variant="outline" className="text-[10px] font-normal">{r}</Badge>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{NW_REDUCED_PAID_UP.note}</p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <IllustrationTag illustrated /> values come straight off the proposal; <IllustrationTag illustrated={false} /> values are calculated at 3% compounding.
      </div>
      <PlanningNotice />
    </div>
  );
}
