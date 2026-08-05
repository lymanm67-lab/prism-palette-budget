import { useSearchParams } from 'react-router-dom';
import { Landmark, FileDown } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import PageOverview from '@/components/PageOverview';
import {
  useFdnSeed,
  useFdnSettings,
  useFdnPillars,
  useFdnInitiatives,
  useFdnRoadmap,
  useFdnRelationships,
  useFdnLegacyNodes,
} from '@/hooks/use-foundation';
import { exportFoundationBinder } from '@/lib/legacy/foundationExport';
import { useFdnOpsSeed } from '@/hooks/use-foundation-ops';
import FoundationDashboardTab from '@/components/foundation/FoundationDashboardTab';
import MissionValuesTab from '@/components/foundation/MissionValuesTab';
import PillarsTab from '@/components/foundation/PillarsTab';
import RoadmapTab from '@/components/foundation/RoadmapTab';
import RelationshipMapTab from '@/components/foundation/RelationshipMapTab';
import LegacyMapTab from '@/components/foundation/LegacyMapTab';
import FundingTab from '@/components/foundation/FundingTab';
import InvestmentsTab from '@/components/foundation/InvestmentsTab';
import GovernanceTab from '@/components/foundation/GovernanceTab';
import ComplianceTab from '@/components/foundation/ComplianceTab';
import ImpactTab from '@/components/foundation/ImpactTab';
import SuccessionTab from '@/components/foundation/SuccessionTab';
import DocumentVaultTab from '@/components/foundation/DocumentVaultTab';
import AiAdvisorTab from '@/components/foundation/AiAdvisorTab';


const TABS = [
  { value: 'dashboard', label: 'Executive Dashboard' },
  { value: 'impact', label: 'Impact & Legacy Score' },
  { value: 'mission', label: 'Mission & Values' },
  { value: 'pillars', label: 'Five Pillars' },
  { value: 'roadmap', label: '5-Year Roadmap' },
  { value: 'funding', label: 'Funding & Donors' },
  { value: 'investments', label: 'Endowment' },
  { value: 'governance', label: 'Governance' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'succession', label: 'Succession' },
  { value: 'relationships', label: 'Relationship Map' },
  { value: 'documents', label: 'Document Vault' },
  { value: 'advisor', label: 'AI Advisor' },
  { value: 'legacy', label: 'Legacy Map' },
];


export default function FamilyFoundation() {
  const [params, setParams] = useSearchParams();
  useFdnSeed();

  const settings = useFdnSettings();
  const pillars = useFdnPillars();
  const initiatives = useFdnInitiatives();
  const roadmap = useFdnRoadmap();
  const relationships = useFdnRelationships();
  const legacyNodes = useFdnLegacyNodes();

  const exporting =
    settings.isLoading ||
    pillars.isLoading ||
    initiatives.isLoading ||
    roadmap.isLoading ||
    relationships.isLoading ||
    legacyNodes.isLoading;

  const handleExport = () => {
    const ok = exportFoundationBinder({
      settings: settings.data ?? null,
      pillars: pillars.data ?? [],
      initiatives: initiatives.data ?? [],
      roadmap: roadmap.data ?? [],
      relationships: relationships.data ?? [],
      legacyNodes: legacyNodes.data ?? [],
    });
    if (!ok) toast.error('Allow pop-ups for this site to export the binder.');
    else toast.success('Binder ready — choose "Save as PDF" in the print dialog.');
  };

  const requested = params.get('tab') ?? 'dashboard';
  const tab = TABS.some((t) => t.value === requested) ? requested : 'dashboard';


  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      <PageOverview
        title="Dr. Lyman A. Montgomery Family Foundation"
        description="The philanthropic arm of the family legacy: mission and values, five impact pillars, a five-year build roadmap, the relationship network that funds and partners with the work, and the generational legacy map."
        icon={Landmark}
        iconColor="text-prism-amber"
        ttsScript="This is the Dr. Lyman A. Montgomery Family Foundation module. Start on the executive dashboard for legacy readiness, endowment progress, dollars committed and deployed, and people served. Set your mission, vision, values, and endowment targets under Mission and Values. Work each of the five impact pillars — housing, financial literacy, education, health, and entrepreneurship — adding initiatives with budgets and beneficiary counts. The five-year roadmap turns the vision into dated phases with checkable milestones. The relationship map sorts funders, partners, and advisors into champions, priority targets, supporters, and prospects so you know who to contact next. The legacy map records what passes to each generation. Educational planning only, not legal, tax, or investment advice."
        features={[
          'Legacy readiness score blending endowment, reach, roadmap execution, and pillar activity',
          'Five impact pillars with budgets, KPIs, and initiative-level tracking',
          'Interactive five-year roadmap with milestone checklists and funding targets',
          'Relationship map that prioritizes outreach by influence versus relationship strength',
          'Generational legacy map of values, assets, stories, and institutions',
        ]}
      />

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="gap-1.5">
          <FileDown className="h-4 w-4" />
          Export PDF Binder
        </Button>
      </div>

      <h1 className="sr-only">Dr. Lyman A. Montgomery Family Foundation Planning Module</h1>


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

        <TabsContent value="dashboard">
          <FoundationDashboardTab />
        </TabsContent>
        <TabsContent value="mission">
          <MissionValuesTab />
        </TabsContent>
        <TabsContent value="pillars">
          <PillarsTab />
        </TabsContent>
        <TabsContent value="roadmap">
          <RoadmapTab />
        </TabsContent>
        <TabsContent value="relationships">
          <RelationshipMapTab />
        </TabsContent>
        <TabsContent value="legacy">
          <LegacyMapTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
