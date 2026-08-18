import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Printer, Save, FileText } from 'lucide-react';
import { MoneyBlueprintPlan } from '@/components/blueprint/MoneyBlueprintPlan';
import { PageExplainer } from '@/components/PageExplainer';
import { BlueprintOverview } from '@/components/blueprint/BlueprintOverview';
import { AssumptionCenter } from '@/components/blueprint/AssumptionCenter';
import { DebtFreedomEngine } from '@/components/blueprint/DebtFreedomEngine';
import {
  SalaryAccelerator, ContributionTimeline, InvestmentWaterfall,
  PortfolioSimulator, WealthRoadmap, CompoundingFlywheel,
} from '@/components/blueprint/GrowthEngine';
import { LegacyWindowPanel, RmdRothPanel } from '@/components/blueprint/LegacyWindowPanel';
import { LtcCenter, HealthcarePanel } from '@/components/blueprint/ProtectionPanel';
import { NetWorthPanel } from '@/components/blueprint/NetWorthPanel';
import { DataIntegrityPanel, ScenarioPanel } from '@/components/blueprint/DataIntegrityPanel';
import { useBlueprintAssumptions, useSaveBlueprintAssumptions } from '@/hooks/use-blueprint-assumptions';
import { useMoneyBlueprint } from '@/hooks/use-money-blueprint';
import { defaultAssumptions, type AssumptionState } from '@/lib/blueprint/model';
import { exportBinderPDF } from '@/lib/legacy/wealthOsExport';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'plan', label: 'Spending Plan' },
  { key: 'networth', label: 'Net Worth' },
  { key: 'debt', label: 'Debt Freedom' },
  { key: 'contributions', label: 'Contributions' },
  { key: 'portfolio', label: 'Growth' },
  { key: 'legacy', label: 'Age 70–85' },
  { key: 'protection', label: 'LTC' },
  { key: 'healthcare', label: 'Healthcare' },
  { key: 'tax', label: 'RMD & Roth' },
  { key: 'assumptions', label: 'Assumptions' },
  { key: 'integrity', label: 'Integrity' },
];

export default function MoneyBlueprint() {
  const { data: record } = useBlueprintAssumptions();
  const { data: plan } = useMoneyBlueprint();
  const saveAssumptions = useSaveBlueprintAssumptions();

  const [state, setState] = useState<AssumptionState>(defaultAssumptions());
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState('overview');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (record && !hydrated) {
      setState(record.state);
      setHydrated(true);
    }
  }, [record, hydrated]);

  const patch = (p: Partial<AssumptionState>) =>
    setState((s) => ({ ...s, ...p, asOf: new Date().toISOString().slice(0, 10) }));

  const onSave = async () => {
    try {
      await saveAssumptions.mutateAsync({ id: record?.id ?? null, state });
      toast.success('Blueprint assumptions saved — all projections updated');
    } catch (e: any) {
      toast.error(e.message || 'Could not save assumptions');
    }
  };

  const onBinder = async () => {
    setExporting(true);
    try {
      const pages = await exportBinderPDF('montgomery-money-blueprint.pdf');
      toast.success(`Wealth binder generated — ${pages} page(s)`);
    } catch (e: any) {
      toast.error(e.message || 'Binder export failed');
    } finally {
      setExporting(false);
    }
  };

  const netMonthly = plan?.state.income.netMonthly ?? 0;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <style>{`
        @media print {
          @page { size: letter portrait; margin: 0.5in; }
          body { background: #fff !important; }
          .print\\:hidden { display: none !important; }
          * { color: #111 !important; box-shadow: none !important; }
          [class*="bg-gradient"], [class*="bg-card"], [class*="backdrop"] { background: #fff !important; }
          .wos-page { break-inside: avoid; page-break-inside: avoid; border: 1px solid #111 !important; }
        }
      `}</style>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">The Montgomery Money Blueprint™</h1>
          <p className="text-muted-foreground max-w-3xl">
            A living financial operating system — one set of assumptions drives the spending plan, debt-to-wealth
            conversion, contribution timeline, portfolio projections, LTC and healthcare planning, and every
            binder-ready report.
          </p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mt-1">As of: {state.asOf}</p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button size="sm" onClick={onSave} disabled={saveAssumptions.isPending}>
            <Save className="h-3.5 w-3.5 mr-1" /> Save assumptions
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5 mr-1" /> Print binder page
          </Button>
          <Button size="sm" variant="outline" onClick={onBinder} disabled={exporting}>
            <FileText className="h-3.5 w-3.5 mr-1" /> {exporting ? 'Generating…' : 'Generate wealth binder'}
          </Button>
        </div>
      </header>

      <PageExplainer
        title="How the Blueprint works"
        sections={[
          {
            heading: 'Four buckets, one paycheck',
            body: 'Foundation Costs cover the non-negotiables (target 50–60% of take-home). Wealth Engine is post-tax investing (10%+). Future Fund holds named savings goals (5–10%). Freedom Spending is whatever is left — target 20–35%.',
          },
          {
            heading: 'The Buffer',
            body: 'A Buffer line automatically adds 15% on top of your Foundation rows to absorb the bills you forgot. It is calculated, not typed.',
          },
          {
            heading: 'One master data model',
            body: 'Everything past the Spending Plan tab derives from the Assumption Center. Change salary, retirement age, a debt payoff date or an LTC premium once and every dependent projection, milestone date and binder page updates automatically.',
          },
          {
            heading: 'Current vs. projected',
            body: 'Every figure is labelled CURRENT / VERIFIED, ESTIMATED or PROJECTED. Pension and Social Security are modelled as income streams only and never counted as net worth, and RMDs moved to a brokerage account are never treated as new wealth.',
          },
        ]}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex w-full flex-wrap h-auto justify-start print:hidden">
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key} className="text-xs">{t.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <BlueprintOverview state={state} netMonthly={netMonthly} onDrill={setTab} />
        </TabsContent>
        <TabsContent value="plan" className="mt-4">
          <MoneyBlueprintPlan />
        </TabsContent>
        <TabsContent value="networth" className="mt-4">
          <NetWorthPanel state={state} />
        </TabsContent>
        <TabsContent value="debt" className="mt-4">
          <DebtFreedomEngine state={state} patch={patch} />
        </TabsContent>
        <TabsContent value="contributions" className="mt-4 space-y-4">
          <SalaryAccelerator state={state} />
          <ContributionTimeline state={state} />
          <InvestmentWaterfall state={state} patch={patch} />
        </TabsContent>
        <TabsContent value="portfolio" className="mt-4 space-y-4">
          <PortfolioSimulator state={state} />
          <WealthRoadmap state={state} />
          <CompoundingFlywheel state={state} />
        </TabsContent>
        <TabsContent value="legacy" className="mt-4">
          <LegacyWindowPanel state={state} />
        </TabsContent>
        <TabsContent value="protection" className="mt-4">
          <LtcCenter state={state} patch={patch} />
        </TabsContent>
        <TabsContent value="healthcare" className="mt-4">
          <HealthcarePanel state={state} patch={patch} />
        </TabsContent>
        <TabsContent value="tax" className="mt-4">
          <RmdRothPanel state={state} />
        </TabsContent>
        <TabsContent value="assumptions" className="mt-4">
          <AssumptionCenter state={state} patch={patch} />
        </TabsContent>
        <TabsContent value="integrity" className="mt-4 space-y-4">
          <DataIntegrityPanel state={state} />
          <ScenarioPanel state={state} patch={patch} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
