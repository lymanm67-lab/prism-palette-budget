import { MoneyBlueprintPlan } from '@/components/blueprint/MoneyBlueprintPlan';
import { PageExplainer } from '@/components/PageExplainer';

export default function MoneyBlueprint() {
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <style>{`
        @media print {
          @page { size: letter portrait; margin: 0.5in; }
          body { background: #fff !important; }
          .print\\:hidden { display: none !important; }
          * { color: #111 !important; box-shadow: none !important; }
          [class*="bg-gradient"], [class*="bg-card"], [class*="backdrop"] { background: #fff !important; }
        }
      `}</style>

      <header>
        <h1 className="text-3xl font-bold">The Montgomery Money Blueprint™</h1>
        <p className="text-muted-foreground">
          A conscious spending plan for the household — Foundation Costs, Wealth Engine, Future Fund, and Freedom Spending,
          scored against target percentages of take-home pay.
        </p>
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
            heading: 'Live numbers',
            body: 'Balance sheet and income figures seed from your household accounts and salary data, and Foundation rows seed from your last 90 days of spending. Overwrite any cell — your edits stick until you press Re-sync.',
          },
        ]}
      />

      <MoneyBlueprintPlan />
    </div>
  );
}
