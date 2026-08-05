import { useSearchParams } from 'react-router-dom';
import { Landmark, FileDown, ArrowRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
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
import GrantsTab from '@/components/foundation/GrantsTab';
import RiskBenchmarksTab from '@/components/foundation/RiskBenchmarksTab';
import LaunchPlanTab from '@/components/foundation/LaunchPlanTab';
import FormationPaperworkTab from '@/components/foundation/FormationPaperworkTab';
import ReadinessIndexTab from '@/components/foundation/ReadinessIndexTab';
import SustainabilityTab from '@/components/foundation/SustainabilityTab';
import CharitableLegacyTab from '@/components/foundation/CharitableLegacyTab';
import RetirementGivingTab from '@/components/foundation/RetirementGivingTab';

const MODULES = [
  {
    value: 'm0',
    step: 'Start',
    title: 'Overview',
    blurb: 'Where the foundation stands right now and the single next action across all four steps.',
    tabs: [
      { value: 'plan', label: 'Planning & Operating Flow' },
      { value: 'dashboard', label: 'Executive Dashboard' },
      { value: 'fundingstrategy', label: 'Charitable Legacy Funding Strategy' },
    ],
  },
  {
    value: 'm1',
    step: 'Step 1',
    title: 'Plan the Foundation',
    blurb: 'Decide the why, the five pillars, the five-year build sequence, and who funds and partners with the work.',
    tabs: [
      { value: 'readiness', label: 'Readiness Index' },
      { value: 'sustainability', label: 'Sustainability & Costs' },
      { value: 'mission', label: 'Mission & Values' },
      { value: 'pillars', label: 'Five Pillars' },
      { value: 'roadmap', label: '5-Year Roadmap' },
      { value: 'relationships', label: 'Relationship Map' },
    ],
  },
  {
    value: 'm2',
    step: 'Step 2',
    title: 'Set Up the Foundation',
    blurb: 'Paperwork: Ohio formation, EIN, bylaws and policies, IRS Form 1023, then the board and compliance calendar.',
    tabs: [
      { value: 'paperwork', label: 'Formation & IRS Forms' },
      { value: 'governance', label: 'Governance' },
      { value: 'compliance', label: 'Compliance Calendar' },
      { value: 'risk', label: 'Risk & Benchmarks' },
    ],
  },
  {
    value: 'm3',
    step: 'Step 3',
    title: 'Operations',
    blurb: 'Run the money: gifts in, endowment invested, grants and scholarships out, impact measured.',
    tabs: [
      { value: 'funding', label: 'Funding & Donors' },
      { value: 'investments', label: 'Endowment' },
      { value: 'grants', label: 'Grants & Scholarships' },
      { value: 'impact', label: 'Impact & Legacy Score' },
      { value: 'advisor', label: 'AI Advisor' },
    ],
  },
  {
    value: 'm4',
    step: 'Step 4',
    title: 'Legacy',
    blurb: 'Make it outlast you: successor trustees, the searchable record, and what passes to each generation.',
    tabs: [
      { value: 'giving', label: 'Retirement & Estate Giving' },
      { value: 'succession', label: 'Succession' },
      { value: 'documents', label: 'Document Vault' },
      { value: 'legacy', label: 'Legacy Map' },
    ],
  },
];

const ALL_TABS = MODULES.flatMap((m) => m.tabs.map((t) => ({ ...t, module: m.value })));




export default function FamilyFoundation() {
  const [params, setParams] = useSearchParams();
  useFdnSeed();
  useFdnOpsSeed();


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

  const requested = params.get('tab') ?? 'plan';
  const active = ALL_TABS.find((t) => t.value === requested) ?? ALL_TABS[0];
  const goTo = (v: string) => setParams({ tab: v }, { replace: true });

  const CONTENT: Record<string, JSX.Element> = {
    plan: <LaunchPlanTab onNavigate={goTo} />,
    dashboard: <FoundationDashboardTab />,
    fundingstrategy: <CharitableLegacyTab />,
    giving: <RetirementGivingTab />,
    readiness: <ReadinessIndexTab onNavigate={goTo} />,
    sustainability: <SustainabilityTab />,
    mission: <MissionValuesTab />,
    pillars: <PillarsTab />,
    roadmap: <RoadmapTab />,
    relationships: <RelationshipMapTab />,
    paperwork: <FormationPaperworkTab onNavigate={goTo} />,
    governance: <GovernanceTab />,
    compliance: <ComplianceTab />,
    risk: <RiskBenchmarksTab />,
    funding: <FundingTab />,
    investments: <InvestmentsTab />,
    grants: <GrantsTab />,
    impact: <ImpactTab />,
    advisor: <AiAdvisorTab />,
    succession: <SuccessionTab />,
    documents: <DocumentVaultTab />,
    legacy: <LegacyMapTab />,
  };

  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      <PageOverview
        title="Dr. Lyman A. Montgomery Family Foundation"
        description="Four sequential modules: plan the foundation, set it up with the state and IRS paperwork, operate the grantmaking, then hand it forward as legacy."
        icon={Landmark}
        iconColor="text-prism-amber"
        ttsScript="This is the Dr. Lyman A. Montgomery Family Foundation module, organized as four steps. Step one, Plan the Foundation: mission and values, the five impact pillars, the five-year roadmap, and the relationship map of funders and partners. Step two, Set Up the Foundation: the Ohio articles of incorporation, the employer identification number, bylaws and conflict-of-interest policies, and IRS Form 1023, each with a direct link to the official filing page, plus your board roster and compliance calendar. Step three, Operations: gifts and pledges in, the endowment invested, grants and scholarships out, and impact measured, with an AI advisor. Step four, Legacy: successor trustees, the searchable document vault, and the generational legacy map. Educational planning only, not legal, tax, or investment advice."
        features={[
          'Step 1 — Plan: mission, five pillars, five-year roadmap, relationship map',
          'Step 2 — Set Up: Ohio formation, EIN, bylaws, Form 1023 with official IRS links',
          'Step 3 — Operations: funding, endowment, grant lifecycle, impact scoring',
          'Step 4 — Legacy: succession, searchable vault, generational legacy map',
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
        value={active.module}
        onValueChange={(m) => {
          const mod = MODULES.find((x) => x.value === m);
          if (mod) goTo(mod.tabs[0].value);
        }}
        className="space-y-4"
      >
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 lg:grid-cols-5">
          {MODULES.map((m) => (
            <TabsTrigger
              key={m.value}
              value={m.value}
              className="flex h-auto flex-col items-start gap-0.5 py-2 text-left"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{m.step}</span>
              <span className="text-xs font-medium sm:text-sm">{m.title}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {MODULES.map((m) => (
          <TabsContent key={m.value} value={m.value} className="space-y-4">
            <Card className="glass-card">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-prism-amber">{m.step}</p>
                  <p className="text-base font-semibold">{m.title}</p>
                  <p className="mt-0.5 max-w-3xl text-xs text-muted-foreground">{m.blurb}</p>
                </div>
                {m.value !== 'm4' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => {
                      const idx = MODULES.findIndex((x) => x.value === m.value);
                      goTo(MODULES[idx + 1].tabs[0].value);
                    }}
                  >
                    Next: {MODULES[MODULES.findIndex((x) => x.value === m.value) + 1].title}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>

            <Tabs value={active.value} onValueChange={goTo} className="space-y-4">
              <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
                {m.tabs.map((t) => (
                  <TabsTrigger key={t.value} value={t.value} className="text-xs sm:text-sm">
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {m.tabs.map((t) => (
                <TabsContent key={t.value} value={t.value}>
                  {CONTENT[t.value]}
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

