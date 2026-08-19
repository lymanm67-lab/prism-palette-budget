import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Printer, Save } from 'lucide-react';
import { PageExplainer } from '@/components/PageExplainer';
import { LtcOverview } from '@/components/ltc/LtcOverview';
import { CurrentPlan } from '@/components/ltc/CurrentPlan';
import { PolicyComparison } from '@/components/ltc/PolicyComparison';
import { QuoteUpload } from '@/components/ltc/QuoteUpload';
import { InflationProjection } from '@/components/ltc/InflationProjection';
import { CareCostGap } from '@/components/ltc/CareCostGap';
import { AssetProtection } from '@/components/ltc/AssetProtection';
import { ScenarioSimulator } from '@/components/ltc/ScenarioSimulator';
import { Recommendation } from '@/components/ltc/Recommendation';
import { DocumentVault } from '@/components/ltc/DocumentVault';
import { useLtcPlan, useSaveLtcPlan } from '@/hooks/use-ltc-plan';
import { defaultState, type LtcState } from '@/lib/ltc/model';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'current', label: 'Current Plan' },
  { key: 'compare', label: 'Compare Policies' },
  { key: 'inflation', label: 'Inflation' },
  { key: 'gap', label: 'Care Cost Gap' },
  { key: 'assets', label: 'Asset Protection' },
  { key: 'scenarios', label: 'Scenarios' },
  { key: 'recommend', label: 'Recommendation' },
  { key: 'vault', label: 'Documents' },
];

export default function LongTermCare() {
  const { data: record } = useLtcPlan();
  const save = useSaveLtcPlan();
  const [state, setState] = useState<LtcState>(defaultState());
  const [hydrated, setHydrated] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const [tab, setTab] = useState(
    TABS.some((t) => t.key === requestedTab) ? (requestedTab as string) : 'overview',
  );

  // Deep links such as /ltc?tab=compare land straight on the quote uploader.
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
            Compare carrier quotes side by side, project benefits against real {state.household.city} care costs, and see
            exactly how much retirement capital each option protects.
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
          { heading: 'Weighted recommendation', body: 'Affordability, inflation protection, benefit size, flexibility, Ohio Partnership status, home care and cash benefit are scored and weighted. Adjust the weights and the ranking updates.' },
          { heading: 'Lapse risk is real', body: 'A policy that lapses protects nothing. If the combined premium exceeds 5% of household income, the dashboard flags it and points you to a lower sweet-spot rung.' },
        ]}
      />

      <Tabs value={tab} onValueChange={changeTab}>
        <TabsList className="flex w-full flex-wrap h-auto justify-start print:hidden">
          {TABS.map((t) => <TabsTrigger key={t.key} value={t.key} className="text-xs">{t.label}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="overview" className="mt-4"><LtcOverview state={state} onGoTo={changeTab} /></TabsContent>
        <TabsContent value="current" className="mt-4"><CurrentPlan state={state} patch={patch} /></TabsContent>
        <TabsContent value="compare" className="mt-4 space-y-4">
          <QuoteUpload state={state} patch={patch} />
          <PolicyComparison state={state} patch={patch} />
        </TabsContent>
        <TabsContent value="inflation" className="mt-4"><InflationProjection state={state} /></TabsContent>
        <TabsContent value="gap" className="mt-4"><CareCostGap state={state} patch={patch} /></TabsContent>
        <TabsContent value="assets" className="mt-4"><AssetProtection state={state} patch={patch} /></TabsContent>
        <TabsContent value="scenarios" className="mt-4"><ScenarioSimulator state={state} /></TabsContent>
        <TabsContent value="recommend" className="mt-4"><Recommendation state={state} patch={patch} /></TabsContent>
        <TabsContent value="vault" className="mt-4"><DocumentVault state={state} patch={patch} /></TabsContent>
      </Tabs>
    </div>
  );
}
