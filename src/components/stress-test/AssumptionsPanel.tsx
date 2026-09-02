import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { LtcSetting, StressAssumptions, StressGoals } from '@/lib/retirement/stressTest';
import { RotateCcw } from 'lucide-react';

type NumKeys = {
  [K in keyof StressAssumptions]: StressAssumptions[K] extends number ? K : never;
}[keyof StressAssumptions];

export function AssumptionsPanel({
  assumptions,
  goals,
  onChange,
  onGoalsChange,
  onReset,
  emergencyCash,
}: {
  assumptions: StressAssumptions;
  goals: StressGoals;
  onChange: (patch: Partial<StressAssumptions>) => void;
  onGoalsChange: (patch: Partial<StressGoals>) => void;
  onReset: () => void;
  emergencyCash: number;
}) {
  const num = (key: NumKeys, label: string, step = 1) => (
    <div className="space-y-1" key={key}>
      <Label htmlFor={key} className="text-xs">{label}</Label>
      <Input
        id={key}
        type="number"
        step={step}
        value={assumptions[key] as number}
        onChange={(e) => onChange({ [key]: Number(e.target.value) } as Partial<StressAssumptions>)}
      />
    </div>
  );

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Assumptions &amp; Goals</CardTitle>
            <CardDescription>
              Pre-filled from your active Prism plan. Edit anything to test a what-if — your master plan is
              never changed unless you save it deliberately.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onReset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset to plan
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={['goals']}>
          <AccordionItem value="goals">
            <AccordionTrigger className="text-sm">What counts as success</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center justify-between rounded-lg border border-border/50 p-3 text-sm">
                  Portfolio never reaches $0
                  <Switch checked={goals.neverDeplete} onCheckedChange={(v) => onGoalsChange({ neverDeplete: v })} />
                </label>
                <label className="flex items-center justify-between rounded-lg border border-border/50 p-3 text-sm">
                  Preserve original principal
                  <Switch checked={goals.preservePrincipal} onCheckedChange={(v) => onGoalsChange({ preservePrincipal: v })} />
                </label>
                <label className="flex items-center justify-between rounded-lg border border-border/50 p-3 text-sm">
                  Fund long-term care needs
                  <Switch checked={goals.fundLtc} onCheckedChange={(v) => onGoalsChange({ fundLtc: v })} />
                </label>
                <label className="flex items-center justify-between rounded-lg border border-border/50 p-3 text-sm">
                  Test a legacy target
                  <Switch
                    checked={goals.legacyTarget != null}
                    onCheckedChange={(v) => onGoalsChange({ legacyTarget: v ? 4_000_000 : null })}
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs">Legacy target ($)</Label>
                  <Input
                    type="number"
                    step={50_000}
                    value={goals.legacyTarget ?? 0}
                    disabled={goals.legacyTarget == null}
                    onChange={(e) => onGoalsChange({ legacyTarget: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">…by age</Label>
                  <Input
                    type="number"
                    value={goals.legacyTargetAge}
                    onChange={(e) => onGoalsChange({ legacyTargetAge: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Minimum portfolio floor ($)</Label>
                  <Input
                    type="number"
                    step={10_000}
                    value={goals.minimumFloor ?? 0}
                    onChange={(e) => onGoalsChange({ minimumFloor: Number(e.target.value) || null })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Minimum annual income ($)</Label>
                  <Input
                    type="number"
                    step={1_000}
                    value={goals.minimumAnnualIncome ?? 0}
                    onChange={(e) => onGoalsChange({ minimumAnnualIncome: Number(e.target.value) || null })}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="ages">
            <AccordionTrigger className="text-sm">Ages &amp; invested assets</AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {num('currentAge', 'Current age')}
                {num('retirementAge', 'Retirement age')}
                {num('lifeExpectancy', 'Life expectancy')}
                {num('portfolioBalance', 'Retirement & brokerage balance ($)', 100)}
                {num('hsaBalance', 'HSA balance ($)', 100)}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Emergency cash of ${emergencyCash.toLocaleString()} is intentionally excluded — reserves are
                liquidity, not invested assets.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="contrib">
            <AccordionTrigger className="text-sm">Contributions</AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {num('employeeContribution', 'Your contributions ($/yr)', 100)}
                {num('employerContribution', 'Employer contributions ($/yr)', 100)}
                {num('hsaContribution', 'HSA contributions ($/yr)', 100)}
                {num('hsaEmployerContribution', 'Employer HSA ($/yr)', 100)}
                {num('contributionGrowthPct', 'Contribution growth (%/yr)', 0.1)}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Employer money grows the portfolio but is never treated as take-home income, and payroll
                deferrals are counted once.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="household">
            <AccordionTrigger className="text-sm">Household (spouse assets &amp; income)</AccordionTrigger>
            <AccordionContent>
              <label className="mb-3 flex items-center justify-between rounded-lg border border-border/50 p-3 text-sm">
                Include spouse assets, contributions &amp; Social Security
                <Switch
                  checked={assumptions.includeSpouse}
                  onCheckedChange={(v) => onChange({ includeSpouse: v })}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                {num('spouseCurrentAge', 'Spouse current age')}
                {num('spouseRetirementAge', 'Spouse retirement age')}
                {num('spouseBalance', 'Spouse invested balance ($)', 100)}
                {num('spouseContribution', 'Spouse contributions ($/yr)', 100)}
                {num('spouseSocialSecurityAnnual', 'Spouse Social Security ($/yr)', 500)}
                {num('spouseSocialSecurityStartAge', 'Spouse SS start age')}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Spouse contributions keep flowing until the spouse retirement age, even if you retire first.
                A spouse pension entered in your plan is already included in the pension line.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="accelerators">
            <AccordionTrigger className="text-sm">Working longer &amp; redirected cash</AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {num('debtRedirectAnnual', 'Freed debt payments redirected ($/yr)', 100)}
                {num('debtRedirectStartAge' as NumKeys, 'Redirect starts at age')}
                {num('taxRefundRedirectAnnual', 'Tax refunds / bonuses invested ($/yr)', 100)}
                {num('postRetirementIncomeAnnual', 'Continued work income ($/yr)', 500)}
                {num('postRetirementIncomeEndAge' as NumKeys, 'Work income ends at age')}
                {num('withdrawalStartAge' as NumKeys, 'First portfolio withdrawal at age')}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Contribution growth of {assumptions.contributionGrowthPct}%/yr models your annual pay raise.
                Continued work income and delayed withdrawals let the portfolio compound instead of being drawn
                down. Set an age to 0 to clear it.
              </p>
            </AccordionContent>
          </AccordionItem>


          <AccordionItem value="markets">
            <AccordionTrigger className="text-sm">Markets &amp; inflation</AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {num('expectedReturnPct', 'Expected average return (%)', 0.1)}
                {num('volatilityPct', 'Volatility / std deviation (%)', 0.5)}
                {num('inflationPct', 'General inflation (%)', 0.1)}
                {num('housingInflationPct', 'Housing inflation (%)', 0.1)}
                {num('healthcareInflationPct', 'Healthcare inflation (%)', 0.1)}
                {num('ltcInflationPct', 'Long-term care inflation (%)', 0.1)}
                {num('travelInflationPct', 'Travel inflation (%)', 0.1)}
                {num('effectiveTaxRatePct', 'Effective tax rate on withdrawals (%)', 0.5)}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="spend">
            <AccordionTrigger className="text-sm">Retirement spending &amp; guaranteed income</AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {num('essentialSpend', 'Essential spending ($/yr)', 500)}
                {num('discretionarySpend', 'Discretionary ($/yr)', 500)}
                {num('healthcareSpend', 'Healthcare ($/yr)', 500)}
                {num('travelSpend', 'Travel ($/yr)', 500)}
                {num('withdrawalGrowthPct', 'Withdrawal growth above inflation (%)', 0.1)}
                {num('socialSecurityAnnual', 'Social Security ($/yr)', 500)}
                {num('socialSecurityStartAge', 'SS start age')}
                {num('socialSecurityColaPct', 'SS COLA (%)', 0.1)}
                {num('pensionAnnual', 'Pension ($/yr)', 500)}
                {num('pensionStartAge', 'Pension start age')}
                {num('pensionColaPct', 'Pension COLA (%)', 0.1)}
                {num('otherGuaranteedAnnual', 'Other guaranteed ($/yr)', 500)}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="ltc">
            <AccordionTrigger className="text-sm">Long-term care event</AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs">Care setting</Label>
                  <Select value={assumptions.ltcSetting} onValueChange={(v) => onChange({ ltcSetting: v as LtcSetting })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No LTC event</SelectItem>
                      <SelectItem value="home">Home care</SelectItem>
                      <SelectItem value="assisted">Assisted living</SelectItem>
                      <SelectItem value="nursing">Nursing facility</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {num('ltcStartAge', 'Age care begins')}
                {num('ltcYears', 'Years of care')}
                {num('ltcAnnualCost', 'Annual cost ($)', 1_000)}
                {num('ltcInsuranceBenefit', 'Insurance benefit ($/yr)', 1_000)}
                {num('ltcHsaOffset', 'HSA applied to care ($/yr)', 500)}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
