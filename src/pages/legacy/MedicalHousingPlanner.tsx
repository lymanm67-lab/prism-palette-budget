import { useSearchParams } from 'react-router-dom';
import { Building2 } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageOverview from '@/components/PageOverview';
import { useMhSeed } from '@/hooks/use-medical-housing';
import MarketDashboardTab from '@/components/medical-housing/MarketDashboardTab';
import MarketComparisonTab from '@/components/medical-housing/MarketComparisonTab';
import EmployerDirectoryTab from '@/components/medical-housing/EmployerDirectoryTab';
import PropertyScoringTab from '@/components/medical-housing/PropertyScoringTab';
import StartupCalculatorTab from '@/components/medical-housing/StartupCalculatorTab';
import IncomeProjectionsTab from '@/components/medical-housing/IncomeProjectionsTab';

const TABS = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'markets', label: 'Market Comparison' },
  { value: 'employers', label: 'Employers' },
  { value: 'properties', label: 'Property Scoring' },
  { value: 'startup', label: 'Startup Capital' },
  { value: 'income', label: 'Income Projections' },
];

export default function MedicalHousingPlanner() {
  const [params, setParams] = useSearchParams();
  useMhSeed();

  const requested = params.get('tab') ?? 'dashboard';
  const tab = TABS.some((t) => t.value === requested) ? requested : 'dashboard';
  const setTab = (v: string) => setParams({ tab: v }, { replace: true });


  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <PageOverview
        title="Medical Professional Housing Planner"
        description="Research Northeast Ohio markets, score candidate properties, and model startup capital and rental income for furnished medical housing."
        icon={Building2}
        iconColor="text-prism-teal"
        ttsScript="This planner helps you evaluate furnished housing for traveling medical professionals in Akron and Cleveland. Start on the dashboard for the recommended pilot market, compare neighborhoods, track hospital employers, score candidate properties, then model your startup capital and monthly income. Everything is editable and saved to your household. This is educational planning only, not investment advice."
        features={[
          'Akron and Cleveland market research with editable rent and price assumptions',
          'Hospital and staffing employer directory with referral tracking',
          'Property scorecards with a recommended decision for each candidate',
          'Startup capital planner covering acquisition, preparation, furnishing, and reserves',
          'Income projections with cash-on-cash return, DSCR, and break-even occupancy',
        ]}
      />

      <h1 className="sr-only">Medical Professional Housing Planner</h1>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex w-full flex-wrap h-auto justify-start gap-1">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs sm:text-sm">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="dashboard"><MarketDashboardTab /></TabsContent>
        <TabsContent value="markets"><MarketComparisonTab /></TabsContent>
        <TabsContent value="employers"><EmployerDirectoryTab /></TabsContent>
        <TabsContent value="properties"><PropertyScoringTab /></TabsContent>
        <TabsContent value="startup"><StartupCalculatorTab /></TabsContent>
        <TabsContent value="income"><IncomeProjectionsTab /></TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">
        Educational planning tool only. Not investment, tax, or legal advice. Verify local zoning,
        licensing, and rental regulations before purchasing.
      </p>
    </div>
  );
}
