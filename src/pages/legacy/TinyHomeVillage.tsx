import { useSearchParams } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageOverview from '@/components/PageOverview';
import { useThvSeed } from '@/hooks/use-tiny-home-village';
import VillageDashboardTab from '@/components/tiny-home-village/VillageDashboardTab';
import VillagePhasesTab from '@/components/tiny-home-village/VillagePhasesTab';
import VillageSitePlannerTab from '@/components/tiny-home-village/VillageSitePlannerTab';
import VillageBudgetTab from '@/components/tiny-home-village/VillageBudgetTab';
import VillageOperatingTab from '@/components/tiny-home-village/VillageOperatingTab';
import VillageResidentModelTab from '@/components/tiny-home-village/VillageResidentModelTab';
import VillageProgramsTab from '@/components/tiny-home-village/VillageProgramsTab';
import VillagePartnersTab from '@/components/tiny-home-village/VillagePartnersTab';
import VillageFundingTab from '@/components/tiny-home-village/VillageFundingTab';
import VillageRisksTab from '@/components/tiny-home-village/VillageRisksTab';
import VillageImpactTab from '@/components/tiny-home-village/VillageImpactTab';
import VillageDocumentsTab from '@/components/tiny-home-village/VillageDocumentsTab';

const TABS = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'phases', label: 'Phases & Milestones' },
  { value: 'sites', label: 'Site Planning' },
  { value: 'budget', label: 'Development Budget' },
  { value: 'operating', label: 'Operating Budget' },
  { value: 'model', label: 'Residency Model' },
  { value: 'programs', label: 'Resident Programs' },
  { value: 'partners', label: 'Partners' },
  { value: 'funding', label: 'Funding' },
  { value: 'risks', label: 'Risks' },
  { value: 'impact', label: 'Impact' },
  { value: 'documents', label: 'Documents' },
];

export default function TinyHomeVillage() {
  const [params, setParams] = useSearchParams();
  useThvSeed();

  const requested = params.get('tab') ?? 'dashboard';
  const tab = TABS.some((t) => t.value === requested) ? requested : 'dashboard';

  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      <PageOverview
        title="Tiny Home Village Legacy Goal"
        description="Plan, fund, build, and operate a supportive tiny home village for young adults aging out of foster care — housing plus mentoring, employment preparation, education, financial literacy, and life skills."
        icon={Home}
        iconColor="text-prism-rose"
        ttsScript="This is Goal 2 of the Montgomery family real estate legacy: a tiny home village for young adults aging out of foster care. Start on the dashboard for phase, cost, and funding status. Work the seven development phases in order, evaluate candidate land in site planning, build the development and operating budgets, define the residency model and resident support programs, then track partners, funding, risks, impact, and documents. This goal stands on its own. Medical housing profit may contribute to it, but the village has its own partners, funding strategy, and measures of success. Educational planning only, not legal, tax, or investment advice."
        features={[
          'Seven development phases from vision and feasibility through staffing and launch',
          'Land evaluation scorecards with automatic site recommendations',
          'Full development budget with low, expected, and high cost scenarios',
          'Annual operating budget with cost per home, cost per resident, and required reserve',
          'Resident programs, community partners, funding pipeline, risk register, and impact reporting',
        ]}
      />

      <h1 className="sr-only">Montgomery Tiny Home Village for Foster Care Alumni</h1>

      <Tabs
        value={tab}
        onValueChange={(v) => setParams({ tab: v }, { replace: true })}
        className="space-y-4"
      >
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs sm:text-sm">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="dashboard"><VillageDashboardTab /></TabsContent>
        <TabsContent value="phases"><VillagePhasesTab /></TabsContent>
        <TabsContent value="sites"><VillageSitePlannerTab /></TabsContent>
        <TabsContent value="budget"><VillageBudgetTab /></TabsContent>
        <TabsContent value="operating"><VillageOperatingTab /></TabsContent>
        <TabsContent value="model"><VillageResidentModelTab /></TabsContent>
        <TabsContent value="programs"><VillageProgramsTab /></TabsContent>
        <TabsContent value="partners"><VillagePartnersTab /></TabsContent>
        <TabsContent value="funding"><VillageFundingTab /></TabsContent>
        <TabsContent value="risks"><VillageRisksTab /></TabsContent>
        <TabsContent value="impact"><VillageImpactTab /></TabsContent>
        <TabsContent value="documents"><VillageDocumentsTab /></TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">
        Educational planning tool only. Not investment, tax, or legal advice. Verify local zoning, tiny home
        regulations, licensing, and child-welfare requirements with qualified professionals before committing funds.
      </p>
    </div>
  );
}
