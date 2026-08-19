import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Award, Target } from 'lucide-react';
import {
  benefitAtAge, careCostAtAge, combinedPremium, rankPolicies, simulateCareEvent,
  sweetSpotTable, defaultState, cashBenefitMonthly, type LtcState, type LtcWeights,
} from '@/lib/ltc/model';
import { money, money2, Note, GapBadge, NumField } from './shared';

const WEIGHT_LABELS: { key: keyof LtcWeights; label: string }[] = [
  { key: 'affordability', label: 'Affordability' },
  { key: 'inflation', label: 'Inflation protection' },
  { key: 'benefit', label: 'Monthly benefit' },
  { key: 'flexibility', label: 'Flexibility' },
  { key: 'partnership', label: 'Partnership qualification' },
  { key: 'homeCare', label: 'Home care coverage' },
  { key: 'cash', label: 'Cash benefit' },
];

export function Recommendation({ state, patch }: { state: LtcState; patch: (p: Partial<LtcState>) => void }) {
  const h = state.household;
  const ranked = rankPolicies(state);
  const byId = (id: string) => state.policies.find((p) => p.id === id)!;
  const top = ranked[0] ? byId(ranked[0].policyId) : null;
  const highestBenefit = [...state.policies].sort((a, b) => b.startingMonthlyBenefit - a.startingMonthlyBenefit)[0];
  const { rows, bestBenefit } = sweetSpotTable(state);

  const setW = (key: keyof LtcWeights, v: number) => patch({ weights: { ...state.weights, [key]: v } });
  const totalW = Object.values(state.weights).reduce((a, b) => a + b, 0);

  const sim = top ? simulateCareEvent(state, top, h.assumedClaimAge, h.assumedCareYears) : null;

  return (
    <div className="space-y-4">
      {top && sim && (
        <Card className="glass-card border-prism-lime/40">
          <CardHeader>
            <div className="flex items-center gap-2 flex-wrap">
              <Award className="h-4 w-4 text-prism-lime" />
              <CardTitle className="text-base">#1 {top.carrier} — {top.product}</CardTitle>
              <Badge variant="outline" className="border-prism-lime/40 text-prism-lime text-[10px]">Recommended</Badge>
            </div>
            <Note>
              Best balance of affordability, flexibility, {top.inflationPct}% lifetime compound inflation,
              {top.cashBenefitPct ? ` ${top.cashBenefitPct}% cash benefit,` : ''}
              {top.partnershipQualified ? ' Ohio Partnership protection,' : ''} home care coverage and retirement asset preservation.
            </Note>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-1.5">
              {([
                ['Starting benefit', `${money(top.startingMonthlyBenefit)} per month each`],
                ['Combined premium', `${money2(combinedPremium(top))} per month`],
                ['Inflation', `${top.inflationPct}% ${top.inflationCompound ? 'compound' : 'simple'}${top.inflationLifetime ? ' lifetime' : ''}`],
                ['Benefit period', `${top.benefitPeriodMonths} months`],
                ['Initial pool', `${money(top.poolEach)} each`],
                ['Cash benefit', top.cashBenefitPct ? `${top.cashBenefitPct}% (${money(cashBenefitMonthly(top))}/mo)` : 'None'],
                ['Partnership', top.partnershipQualified ? 'Yes' : 'No'],
                ['Overall score', `${ranked[0].weighted} / 10`],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-3 border-b border-border/30 py-1">
                  <span className="text-xs text-muted-foreground">{k}</span>
                  <span className="text-sm font-semibold tabular-nums">{v}</span>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-prism-amber/40 bg-prism-amber/5 p-3 text-sm">
              The {top.carrier} plan does not provide the highest starting monthly benefit
              {highestBenefit && highestBenefit.id !== top.id
                ? ` — ${highestBenefit.carrier} and others start at ${money(highestBenefit.startingMonthlyBenefit)} and protect more from day one`
                : ''}.
              It ranks higher for this household because the strategy prioritizes sustainable premiums, lifetime benefit
              growth, flexibility, and preserving capital for retirement investing.
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-border/60 bg-card/60 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">How much risk are we transferring?</p>
                <p className="text-lg font-bold tabular-nums">{money(sim.insurancePaid)}</p>
                <p className="text-[11px] text-muted-foreground">of a {money(sim.totalCareCost)} care event at age {h.assumedClaimAge}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-card/60 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">What are we paying to transfer it?</p>
                <p className="text-lg font-bold tabular-nums">{money(sim.premiumsPaid)}</p>
                <p className="text-[11px] text-muted-foreground">{money2(combinedPremium(top))}/mo until age {h.assumedClaimAge}</p>
              </div>
              <div className="rounded-lg border border-prism-lime/40 bg-prism-lime/5 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Is the premium worth it?</p>
                <p className="text-lg font-bold tabular-nums">
                  {(sim.insurancePaid / Math.max(1, sim.premiumsPaid)).toFixed(2)}× premium
                </p>
                <p className="text-[11px] text-muted-foreground">retirement capital protected per premium dollar</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base">Decision Weights</CardTitle>
            <Note>Total {totalW}. Scores are normalised, so weights need not sum to 100.</Note>
          </div>
          <Button size="sm" variant="outline" onClick={() => patch({ weights: defaultState().weights })}>Reset weights</Button>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          {WEIGHT_LABELS.map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>{label}</span>
                <span className="tabular-nums font-semibold">{state.weights[key]}%</span>
              </div>
              <Slider value={[state.weights[key]]} min={0} max={50} step={1} onValueChange={([v]) => setW(key, v)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base">Ranking under these weights</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2">#</th><th className="py-2">Plan</th><th className="py-2">Premium</th>
                <th className="py-2">Afford.</th><th className="py-2">Inflation</th><th className="py-2">Benefit</th>
                <th className="py-2">Flex.</th><th className="py-2">Partnership</th><th className="py-2">Overall</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((s, i) => {
                const p = byId(s.policyId);
                return (
                  <tr key={s.policyId} className="border-b border-border/30">
                    <td className="py-2">{i + 1}</td>
                    <td className="py-2 whitespace-nowrap">{p.carrier} — {p.product}</td>
                    <td className="py-2 tabular-nums">{money2(combinedPremium(p))}</td>
                    <td className="py-2 tabular-nums">{s.affordability}</td>
                    <td className="py-2 tabular-nums">{s.inflation}</td>
                    <td className="py-2 tabular-nums">{s.benefit}</td>
                    <td className="py-2 tabular-nums">{s.flexibility}</td>
                    <td className="py-2 tabular-nums">{s.partnership}</td>
                    <td className="py-2 tabular-nums font-bold text-prism-amber">{s.weighted}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-prism-amber" /> Find Our LTC Sweet Spot
          </CardTitle>
          <Note>
            All rungs hold 3% compound lifetime inflation, a 3-year benefit period, 90-day elimination, Partnership
            qualification, and 100% home care and assisted living. Enter each spouse's quoted premium as you receive it.
            Best balance under current inputs: {bestBenefit ? money(bestBenefit) : '—'} per month.
          </Note>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2">Benefit</th><th className="py-2">Lyman /mo</th><th className="py-2">Kateri /mo</th>
                <th className="py-2">Combined /mo</th><th className="py-2">Combined /yr</th>
                <th className="py-2">Benefit at {h.assumedClaimAge}</th><th className="py-2">Pool at {h.assumedClaimAge}</th>
                <th className="py-2">Gap</th><th className="py-2">Capital protected</th><th className="py-2">Value score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const rung = state.sweetSpot[i];
                const setRung = (p: Partial<typeof rung>) =>
                  patch({ sweetSpot: state.sweetSpot.map((x, j) => (j === i ? { ...x, ...p } : x)) });
                return (
                  <tr key={r.benefit} className={`border-b border-border/30 ${r.highlight ? 'bg-prism-amber/5' : ''} ${r.benefit === bestBenefit ? 'bg-prism-lime/5' : ''}`}>
                    <td className="py-2 font-semibold whitespace-nowrap">
                      {money(r.benefit)}
                      {r.highlight && <Badge variant="outline" className="ml-2 text-[9px] border-prism-amber/40 text-prism-amber">Middle ground</Badge>}
                    </td>
                    <td className="py-2"><NumField className="w-24 h-8" value={rung.premiumLyman} onChange={(n) => setRung({ premiumLyman: n })} /></td>
                    <td className="py-2"><NumField className="w-24 h-8" value={rung.premiumKateri} onChange={(n) => setRung({ premiumKateri: n })} /></td>
                    <td className="py-2 tabular-nums font-semibold">{money2(r.combined)}</td>
                    <td className="py-2 tabular-nums">{money(r.annual)}</td>
                    <td className="py-2 tabular-nums">{money(r.futureMonthly)}</td>
                    <td className="py-2 tabular-nums">{money(r.futurePool)}</td>
                    <td className="py-2 tabular-nums">{money(r.gap)} <GapBadge band={r.band} /></td>
                    <td className="py-2 tabular-nums">{money(r.protectedCapital)}</td>
                    <td className="py-2 tabular-nums font-bold">{r.valueScore}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Note>
            Value score rewards capital protected per premium dollar and penalises buying benefit well beyond projected
            {' '}{h.city} care cost ({money(careCostAtAge(h, h.lymanAge, h.assumedClaimAge))}/mo at age {h.assumedClaimAge}).
          </Note>
        </CardContent>
      </Card>

      <Card className="glass-card border-prism-amber/30">
        <CardContent className="pt-5 text-center space-y-1">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Family LTC Strategy</p>
          <p className="text-lg font-bold">Protect the downside. Keep the upside invested. Preserve the legacy.</p>
          {top && (
            <Note>
              Projected benefit at age {h.assumedClaimAge}: {money(benefitAtAge(top, h.lymanAge, h.assumedClaimAge).monthlyBenefit)} per month.
            </Note>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
