import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import { benefitAtAge, careCostAtAge, gapBand, type LtcState } from '@/lib/ltc/model';
import { coverageAt, futureHourlyRate, HOUR_TIERS } from '@/lib/ltc/location';
import { money, money2, Note, Field, NumField, GapBadge, CoverageBadge } from './shared';

const GROWTH = [2, 3, 4, 5];
const AGES = [65, 70, 75, 80, 85];

export function CareCostGap({ state, patch }: { state: LtcState; patch: (p: Partial<LtcState>) => void }) {
  const h = state.household;
  const policy = state.policies.find((p) => p.id === state.currentPolicyId) || state.policies[0];
  const setH = (p: Partial<typeof h>) => patch({ household: { ...h, ...p } });

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">{h.city} Non-Medical Home Care Cost Basis</CardTitle>
          <Note>Akron OH daily rate $128–$140. Replace with agency quotes as you gather them.</Note>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <Field label="In-home care ($/month)"><NumField value={h.homeCareMonthly} onChange={(n) => setH({ homeCareMonthly: n })} /></Field>
          <Field label="Daily planning low"><NumField value={h.dailyLow} onChange={(n) => setH({ dailyLow: n })} /></Field>
          <Field label="Daily planning high"><NumField value={h.dailyHigh} onChange={(n) => setH({ dailyHigh: n })} /></Field>
          <Field label="Market"><input className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={h.city} onChange={(e) => setH({ city: e.target.value })} /></Field>
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground block">Cost growth assumption</span>
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
          <CardTitle className="text-base">Projected cost, benefit and gap</CardTitle>
          <Note>Weekly care hours × projected local hourly rate × 4.33. Plan benefits are capped at $2,100 per month.</Note>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2">Age</th>
                <th className="py-2">Care hours</th>
                <th className="py-2">Projected rate</th>
                <th className="py-2">Monthly cost</th>
                <th className="py-2">Plan pays</th>
                <th className="py-2">Your monthly share</th>
                <th className="py-2">Coverage</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {AGES.flatMap((age) => {
                const years = Math.max(0, age - h.lymanAge);
                const currentHourlyRate = ((h.dailyLow + h.dailyHigh) / 2) / 4.5;
                const hourlyRate = futureHourlyRate(currentHourlyRate, h.careCostGrowthPct, years);
                const availableBenefit = Math.min(2100, policy ? benefitAtAge(policy, h.lymanAge, age).monthlyBenefit : 0);

                return HOUR_TIERS.map((hours, index) => {
                  const coverage = coverageAt(hours, hourlyRate, availableBenefit);
                  return (
                    <tr key={`${age}-${hours}`} className={`border-b border-border/30 ${index === 0 ? 'border-t border-border/60' : ''}`}>
                      <td className="py-2 font-semibold">{index === 0 ? age : ''}</td>
                      <td className="py-2 tabular-nums">{hours} hrs/week</td>
                      <td className="py-2 tabular-nums">{money2(hourlyRate)}/hr</td>
                      <td className="py-2 tabular-nums">{money(coverage.monthlyCost)}</td>
                      <td className="py-2 tabular-nums font-semibold">{money(coverage.insurancePays)}</td>
                      <td className="py-2 tabular-nums">{money(coverage.outOfPocketMonthly)}</td>
                      <td className="py-2 tabular-nums">{coverage.coveragePct.toFixed(0)}%</td>
                      <td className="py-2"><CoverageBadge band={coverage.band} /></td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base">Growth scenarios at age {h.assumedClaimAge}</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {GROWTH.map((g) => {
            const cost = careCostAtAge(h, h.lymanAge, h.assumedClaimAge, g);
            const benefit = policy ? benefitAtAge(policy, h.lymanAge, h.assumedClaimAge).monthlyBenefit : 0;
            return (
              <div key={g} className="rounded-lg border border-border/60 bg-card/60 p-3 space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{g}% annual growth</p>
                <p className="text-lg font-bold tabular-nums">{money(cost)}/mo</p>
                <p className="text-xs text-muted-foreground">Gap {money(Math.max(0, cost - benefit))}</p>
                <GapBadge band={gapBand(benefit, cost)} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="pt-5 flex items-start gap-2">
          <Info className="h-4 w-4 text-prism-sky mt-0.5 shrink-0" />
          <p className="text-sm">
            A gap is not automatically a failure. The purpose of LTC insurance is to transfer the largest portion of the
            risk while retirement income and assets fund a manageable remaining amount. Daily planning range for {h.city}:
            {' '}${h.dailyLow}–${h.dailyHigh} per day.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
