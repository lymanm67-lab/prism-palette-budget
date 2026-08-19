import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Trash2, MapPin, History } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import CollapsibleSection from '@/components/CollapsibleSection';
import { money, money2, Note, Field, NumField, TextField, Select, CoverageBadge, StatCard, hours1 } from './shared';
import {
  CARE_CATEGORY_LABEL, CARE_CATEGORY_EXAMPLES, HOUR_TIERS, PRICING_STATUS_LABEL, RANKING_LABEL,
  VERIFICATION_LABEL, activePolicy, agencyRate, coverageAt, effectiveHourly, locationLabel, marketStats,
  monthlyCostFromHours, policyMonthlyBenefit, rankAgencies, verificationFlag,
  type CareAgency, type CareCategory, type LtcLocationState, type PricingStatus, type RankingKey,
} from '@/lib/ltc/location';
import type { LtcState } from '@/lib/ltc/model';

const CATS: CareCategory[] = ['nonMedical', 'personalCare', 'homeHealth', 'skilledNursing'];
const RANKINGS: RankingKey[] = ['bestOverall', 'lowestCost', 'mostHours', 'lowestOop', 'h10', 'h20', 'h30', 'h40'];
const STATUSES: PricingStatus[] = ['verified', 'agentConfirmed', 'publiclyListed', 'userEntered', 'estimated', 'needsVerification', 'outdated'];

interface Props {
  state: LtcState;
  loc: LtcLocationState;
  patchLoc: (p: Partial<LtcLocationState>) => void;
}

export function AgencyComparison({ state, loc, patchLoc }: Props) {
  const policy = activePolicy(state);
  const h = state.household;
  const benefit = policyMonthlyBenefit(policy, h.lymanAge);
  const home = loc.locations.find((l) => l.isCurrent) || loc.locations[0];
  const [activeLocationId, setActiveLocationId] = useState(home?.id || '');
  const [ranking, setRanking] = useState<RankingKey>('bestOverall');
  const active = loc.locations.find((l) => l.id === activeLocationId) || home;
  const local = loc.agencies.filter((a) => a.locationId === active?.id);
  const cat = loc.compareCategory;

  const setAgency = (id: string, p: Partial<CareAgency>) => {
    const prev = loc.agencies.find((a) => a.id === id);
    const history = [...loc.rateHistory];
    // Rate changes are logged so local pricing trends are visible over time.
    if (prev) {
      CATS.forEach((c) => {
        const key = ({ nonMedical: 'nonMedicalHourly', personalCare: 'personalCareHourly', homeHealth: 'homeHealthAideHourly', skilledNursing: 'skilledNursingHourly' } as const)[c];
        const next = (p as Record<string, unknown>)[key];
        if (typeof next === 'number' && next > 0 && next !== prev[key]) {
          history.push({
            id: `rh-${Date.now()}-${c}`, agencyId: id, date: new Date().toISOString().slice(0, 10),
            category: c, oldRate: (prev[key] as number | null) ?? null, newRate: next, source: p.source ?? prev.source,
          });
        }
      });
    }
    patchLoc({ agencies: loc.agencies.map((a) => (a.id === id ? { ...a, ...p } : a)), rateHistory: history });
  };

  const addAgency = () => {
    if (!active) return;
    patchLoc({
      agencies: [...loc.agencies, {
        id: `ag-${Date.now()}`, locationId: active.id, name: '', city: active.city, state: active.state, zip: active.zip,
        nonMedicalHourly: null, personalCareHourly: null, homeHealthAideHourly: null, skilledNursingHourly: null,
        classification: 'nonMedical', licensed: 'unknown', ltcEligible: 'unknown',
        pricingStatus: 'needsVerification', lastVerified: new Date().toISOString().slice(0, 10),
      }],
    });
  };

  const removeAgency = (id: string) => patchLoc({
    agencies: loc.agencies.filter((a) => a.id !== id),
    rateHistory: loc.rateHistory.filter((r) => r.agencyId !== id),
  });

  const ranked = active ? rankAgencies(local, cat, loc.compareHours, benefit, ranking) : [];
  const historyChart = loc.rateHistory
    .filter((r) => local.some((a) => a.id === r.agencyId) && r.category === cat)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({ date: r.date, rate: r.newRate }));

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Local Home Care Agency Comparison</CardTitle>
            <Note>Agency pricing is never invented. Anything unknown stays blank and reads "Rate Not Publicly Available".</Note>
          </div>
          <Button size="sm" variant="outline" onClick={addAgency}><Plus className="h-3.5 w-3.5 mr-1" /> Add agency</Button>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-3">
          <Field label="Market">
            <Select value={active?.id || ''} onChange={setActiveLocationId}
              options={loc.locations.map((l) => ({ value: l.id, label: locationLabel(l) || 'Unnamed' }))} />
          </Field>
          <Field label="Care category">
            <Select value={cat} onChange={(v) => patchLoc({ compareCategory: v as CareCategory })}
              options={CATS.map((c) => ({ value: c, label: CARE_CATEGORY_LABEL[c] }))} />
          </Field>
          <Field label="Care hours per week">
            <Select value={String(loc.compareHours)} onChange={(v) => patchLoc({ compareHours: Number(v) })}
              options={HOUR_TIERS.map((t) => ({ value: String(t), label: `${t} hours/week` }))} />
          </Field>
        </CardContent>
      </Card>

      {/* ------------------------------------------------ market card */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> {active ? `${active.city} Home Care Market` : 'Home Care Market'}
          </CardTitle>
          <Note>The four service categories are priced separately — they are never blended into one average.</Note>
        </CardHeader>
        <CardContent className="space-y-3">
          {CATS.map((c) => {
            const s = marketStats(local, c);
            return (
              <div key={c} className="rounded-lg border border-border/60 p-3 space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-sm">{CARE_CATEGORY_LABEL[c]}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {s.count} agenc{s.count === 1 ? 'y' : 'ies'} compared{s.lastUpdated ? ` · last updated ${s.lastUpdated}` : ''}
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground">{CARE_CATEGORY_EXAMPLES[c]}</p>
                {s.count === 0 ? (
                  <p className="text-xs text-muted-foreground">Rate Not Publicly Available — add agency pricing for this category.</p>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    <StatCard label="Lowest verified" value={`${money2(s.low!)}/hr`} tone="good" />
                    <StatCard label="Median verified" value={`${money2(s.median!)}/hr`} tone="info" />
                    <StatCard label="Average verified" value={`${money2(s.average!)}/hr`} />
                    <StatCard label="Highest verified" value={`${money2(s.high!)}/hr`} tone="warn" />
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ------------------------------------------------ agency records */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Agency records &amp; verification</CardTitle>
          <Note>Rates older than 12 months show "Review Recommended"; older than 24 months show "Outdated".</Note>
        </CardHeader>
        <CardContent className="space-y-3">
          {!local.length && <p className="text-sm text-muted-foreground">No agencies yet for this market. Add one to begin comparing.</p>}
          {local.map((a) => {
            const flag = verificationFlag(a.lastVerified);
            const rate = agencyRate(a, cat);
            return (
              <CollapsibleSection
                key={a.id}
                title={a.name || 'New agency'}
                subtitle={rate ? `${money2(rate)}/hr ${CARE_CATEGORY_LABEL[cat].toLowerCase()}` : 'Rate Not Publicly Available'}
                icon={Building2}
                badge={
                  <div className="flex gap-1 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{PRICING_STATUS_LABEL[a.pricingStatus]}</Badge>
                    <Badge variant="outline" className={`text-[10px] ${flag === 'current' ? 'border-prism-lime/40 text-prism-lime' : flag === 'reviewRecommended' ? 'border-prism-amber/40 text-prism-amber' : 'border-destructive/40 text-destructive'}`}>
                      {VERIFICATION_LABEL[flag]}
                    </Badge>
                  </div>
                }
              >
                <div className="space-y-3 rounded-lg border border-border/40 p-3">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <Field label="Agency name"><TextField value={a.name} onChange={(v) => setAgency(a.id, { name: v })} /></Field>
                    <Field label="City"><TextField value={a.city} onChange={(v) => setAgency(a.id, { city: v })} /></Field>
                    <Field label="State"><TextField value={a.state} onChange={(v) => setAgency(a.id, { state: v })} /></Field>
                    <Field label="ZIP"><TextField value={a.zip || ''} onChange={(v) => setAgency(a.id, { zip: v })} /></Field>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <Field label="Non-medical $/hr"><NumField value={a.nonMedicalHourly ?? 0} onChange={(n) => setAgency(a.id, { nonMedicalHourly: n || null })} /></Field>
                    <Field label="Personal care $/hr"><NumField value={a.personalCareHourly ?? 0} onChange={(n) => setAgency(a.id, { personalCareHourly: n || null })} /></Field>
                    <Field label="Home health aide $/hr"><NumField value={a.homeHealthAideHourly ?? 0} onChange={(n) => setAgency(a.id, { homeHealthAideHourly: n || null })} /></Field>
                    <Field label="Skilled nursing $/hr"><NumField value={a.skilledNursingHourly ?? 0} onChange={(n) => setAgency(a.id, { skilledNursingHourly: n || null })} /></Field>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <Field label="Min visit (hours)"><NumField value={a.minVisitHours ?? 0} onChange={(n) => setAgency(a.id, { minVisitHours: n || null })} /></Field>
                    <Field label="Min weekly hours"><NumField value={a.minWeeklyHours ?? 0} onChange={(n) => setAgency(a.id, { minWeeklyHours: n || null })} /></Field>
                    <Field label="Weekend $/hr"><NumField value={a.weekendHourly ?? 0} onChange={(n) => setAgency(a.id, { weekendHourly: n || null })} /></Field>
                    <Field label="Holiday $/hr"><NumField value={a.holidayHourly ?? 0} onChange={(n) => setAgency(a.id, { holidayHourly: n || null })} /></Field>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <Field label="Overnight $/hr"><NumField value={a.overnightHourly ?? 0} onChange={(n) => setAgency(a.id, { overnightHourly: n || null })} /></Field>
                    <Field label="Live-in $/day"><NumField value={a.liveInDaily ?? 0} onChange={(n) => setAgency(a.id, { liveInDaily: n || null })} /></Field>
                    <Field label="Transportation $/mo"><NumField value={a.transportationFee ?? 0} onChange={(n) => setAgency(a.id, { transportationFee: n || null })} /></Field>
                    <Field label="Assessment / enrollment fee"><NumField value={a.assessmentFee ?? 0} onChange={(n) => setAgency(a.id, { assessmentFee: n || null })} /></Field>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <Field label="Cancellation fee"><NumField value={a.cancellationFee ?? 0} onChange={(n) => setAgency(a.id, { cancellationFee: n || null })} /></Field>
                    <Field label="Other recurring fees $/mo"><NumField value={a.otherMonthlyFees ?? 0} onChange={(n) => setAgency(a.id, { otherMonthlyFees: n || null })} /></Field>
                    <Field label="Distance from home (miles)"><NumField value={a.distanceMiles ?? 0} onChange={(n) => setAgency(a.id, { distanceMiles: n || null })} /></Field>
                    <Field label="Quality rating (0–5, yours)"><NumField value={a.qualityRating ?? 0} onChange={(n) => setAgency(a.id, { qualityRating: n || null })} /></Field>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <Field label="Classification">
                      <Select value={a.classification} onChange={(v) => setAgency(a.id, { classification: v as CareAgency['classification'] })}
                        options={[{ value: 'nonMedical', label: 'Non-medical' }, { value: 'medical', label: 'Medical' }, { value: 'both', label: 'Both' }, { value: 'unknown', label: 'Unknown' }]} />
                    </Field>
                    <Field label="Licensed / certified">
                      <Select value={a.licensed || 'unknown'} onChange={(v) => setAgency(a.id, { licensed: v as CareAgency['licensed'] })}
                        options={[{ value: 'unknown', label: 'Unknown' }, { value: 'licensed', label: 'Licensed' }, { value: 'certified', label: 'Certified' }]} />
                    </Field>
                    <Field label="LTC reimbursement eligibility">
                      <Select value={a.ltcEligible || 'unknown'} onChange={(v) => setAgency(a.id, { ltcEligible: v as CareAgency['ltcEligible'] })}
                        options={[{ value: 'unknown', label: 'Unknown' }, { value: 'eligible', label: 'Eligible' }, { value: 'notEligible', label: 'Not eligible' }]} />
                    </Field>
                    <Field label="Pricing status">
                      <Select value={a.pricingStatus} onChange={(v) => setAgency(a.id, { pricingStatus: v as PricingStatus })}
                        options={STATUSES.map((s) => ({ value: s, label: PRICING_STATUS_LABEL[s] }))} />
                    </Field>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <Field label="Phone"><TextField value={a.phone || ''} onChange={(v) => setAgency(a.id, { phone: v })} /></Field>
                    <Field label="Website"><TextField value={a.website || ''} onChange={(v) => setAgency(a.id, { website: v })} /></Field>
                    <Field label="Date rate verified"><TextField value={a.lastVerified || ''} onChange={(v) => setAgency(a.id, { lastVerified: v })} placeholder="YYYY-MM-DD" /></Field>
                    <Field label="Source of pricing"><TextField value={a.source || ''} onChange={(v) => setAgency(a.id, { source: v })} placeholder="Phone quote, website, agent" /></Field>
                  </div>

                  <Field label="Notes"><TextField value={a.notes || ''} onChange={(v) => setAgency(a.id, { notes: v })} /></Field>

                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeAgency(a.id)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove agency
                  </Button>
                </div>
              </CollapsibleSection>
            );
          })}
        </CardContent>
      </Card>

      {/* ------------------------------------------------ hours cost table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Compare agencies by hours of care</CardTitle>
          <Note>Weekly hours × hourly rate × 4.33 = estimated monthly cost.</Note>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2">Agency</th>
                <th className="py-2">Hourly rate</th>
                {HOUR_TIERS.map((t) => <th key={t} className="py-2">{t} hrs/wk</th>)}
              </tr>
            </thead>
            <tbody>
              {local.map((a) => {
                const rate = agencyRate(a, cat);
                return (
                  <tr key={a.id} className="border-b border-border/30">
                    <td className="py-2">{a.name || '—'}</td>
                    <td className="py-2 tabular-nums">{rate ? money2(rate) : <span className="text-xs text-muted-foreground">Rate Not Publicly Available</span>}</td>
                    {HOUR_TIERS.map((t) => (
                      <td key={t} className="py-2 tabular-nums">{rate ? money(monthlyCostFromHours(t, rate)) : '—'}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ------------------------------------------------ coverage per agency */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Agency-by-agency LTC coverage at {loc.compareHours} hrs/week</CardTitle>
          <Note>
            Reimbursement maximum {money(benefit)}/mo per person. The 25% cash benefit
            ({money(policy ? policy.startingMonthlyBenefit * (policy.cashBenefitPct / 100) : 0)}/mo) is not added here
            unless the contract confirms both can be used at the same time.
          </Note>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2">Agency</th>
                <th className="py-2">Effective $/hr</th>
                <th className="py-2">Monthly cost</th>
                <th className="py-2">LTC benefit</th>
                <th className="py-2">Out-of-pocket</th>
                <th className="py-2">% covered</th>
                <th className="py-2">Hours needed</th>
                <th className="py-2">Hours policy buys</th>
                <th className="py-2">Uncovered hours</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {local.map((a) => {
                const eff = effectiveHourly(a, cat, loc.compareHours);
                if (eff == null) {
                  return (
                    <tr key={a.id} className="border-b border-border/30">
                      <td className="py-2">{a.name || '—'}</td>
                      <td className="py-2 text-xs text-muted-foreground" colSpan={9}>Rate Not Publicly Available</td>
                    </tr>
                  );
                }
                const c = coverageAt(loc.compareHours, eff, benefit);
                return (
                  <tr key={a.id} className="border-b border-border/30">
                    <td className="py-2">{a.name || '—'}</td>
                    <td className="py-2 tabular-nums">{money2(eff)}</td>
                    <td className="py-2 tabular-nums">{money(c.monthlyCost)}</td>
                    <td className="py-2 tabular-nums">{money(c.insurancePays)}</td>
                    <td className="py-2 tabular-nums font-semibold">{money(c.outOfPocketMonthly)}</td>
                    <td className="py-2 tabular-nums">{c.coveragePct.toFixed(0)}%</td>
                    <td className="py-2 tabular-nums">{loc.compareHours}</td>
                    <td className="py-2 tabular-nums">{hours1(c.hoursCoveredWeekly)}</td>
                    <td className="py-2 tabular-nums">{hours1(c.uncoveredWeeklyHours)}</td>
                    <td className="py-2"><CoverageBadge band={c.band} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ------------------------------------------------ rankings */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Best Fit for Our LTC Policy</CardTitle>
          <Note>
            Cheapest is never automatically #1. Ranking blends cost, hours purchased, out-of-pocket, minimum visit
            requirements, weekend premiums, fees, service type, reimbursement eligibility, your quality notes and distance.
          </Note>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {RANKINGS.map((k) => (
              <Button key={k} size="sm" variant={ranking === k ? 'default' : 'outline'} onClick={() => setRanking(k)}>
                {RANKING_LABEL[k]}
              </Button>
            ))}
          </div>
          {!ranked.length && <p className="text-sm text-muted-foreground">Add agency pricing to produce a ranking.</p>}
          <div className="space-y-2">
            {ranked.map((r, i) => (
              <div key={r.agency.id} className="rounded-lg border border-border/60 bg-card/60 p-3 flex flex-wrap items-center gap-3">
                <span className="text-lg font-bold w-8 text-center">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm">{r.agency.name || 'Unnamed agency'}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {money2(r.effective)}/hr effective · buys {hours1(r.coverage.hoursCoveredWeekly)}/wk ·{' '}
                    {money(r.coverage.outOfPocketMonthly)}/mo out-of-pocket
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">Fit {r.overall}/10</Badge>
                  <CoverageBadge band={r.coverage.band} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------ distance / service area */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Agency locations &amp; distance from home</CardTitle>
          <Note>Distances are the values you entered. Service area notes live on each agency record.</Note>
        </CardHeader>
        <CardContent className="space-y-2">
          {local.filter((a) => a.distanceMiles != null).length === 0 && (
            <p className="text-sm text-muted-foreground">Enter distances on agency records to build the local view.</p>
          )}
          {local.filter((a) => a.distanceMiles != null)
            .sort((a, b) => (a.distanceMiles || 0) - (b.distanceMiles || 0))
            .map((a) => {
              const maxD = Math.max(...local.map((x) => x.distanceMiles || 0), 1);
              return (
                <div key={a.id} className="flex items-center gap-3">
                  <span className="w-40 truncate text-sm">{a.name || '—'}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden">
                    <div className="h-full bg-primary/60" style={{ width: `${((a.distanceMiles || 0) / maxD) * 100}%` }} />
                  </div>
                  <span className="text-xs tabular-nums w-20 text-right">{a.distanceMiles} mi</span>
                  <span className="text-[11px] text-muted-foreground w-28 truncate">{[a.city, a.state].filter(Boolean).join(', ')}</span>
                </div>
              );
            })}
        </CardContent>
      </Card>

      {/* ------------------------------------------------ rate history */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4 text-primary" /> Home Care Pricing History</CardTitle>
          <Note>Every rate change you save is logged with the old rate, new rate and percentage increase.</Note>
        </CardHeader>
        <CardContent className="space-y-3">
          {historyChart.length > 1 && (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyChart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(v: number) => money2(v)} />
                  <Line type="monotone" dataKey="rate" stroke="hsl(var(--primary))" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {!loc.rateHistory.length && <p className="text-sm text-muted-foreground">No rate changes logged yet.</p>}
          {!!loc.rateHistory.length && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="py-2">Date</th>
                    <th className="py-2">Agency</th>
                    <th className="py-2">Category</th>
                    <th className="py-2">Old rate</th>
                    <th className="py-2">New rate</th>
                    <th className="py-2">Change</th>
                    <th className="py-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {[...loc.rateHistory].sort((a, b) => b.date.localeCompare(a.date)).map((r) => {
                    const changePct = r.oldRate ? ((r.newRate - r.oldRate) / r.oldRate) * 100 : null;
                    return (
                      <tr key={r.id} className="border-b border-border/30">
                        <td className="py-2">{r.date}</td>
                        <td className="py-2">{loc.agencies.find((a) => a.id === r.agencyId)?.name || '—'}</td>
                        <td className="py-2">{CARE_CATEGORY_LABEL[r.category]}</td>
                        <td className="py-2 tabular-nums">{r.oldRate ? money2(r.oldRate) : '—'}</td>
                        <td className="py-2 tabular-nums">{money2(r.newRate)}</td>
                        <td className="py-2 tabular-nums">{changePct == null ? '—' : `${changePct > 0 ? '+' : ''}${changePct.toFixed(1)}%`}</td>
                        <td className="py-2 text-xs text-muted-foreground">{r.source || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
