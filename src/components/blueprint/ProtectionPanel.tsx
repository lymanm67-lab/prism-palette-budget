import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Plus, Shield, Trash2, HeartPulse, Stethoscope, AlertTriangle } from 'lucide-react';
import { money, NumField, SectionNote, ConfidenceBadge } from './shared';
import {
  CARE_SCENARIOS, annualPremium, dailyBenefit, careCostAtAge, healthcareReserve,
  ltcBenefitAtAge, scoreLtcQuotes, HEALTHCARE_LINES,
  type AssumptionState, type CareScenarioKey, type LtcQuote,
} from '@/lib/blueprint/model';

const AGES = [65, 70, 75, 80, 85, 90];

function blankQuote(): LtcQuote {
  return {
    id: `q-${Date.now()}`, carrier: '', product: '', applicant: '',
    monthlyPremium: 0, startingMonthlyBenefit: 0, benefitPool: 0, benefitPeriodYears: 3,
    homeCarePct: 100, assistedLivingPct: 100, nursingPct: 100, cashBenefitPct: 0,
    eliminationDays: 90, inflationPct: 3, inflationCompound: true, inflationYears: 99,
    partnershipQualified: false, sharedCare: false, premiumWaiver: false, nonforfeiture: false,
    spousalDiscount: false, underwritingClass: 'Standard',
    quoteDate: new Date().toISOString().slice(0, 10),
  };
}

export function LtcCenter({
  state, patch,
}: { state: AssumptionState; patch: (p: Partial<AssumptionState>) => void }) {
  const [careScenario, setCareScenario] = useState<CareScenarioKey>('home30');
  const quotes = state.ltcQuotes;
  const scores = useMemo(() => scoreLtcQuotes(quotes, state.currentAge), [quotes, state.currentAge]);
  const setQuote = (i: number, p: Partial<LtcQuote>) =>
    patch({ ltcQuotes: quotes.map((q, ix) => (ix === i ? { ...q, ...p } : q)) });

  return (
    <div className="space-y-4">
      <Card className="wos-page">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-prism-teal" /> Long-Term Care Insurance Center
          </CardTitle>
          <SectionNote>
            Store every quote and scenario. Scoring is relative across eight axes — the cheapest policy is
            never automatically recommended.
          </SectionNote>
        </CardHeader>
        <CardContent className="space-y-4">
          {!quotes.length && (
            <SectionNote>No quotes stored yet. Add one to compare carriers side by side.</SectionNote>
          )}
          {quotes.map((q, i) => (
            <div key={q.id} className="rounded-lg border border-border/60 p-3 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="grid gap-2 sm:grid-cols-3 flex-1">
                  <div><Label className="text-[11px]">Carrier</Label><Input className="h-9" value={q.carrier} onChange={(e) => setQuote(i, { carrier: e.target.value })} /></div>
                  <div><Label className="text-[11px]">Product</Label><Input className="h-9" value={q.product} onChange={(e) => setQuote(i, { product: e.target.value })} /></div>
                  <div><Label className="text-[11px]">Applicant</Label><Input className="h-9" value={q.applicant} onChange={(e) => setQuote(i, { applicant: e.target.value })} /></div>
                </div>
                <Button size="icon" variant="ghost" className="h-8 w-8 print:hidden" onClick={() => patch({ ltcQuotes: quotes.filter((_, ix) => ix !== i) })}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                <div><Label className="text-[11px]">Monthly premium</Label><NumField value={q.monthlyPremium} onChange={(n) => setQuote(i, { monthlyPremium: n })} /></div>
                <div><Label className="text-[11px]">Starting monthly benefit</Label><NumField value={q.startingMonthlyBenefit} onChange={(n) => setQuote(i, { startingMonthlyBenefit: n })} /></div>
                <div><Label className="text-[11px]">Benefit pool</Label><NumField value={q.benefitPool} onChange={(n) => setQuote(i, { benefitPool: n })} /></div>
                <div><Label className="text-[11px]">Benefit period (yrs)</Label><NumField value={q.benefitPeriodYears} onChange={(n) => setQuote(i, { benefitPeriodYears: n })} /></div>
                <div><Label className="text-[11px]">Home care %</Label><NumField value={q.homeCarePct} onChange={(n) => setQuote(i, { homeCarePct: n })} /></div>
                <div><Label className="text-[11px]">Assisted living %</Label><NumField value={q.assistedLivingPct} onChange={(n) => setQuote(i, { assistedLivingPct: n })} /></div>
                <div><Label className="text-[11px]">Nursing %</Label><NumField value={q.nursingPct} onChange={(n) => setQuote(i, { nursingPct: n })} /></div>
                <div><Label className="text-[11px]">Cash benefit %</Label><NumField value={q.cashBenefitPct} onChange={(n) => setQuote(i, { cashBenefitPct: n })} /></div>
                <div><Label className="text-[11px]">Elimination (days)</Label><NumField value={q.eliminationDays} onChange={(n) => setQuote(i, { eliminationDays: n })} /></div>
                <div><Label className="text-[11px]">Inflation %</Label><NumField value={q.inflationPct} onChange={(n) => setQuote(i, { inflationPct: n })} /></div>
                <div><Label className="text-[11px]">Inflation years</Label><NumField value={q.inflationYears} onChange={(n) => setQuote(i, { inflationYears: n })} /></div>
                <div><Label className="text-[11px]">Underwriting class</Label><Input className="h-9" value={q.underwritingClass} onChange={(e) => setQuote(i, { underwritingClass: e.target.value })} /></div>
                <div><Label className="text-[11px]">Quote date</Label><Input className="h-9" value={q.quoteDate} onChange={(e) => setQuote(i, { quoteDate: e.target.value })} /></div>
              </div>
              <div className="flex flex-wrap gap-4 text-xs">
                {([
                  ['inflationCompound', 'Compound inflation'],
                  ['partnershipQualified', 'Partnership qualified'],
                  ['sharedCare', 'Shared Care'],
                  ['premiumWaiver', 'Premium waiver'],
                  ['nonforfeiture', 'Nonforfeiture'],
                  ['spousalDiscount', 'Spousal discount'],
                ] as [keyof LtcQuote, string][]).map(([k, label]) => (
                  <label key={String(k)} className="flex items-center gap-2">
                    <Switch checked={!!q[k]} onCheckedChange={(v) => setQuote(i, { [k]: v } as Partial<LtcQuote>)} />
                    {label}
                  </label>
                ))}
              </div>
              <div>
                <Label className="text-[11px]">Notes</Label>
                <Input className="h-9" value={q.notes || ''} onChange={(e) => setQuote(i, { notes: e.target.value })} />
              </div>
              <SectionNote>
                Annual premium {money(annualPremium(q))} · daily benefit equivalent {money(dailyBenefit(q))}
              </SectionNote>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button size="sm" variant="outline" onClick={() => patch({ ltcQuotes: [...quotes, blankQuote()] })}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add LTC quote
            </Button>
            {/* Carrier PDFs are parsed by the LTC dashboard uploader, which stores the file too. */}
            <Button size="sm" variant="ghost" asChild>
              <Link to="/ltc?tab=compare">
                <Upload className="h-3.5 w-3.5 mr-1" /> Upload a carrier quote (AI parse)
              </Link>
            </Button>
          </div>
          <SectionNote>
            Have a PDF or photo of a carrier quote? Upload it on the LTC dashboard's Compare tab — it extracts the
            benefit, inflation rider and premiums, saves the file, and adds the policy to the comparison.
          </SectionNote>
        </CardContent>
      </Card>

      {quotes.length > 0 && (
        <>
          <Card className="wos-page">
            <CardHeader className="pb-3"><CardTitle className="text-base">Side-by-side comparison & scoring</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr className="border-b">
                    <th className="text-left py-1.5">Quote</th><th className="text-right">Premium / mo</th>
                    <th className="text-right">Afford.</th><th className="text-right">Future benefit</th>
                    <th className="text-right">Inflation</th><th className="text-right">Home care</th>
                    <th className="text-right">Cash</th><th className="text-right">Partnership</th>
                    <th className="text-right">Pool</th><th className="text-right">Spousal</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {quotes.map((q) => {
                    const s = scores.find((x) => x.quoteId === q.id)!;
                    return (
                      <tr key={q.id} className="border-b border-border/40">
                        <td className="py-1.5">{q.carrier || 'Unnamed'} {q.product}</td>
                        <td className="text-right">{money(q.monthlyPremium)}</td>
                        <td className="text-right">{s.affordability}</td>
                        <td className="text-right">{s.futureBenefit}</td>
                        <td className="text-right">{s.inflationProtection.toFixed(1)}</td>
                        <td className="text-right">{s.homeCareFlexibility.toFixed(1)}</td>
                        <td className="text-right">{s.cashBenefit.toFixed(1)}</td>
                        <td className="text-right">{s.partnership}</td>
                        <td className="text-right">{s.benefitPool}</td>
                        <td className="text-right">{s.spousalProtection}</td>
                        <td className="text-right font-bold">{s.total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <SectionNote>Scores are relative across the stored quotes and out of 10 per axis. Judgment stays with you.</SectionNote>
            </CardContent>
          </Card>

          <Card className="wos-page">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">LTC Future Benefit vs. Cost of Care</CardTitle>
                  <SectionNote>Care costs inflate at {state.careCostBasis.inflationPct}%/yr from today's rates.</SectionNote>
                </div>
                <Select value={careScenario} onValueChange={(v) => setCareScenario(v as CareScenarioKey)}>
                  <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CARE_SCENARIOS.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-4">
                <div><Label className="text-[11px]">Home care $/hr</Label><NumField value={state.careCostBasis.homeHourlyRate} onChange={(n) => patch({ careCostBasis: { ...state.careCostBasis, homeHourlyRate: n } })} /></div>
                <div><Label className="text-[11px]">Assisted living $/mo</Label><NumField value={state.careCostBasis.assistedMonthly} onChange={(n) => patch({ careCostBasis: { ...state.careCostBasis, assistedMonthly: n } })} /></div>
                <div><Label className="text-[11px]">Nursing $/mo</Label><NumField value={state.careCostBasis.nursingMonthly} onChange={(n) => patch({ careCostBasis: { ...state.careCostBasis, nursingMonthly: n } })} /></div>
                <div><Label className="text-[11px]">Care inflation %</Label><NumField value={state.careCostBasis.inflationPct} onChange={(n) => patch({ careCostBasis: { ...state.careCostBasis, inflationPct: n } })} /></div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground">
                    <tr className="border-b">
                      <th className="text-left py-1.5">Quote</th>
                      {[state.currentAge, ...AGES.filter((a) => a > state.currentAge)].map((a) => (
                        <th key={a} className="text-right">Age {a}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {quotes.map((q) => (
                      <tr key={q.id} className="border-b border-border/40">
                        <td className="py-1.5">{q.carrier || 'Unnamed'} benefit / mo</td>
                        {[state.currentAge, ...AGES.filter((a) => a > state.currentAge)].map((a) => (
                          <td key={a} className="text-right">{money(ltcBenefitAtAge(q, state.currentAge, a).monthlyBenefit)}</td>
                        ))}
                      </tr>
                    ))}
                    <tr className="border-b border-border/40">
                      <td className="py-1.5 font-medium">Projected care cost / mo</td>
                      {[state.currentAge, ...AGES.filter((a) => a > state.currentAge)].map((a) => (
                        <td key={a} className="text-right">{money(careCostAtAge(careScenario, state.careCostBasis, state.currentAge, a))}</td>
                      ))}
                    </tr>
                    {quotes.map((q) => (
                      <tr key={`gap-${q.id}`} className="border-b border-border/40">
                        <td className="py-1.5 text-muted-foreground">Self-funded gap ({q.carrier || 'Unnamed'})</td>
                        {[state.currentAge, ...AGES.filter((a) => a > state.currentAge)].map((a) => {
                          const gap = careCostAtAge(careScenario, state.careCostBasis, state.currentAge, a)
                            - ltcBenefitAtAge(q, state.currentAge, a).monthlyBenefit;
                          return <td key={a} className={`text-right ${gap > 0 ? 'text-destructive' : 'text-prism-teal'}`}>{money(gap)}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ConfidenceBadge level="projected" />
            </CardContent>
          </Card>
        </>
      )}

      <Card className="wos-page">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">LTC Insurance + Self-Funding Strategy</CardTitle>
          <SectionNote>
            The objective is not to insure 100% of future care. Transfer a meaningful first layer of risk,
            keep the portfolio compounding, and protect legacy assets.
          </SectionNote>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { n: 1, title: 'LTC insurance', body: `${state.ltcQuotes.length} option(s) stored · ${money(state.ltcQuotes.reduce((s, q) => s + q.monthlyPremium, 0))}/mo premium modelled` },
            { n: 2, title: 'Pension + Social Security + HSA + healthcare reserve + taxable investments', body: `${money(state.socialSecurityMonthly + state.spousePensionMonthly)}/mo income streams · HSA ${money(state.healthcare.hsaBalance)}` },
            { n: 3, title: 'Long-term investment portfolio — catastrophic backstop only', body: `${money(state.portfolioBalance)} today, compounding at ${state.primaryReturnPct}%` },
          ].map((l) => (
            <div key={l.n} className="rounded-lg border border-border/60 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Layer {l.n}</p>
              <p className="text-sm font-semibold">{l.title}</p>
              <SectionNote>{l.body}</SectionNote>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function HealthcarePanel({
  state, patch,
}: { state: AssumptionState; patch: (p: Partial<AssumptionState>) => void }) {
  const res = useMemo(() => healthcareReserve(state.healthcare), [state.healthcare]);
  const setH = (p: Partial<AssumptionState['healthcare']>) => patch({ healthcare: { ...state.healthcare, ...p } });
  const yearsToMedicareDecision = state.medicare.plannedMedicareAge - state.currentAge;

  return (
    <div className="space-y-4">
      <Card className="wos-page">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <HeartPulse className="h-4 w-4 text-prism-teal" /> Healthcare Reserve Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {HEALTHCARE_LINES.map((l) => (
              <div key={String(l.key)}>
                <Label className="text-[11px]">{l.label}{l.annual ? ' (/yr)' : ' (/mo)'}</Label>
                <NumField value={Number(state.healthcare[l.key]) || 0} onChange={(n) => setH({ [l.key]: n } as any)} />
              </div>
            ))}
            <div><Label className="text-[11px]">Reserve years</Label><NumField value={state.healthcare.reserveYears} onChange={(n) => setH({ reserveYears: n })} /></div>
            <div><Label className="text-[11px]">HSA balance</Label><NumField value={state.healthcare.hsaBalance} onChange={(n) => setH({ hsaBalance: n })} /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ['Monthly cost', money(res.monthly)],
              ['Annual cost', money(res.annual)],
              [`Reserve target (${state.healthcare.reserveYears} yr)`, money(res.target)],
              ['HSA balance', money(res.hsaBalance)],
              [res.gap > 0 ? 'Funding gap' : 'Surplus', money(Math.abs(res.gap))],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border/60 p-3">
                <p className="text-[11px] uppercase text-muted-foreground">{label}</p>
                <p className="text-lg font-bold tabular-nums">{value}</p>
              </div>
            ))}
          </div>
          <ConfidenceBadge level="projected" />
        </CardContent>
      </Card>

      <Card className="wos-page">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Stethoscope className="h-4 w-4 text-prism-teal" /> Medicare & Retiree Healthcare Planner
          </CardTitle>
          <SectionNote>
            No plan is recommended today for a retirement that may be decades away. Options are tracked; the
            comparison happens inside the decision window.
          </SectionNote>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <div><Label className="text-[11px]">Planned Medicare age</Label><NumField value={state.medicare.plannedMedicareAge} onChange={(n) => patch({ medicare: { ...state.medicare, plannedMedicareAge: n } })} /></div>
            <div><Label className="text-[11px]">Planned retirement age</Label><NumField value={state.retirementAge} onChange={(n) => patch({ retirementAge: n })} /></div>
            <div className="flex items-end gap-4 text-xs">
              <label className="flex items-center gap-2">
                <Switch checked={state.medicare.hsaEligible} onCheckedChange={(v) => patch({ medicare: { ...state.medicare, hsaEligible: v } })} /> HSA eligible
              </label>
              <label className="flex items-center gap-2">
                <Switch checked={state.medicare.medicareEnrolled} onCheckedChange={(v) => patch({ medicare: { ...state.medicare, medicareEnrolled: v } })} /> Enrolled
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {state.medicare.optionsConsidered.map((o) => (
              <Badge key={o} variant="outline" className="text-[10px]">{o}</Badge>
            ))}
          </div>

          <div className="space-y-2">
            {[
              ['ACTIVE EMPLOYMENT', 'IU active employee health coverage'],
              ['AGE 64/65+', 'Medicare / HSA coordination review'],
              ['CONTINUE WORKING', 'Continue appropriate active employee coverage'],
              [`6 MONTHS BEFORE RETIREMENT (age ${state.retirementAge})`, 'Medicare decision analysis — compare the options available then'],
              ['RETIREMENT', 'Medicare + selected supplemental / retiree strategy (e.g. IU Blue Retiree)'],
            ].map(([stage, body]) => (
              <div key={stage} className="rounded-lg border border-border/60 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{stage}</p>
                <p className="text-sm">{body}</p>
              </div>
            ))}
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Medicare decision window</AlertTitle>
            <AlertDescription className="text-xs">
              Opens approximately six months before age {state.retirementAge} — about {Math.max(0, yearsToMedicareDecision)} years
              from now. Active employer coverage is {state.medicare.activeEmployerCoverage ? 'ON' : 'OFF'}, so Medicare is
              not assumed to begin at 65. Verify the Medicare and HSA rules in force at that time before your final
              HSA contribution — current rules are not projected forward.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
