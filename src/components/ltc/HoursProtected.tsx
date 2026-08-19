import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Gauge, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { money, money2, Note, Field, NumField, Select, CoverageBadge, StatCard, hours1 } from './shared';
import {
  CARE_CATEGORY_LABEL, HOUR_TIERS, activePolicy, benefitPoolNote, blendedCare, coverageAt, locationAffordability,
  locationLabel, locationPlanningRate, locationRetirementImpact, policyMonthlyBenefit, progressionHours,
  simulateProgression, weeklyHoursCovered,
  type CareCategory, type LtcLocationState,
} from '@/lib/ltc/location';
import { benefitAtAge, type LtcState } from '@/lib/ltc/model';

interface Props {
  state: LtcState;
  loc: LtcLocationState;
  patchLoc: (p: Partial<LtcLocationState>) => void;
}

export function HoursProtected({ state, loc, patchLoc }: Props) {
  const policy = activePolicy(state);
  const h = state.household;
  const benefit = policyMonthlyBenefit(policy, h.lymanAge);
  const pool = policy ? benefitAtAge(policy, h.lymanAge, h.lymanAge).pool : 0;
  const current = loc.locations.find((l) => l.isCurrent) || loc.locations[0];
  const future = loc.locations.find((l) => l.id === loc.futureLocationId);
  const rateOf = (id?: string) => {
    const l = loc.locations.find((x) => x.id === id);
    return l ? locationPlanningRate(l, loc.agencies, loc.compareCategory).rate : null;
  };
  const currentRate = rateOf(current?.id);
  const setBlended = (p: Partial<LtcLocationState['blended']>) => patchLoc({ blended: { ...loc.blended, ...p } });

  const progHours = progressionHours(loc.progression);
  const progression = currentRate
    ? simulateProgression(progHours, currentRate, loc.careRateInflationPct, benefit, policy?.inflationPct ?? 0, pool)
    : [];
  const blend = blendedCare(loc.blended, currentRate || 0, benefit);

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------ primary metric */}
      <Card className="glass-card border-primary/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> Hours of Professional Care Protected
          </CardTitle>
          <Note>The primary decision metric: how many hours of care our policy purchases where we actually live.</Note>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            {currentRate ? (
              <>
                Our LTC insurance currently purchases approximately{' '}
                <span className="font-bold text-primary">{weeklyHoursCovered(benefit, currentRate).toFixed(1)} hours</span>{' '}
                of professional {CARE_CATEGORY_LABEL[loc.compareCategory].toLowerCase()} per week at{' '}
                {money2(currentRate)}/hour in {locationLabel(current!)}.
              </>
            ) : (
              'Enter a local hourly rate or agency pricing to see how many hours the policy purchases.'
            )}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {loc.locations.map((l) => {
              const r = locationPlanningRate(l, loc.agencies, loc.compareCategory).rate;
              return (
                <StatCard
                  key={l.id}
                  label={locationLabel(l) || 'Unnamed'}
                  value={r ? `${weeklyHoursCovered(benefit, r).toFixed(1)} hrs/wk` : '—'}
                  sub={r ? `${money2(r)}/hr` : 'Rate Not Publicly Available'}
                  tone={l.isCurrent ? 'info' : 'default'}
                />
              );
            })}
          </div>
          <Note>{benefitPoolNote(policy)}</Note>
        </CardContent>
      </Card>

      {/* ------------------------------------------------ care intensity */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Care Intensity by Location</CardTitle>
          <Note>A policy can fully cover moderate care needs even when it does not fully cover full-time home care.</Note>
        </CardHeader>
        <CardContent className="space-y-4">
          {loc.locations.map((l) => {
            const r = locationPlanningRate(l, loc.agencies, loc.compareCategory).rate;
            return (
              <div key={l.id} className="rounded-lg border border-border/60 p-3 space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-sm">{locationLabel(l) || 'Unnamed'}</p>
                  <p className="text-[11px] text-muted-foreground">{r ? `${money2(r)}/hr` : 'Rate Not Publicly Available'}</p>
                </div>
                {!r ? <p className="text-xs text-muted-foreground">Add pricing to model care intensity here.</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                          <th className="py-1.5">Care level</th>
                          <th className="py-1.5">Monthly cost</th>
                          <th className="py-1.5">Insurance pays</th>
                          <th className="py-1.5">Household pays</th>
                          <th className="py-1.5">% covered</th>
                          <th className="py-1.5">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {HOUR_TIERS.map((t) => {
                          const c = coverageAt(t, r, benefit);
                          return (
                            <tr key={t} className="border-b border-border/30">
                              <td className="py-1.5">{t} hours/week</td>
                              <td className="py-1.5 tabular-nums">{money(c.monthlyCost)}</td>
                              <td className="py-1.5 tabular-nums">{money(c.insurancePays)}</td>
                              <td className="py-1.5 tabular-nums font-semibold">{money(c.outOfPocketMonthly)}</td>
                              <td className="py-1.5 tabular-nums">{c.coveragePct.toFixed(0)}%</td>
                              <td className="py-1.5"><CoverageBadge band={c.band} /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ------------------------------------------------ progression */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Progressive Care Scenario — {locationLabel(current!) || 'current market'}</CardTitle>
          <Note>Care needs usually increase. Agency rates grow at {loc.careRateInflationPct}%; the benefit grows at {policy?.inflationPct ?? 0}%.</Note>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {(['moderate', 'higher', 'custom'] as const).map((m) => (
              <Button key={m} size="sm" variant={loc.progression.mode === m ? 'default' : 'outline'}
                onClick={() => patchLoc({ progression: { ...loc.progression, mode: m } })}>
                {m === 'moderate' ? 'Moderate 10 → 20 → 30' : m === 'higher' ? 'Higher care 20 → 30 → 40' : 'Custom'}
              </Button>
            ))}
          </div>
          {loc.progression.mode === 'custom' && (
            <div className="grid sm:grid-cols-4 gap-3">
              {[0, 1, 2].map((i) => (
                <Field key={i} label={`Year ${i + 1} hours/week`}>
                  <NumField
                    value={loc.progression.customHours[i] ?? 0}
                    onChange={(n) => {
                      const arr = [...loc.progression.customHours];
                      arr[i] = n;
                      patchLoc({ progression: { ...loc.progression, customHours: arr } });
                    }}
                  />
                </Field>
              ))}
            </div>
          )}
          {!progression.length ? <p className="text-sm text-muted-foreground">Add a local rate to run the progression.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="py-2">Year</th>
                    <th className="py-2">Hours/week</th>
                    <th className="py-2">Hourly rate</th>
                    <th className="py-2">Annual cost</th>
                    <th className="py-2">Insurance reimbursement</th>
                    <th className="py-2">Household contribution</th>
                    <th className="py-2">Policy pool used</th>
                    <th className="py-2">Pool remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {progression.map((p) => (
                    <tr key={p.year} className="border-b border-border/30">
                      <td className="py-2">{p.year}</td>
                      <td className="py-2 tabular-nums">{p.weeklyHours}</td>
                      <td className="py-2 tabular-nums">{money2(p.hourlyRate)}</td>
                      <td className="py-2 tabular-nums">{money(p.annualCost)}</td>
                      <td className="py-2 tabular-nums">{money(p.insurancePaid)}</td>
                      <td className="py-2 tabular-nums font-semibold">{money(p.householdPaid)}</td>
                      <td className="py-2 tabular-nums">{money(p.poolUsed)}</td>
                      <td className="py-2 tabular-nums">{money(p.poolRemaining)}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td className="py-2" colSpan={3}>Total</td>
                    <td className="py-2 tabular-nums">{money(progression.reduce((s, p) => s + p.annualCost, 0))}</td>
                    <td className="py-2 tabular-nums">{money(progression.reduce((s, p) => s + p.insurancePaid, 0))}</td>
                    <td className="py-2 tabular-nums">{money(progression.reduce((s, p) => s + p.householdPaid, 0))}</td>
                    <td className="py-2" colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------ blended care */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Blended Care Model</CardTitle>
          <Note>Not all required care has to be purchased from an agency. Family support reduces the paid hours needed.</Note>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Field label="Care needed (hrs/week)"><NumField value={loc.blended.neededWeeklyHours} onChange={(n) => setBlended({ neededWeeklyHours: n })} /></Field>
            <Field label="Family caregiver hrs/week"><NumField value={loc.blended.familyWeeklyHours} onChange={(n) => setBlended({ familyWeeklyHours: n })} /></Field>
            <Field label="Adult day care hrs/week"><NumField value={loc.blended.adultDayWeeklyHours} onChange={(n) => setBlended({ adultDayWeeklyHours: n })} /></Field>
            <Field label="Adult day care $/hr"><NumField value={loc.blended.adultDayHourlyCost} onChange={(n) => setBlended({ adultDayHourlyCost: n })} /></Field>
            <Field label="Respite hrs/week"><NumField value={loc.blended.respiteWeeklyHours} onChange={(n) => setBlended({ respiteWeeklyHours: n })} /></Field>
            <Field label="Other support hrs/week"><NumField value={loc.blended.otherSupportWeeklyHours} onChange={(n) => setBlended({ otherSupportWeeklyHours: n })} /></Field>
            <Field label="Meal services $/mo"><NumField value={loc.blended.mealServiceMonthly} onChange={(n) => setBlended({ mealServiceMonthly: n })} /></Field>
            <Field label="Transportation $/mo"><NumField value={loc.blended.transportationMonthly} onChange={(n) => setBlended({ transportationMonthly: n })} /></Field>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Paid agency hours" value={hours1(blend.paidAgencyWeeklyHours)} sub={`of ${hours1(blend.neededWeeklyHours)} needed`} />
            <StatCard label="Total monthly care cost" value={money(blend.totalMonthlyCost)} />
            <StatCard label="Insurance pays" value={money(blend.insurancePays)} tone="good" />
            <StatCard label="Household pays" value={money(blend.householdPays)} tone={blend.householdPays > 1000 ? 'warn' : 'default'} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Coverage {blend.coveragePct.toFixed(0)}%</span>
            <CoverageBadge band={blend.band} />
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------ affordability score */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Gauge className="h-4 w-4 text-primary" /> LTC Location Affordability Score</CardTitle>
          <Note>An LTC affordability indicator only — not a recommendation about where we should live.</Note>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2">Location</th>
                <th className="py-2">Score</th>
                <th className="py-2">Hours bought</th>
                <th className="py-2">20-hr coverage</th>
                <th className="py-2">30-hr coverage</th>
                <th className="py-2">Household @ 20 hrs</th>
                <th className="py-2">Inflation drag</th>
              </tr>
            </thead>
            <tbody>
              {loc.locations.map((l) => {
                const s = locationAffordability(l, loc.agencies, loc.compareCategory, benefit,
                  policy?.inflationPct ?? 0, loc.careRateInflationPct);
                return (
                  <tr key={l.id} className="border-b border-border/30">
                    <td className="py-2">{locationLabel(l) || '—'}</td>
                    <td className="py-2 tabular-nums font-semibold">{s.rate ? `${s.score}/100` : '—'}</td>
                    <td className="py-2 tabular-nums">{s.rate ? hours1(s.hoursCovered) : '—'}</td>
                    <td className="py-2 tabular-nums">{s.rate ? `${s.cover20.toFixed(0)}%` : '—'}</td>
                    <td className="py-2 tabular-nums">{s.rate ? `${s.cover30.toFixed(0)}%` : '—'}</td>
                    <td className="py-2 tabular-nums">{s.rate ? money(s.oop20) : '—'}</td>
                    <td className="py-2 tabular-nums">{s.rate ? `${s.inflationDrag > 0 ? '+' : ''}${s.inflationDrag.toFixed(1)}pp` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ------------------------------------------------ retirement protection */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Retirement Asset Protection by Location</CardTitle>
          <Note>
            Three years of care at {loc.compareHours} hrs/week against a retirement balance of {money(h.retirementBalance)}.
            Answers: would moving materially increase the threat long-term care poses to the portfolio?
          </Note>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2">Location</th>
                <th className="py-2">3-yr care cost</th>
                <th className="py-2">Insurance benefits</th>
                <th className="py-2">Household LTC expense</th>
                <th className="py-2">Withdrawals avoided</th>
                <th className="py-2">Risk transferred</th>
                <th className="py-2">Assets preserved (no ins.)</th>
                <th className="py-2">Assets preserved (with ins.)</th>
              </tr>
            </thead>
            <tbody>
              {loc.locations.map((l) => {
                const r = locationPlanningRate(l, loc.agencies, loc.compareCategory).rate;
                const im = locationRetirementImpact(l, r, loc.compareHours, benefit, pool, h.retirementBalance);
                return (
                  <tr key={l.id} className="border-b border-border/30">
                    <td className="py-2">{locationLabel(l) || '—'}</td>
                    <td className="py-2 tabular-nums">{r ? money(im.threeYearCareCost) : '—'}</td>
                    <td className="py-2 tabular-nums">{r ? money(im.insuranceBenefits) : '—'}</td>
                    <td className="py-2 tabular-nums font-semibold">{r ? money(im.householdLtcExpense) : '—'}</td>
                    <td className="py-2 tabular-nums">{r ? money(im.withdrawalsAvoided) : '—'}</td>
                    <td className="py-2 tabular-nums">{r ? `${im.riskTransferredPct.toFixed(0)}%` : '—'}</td>
                    <td className="py-2 tabular-nums">{r ? money(im.assetsPreservedNoInsurance) : '—'}</td>
                    <td className="py-2 tabular-nums">{r ? money(im.assetsPreservedWithInsurance) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ------------------------------------------------ final decision */}
      <Card className="glass-card border-primary/30">
        <CardHeader>
          <CardTitle className="text-base">Where Does Our LTC Policy Work Best?</CardTitle>
          <Note>Real agency cost + actual hours needed + LTC benefit + household resources = realistic LTC exposure.</Note>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2">Measure</th>
                  <th className="py-2">{current ? locationLabel(current) : 'Current city'}</th>
                  <th className="py-2">{future ? locationLabel(future) : 'Potential future city'}</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const fr = rateOf(future?.id);
                  const c = currentRate ? coverageAt(loc.compareHours, currentRate, benefit) : null;
                  const f = fr ? coverageAt(loc.compareHours, fr, benefit) : null;
                  const ci = current ? locationRetirementImpact(current, currentRate, loc.compareHours, benefit, pool, h.retirementBalance) : null;
                  const fi = future ? locationRetirementImpact(future, fr, loc.compareHours, benefit, pool, h.retirementBalance) : null;
                  const rows: [string, string, string][] = [
                    ['Local agency rate', currentRate ? `${money2(currentRate)}/hr` : '—', fr ? `${money2(fr)}/hr` : '—'],
                    ['Weekly hours covered', c ? hours1(c.hoursCoveredWeekly) : '—', f ? hours1(f.hoursCoveredWeekly) : '—'],
                    ['Monthly out-of-pocket', c ? money(c.outOfPocketMonthly) : '—', f ? money(f.outOfPocketMonthly) : '—'],
                    ['3-year household exposure', c ? money(c.outOfPocket3Year) : '—', f ? money(f.outOfPocket3Year) : '—'],
                    ['Retirement assets protected', ci && currentRate ? money(ci.withdrawalsAvoided) : '—', fi && fr ? money(fi.withdrawalsAvoided) : '—'],
                  ];
                  return rows.map((r) => (
                    <tr key={r[0]} className="border-b border-border/30">
                      <td className="py-2 text-muted-foreground">{r[0]}</td>
                      <td className="py-2 tabular-nums">{r[1]}</td>
                      <td className="py-2 tabular-nums font-semibold">{r[2]}</td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>

          <div className="space-y-2">
            {HOUR_TIERS.map((t) => {
              const c = currentRate ? coverageAt(t, currentRate, benefit) : null;
              return (
                <div key={t} className="flex flex-wrap items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Can our policy reasonably support {t} hours/week in {current ? locationLabel(current) : 'our market'}?</span>
                  {c ? <><Badge variant="outline" className="text-[10px]">{c.coveragePct.toFixed(0)}% covered</Badge><CoverageBadge band={c.band} />
                    <span className="text-xs text-muted-foreground">household {money(c.outOfPocketMonthly)}/mo</span></>
                    : <span className="text-xs text-muted-foreground">Add a local rate to answer.</span>}
                </div>
              );
            })}
          </div>

          {(() => {
            const fr = rateOf(future?.id);
            if (!currentRate || !fr || !future) return null;
            const diff = ((fr - currentRate) / currentRate) * 100;
            const c = coverageAt(loc.compareHours, currentRate, benefit);
            const f = coverageAt(loc.compareHours, fr, benefit);
            const exposureDiff = f.outOfPocket3Year - c.outOfPocket3Year;
            return (
              <div className="rounded-lg border border-border/60 bg-card/60 p-3 text-sm">
                <p className="font-semibold mb-1">Would moving materially change our LTC risk?</p>
                <p>
                  Moving to {locationLabel(future)} changes the local rate by {diff > 0 ? '+' : ''}{diff.toFixed(0)}% and the
                  three-year household exposure by {exposureDiff >= 0 ? '+' : '−'}{money(Math.abs(exposureDiff))} at{' '}
                  {loc.compareHours} hours/week. Coverage moves from {c.coveragePct.toFixed(0)}% to {f.coveragePct.toFixed(0)}%.
                </p>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="pt-5">
          <Field label="Care category used across this tab">
            <Select value={loc.compareCategory} onChange={(v) => patchLoc({ compareCategory: v as CareCategory })}
              options={(['nonMedical', 'personalCare', 'homeHealth', 'skilledNursing'] as CareCategory[])
                .map((c) => ({ value: c, label: CARE_CATEGORY_LABEL[c] }))} />
          </Field>
        </CardContent>
      </Card>
    </div>
  );
}
