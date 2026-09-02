import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { HelpCircle } from 'lucide-react';

export function HowToGuide() {
  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">How to use this stress test</CardTitle>
        </div>
        <CardDescription>
          Recommended values for your plan and what each field controls.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Accordion type="multiple" defaultValue={['run', 'success', 'ages', 'contrib', 'markets', 'spending', 'ltc', 'reading']}>
          <AccordionItem value="run">
            <AccordionTrigger className="text-sm">Running the test</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Choose <strong>Household</strong> to see the combined picture, <strong>Lyman</strong> for your individual assets and income, or <strong>Kateri</strong> for your wife’s view. The default <strong>10,000 simulations</strong> gives the most stable results; 1,000 is useful for quick what-ifs.
              </p>
              <p>
                Click <strong>Run stress test</strong> to generate lifetime scenarios. Nothing is saved to your master plan unless you press <strong>Save as scenario</strong> or <strong>Record annual review</strong>.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="success">
            <AccordionTrigger className="text-sm">What counts as success</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                These switches set the pass/fail rules for every simulation:
              </p>
              <ul className="ml-5 list-disc space-y-1">
                <li><strong>Portfolio never reaches $0</strong> — default on; flags any run that depletes investments.</li>
                <li><strong>Preserve original principal</strong> — requires ending balance to be at least the starting balance.</li>
                <li><strong>Fund long-term care needs</strong> — care costs must be payable without breaking the portfolio floor.</li>
                <li><strong>Test a legacy target</strong> — default $4,000,000 by age 85. The percentage shown is the chance the portfolio is at or above that target at that age.</li>
              </ul>
              <p>
                <strong>Minimum portfolio floor</strong> and <strong>Minimum annual income</strong> are optional safety rails. Set them to $0 to disable them. For your plan, try a floor of $50,000 and an income floor around $40,500–$60,000 based on essential spending plus guaranteed income.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="ages">
            <AccordionTrigger className="text-sm">Ages & invested assets</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm text-muted-foreground">
              <ul className="ml-5 list-disc space-y-1">
                <li><strong>Current age</strong> — your age today. Recommended: 58.</li>
                <li><strong>Retirement age</strong> — when you stop full-time earned income. Recommended: 85 for your legacy plan.</li>
                <li><strong>Life expectancy</strong> — how long the simulation runs. Recommended: 100 (Longevity Dividend baseline).</li>
                <li><strong>Retirement & brokerage balance</strong> — invested assets only, not emergency cash. Use retirement + self-directed accounts.</li>
                <li><strong>HSA balance</strong> — health savings account; treated as its own sleeve and drawn last for medical/LTC costs.</li>
              </ul>
              <p>Emergency cash is intentionally excluded — it is liquidity, not an invested asset.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="contrib">
            <AccordionTrigger className="text-sm">Contributions & accelerators</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm text-muted-foreground">
              <ul className="ml-5 list-disc space-y-1">
                <li><strong>Your contributions</strong> — annual employee retirement contributions (payroll deferrals).</li>
                <li><strong>Employer contributions</strong> — employer match/profit share, grows with the same raise rate but is not take-home income.</li>
                <li><strong>HSA contributions</strong> — your annual HSA deposits.</li>
                <li><strong>Employer HSA</strong> — employer HSA deposits.</li>
                <li><strong>Contribution growth</strong> — annual raise rate. Recommended: 3%.</li>
              </ul>
              <p>
                In <strong>Working longer & redirected cash</strong>, enable <strong>Legacy plan — never withdraw from retirement accounts</strong> to set withdrawals to age 999. Enter freed debt payments, tax refunds, and any continued work income after retirement. Use the projected earned-income line at your retirement age as a starting point for continued work income.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="markets">
            <AccordionTrigger className="text-sm">Markets & inflation</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm text-muted-foreground">
              <ul className="ml-5 list-disc space-y-1">
                <li><strong>Expected average return</strong> — arithmetic mean annual return. Recommended: 8% for a diversified equity-heavy portfolio.</li>
                <li><strong>Volatility / std deviation</strong> — how much returns swing around the mean. Recommended: 15%.</li>
                <li><strong>General inflation</strong> — overall cost-of-living increase. Recommended: 2.5–3%.</li>
                <li><strong>Housing inflation</strong> — housing/rent cost growth.</li>
                <li><strong>Healthcare inflation</strong> — medical cost growth, typically higher. Recommended: 5%.</li>
                <li><strong>Long-term care inflation</strong> — care cost growth. Recommended: 5%.</li>
                <li><strong>Travel inflation</strong> — travel cost growth.</li>
                <li><strong>Effective tax rate on withdrawals</strong> — estimated blended tax on portfolio withdrawals. Recommended: 10–15% for your plan.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="spending">
            <AccordionTrigger className="text-sm">Retirement spending & guaranteed income</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Enter annual retirement spending broken into essentials, discretionary, healthcare, and travel. These are inflated each year and reduced by guaranteed income before any portfolio withdrawal is calculated.
              </p>
              <ul className="ml-5 list-disc space-y-1">
                <li><strong>Social Security</strong> — your age-70 benefit. Recommended: $42,480/year ($3,540/month).</li>
                <li><strong>SS start age</strong> — when you file. Recommended: 70.</li>
                <li><strong>Pension</strong> — Kateri’s OPERS pension. Recommended: $78,708/year beginning at age 62.</li>
                <li><strong>Other guaranteed</strong> — any additional pension or annuity income.</li>
              </ul>
              <p>Social Security and pension COLAs keep these income streams growing with inflation.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="ltc">
            <AccordionTrigger className="text-sm">Long-term care event</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Choose a care setting (home, assisted living, nursing facility) or <strong>No LTC event</strong> to remove it. Set the age care begins, years of care, and annual cost.
              </p>
              <p>
                Enter your LTC insurance benefit and HSA applied to care to offset costs. For your Nationwide CareMatters Together policy, the model applies roughly $51,756/year of benefit at age 85. Adjust the HSA offset to reflect how much of your HSA balance you would direct toward care.
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="reading">
            <AccordionTrigger className="text-sm">Reading the results</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm text-muted-foreground">
              <ul className="ml-5 list-disc space-y-1">
                <li><strong>Success probability</strong> — percent of simulations that pass every active success rule.</li>
                <li><strong>Median ending</strong> — the midpoint ending portfolio value across all runs.</li>
                <li><strong>10th percentile</strong> — the worst 10% of outcomes; a useful stress-case estimate.</li>
                <li><strong>Legacy probability</strong> — chance of hitting your legacy target by the target age.</li>
                <li><strong>Depletion age</strong> — median age when the portfolio reaches zero (only if any runs fail).</li>
              </ul>
              <p>
                Use the <strong>Sequence-of-Returns</strong>, <strong>Crisis</strong>, <strong>Inflation</strong>, and <strong>Spending</strong> grids to see which risks matter most. The <strong>Top Risks</strong> table and <strong>What Improves the Plan Most?</strong> list prioritize your next move.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
