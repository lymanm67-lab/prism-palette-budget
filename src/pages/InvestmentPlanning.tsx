import { useMemo, useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectLabel, SelectItem } from '@/components/ui/select';
import { Sparkles, Download, TrendingUp, Wand2, Target, TrendingDown } from 'lucide-react';
import { RelatedToolsBar } from '@/components/planning/RelatedToolsBar';
import { useQueryClient } from '@tanstack/react-query';
import { useInvestmentPlan } from '@/hooks/use-investment-plan';
import { useHousehold } from '@/contexts/HouseholdContext';
import { loadMontgomerySample } from '@/lib/investment/montgomery-sample';
import { SnapshotDashboard } from '@/components/investment/SnapshotDashboard';
import { ReturnScenarioComparison } from '@/components/investment/ReturnScenarioComparison';
import { MixedReturnsScenario } from '@/components/investment/MixedReturnsScenario';
import { ProjectionDiagnostic } from '@/components/investment/ProjectionDiagnostic';
import { ContributionSourcesChart } from '@/components/investment/ContributionSourcesChart';
import { MoneyRulesToggles } from '@/components/investment/MoneyRulesToggles';
import { DollarModeCard } from '@/components/investment/DollarModeCard';
import { LegacyProtectionCard } from '@/components/investment/LegacyProtectionCard';
import { TrustFundingTracker } from '@/components/investment/TrustFundingTracker';
import { AssetTagManager } from '@/components/investment/AssetTagManager';
import { InvestmentWizard } from '@/components/investment/InvestmentWizard';
import { RaiseRedirectPlanner } from '@/components/investment/RaiseRedirectPlanner';
import { DebtToWealthTool } from '@/components/investment/DebtToWealthTool';
import { ScenarioComparison } from '@/components/investment/ScenarioComparison';
import { MilestoneTracker } from '@/components/investment/MilestoneTracker';
import { ProjectionCharts } from '@/components/investment/ProjectionCharts';
import { DisclaimerBlock } from '@/components/investment/DisclaimerBlock';
import { CollapsibleSection } from '@/components/investment/CollapsibleSection';
import { AllocationRulesSection } from '@/components/investment/AllocationRulesSection';
import { SpouseHouseholdPanel } from '@/components/investment/SpouseHouseholdPanel';
import { PensionPlanner } from '@/components/investment/PensionPlanner';
import { HSAPlanner } from '@/components/investment/HSAPlanner';
import { LegacyPlanner } from '@/components/investment/LegacyPlanner';
import { MoneyRulesManager } from '@/components/investment/MoneyRulesManager';
import { TaxPlanner } from '@/components/investment/TaxPlanner';
import { RiskPlanner } from '@/components/investment/RiskPlanner';
import { HealthcarePlanner } from '@/components/investment/HealthcarePlanner';
import { IncomeEngineering } from '@/components/investment/IncomeEngineering';
import { RealAssetsPlanner } from '@/components/investment/RealAssetsPlanner';
import { BehaviorAccountability } from '@/components/investment/BehaviorAccountability';
import { EstateExecution } from '@/components/investment/EstateExecution';
import { CharitablePlanner } from '@/components/investment/CharitablePlanner';
import { CollegePlanner } from '@/components/investment/CollegePlanner';
import { AutomationLog } from '@/components/investment/AutomationLog';
import { runProjection } from '@/lib/investment/projection';
import { exportInvestmentPlanPDF } from '@/lib/investment/exportInvestmentPlanPDF';
import { toast } from '@/hooks/use-toast';

export default function InvestmentPlanning() {
  const { data: plan, isLoading } = useInvestmentPlan();
  const { household } = useHousehold();
  const qc = useQueryClient();
  const [loadingSample, setLoadingSample] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('snapshot');

  // Sync default tab once the plan finishes loading (avoids flash of wizard for returning users)
  useEffect(() => {
    if (isLoading) return;
    setActiveTab((current) => {
      if (current !== 'snapshot' && current !== 'wizard') return current;
      return plan ? 'snapshot' : 'wizard';
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, plan?.id]);

  const TAB_GROUPS = [
    { label: 'Build Your Plan', items: [
      { value: 'raise', label: 'Raises' },
      { value: 'debt', label: 'Debt → Wealth' },
      { value: 'income', label: 'Retirement Income' },
      { value: 'rules', label: 'Money Rules' },
    ]},
    { label: 'Tax & Risk', items: [
      { value: 'tax', label: 'Tax' },
      { value: 'risk', label: 'Risk' },
      { value: 'healthcare', label: 'Healthcare' },
    ]},
    { label: 'Household', items: [
      { value: 'spouse', label: 'Spouse' },
      { value: 'pensions', label: 'Pensions' },
      { value: 'hsa', label: 'HSA' },
    ]},
    { label: 'Assets & Goals', items: [
      { value: 'assets', label: 'Asset Tags' },
      { value: 'realassets', label: 'Real Assets' },
      { value: 'college', label: 'College / 529' },
      { value: 'charitable', label: 'Charitable Giving' },
    ]},
    { label: 'Legacy & Estate', items: [
      { value: 'legacy', label: 'Legacy' },
      { value: 'estate', label: 'Estate Execution' },
      { value: 'trust', label: 'Trust Funding' },
    ]},
    { label: 'Coaching', items: [
      { value: 'behavior', label: 'Behavior Coach' },
      { value: 'automation', label: 'Automation Log' },
    ]},
  ];
  const MORE_TAB_VALUES = TAB_GROUPS.flatMap(g => g.items.map(i => i.value));
  const TAB_LABEL_LOOKUP: Record<string, string> = Object.fromEntries(
    TAB_GROUPS.flatMap(g => g.items.map(i => [i.value, `${g.label} · ${i.label}`]))
  );

  const handleLoadSample = async () => {
    if (!household) return;
    if (plan && !window.confirm('This replaces your current active plan, spouse, pension, legacy, and money rules with the Montgomery sample. Continue?')) return;
    setLoadingSample(true);
    try {
      await loadMontgomerySample(household.id);
      await qc.invalidateQueries();
      toast({ title: 'Montgomery sample loaded', description: 'Snapshot, spouse, pension, legacy, and money rules are populated.' });
    } catch (e: any) {
      toast({ title: 'Load failed', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingSample(false);
    }
  };


  const projection = useMemo(() => {
    if (!plan || !plan.current_age || !plan.retirement_age) return null;
    return runProjection({
      currentAge: plan.current_age,
      retirementAge: plan.retirement_age,
      currentBalance: plan.current_balance,
      targetAmount: plan.target_amount,
      monthlyEmployeeContribution: plan.monthly_employee_contribution,
      monthlyEmployerContribution: plan.monthly_employer_contribution,
      expectedReturnPct: plan.expected_return_pct,
      annualRaisePct: plan.annual_raise_pct,
      raiseRedirectPct: plan.raise_redirect_pct,
      debtPaymentAmount: plan.debt_payment_amount ?? undefined,
      debtPayoffDate: plan.debt_payoff_date,
      additionalMonthlyAmount: plan.additional_monthly_amount ?? undefined,
      additionalStartDate: plan.additional_start_date,
      ssMonthlyEstimate: plan.ss_monthly_estimate ?? undefined,
      ssClaimingAge: plan.ss_claiming_age ?? undefined,
      ssInvestWhileWorking: plan.ss_invest_while_working,
      ssInvestPct: plan.ss_invest_pct,
      useFutureDollars: plan.use_future_dollars,
      inflationPct: plan.inflation_pct,
    });
  }, [plan]);

  const handleExport = () => {
    if (!plan) return;
    try {
      exportInvestmentPlanPDF(plan);
      toast({ title: 'PDF exported', description: 'Your investment plan PDF has been downloaded.' });
    } catch (e: any) {
      toast({ title: 'Export failed', description: e.message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    document.title = 'Investment Planning | Prism Money';
  }, []);

  return (
    <div className="container max-w-6xl mx-auto p-4 md:p-6 space-y-6">




      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Investment Planning
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            From budgeting to wealth-building — see if you're on track, model raises, and convert debt payments into investments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleLoadSample} disabled={loadingSample || !household}>
            <Wand2 className="h-4 w-4 mr-1" /> {loadingSample ? 'Loading…' : 'Load Montgomery sample'}
          </Button>
          {plan && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" /> Export PDF
            </Button>
          )}
        </div>
      </header>

      <RelatedToolsBar
        tools={[
          { to: '/goals', icon: Target, label: 'Goals', description: 'Short-term savings & milestones' },
          { to: '/debt-payoff', icon: TrendingDown, label: 'Debt Payoff', description: 'Build your payoff strategy first, then redirect payments here' },
          { to: '/investments', icon: TrendingUp, label: 'Holdings', description: 'See current investment account balances' },
        ]}
      />


      {isLoading ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Loading your plan…</CardContent></Card>
      ) : !plan ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-6 space-y-4 text-center">
            <Sparkles className="h-8 w-8 mx-auto text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Build your investment plan</h2>
              <p className="text-sm text-muted-foreground mt-1">Run the setup wizard to get your projection and scenario comparison.</p>
            </div>
            <Button onClick={() => setActiveTab('wizard')} size="sm">
              Start setup wizard
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center gap-2 flex-wrap rounded-xl border border-border bg-card/40 backdrop-blur p-2">
          <TabsList className="bg-transparent gap-1 p-0 h-auto">
            <TabsTrigger value="wizard" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
              Setup
            </TabsTrigger>
            <TabsTrigger value="snapshot" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Snapshot
            </TabsTrigger>
            <TabsTrigger value="scenarios" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
              Scenarios
            </TabsTrigger>
            <TabsTrigger value="milestones" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
              Milestones
            </TabsTrigger>
          </TabsList>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden md:inline">More tools</span>
            <Select value={MORE_TAB_VALUES.includes(activeTab) ? activeTab : ''} onValueChange={setActiveTab}>
              <SelectTrigger className="w-[220px] h-9">
                <SelectValue placeholder="Explore planning tools…" />
              </SelectTrigger>
              <SelectContent className="max-h-[420px]">
                {TAB_GROUPS.map((group) => (
                  <SelectGroup key={group.label}>
                    <SelectLabel className="text-xs uppercase tracking-wider text-muted-foreground">{group.label}</SelectLabel>
                    {group.items.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {MORE_TAB_VALUES.includes(activeTab) && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary">
              {TAB_LABEL_LOOKUP[activeTab]}
            </span>
            <button onClick={() => setActiveTab('snapshot')} className="hover:text-foreground underline-offset-2 hover:underline">
              ← Back to Snapshot
            </button>
          </div>
        )}


        <TabsContent value="snapshot" className="mt-4 space-y-3">
          <SnapshotDashboard plan={plan ?? null} />
          {projection && (
            <CollapsibleSection title="Projection charts" defaultOpen>
              <ProjectionCharts yearly={projection.yearly} target={plan!.target_amount} />
            </CollapsibleSection>
          )}
          {projection && (
            <CollapsibleSection title="Contribution sources">
              <ContributionSourcesChart yearly={projection.yearly} />
            </CollapsibleSection>
          )}
          <CollapsibleSection title="Today's vs future dollars">
            <DollarModeCard plan={plan ?? null} />
          </CollapsibleSection>
          <CollapsibleSection title="Retirement allocation rules">
            <AllocationRulesSection />
          </CollapsibleSection>
          <CollapsibleSection title="Projection diagnostic">
            <ProjectionDiagnostic plan={plan ?? null} />
          </CollapsibleSection>
        </TabsContent>

        <TabsContent value="wizard" className="mt-4">
          <InvestmentWizard plan={plan ?? null} />
        </TabsContent>

        <TabsContent value="raise" className="mt-4">
          <RaiseRedirectPlanner
            defaultIncome={plan?.current_monthly_income ?? 5000}
            yearsToRetirement={plan && plan.current_age && plan.retirement_age ? plan.retirement_age - plan.current_age : 25}
            returnPct={plan?.expected_return_pct ?? 7}
          />
        </TabsContent>

        <TabsContent value="debt" className="mt-4">
          <DebtToWealthTool
            defaultPayment={plan?.debt_payment_amount ?? 500}
            yearsAfter={plan && plan.current_age && plan.retirement_age ? plan.retirement_age - plan.current_age : 15}
            returnPct={plan?.expected_return_pct ?? 7}
          />
        </TabsContent>

        <TabsContent value="spouse" className="mt-4"><SpouseHouseholdPanel planId={plan?.id} /></TabsContent>
        <TabsContent value="pensions" className="mt-4"><PensionPlanner planId={plan?.id} /></TabsContent>
        <TabsContent value="hsa" className="mt-4"><HSAPlanner plan={plan ?? null} /></TabsContent>
        <TabsContent value="legacy" className="mt-4 space-y-3">
          <LegacyProtectionCard plan={plan ?? null} />
          <LegacyPlanner planId={plan?.id} />
        </TabsContent>
        <TabsContent value="trust" className="mt-4"><TrustFundingTracker plan={plan ?? null} /></TabsContent>
        <TabsContent value="assets" className="mt-4"><AssetTagManager plan={plan ?? null} /></TabsContent>
        <TabsContent value="rules" className="mt-4"><MoneyRulesManager planId={plan?.id} /></TabsContent>
        <TabsContent value="tax" className="mt-4"><TaxPlanner plan={plan ?? null} /></TabsContent>
        <TabsContent value="risk" className="mt-4"><RiskPlanner plan={plan ?? null} /></TabsContent>
        <TabsContent value="healthcare" className="mt-4"><HealthcarePlanner plan={plan ?? null} /></TabsContent>
        <TabsContent value="income" className="mt-4"><IncomeEngineering plan={plan ?? null} /></TabsContent>
        <TabsContent value="realassets" className="mt-4"><RealAssetsPlanner /></TabsContent>
        <TabsContent value="behavior" className="mt-4"><BehaviorAccountability /></TabsContent>
        <TabsContent value="estate" className="mt-4"><EstateExecution planId={plan?.id} /></TabsContent>
        <TabsContent value="charitable" className="mt-4"><CharitablePlanner /></TabsContent>
        <TabsContent value="college" className="mt-4"><CollegePlanner /></TabsContent>
        <TabsContent value="automation" className="mt-4"><AutomationLog planId={plan?.id} /></TabsContent>

        <TabsContent value="scenarios" className="mt-4 space-y-3">
          <ReturnScenarioComparison
            plan={plan ?? null}
            onCreateRules={() => setActiveTab('rules')}
            onReviewLegacy={() => setActiveTab('legacy')}
          />
          <MixedReturnsScenario plan={plan ?? null} />
          <ScenarioComparison plan={plan ?? null} />
        </TabsContent>

        <TabsContent value="milestones" className="mt-4">
          <MilestoneTracker />
        </TabsContent>
      </Tabs>

      <DisclaimerBlock />
    </div>
  );
}
