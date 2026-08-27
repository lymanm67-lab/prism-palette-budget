import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Printer, Save } from 'lucide-react';
import { PageExplainer } from '@/components/PageExplainer';
import { LtcOverview } from '@/components/ltc/LtcOverview';
import { CurrentPlan } from '@/components/ltc/CurrentPlan';
import { QuoteUpload } from '@/components/ltc/QuoteUpload';
import { NationwidePolicyTab } from '@/components/ltc/nationwide/NationwidePolicyTab';
import { SharedPoolPanel } from '@/components/ltc/nationwide/SharedPoolPanel';
import { NwInflationProjection } from '@/components/ltc/nationwide/NwInflationProjection';
import { PolicyValuePaths } from '@/components/ltc/nationwide/PolicyValuePaths';
import { StressTestTab } from '@/components/ltc/nationwide/StressTestTab';
import { CareCostGap } from '@/components/ltc/CareCostGap';
import { AssetProtection } from '@/components/ltc/AssetProtection';
import { ScenarioSimulator } from '@/components/ltc/ScenarioSimulator';
import type { PoolScenario } from '@/lib/ltc/nationwide';
import { DocumentVault } from '@/components/ltc/DocumentVault';
import { CareCostByLocation } from '@/components/ltc/CareCostByLocation';
import { AgencyComparison } from '@/components/ltc/AgencyComparison';
import { HoursProtected } from '@/components/ltc/HoursProtected';
import { RenewalTracker } from '@/components/ltc/RenewalTracker';
import { GapStrategy } from '@/components/ltc/GapStrategy';
import { useLtcPlan, useSaveLtcPlan } from '@/hooks/use-ltc-plan';
import { defaultState, type LtcState } from '@/lib/ltc/model';
import { ensureLocationState, type LtcLocationState } from '@/lib/ltc/location';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'current', label: 'Current Plan' },
  { key: 'policy', label: 'Our Policy' },
  { key: 'pool', label: 'Shared Pool' },
  { key: 'locations', label: 'Care Cost by Location' },
  { key: 'agencies', label: 'Local Agencies' },
  { key: 'hours', label: 'Hours Protected' },
  { key: 'inflation', label: 'Inflation' },
  { key: 'gap', label: 'Care Cost Gap' },
  { key: 'strategy', label: 'Gap Strategy' },
  { key: 'assets', label: 'Asset Protection' },
  { key: 'scenarios', label: 'Scenarios' },
  { key: 'value', label: 'Policy Value' },
  { key: 'stress', label: 'Stress Test' },
  { key: 'tax', label: 'Tax Advantage' },
  { key: 'renewals', label: 'Renewals & Rate Increases' },
  { key: 'vault', label: 'Documents' },
];



export default function LongTermCare() {
  const { data: record } = useLtcPlan();
  const save = useSaveLtcPlan();
  const [state, setState] = useState<LtcState>(defaultState());
  const [hydrated, setHydrated] = useState(false);
  const [poolScenario, setPoolScenario] = useState<PoolScenario>('lymanMore');
  const [poolAge, setPoolAge] = useState(85);
  const [includeSurrender, setIncludeSurrender] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const [tab, setTab] = useState(
    TABS.some((t) => t.key === requestedTab) ? (requestedTab as string) : 'overview',
  );

  // Deep links such as /ltc?tab=policy land straight on the Nationwide policy tab.
  useEffect(() => {
    if (requestedTab && TABS.some((t) => t.key === requestedTab) && requestedTab !== tab) setTab(requestedTab);
  }, [requestedTab]);

  const changeTab = (next: string) => {
    setTab(next);
    const params = new URLSearchParams(searchParams);
    params.set('tab', next);
    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    if (record && !hydrated) { setState(record.state); setHydrated(true); }
  }, [record, hydrated]);

  const patch = (p: Partial<LtcState>) =>
    setState((s) => ({ ...s, ...p, asOf: new Date().toISOString().slice(0, 10) }));

  // Location block hydrates from saved plans that predate it.
  const locationState = ensureLocationState(state.location);
  const patchLoc = (p: Partial<LtcLocationState>) =>
    patch({ location: { ...locationState, ...p } });


  const onSave = async () => {
    try {
      await save.mutateAsync(state);
      toast.success('Long-term care plan saved');
    } catch (e: any) {
      toast.error(e.message || 'Could not save plan');
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Long-Term Care Decision Dashboard</h1>
          <p className="text-muted-foreground max-w-3xl">
            Our active Nationwide CareMatters Together policy, projected against real {state.household.city} care costs,
            with the shared benefit pool, cash indemnity claims, and the retirement capital it protects.
          </p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mt-1">As of: {state.asOf}</p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button size="sm" onClick={onSave} disabled={save.isPending}>
            <Save className="h-3.5 w-3.5 mr-1" /> Save plan
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5 mr-1" /> Print
          </Button>
        </div>
      </header>

      <PageExplainer
        title="How this dashboard decides"
        sections={[
          { heading: 'Transfer the downside', body: 'Long-term care is the single largest threat to a retirement portfolio. Insurance is judged by how much retirement capital it protects per premium dollar, not by the biggest benefit.' },
          { heading: 'Real local costs', body: 'Projections use Akron-area care costs grown at your assumed inflation rate, so benefit growth is always compared to what care will actually cost.' },
          { heading: 'One policy of record', body: 'Nationwide CareMatters Together is the active LTC strategy: $291.96 combined monthly premium, $2,000 initial monthly benefit per insured, 3% compound inflation for life, and cash indemnity claims.' },
          { heading: 'Lapse risk is real', body: 'A policy that lapses protects nothing. If the combined premium exceeds 5% of household income, the dashboard flags it and points you to a lower sweet-spot rung.' },
        ]}
      />

      <Tabs value={tab} onValueChange={changeTab}>
        <TabsList className="flex w-full flex-wrap h-auto justify-start print:hidden">
          {TABS.map((t) => <TabsTrigger key={t.key} value={t.key} className="text-xs">{t.label}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="overview" className="mt-4"><LtcOverview state={state} onGoTo={changeTab} /></TabsContent>
        <TabsContent value="current" className="mt-4"><CurrentPlan state={state} patch={patch} /></TabsContent>
        <TabsContent value="policy" className="mt-4 space-y-4">
          <NationwidePolicyTab />
          <QuoteUpload state={state} patch={patch} />
        </TabsContent>
        <TabsContent value="pool" className="mt-4">
          <SharedPoolPanel scenario={poolScenario} age={poolAge} onScenario={setPoolScenario} onAge={setPoolAge} />
        </TabsContent>
        <TabsContent value="locations" className="mt-4">
          <CareCostByLocation state={state} loc={locationState} patchLoc={patchLoc} />
        </TabsContent>
        <TabsContent value="agencies" className="mt-4">
          <AgencyComparison state={state} loc={locationState} patchLoc={patchLoc} />
        </TabsContent>
        <TabsContent value="hours" className="mt-4">
          <HoursProtected state={state} loc={locationState} patchLoc={patchLoc} />
        </TabsContent>
        <TabsContent value="inflation" className="mt-4"><NwInflationProjection /></TabsContent>

        <TabsContent value="gap" className="mt-4"><CareCostGap state={state} patch={patch} /></TabsContent>
        <TabsContent value="strategy" className="mt-4">
          <GapStrategy state={state} patch={patch} loc={locationState} />
        </TabsContent>
        <TabsContent value="assets" className="mt-4"><AssetProtection state={state} patch={patch} /></TabsContent>
        <TabsContent value="scenarios" className="mt-4"><ScenarioSimulator state={state} /></TabsContent>
        <TabsContent value="value" className="mt-4">
          <PolicyValuePaths includeSurrenderValue={includeSurrender} onToggle={setIncludeSurrender} />
        </TabsContent>
        <TabsContent value="stress" className="mt-4"><StressTestTab /></TabsContent>
        <TabsContent value="renewals" className="mt-4"><RenewalTracker state={state} patch={patch} /></TabsContent>
        <TabsContent value="vault" className="mt-4"><DocumentVault state={state} patch={patch} /></TabsContent>
      </Tabs>
    </div>
  );
}
