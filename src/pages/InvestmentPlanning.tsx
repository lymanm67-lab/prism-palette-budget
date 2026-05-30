import { useMemo, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Download, TrendingUp } from 'lucide-react';
import { useInvestmentPlan } from '@/hooks/use-investment-plan';
import { SnapshotDashboard } from '@/components/investment/SnapshotDashboard';
import { InvestmentWizard } from '@/components/investment/InvestmentWizard';
import { RaiseRedirectPlanner } from '@/components/investment/RaiseRedirectPlanner';
import { DebtToWealthTool } from '@/components/investment/DebtToWealthTool';
import { ScenarioComparison } from '@/components/investment/ScenarioComparison';
import { MilestoneTracker } from '@/components/investment/MilestoneTracker';
import { ProjectionCharts } from '@/components/investment/ProjectionCharts';
import { DisclaimerBlock } from '@/components/investment/DisclaimerBlock';
import { SpouseHouseholdPanel } from '@/components/investment/SpouseHouseholdPanel';
import { PensionPlanner } from '@/components/investment/PensionPlanner';
import { HSAPlanner } from '@/components/investment/HSAPlanner';
import { LegacyPlanner } from '@/components/investment/LegacyPlanner';
import { MoneyRulesManager } from '@/components/investment/MoneyRulesManager';
import { TaxPlanner } from '@/components/investment/TaxPlanner';
import { RiskPlanner } from '@/components/investment/RiskPlanner';
import { runProjection } from '@/lib/investment/projection';
import { exportInvestmentPlanPDF } from '@/lib/investment/exportInvestmentPlanPDF';
import { toast } from '@/hooks/use-toast';

export default function InvestmentPlanning() {
  const { data: plan, isLoading } = useInvestmentPlan();

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
          {plan && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" /> Export PDF
            </Button>
          )}
        </div>
      </header>

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
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue={plan ? 'snapshot' : 'wizard'} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="snapshot">Snapshot</TabsTrigger>
          <TabsTrigger value="wizard">Setup</TabsTrigger>
          <TabsTrigger value="raise">Raises</TabsTrigger>
          <TabsTrigger value="debt">Debt→Wealth</TabsTrigger>
          <TabsTrigger value="spouse">Spouse</TabsTrigger>
          <TabsTrigger value="pensions">Pensions</TabsTrigger>
          <TabsTrigger value="hsa">HSA</TabsTrigger>
          <TabsTrigger value="legacy">Legacy</TabsTrigger>
          <TabsTrigger value="rules">Money rules</TabsTrigger>
          <TabsTrigger value="tax">Tax</TabsTrigger>
          <TabsTrigger value="risk">Risk</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
        </TabsList>

        <TabsContent value="snapshot" className="mt-4 space-y-4">
          <SnapshotDashboard plan={plan ?? null} />
          {projection && <ProjectionCharts yearly={projection.yearly} target={plan!.target_amount} />}
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
        <TabsContent value="legacy" className="mt-4"><LegacyPlanner planId={plan?.id} /></TabsContent>
        <TabsContent value="rules" className="mt-4"><MoneyRulesManager planId={plan?.id} /></TabsContent>
        <TabsContent value="tax" className="mt-4"><TaxPlanner plan={plan ?? null} /></TabsContent>
        <TabsContent value="risk" className="mt-4"><RiskPlanner plan={plan ?? null} /></TabsContent>

        <TabsContent value="scenarios" className="mt-4">
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
