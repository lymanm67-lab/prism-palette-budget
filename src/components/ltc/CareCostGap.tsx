import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import { type LtcState } from '@/lib/ltc/model';
import {
  PLAN_AGES, PLAN_HOUR_TIERS, PLAN_INFLATION_PCT, PLAN_MAX_MONTHLY,
  carePlanAt, carePlanTiers, planMaxAtAge, targetAgencyRate,
} from '@/lib/ltc/careplan';
import { money, money2, Note, Field, NumField, CoverageBadge, StatCard } from './shared';

const GROWTH = [2, 3, 4, 5];

export function CareCostGap({ state, patch }: { state: LtcState; patch: (p: Partial<LtcState>) => void }) {
  const h = state.household;
  const setH = (p: Partial<typeof h>) => patch({ household: { ...h, ...p } });
  const claimAge = h.assumedClaimAge;

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">{h.city} In-Home Care Cost Basis</CardTitle>
          <Note>
            Akron OH non-medical home care daily rate $128–$140. Hourly planning rate is derived from that range and
            grown at the cost growth assumption. Plan benefits are capped at {money(PLAN_MAX_MONTHLY)}/mo today, growing
            {' '}{PLAN_INFLATION_PCT}% compound annually.
          </Note>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <Field label="Daily planning low"><NumField value={h.dailyLow} onChange={(n) => setH({ dailyLow: n })} /></Field>
          <Field label="Daily planning high"><NumField value={h.dailyHigh} onChange={(n) => setH({ dailyHigh: n })} /></Field>
          <Field label="Assumed claim age"><NumField value={h.assumedClaimAge} onChange={(n) => setH({ assumedClaimAge: n })} /></Field>
          <Field label="Market"><input className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={h.city} onChange={(e) => setH({ city: e.target.value })} /></Field>
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground block">Care rate growth</span>
            <div className="flex gap-1">
              {GROWTH.map((g) => (
                <Button key={g} size="sm" variant={h.careCostGrowthPct === g ? 'default' : 'outline'}
                  onClick={() => setH({ careCostGrowthPct: g })}>{g}%</Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Projected cost, plan maximum and your share</CardTitle>
          <Note>Weekly care hours × projected hourly rate × 4.33 weeks, measured against the inflated plan maximum.</Note>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2">Age</th>
                <th className="py-2">Care hours</th>
                <th className="py-2">Projected rate</th>
                <th className="py-2">Monthly cost</th>
                <th className="py-2">Plan maximum</th>
                <th className="py-2">Plan pays</th>
                <th className="py-2">Your monthly share</th>
                <th className="py-2">Coverage</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {PLAN_AGES.flatMap((age) =>
                carePlanTiers(h, age).map((t, index) => (
                  <tr key={`${age}-${t.weeklyHours}`} className={`border-b border-border/30 ${index === 0 ? 'border-t border-border/60' : ''}`}>
                    <td className="py-2 font-semibold">{index === 0 ? age : ''}</td>
                    <td className="py-2 tabular-nums">{t.weeklyHours} hrs/week</td>
                    <td className="py-2 tabular-nums">{money2(t.hourlyRate)}/hr</td>
                    <td className="py-2 tabular-nums">{money(t.monthlyCost)}</td>
                    <td className="py-2 tabular-nums">{money(t.planMax)}</td>
                    <td className="py-2 tabular-nums font-semibold">{money(t.planPays)}</td>
                    <td className={`py-2 tabular-nums ${t.withinPlanMax ? 'text-prism-positive' : ''}`}>
                      {t.monthlyShare > 0 ? money(t.monthlyShare) : 'Covered'}
                    </td>
                    <td className="py-2 tabular-nums">{t.coveragePct.toFixed(0)}%</td>
                    <td className="py-2"><CoverageBadge band={t.band} /></td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Rate an agency must accept at age {claimAge}</CardTitle>
          <Note>The hourly rate that keeps each tier fully inside the {money(planMaxAtAge(h.lymanAge, claimAge))}/mo plan maximum.</Note>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PLAN_HOUR_TIERS.map((hrs) => {
            const p = carePlanAt(h, claimAge, hrs);
            const target = targetAgencyRate(hrs, p.planMax);
            return (
              <StatCard
                key={hrs}
                label={`${hrs} hrs/week`}
                value={`${money2(target)}/hr`}
                sub={`Market projection ${money2(p.hourlyRate)}/hr`}
                tone={p.hourlyRate <= target ? 'good' : 'warn'}
              />
            );
          })}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base">Care rate growth scenarios at age {claimAge}</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {GROWTH.map((g) => {
            const p = carePlanAt(h, claimAge, 20, { careInflationPct: g });
            return (
              <div key={g} className="rounded-lg border border-border/60 bg-card/60 p-3 space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{g}% care growth · 20 hrs/wk</p>
                <p className="text-lg font-bold tabular-nums">{money(p.monthlyCost)}/mo</p>
                <p className="text-xs text-muted-foreground">Your share {money(p.monthlyShare)}</p>
                <CoverageBadge band={p.band} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="pt-5 flex items-start gap-2">
          <Info className="h-4 w-4 text-prism-sky mt-0.5 shrink-0" />
          <p className="text-sm">
            The plan is capped on purpose. Instead of insuring 24/7 care, it funds a defined block of in-home hours at a
            monthly maximum of {money(PLAN_MAX_MONTHLY)} today, inflated {PLAN_INFLATION_PCT}% annually. Agencies are
            shopped to accept that maximum. Daily planning range for {h.city}: ${h.dailyLow}–${h.dailyHigh} per day.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
