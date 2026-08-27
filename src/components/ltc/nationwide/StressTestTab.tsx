import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, Waves } from 'lucide-react';
import {
  DEFAULT_STRESS, NW, NW_WATERFALL, NW_WATERFALL_MESSAGE, STRESS_CLAIM_AGES,
  STRESS_COST_PRESETS, STRESS_DURATIONS, runStressTest, type StressInputs,
} from '@/lib/ltc/nationwide';
import { money, pct, StatCard, Field, Select, NumField } from '../shared';
import { IllustrationTag, PlanningNotice } from './PlanningNotice';

export function StressTestTab({ hsaBalance = 0 }: { hsaBalance?: number }) {
  const [inputs, setInputs] = useState<StressInputs>({ ...DEFAULT_STRESS, hsaBalance });
  const set = (p: Partial<StressInputs>) => setInputs((s) => ({ ...s, ...p }));
  const r = useMemo(() => runStressTest(inputs), [inputs]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-prism-amber" /> Long-Term Care Stress Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Claim age (older insured)">
              <Select value={String(inputs.claimAge)} onChange={(v) => set({ claimAge: Number(v) })}
                options={STRESS_CLAIM_AGES.map((a) => ({ value: String(a), label: `Age ${a}` }))} />
            </Field>
            <Field label="Care duration">
              <Select value={String(inputs.careYears)} onChange={(v) => set({ careYears: Number(v) })}
                options={STRESS_DURATIONS.map((y) => ({ value: String(y), label: `${y} year${y > 1 ? 's' : ''}` }))} />
            </Field>
            <Field label="Monthly care cost">
              <Select value={String(inputs.monthlyCareCost)} onChange={(v) => set({ monthlyCareCost: Number(v) })}
                options={STRESS_COST_PRESETS.map((c) => ({ value: String(c), label: money(c) }))} />
            </Field>
            <Field label="HSA balance today"><NumField value={inputs.hsaBalance} onChange={(v) => set({ hsaBalance: v })} /></Field>
            <Field label="HSA growth %"><NumField value={inputs.hsaReturnPct} onChange={(v) => set({ hsaReturnPct: v })} /></Field>
            <Field label="Monthly income for care"><NumField value={inputs.monthlyIncomeAvailable} onChange={(v) => set({ monthlyIncomeAvailable: v })} /></Field>
            <Field label="Taxable assets"><NumField value={inputs.taxableAssets} onChange={(v) => set({ taxableAssets: v })} /></Field>
            <Field label="Retirement assets"><NumField value={inputs.retirementAssets} onChange={(v) => set({ retirementAssets: v })} /></Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Monthly LTC benefit" value={money(r.monthlyBenefit)} sub={r.benefitIllustrated ? 'Illustrated value' : '3% compounding estimate'} tone="good" />
            <StatCard label="Monthly gap" value={money(r.monthlyGap)} sub={`${pct(r.coveragePct)} of care cost covered`} tone={r.monthlyGap > 0 ? 'warn' : 'good'} />
            <StatCard label="Total care cost" value={money(r.totalCareCost)} sub={`${r.months} months of care`} />
            <StatCard label="Insurance pays" value={money(r.insurancePaid)} sub={`${Math.round(r.payableMonths)} months from the shared pool`} tone="good" />
            <StatCard label="Shared pool at claim" value={money(r.poolAtClaim)} sub={r.poolExhausted ? 'Pool fully used in this scenario' : 'Pool not exhausted'} tone={r.poolExhausted ? 'warn' : 'info'} />
            <StatCard label="Elimination period cost" value={money(r.eliminationCost)} sub={`${NW.eliminationDays}-day wait, household funded`} tone="warn" />
            <StatCard label="Retroactive initial payment" value={`≈ ${money(r.retroactiveFirstPayment)}`} sub="Illustrative, per policy terms" />
            <StatCard label="Portfolio assets protected" value={money(r.portfolioAssetsProtected)} sub="Would have come from invested assets" tone="good" />
          </div>

          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Funding waterfall for the remaining {money(r.totalGap)} gap</p>
            <div className="space-y-2">
              {r.layers.map((l) => (
                <div key={l.key} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/40 pb-1.5">
                  <span className="text-sm font-medium">{l.label}</span>
                  <span className="text-xs text-muted-foreground flex-1 min-w-[12rem]">{l.detail}</span>
                  <span className="text-sm tabular-nums font-semibold">{money(l.applied)}</span>
                  <Badge variant="outline" className="text-[10px]">gap left {money(l.remainingGap)}</Badge>
                </div>
              ))}
            </div>
            <p className="text-sm mt-2">
              Uncovered gap:{' '}
              <span className={r.uncoveredGap > 0 ? 'font-semibold text-destructive' : 'font-semibold text-prism-lime'}>
                {money(r.uncoveredGap)}
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">HSA at claim age: {money(r.hsaAtClaim)}</p>
          </div>
          <div className="flex items-center gap-2"><IllustrationTag illustrated={r.benefitIllustrated} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Waves className="h-4 w-4 text-prism-sky" /> Coordination Order
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {NW_WATERFALL.map((w) => (
            <div key={w.step} className="flex gap-3 rounded border border-border/50 p-2">
              <span className="text-xs font-bold text-muted-foreground">{w.step}</span>
              <div>
                <p className="text-sm font-semibold">{w.label}</p>
                <p className="text-xs text-muted-foreground">{w.body}</p>
              </div>
            </div>
          ))}
          <p className="text-sm font-medium pt-1">{NW_WATERFALL_MESSAGE}</p>
        </CardContent>
      </Card>

      <PlanningNotice />
    </div>
  );
}
