import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Plus, Trash2, Home, Plane, TrendingUp } from 'lucide-react';
import CollapsibleSection from '@/components/CollapsibleSection';
import { money, money2, Note, Field, NumField, TextField, Select, CoverageBadge, StatCard, hours1 } from './shared';
import {
  CARE_CATEGORY_LABEL, CARE_CATEGORY_EXAMPLES, HOUR_TIERS, PROJECTION_AGES, US_STATES,
  activePolicy, coverageAt, futureHourlyRate, locationLabel, locationPlanningRate, monthlyCostFromHours,
  policyMonthlyBenefit, weeklyHoursCovered,
  type CareCategory, type LtcLocation, type LtcLocationState,
} from '@/lib/ltc/location';
import type { LtcState } from '@/lib/ltc/model';

const CATS: CareCategory[] = ['nonMedical', 'personalCare', 'homeHealth', 'skilledNursing'];
const INFL = [2, 3, 4, 5];

interface Props {
  state: LtcState;
  loc: LtcLocationState;
  patchLoc: (p: Partial<LtcLocationState>) => void;
}

export function CareCostByLocation({ state, loc, patchLoc }: Props) {
  const policy = activePolicy(state);
  const h = state.household;
  const benefitNow = policyMonthlyBenefit(policy, h.lymanAge);
  const current = loc.locations.find((l) => l.isCurrent) || loc.locations[0];

  const setLocation = (id: string, p: Partial<LtcLocation>) =>
    patchLoc({ locations: loc.locations.map((l) => (l.id === id ? { ...l, ...p } : l)) });

  const setMedian = (id: string, cat: CareCategory, v: number) =>
    patchLoc({
      locations: loc.locations.map((l) =>
        l.id === id ? { ...l, medianHourly: { ...l.medianHourly, [cat]: v > 0 ? v : null } } : l),
    });

  const addLocation = () =>
    patchLoc({
      locations: [...loc.locations, {
        id: `loc-${Date.now()}`, city: '', state: 'OH',
        medianHourly: { nonMedical: null, personalCare: null, homeHealth: null, skilledNursing: null },
        assistedLivingMonthly: null, nursingMonthly: null, partnershipAvailable: null, providerCount: null,
        lastUpdated: new Date().toISOString().slice(0, 10), source: 'User entered',
      }],
    });

  const removeLocation = (id: string) => patchLoc({
    locations: loc.locations.filter((l) => l.id !== id),
    agencies: loc.agencies.filter((a) => a.locationId !== id),
    futureLocationId: loc.futureLocationId === id ? undefined : loc.futureLocationId,
  });

  const makeCurrent = (id: string) =>
    patchLoc({ locations: loc.locations.map((l) => ({ ...l, isCurrent: l.id === id })) });

  const rateFor = (l: LtcLocation) => locationPlanningRate(l, loc.agencies, loc.compareCategory);
  const future = loc.locations.find((l) => l.id === loc.futureLocationId);

  const currentRate = current ? rateFor(current).rate : null;
  const stateRows = [...new Set(loc.locations.map((l) => l.state).filter(Boolean))];

  return (
    <div className="space-y-4">
      <Card className="glass-card border-primary/30">
        <CardContent className="pt-5 flex items-start gap-3">
          <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Long-Term Care Location Strategy</p>
            <p className="text-sm text-muted-foreground">
              Care costs are local. Our insurance strategy should be too. Compare actual agencies, measure how many
              hours the policy purchases, understand the household contribution, and make relocation decisions with the
              full financial picture in view.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------ assumption controls */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Comparison basis</CardTitle>
          <Note>
            Care costs may rise at a different rate than the policy benefit, so the two inflation assumptions are kept
            separate.
          </Note>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <Field label="Care category">
            <Select
              value={loc.compareCategory}
              onChange={(v) => patchLoc({ compareCategory: v as CareCategory })}
              options={CATS.map((c) => ({ value: c, label: CARE_CATEGORY_LABEL[c] }))}
            />
          </Field>
          <Field label="Care hours per week">
            <Select
              value={String(loc.compareHours)}
              onChange={(v) => patchLoc({ compareHours: Number(v) })}
              options={HOUR_TIERS.map((t) => ({ value: String(t), label: `${t} hours/week` }))}
            />
          </Field>
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground block">Agency rate inflation</span>
            <div className="flex gap-1 flex-wrap">
              {INFL.map((g) => (
                <Button key={g} size="sm" variant={loc.careRateInflationPct === g ? 'default' : 'outline'}
                  onClick={() => patchLoc({ careRateInflationPct: g })}>{g}%</Button>
              ))}
              <div className="w-20"><NumField value={loc.careRateInflationPct} onChange={(n) => patchLoc({ careRateInflationPct: n })} /></div>
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-card/60 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Policy benefit inflation</p>
            <p className="text-lg font-bold tabular-nums">{policy?.inflationPct ?? 0}% compound</p>
            <p className="text-[11px] text-muted-foreground">{policy?.carrier} · {money(benefitNow)}/mo per person</p>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------ locations */}
      <Card className="glass-card">
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Care Cost by Location</CardTitle>
            <Note>
              {current ? locationLabel(current) : 'No location'} is the default planning market. Add any U.S. city and
              state — these are working entries, not fixed choices.
            </Note>
          </div>
          <Button size="sm" variant="outline" onClick={addLocation}><Plus className="h-3.5 w-3.5 mr-1" /> Add location</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {loc.locations.map((l) => (
            <CollapsibleSection
              key={l.id}
              title={locationLabel(l) || 'New location'}
              subtitle={
                rateFor(l).rate != null
                  ? `${money2(rateFor(l).rate!)}/hr ${CARE_CATEGORY_LABEL[loc.compareCategory].toLowerCase()} · ${rateFor(l).basis === 'agencies' ? `median of ${rateFor(l).count} agencies` : 'entered median'}`
                  : 'Rate Not Publicly Available — enter a median or add agencies'
              }
              accent={!!l.isCurrent}
              badge={
                <div className="flex gap-1">
                  {l.isCurrent && <Badge variant="outline" className="text-[10px] border-primary/40 text-primary"><Home className="h-3 w-3 mr-1" />Current</Badge>}
                  {l.isFuture && <Badge variant="outline" className="text-[10px]"><Plane className="h-3 w-3 mr-1" />Possible future</Badge>}
                </div>
              }
            >
              <div className="space-y-3 rounded-lg border border-border/40 p-3">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Field label="City"><TextField value={l.city} onChange={(v) => setLocation(l.id, { city: v })} placeholder="City" /></Field>
                  <Field label="State">
                    <Select value={l.state} onChange={(v) => setLocation(l.id, { state: v })}
                      options={US_STATES.map((s) => ({ value: s, label: s }))} />
                  </Field>
                  <Field label="ZIP (optional)"><TextField value={l.zip || ''} onChange={(v) => setLocation(l.id, { zip: v })} placeholder="44333" /></Field>
                  <Field label="Providers in market"><NumField value={l.providerCount ?? 0} onChange={(n) => setLocation(l.id, { providerCount: n || null })} /></Field>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {CATS.map((c) => (
                    <Field key={c} label={`${CARE_CATEGORY_LABEL[c]} $/hr`}>
                      <NumField value={l.medianHourly?.[c] ?? 0} onChange={(n) => setMedian(l.id, c, n)} />
                    </Field>
                  ))}
                </div>
                <Note>{CARE_CATEGORY_EXAMPLES[loc.compareCategory]}</Note>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Field label="Assisted living $/mo"><NumField value={l.assistedLivingMonthly ?? 0} onChange={(n) => setLocation(l.id, { assistedLivingMonthly: n || null })} /></Field>
                  <Field label="Nursing facility $/mo"><NumField value={l.nursingMonthly ?? 0} onChange={(n) => setLocation(l.id, { nursingMonthly: n || null })} /></Field>
                  <Field label="Local care inflation %"><NumField value={l.careInflationPct ?? loc.careRateInflationPct} onChange={(n) => setLocation(l.id, { careInflationPct: n || null })} /></Field>
                  <Field label="LTC Partnership">
                    <Select
                      value={l.partnershipAvailable == null ? 'unknown' : l.partnershipAvailable ? 'yes' : 'no'}
                      onChange={(v) => setLocation(l.id, { partnershipAvailable: v === 'unknown' ? null : v === 'yes' })}
                      options={[{ value: 'unknown', label: 'Unknown' }, { value: 'yes', label: 'Available' }, { value: 'no', label: 'Not available' }]}
                    />
                  </Field>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <Field label="Source of pricing"><TextField value={l.source || ''} onChange={(v) => setLocation(l.id, { source: v })} placeholder="Agency quote, survey, agent" /></Field>
                  <Field label="Last updated"><TextField value={l.lastUpdated || ''} onChange={(v) => setLocation(l.id, { lastUpdated: v })} placeholder="YYYY-MM-DD" /></Field>
                  <Field label="State policy considerations"><TextField value={l.policyNotes || ''} onChange={(v) => setLocation(l.id, { policyNotes: v })} placeholder="Partnership, filial rules, Medicaid look-back" /></Field>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant={l.isCurrent ? 'default' : 'outline'} onClick={() => makeCurrent(l.id)}>Set as current residence</Button>
                  <Button size="sm" variant={l.isFuture ? 'default' : 'outline'} onClick={() => setLocation(l.id, { isFuture: !l.isFuture })}>Possible future residence</Button>
                  <Button size="sm" variant={loc.futureLocationId === l.id ? 'default' : 'outline'} onClick={() => patchLoc({ futureLocationId: l.id })}>Use in relocation scenario</Button>
                  {loc.locations.length > 1 && (
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeLocation(l.id)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                    </Button>
                  )}
                </div>
              </div>
            </CollapsibleSection>
          ))}
        </CardContent>
      </Card>

      {/* ------------------------------------------------ city comparison */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Compare LTC Costs by City</CardTitle>
          <Note>
            {CARE_CATEGORY_LABEL[loc.compareCategory]} · monthly cost = weekly hours × hourly rate × 4.33 · coverage
            measured against {money(benefitNow)}/mo of reimbursement.
          </Note>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2">City</th>
                <th className="py-2">Median $/hr</th>
                {HOUR_TIERS.map((t) => <th key={t} className="py-2">{t} hrs/wk</th>)}
                <th className="py-2">LTC coverage @ {loc.compareHours} hrs</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {loc.locations.map((l) => {
                const { rate, basis } = rateFor(l);
                const cov = rate ? coverageAt(loc.compareHours, rate, benefitNow) : null;
                return (
                  <tr key={l.id} className="border-b border-border/30">
                    <td className="py-2">
                      {locationLabel(l) || '—'}
                      {l.isCurrent && <span className="text-[10px] text-primary ml-1">(current)</span>}
                    </td>
                    <td className="py-2 tabular-nums">{rate ? money2(rate) : <span className="text-muted-foreground text-xs">Rate Not Publicly Available</span>}</td>
                    {HOUR_TIERS.map((t) => (
                      <td key={t} className="py-2 tabular-nums">{rate ? money(monthlyCostFromHours(t, rate)) : '—'}</td>
                    ))}
                    <td className="py-2 tabular-nums font-semibold">{cov ? `${cov.coveragePct.toFixed(0)}%` : '—'}</td>
                    <td className="py-2">{cov ? <CoverageBadge band={cov.band} /> : <Badge variant="outline" className="text-[10px]">{basis === 'none' ? 'No rate' : '—'}</Badge>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ------------------------------------------------ hours over time */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Hours Purchased Over Time
          </CardTitle>
          <Note>
            Future LTC benefit ÷ future hourly rate ÷ 4.33 = weekly hours covered. Policy grows at{' '}
            {policy?.inflationPct ?? 0}%; agency rates at {loc.careRateInflationPct}% unless a location overrides it.
          </Note>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2">Age</th>
                <th className="py-2">Location</th>
                <th className="py-2">LTC benefit</th>
                <th className="py-2">Hourly rate</th>
                <th className="py-2">Weekly hours covered</th>
              </tr>
            </thead>
            <tbody>
              {PROJECTION_AGES.map((age) => (
                loc.locations.map((l, li) => {
                  const { rate } = rateFor(l);
                  const years = Math.max(0, age - h.lymanAge);
                  const benefit = policyMonthlyBenefit(policy, h.lymanAge, age);
                  const futRate = rate ? futureHourlyRate(rate, l.careInflationPct ?? loc.careRateInflationPct, years) : null;
                  return (
                    <tr key={`${age}-${l.id}`} className="border-b border-border/30">
                      <td className="py-2">{li === 0 ? age : ''}</td>
                      <td className="py-2">{locationLabel(l) || '—'}</td>
                      <td className="py-2 tabular-nums">{money(benefit)}</td>
                      <td className="py-2 tabular-nums">{futRate ? money2(futRate) : '—'}</td>
                      <td className="py-2 tabular-nums font-semibold">{futRate ? hours1(weeklyHoursCovered(benefit, futRate)) : '—'}</td>
                    </tr>
                  );
                })
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ------------------------------------------------ relocation */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">What If We Move?</CardTitle>
          <Note>Relocation does not automatically make long-term care more expensive — the comparison decides.</Note>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Current location">
              <Select value={current?.id || ''} onChange={makeCurrent}
                options={loc.locations.map((l) => ({ value: l.id, label: locationLabel(l) || 'Unnamed' }))} />
            </Field>
            <Field label="Future location">
              <Select value={loc.futureLocationId || ''} onChange={(v) => patchLoc({ futureLocationId: v })}
                options={[{ value: '', label: 'Select a location' },
                  ...loc.locations.filter((l) => l.id !== current?.id).map((l) => ({ value: l.id, label: locationLabel(l) || 'Unnamed' }))]} />
            </Field>
          </div>

          {future && (() => {
            const fRate = rateFor(future).rate;
            const rows: { label: string; cur: string; fut: string }[] = [];
            const cCov = currentRate ? coverageAt(loc.compareHours, currentRate, benefitNow) : null;
            const fCov = fRate ? coverageAt(loc.compareHours, fRate, benefitNow) : null;
            rows.push({ label: 'Hourly home care cost', cur: currentRate ? money2(currentRate) : '—', fut: fRate ? money2(fRate) : '—' });
            HOUR_TIERS.forEach((t) => rows.push({
              label: `Monthly cost at ${t} hrs/week`,
              cur: currentRate ? money(monthlyCostFromHours(t, currentRate)) : '—',
              fut: fRate ? money(monthlyCostFromHours(t, fRate)) : '—',
            }));
            rows.push({ label: 'LTC benefit', cur: money(benefitNow), fut: money(benefitNow) });
            rows.push({ label: `Coverage @ ${loc.compareHours} hrs`, cur: cCov ? `${cCov.coveragePct.toFixed(0)}%` : '—', fut: fCov ? `${fCov.coveragePct.toFixed(0)}%` : '—' });
            rows.push({ label: 'Monthly out-of-pocket', cur: cCov ? money(cCov.outOfPocketMonthly) : '—', fut: fCov ? money(fCov.outOfPocketMonthly) : '—' });
            rows.push({ label: 'Annual out-of-pocket', cur: cCov ? money(cCov.outOfPocketAnnual) : '—', fut: fCov ? money(fCov.outOfPocketAnnual) : '—' });
            rows.push({ label: 'Three-year exposure', cur: cCov ? money(cCov.outOfPocket3Year) : '—', fut: fCov ? money(fCov.outOfPocket3Year) : '—' });
            const diffPct = currentRate && fRate ? ((fRate - currentRate) / currentRate) * 100 : null;
            return (
              <div className="space-y-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                        <th className="py-2">Measure</th>
                        <th className="py-2">{locationLabel(current!)}</th>
                        <th className="py-2">{locationLabel(future)}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.label} className="border-b border-border/30">
                          <td className="py-2 text-muted-foreground">{r.label}</td>
                          <td className="py-2 tabular-nums">{r.cur}</td>
                          <td className="py-2 tabular-nums font-semibold">{r.fut}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="rounded-lg border border-border/60 bg-card/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Cost difference from current location</p>
                  <p className="text-sm">
                    {diffPct == null ? 'Enter a rate for both locations to compare.'
                      : Math.abs(diffPct) < 0.5 ? 'Home care is estimated to cost about the same as ' + locationLabel(current!)
                      : `Home care is estimated to cost ${Math.abs(diffPct).toFixed(0)}% ${diffPct > 0 ? 'more' : 'less'} than ${locationLabel(current!)}`}
                  </p>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* ------------------------------------------------ states */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Compare States</CardTitle>
          <Note>Built from the locations entered above. Every rate carries the source and last-updated date you entered.</Note>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2">State</th>
                <th className="py-2">Median home care $/hr</th>
                <th className="py-2">Est. annual care ({loc.compareHours} hrs/wk)</th>
                <th className="py-2">Assisted living</th>
                <th className="py-2">Nursing care</th>
                <th className="py-2">Partnership</th>
                <th className="py-2">Source / updated</th>
              </tr>
            </thead>
            <tbody>
              {stateRows.map((st) => {
                const inState = loc.locations.filter((l) => l.state === st);
                const rates = inState.map((l) => rateFor(l).rate).filter((r): r is number => r != null);
                const med = rates.length ? rates.sort((a, b) => a - b)[Math.floor(rates.length / 2)] : null;
                const al = inState.map((l) => l.assistedLivingMonthly).filter((v): v is number => !!v);
                const nf = inState.map((l) => l.nursingMonthly).filter((v): v is number => !!v);
                const partner = inState.some((l) => l.partnershipAvailable === true);
                return (
                  <tr key={st} className="border-b border-border/30">
                    <td className="py-2 font-medium">{st}</td>
                    <td className="py-2 tabular-nums">{med ? money2(med) : <span className="text-xs text-muted-foreground">Rate Not Publicly Available</span>}</td>
                    <td className="py-2 tabular-nums">{med ? money(monthlyCostFromHours(loc.compareHours, med) * 12) : '—'}</td>
                    <td className="py-2 tabular-nums">{al.length ? `${money(al[0])}/mo` : '—'}</td>
                    <td className="py-2 tabular-nums">{nf.length ? `${money(nf[0])}/mo` : '—'}</td>
                    <td className="py-2">{inState.every((l) => l.partnershipAvailable == null) ? 'Unknown' : partner ? 'Yes' : 'No'}</td>
                    <td className="py-2 text-xs text-muted-foreground">{inState[0]?.source || '—'}{inState[0]?.lastUpdated ? ` · ${inState[0].lastUpdated}` : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base">Planning distinction</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-3">
          <StatCard label="Agency cost" value={currentRate ? `${money2(currentRate)}/hr` : '—'} sub="What a provider charges" />
          <StatCard label="Insurance maximum" value={`${money(benefitNow)}/mo`} sub="What the policy can reimburse" tone="info" />
          <StatCard label="Care need" value={`${loc.compareHours} hrs/wk`} sub="Hours actually necessary" tone="warn" />
          <p className="sm:col-span-3 text-xs text-muted-foreground">
            A high city average is not our cost. We may choose a lower-cost agency, fewer hours, family assistance,
            adult day care, or a blended care strategy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
