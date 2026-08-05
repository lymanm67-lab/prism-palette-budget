import { useMemo, useState } from 'react';
import { ArrowDown, Printer, ShieldAlert, Landmark } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  ESTATE_ITEMS,
  ESTATE_NOTE,
  FUNDING_PHASES,
  LEGACY_PRINCIPLE,
  MISSION_FIRST_PRINCIPLE,
  QCD_NOTE,
  RETIREMENT_DEFAULTS,
  RETIREMENT_GUIDANCE,
  RETIREMENT_WORKFLOW,
  TAX_LAW_NOTE,
  projectRetirementGiving,
  type RetirementGivingState,
} from '@/lib/legacy/charitableLegacy';
import { useFdnReadinessState } from '@/hooks/use-foundation-readiness';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const FIELDS: { key: keyof RetirementGivingState; label: string; suffix?: string }[] = [
  { key: 'currentAge', label: 'Current age' },
  { key: 'retirementAge', label: 'Expected retirement age' },
  { key: 'traditionalBalance', label: 'Traditional retirement accounts' },
  { key: 'rothBalance', label: 'Roth retirement accounts' },
  { key: 'taxableBalance', label: 'Taxable investment accounts' },
  { key: 'projectedAnnualDistribution', label: 'Projected taxable distribution / yr' },
  { key: 'annualGivingGoal', label: 'Annual charitable giving goal' },
  { key: 'incomeNeed', label: 'Retirement income need / yr' },
  { key: 'returnPct', label: 'Assumed return', suffix: '%' },
  { key: 'yearsOfGiving', label: 'Years of planned giving' },
];

export default function RetirementGivingTab() {
  const { state, patch } = useFdnReadinessState();
  const savedRet = (state.funding?.retirement ?? {}) as RetirementGivingState;
  const savedEstate = (state.funding?.estate ?? {}) as Record<string, boolean>;
  const [draftRet, setDraftRet] = useState<RetirementGivingState>({});
  const [draftEstate, setDraftEstate] = useState<Record<string, boolean>>({});

  const ret: RetirementGivingState = useMemo(
    () => ({ ...RETIREMENT_DEFAULTS, ...savedRet, ...draftRet }),
    [savedRet, draftRet],
  );
  const estate = useMemo(() => ({ ...savedEstate, ...draftEstate }), [savedEstate, draftEstate]);
  const proj = useMemo(() => projectRetirementGiving(ret), [ret]);
  const estateDone = ESTATE_ITEMS.filter((i) => estate[i.key]).length;

  const setRet = (key: keyof RetirementGivingState, value: number) => {
    const next = { ...ret, [key]: value };
    setDraftRet(next);
    patch({ funding: { ...(state.funding ?? {}), retirement: next } });
  };
  const setEstate = (key: string, value: boolean) => {
    const next = { ...estate, [key]: value };
    setDraftEstate(next);
    patch({ funding: { ...(state.funding ?? {}), estate: next } });
  };

  const phase3 = FUNDING_PHASES[2];
  const phase4 = FUNDING_PHASES[3];

  return (
    <div className="space-y-6">
      <Card className="glass-card border-prism-amber/40">
        <CardContent className="space-y-2 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-prism-amber">Mission first</p>
          <p className="text-sm leading-relaxed">{MISSION_FIRST_PRINCIPLE}</p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Retirement Giving Strategy</h2>
          <p className="text-xs text-muted-foreground">
            {phase3.step} — {phase3.title}. Requires annual professional review.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Print Report
        </Button>
      </div>

      <Card className="glass-card">
        <CardContent className="space-y-2 p-4">
          <p className="text-sm leading-relaxed">{RETIREMENT_GUIDANCE}</p>
          <div className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/30 p-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-prism-amber" />
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{QCD_NOTE}</p>
              <Badge variant="outline" className="text-[10px]">Requires annual professional review</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inputs + projection */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Retirement Planning Inputs</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 pt-0 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={String(f.key)} className="space-y-1">
                <Label className="text-xs">
                  {f.label}
                  {f.suffix ? ` (${f.suffix})` : ''}
                </Label>
                <Input
                  type="number"
                  className="h-9"
                  value={(ret[f.key] as number) ?? ''}
                  onChange={(e) => setRet(f.key, Number(e.target.value) || 0)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Illustrative Projection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0 text-sm">
            {[
              { l: 'Years to retirement', v: `${proj.years}` },
              { l: 'Balance at retirement', v: money(proj.balanceAtRetirement) },
              { l: 'Illustrative first-year RMD', v: money(proj.rmdFirstYear) },
              { l: 'Lifetime charitable giving', v: money(proj.lifetimeGiving) },
              { l: 'Giving as % of distribution', v: `${Math.round(proj.givingShareOfDistribution)}%` },
            ].map((r) => (
              <div key={r.l} className="flex items-center justify-between border-b border-border/40 pb-2">
                <span className="text-xs text-muted-foreground">{r.l}</span>
                <span className="font-semibold">{r.v}</span>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">
              No tax savings are calculated. {TAX_LAW_NOTE}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Workflow */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Annual Charitable Distribution Workflow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 p-4 pt-0">
          {RETIREMENT_WORKFLOW.map((step, i) => (
            <div key={step}>
              <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm">
                <span className="mr-2 text-xs text-muted-foreground">{i + 1}</span>
                {step}
              </div>
              {i < RETIREMENT_WORKFLOW.length - 1 && (
                <div className="flex justify-center py-0.5">
                  <ArrowDown className="h-3.5 w-3.5 text-prism-amber" />
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Phase four legacy funding */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-prism-amber">{phase4.step}</p>
          <CardTitle className="flex items-center gap-2 text-base">
            <Landmark className="h-4 w-4" />
            {phase4.title}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{LEGACY_PRINCIPLE}</p>
        </CardHeader>
        <CardContent className="grid gap-4 p-4 pt-0 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold">Potential future sources</p>
            <ul className="space-y-0.5 text-xs text-muted-foreground">
              {phase4.sources.map((s) => (
                <li key={s}>• {s}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold">
              Estate integration ({estateDone}/{ESTATE_ITEMS.length})
            </p>
            <div className="space-y-1.5">
              {ESTATE_ITEMS.map((i) => (
                <label key={i.key} className="flex items-center gap-2 text-xs">
                  <Checkbox checked={!!estate[i.key]} onCheckedChange={(v) => setEstate(i.key, !!v)} />
                  {i.label}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 p-3">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-prism-amber" />
        <p className="text-xs text-muted-foreground">{ESTATE_NOTE} Planning tool only — not legal or tax advice.</p>
      </div>
    </div>
  );
}
