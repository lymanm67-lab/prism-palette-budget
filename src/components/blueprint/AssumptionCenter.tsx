import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sliders } from 'lucide-react';
import { NumField, SectionNote, ConfidenceBadge } from './shared';
import type { AssumptionState, Confidence } from '@/lib/blueprint/model';

type Field = { key: keyof AssumptionState; label: string; suffix?: string; confidence?: Confidence };

const GROUPS: { title: string; blurb: string; fields: Field[] }[] = [
  {
    title: 'People & horizon',
    blurb: 'Retirement age drives every timeline, projection and Medicare window.',
    fields: [
      { key: 'currentAge', label: 'Current age', confidence: 'current' },
      { key: 'spouseCurrentAge', label: 'Spouse current age', confidence: 'current' },
      { key: 'retirementAge', label: 'Retirement age (80–85 plan)', confidence: 'projected' },
      { key: 'legacyWindowStartAge', label: 'Legacy window starts at age', confidence: 'projected' },
    ],
  },
  {
    title: 'Salary & contributions',
    blurb: '100% of raises redirect to investing unless you lower the redirect percentage.',
    fields: [
      { key: 'salaryAnnual', label: 'Current salary (annual)', suffix: '$', confidence: 'current' },
      { key: 'salaryGrowthPct', label: 'Annual salary growth', suffix: '%', confidence: 'estimated' },
      { key: 'raiseRedirectPct', label: 'Raise redirected to investing', suffix: '%' },
      { key: 'employerContributionPct', label: 'Employer contribution', suffix: '%', confidence: 'current' },
      { key: 'employeeContributionMonthly', label: 'Employee contribution / mo', suffix: '$', confidence: 'current' },
      { key: 'scheduledIncreaseMonthly', label: 'Scheduled increase / mo', suffix: '$' },
      { key: 'scheduledIncreaseStartYear', label: 'Increase starts (year)' },
      { key: 'additionalVoluntaryMonthly', label: 'Additional voluntary / mo', suffix: '$' },
    ],
  },
  {
    title: 'Portfolio & returns',
    blurb: 'Return scenarios feed the growth simulator and every milestone date.',
    fields: [
      { key: 'portfolioBalance', label: 'Portfolio balance', suffix: '$', confidence: 'current' },
      { key: 'primaryReturnPct', label: 'Planning return', suffix: '%', confidence: 'projected' },
      { key: 'stretchReturnPct', label: 'Stretch return', suffix: '%', confidence: 'projected' },
      { key: 'inflationPct', label: 'Inflation', suffix: '%' },
      { key: 'healthcareInflationPct', label: 'Healthcare inflation', suffix: '%' },
    ],
  },
  {
    title: 'Income streams (never net worth)',
    blurb: 'Social Security and pension are modelled as income only — they are excluded from assets.',
    fields: [
      { key: 'socialSecurityStartAge', label: 'Social Security start age' },
      { key: 'socialSecurityMonthly', label: 'Social Security / mo', suffix: '$', confidence: 'projected' },
      { key: 'socialSecurityCola', label: 'Social Security COLA', suffix: '%' },
      { key: 'spousePensionStartAge', label: 'Spouse pension start age' },
      { key: 'spousePensionMonthly', label: 'Spouse pension / mo', suffix: '$', confidence: 'estimated' },
      { key: 'spousePensionCola', label: 'Pension COLA', suffix: '%' },
      { key: 'spousePensionSurvivorPct', label: 'Survivor option', suffix: '%' },
      { key: 'otherRecurringIncomeMonthly', label: 'Other recurring income / mo', suffix: '$' },
      { key: 'plannedWithdrawalForLiving', label: 'Planned portfolio withdrawal / mo', suffix: '$' },
    ],
  },
  {
    title: 'Tax, RMD & conversions',
    blurb: 'Editable because future rules will change — nothing here is hard-coded downstream.',
    fields: [
      { key: 'rmdAge', label: 'RMD start age' },
      { key: 'effectiveTaxRatePct', label: 'Effective tax rate', suffix: '%' },
      { key: 'rothConversionAnnual', label: 'Annual Roth conversion', suffix: '$' },
    ],
  },
];

export function AssumptionCenter({
  state, patch,
}: { state: AssumptionState; patch: (p: Partial<AssumptionState>) => void }) {
  return (
    <div className="space-y-4">
      <Card className="wos-page">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sliders className="h-4 w-4 text-prism-teal" /> Assumption Center
          </CardTitle>
          <SectionNote>
            One place for every assumption. Editing a value here immediately re-runs the debt engine,
            contribution timeline, waterfall, portfolio projections, healthcare reserve and binder pages.
          </SectionNote>
        </CardHeader>
        <CardContent className="space-y-6">
          {GROUPS.map((g) => (
            <div key={g.title} className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">{g.title}</h3>
                <SectionNote>{g.blurb}</SectionNote>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {g.fields.map((f) => (
                  <div key={String(f.key)} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs">
                        {f.label}{f.suffix ? ` (${f.suffix})` : ''}
                      </Label>
                      {f.confidence && <ConfidenceBadge level={state.confidence[String(f.key)] ?? f.confidence} />}
                    </div>
                    <NumField
                      value={Number(state[f.key] as number) || 0}
                      onChange={(n) => patch({ [f.key]: n } as Partial<AssumptionState>)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Return scenarios</h3>
            <div className="flex flex-wrap gap-2">
              {state.returnScenarios.map((r, i) => (
                <div key={i} className="w-24">
                  <NumField
                    value={r}
                    onChange={(n) => {
                      const next = [...state.returnScenarios];
                      next[i] = n;
                      patch({ returnScenarios: next.filter((x) => x > 0) });
                    }}
                  />
                </div>
              ))}
              <div className="w-24">
                <NumField value={0} onChange={(n) => n > 0 && patch({ returnScenarios: [...state.returnScenarios, n].sort((a, b) => a - b) })} />
              </div>
            </div>
            <SectionNote>Blank box adds a scenario. Set a value to 0 to remove it.</SectionNote>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div>
              <p className="text-sm font-medium">Active employer health coverage</p>
              <SectionNote>Keeps HSA eligibility alive past 65 while you continue working.</SectionNote>
            </div>
            <Switch
              checked={state.medicare.activeEmployerCoverage}
              onCheckedChange={(v) => patch({ medicare: { ...state.medicare, activeEmployerCoverage: v } })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
