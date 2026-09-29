import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Printer, Save, FileText, ArrowLeft } from 'lucide-react';
import { MoneyBlueprintPlan } from '@/components/blueprint/MoneyBlueprintPlan';
import { PageExplainer } from '@/components/PageExplainer';
import { BlueprintOverview } from '@/components/blueprint/BlueprintOverview';
import { AssumptionCenter } from '@/components/blueprint/AssumptionCenter';
import { HouseholdProfileCard } from '@/components/blueprint/HouseholdProfileCard';
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
  { key: 'assumptions', label: 'Step 1 · Assumptions & Integrity', blurb: 'Lock your baseline rules, return rates, and audit data' },
  { key: 'overview', label: 'Step 2 · Overview', blurb: 'High-level executive pulse check based on calibrated inputs' },
  { key: 'cashflow', label: 'Step 3 · Cash Flow & Debt', blurb: 'Today: monthly spending buckets, freed cash, and debt elimination' },
  { key: 'growth', label: 'Step 4 · Growth & Investing', blurb: 'Tomorrow: accumulation, employer match, and compounding engine' },
  { key: 'protection', label: 'Step 5 · Net Worth & Protection', blurb: 'Defense: balance sheet, emergency cushion, healthcare & LTC' },
  { key: 'retirement', label: 'Step 6 · Retirement & Legacy', blurb: 'The finish line: Age 70–85 drawdown, RMDs, Roth, and legacy' },
];

const DRILL_MAP: Record<string, string> = {
  plan: 'cashflow', debt: 'cashflow', contributions: 'growth', portfolio: 'growth',
  networth: 'protection', legacy: 'retirement', tax: 'retirement', integrity: 'assumptions',
};

function StepNav({ tab, onGo }: { tab: string; onGo: (key: string) => void }) {
  const idx = TABS.findIndex((t) => t.key === tab);
  const next = TABS[idx + 1];
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
      <Button size="sm" variant="ghost" onClick={() => onGo('overview')} className="text-xs">
        <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to overview
      </Button>
      {next && (
        <Button size="sm" variant="outline" onClick={() => onGo(next.key)} className="text-xs">
          Continue to {next.label} →
        </Button>
      )}
    </div>
  );
}

export default function MoneyBlueprint() {
  const { data: record } = useBlueprintAssumptions();
  const { data: plan } = useMoneyBlueprint();
  const saveAssumptions = useSaveBlueprintAssumptions();

  const [state, setState] = useState<AssumptionState>(defaultAssumptions());
  const [tab, setTab] = useState('assumptions');
  const [exporting, setExporting] = useState(false);

  // Sync whenever the saved record changes — including refetches triggered by
  // Household profile saves (ages/salary flow in via useBlueprintAssumptions).
  useEffect(() => {
    if (record) setState(record.state);
  }, [record]);

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
    <div className="blueprint-print container mx-auto p-4 md:p-6 space-y-6">
      <style>{`
        @media print {
          @page { size: letter portrait; margin: 0.45in; }
          html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .blueprint-print, .blueprint-print * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .blueprint-print .print\\:hidden { display: none !important; }
          .blueprint-print .bp-print-cover { display: block !important; }
          .blueprint-print .bp-print-cover, .blueprint-print .bp-print-cover * { color: #fff !important; }
          .blueprint-print .rounded-lg, .blueprint-print .rounded-xl, .blueprint-print [class*="bg-card"] {
            background: #f8fafc !important; border: 1px solid #cbd5e1 !important; border-radius: 10px !important;
            break-inside: avoid; page-break-inside: avoid;
          }
          .blueprint-print h2, .blueprint-print h3, .blueprint-print [class*="CardTitle"], .blueprint-print .font-semibold {
            color: #0f2a44 !important;
          }
          .blueprint-print h2, .blueprint-print h3 { border-left: 4px solid #0d9488; padding-left: 8px; }
          .blueprint-print .text-muted-foreground { color: #475569 !important; }
          .blueprint-print [class*="text-emerald"], .blueprint-print [class*="text-green"], .blueprint-print [class*="text-teal"] { color: #047857 !important; }
          .blueprint-print [class*="text-rose"], .blueprint-print [class*="text-red"], .blueprint-print [class*="text-destructive"] { color: #b91c1c !important; }
          .blueprint-print [class*="text-amber"], .blueprint-print [class*="text-orange"], .blueprint-print [class*="text-prism"] { color: #c2410c !important; }
          .blueprint-print [class*="text-primary"], .blueprint-print [class*="text-blue"] { color: #0f766e !important; }
          .blueprint-print [class*="bg-emerald"], .blueprint-print [class*="bg-green"] { background: #d1fae5 !important; }
          .blueprint-print [class*="bg-rose"], .blueprint-print [class*="bg-red"] { background: #fee2e2 !important; }
          .blueprint-print [class*="bg-amber"], .blueprint-print [class*="bg-orange"] { background: #ffedd5 !important; }
          .blueprint-print [class*="bg-primary"] { background: #0d9488 !important; }
          .blueprint-print table { width: 100%; border-collapse: collapse; }
          .blueprint-print thead tr { background: #0f2a44 !important; }
          .blueprint-print thead th, .blueprint-print thead th * { color: #fff !important; }
          .blueprint-print tbody tr:nth-child(even) { background: #e6f4f1 !important; }
          .blueprint-print td, .blueprint-print th { border-bottom: 1px solid #cbd5e1 !important; padding: 4px 6px !important; }
          .blueprint-print .recharts-wrapper, .blueprint-print .recharts-surface { overflow: visible !important; max-width: 100% !important; }
          .blueprint-print .recharts-text, .blueprint-print .recharts-cartesian-axis-tick-value { fill: #334155 !important; }
          .blueprint-print .recharts-cartesian-grid line { stroke: #e2e8f0 !important; }
          .blueprint-print [role="tabpanel"] { display: block !important; }
          .blueprint-print [role="tabpanel"][hidden] { display: none !important; }
          .blueprint-print .wos-page { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <div className="bp-print-cover hidden" style={{ background: 'linear-gradient(135deg,#0f2a44,#0d9488)', padding: '18px 22px', borderRadius: 12, borderBottom: '5px solid #f97316' }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>The Montgomery Money Blueprint™</div>
        <div style={{ fontSize: 11, opacity: 0.9 }}>Wealth Binder · As of {state.asOf}</div>
      </div>


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

        <TabsContent value="overview" className="mt-4 space-y-4">
          <StepNav tab="overview" onGo={setTab} />
          <BlueprintOverview state={state} netMonthly={netMonthly} onDrill={(k) => setTab(DRILL_MAP[k] ?? k)} />
        </TabsContent>
        <TabsContent value="cashflow" className="mt-4 space-y-4">
          <StepNav tab="cashflow" onGo={setTab} />
          <MoneyBlueprintPlan />
          <DebtFreedomEngine state={state} patch={patch} />
        </TabsContent>
        <TabsContent value="growth" className="mt-4 space-y-4">
          <StepNav tab="growth" onGo={setTab} />
          <SalaryAccelerator state={state} />
          <ContributionTimeline state={state} />
          <InvestmentWaterfall state={state} patch={patch} />
          <PortfolioSimulator state={state} />
          <WealthRoadmap state={state} />
          <CompoundingFlywheel state={state} />
        </TabsContent>
        <TabsContent value="protection" className="mt-4 space-y-4">
          <StepNav tab="protection" onGo={setTab} />
          <NetWorthPanel state={state} />
          <HealthcarePanel state={state} patch={patch} />
          <LtcCenter state={state} patch={patch} />
        </TabsContent>
        <TabsContent value="retirement" className="mt-4 space-y-4">
          <StepNav tab="retirement" onGo={setTab} />
          <LegacyWindowPanel state={state} />
          <RmdRothPanel state={state} />
        </TabsContent>
        <TabsContent value="assumptions" className="mt-4 space-y-4">
          <StepNav tab="assumptions" onGo={setTab} />
          <HouseholdProfileCard />
          <AssumptionCenter state={state} patch={patch} />
          <DataIntegrityPanel state={state} />
          <ScenarioPanel state={state} patch={patch} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
