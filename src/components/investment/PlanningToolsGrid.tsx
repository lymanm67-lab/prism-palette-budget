import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';

export interface ToolGroup {
  label: string;
  items: { value: string; label: string }[];
}

const DESCRIPTIONS: Record<string, string> = {
  raise: 'Model future raises and how much to redirect',
  debt: 'Turn freed-up debt payments into investments',
  income: 'Engineer retirement income streams and buckets',
  rules: 'Automate where every new dollar goes',
  portfolio: 'Risk profile, model portfolios, drift, and fee drag',
  aiadvisor: 'AI planner analysis vs. a human investment planner',
  tax: 'Roth vs traditional, conversions, withdrawal tax',
  risk: 'Monte Carlo, glide path, sequence-of-returns risk',
  healthcare: 'ACA, IRMAA, and long-term-care planning',
  spouse: "Add Kateri's balances and contributions",
  pensions: 'OPERS, Social Security, and pension timing',
  hsa: 'HSA as a stealth retirement account',
  assets: 'Tag accounts by purpose and owner',
  realassets: 'Real estate, business equity, and RSUs',
  college: '529 savings vs retirement tradeoff',
  charitable: 'DAF, QCD, and appreciated-stock giving',
  legacy: 'Legacy protection and heir planning',
  estate: 'Beneficiary audit and estate execution',
  trust: 'Track what is actually funded into the trust',
  behavior: 'Coach mode and accountability check-ins',
  automation: 'Log of automated money-rule executions',
};

export function PlanningToolsGrid({
  groups,
  onSelect,
}: {
  groups: ToolGroup[];
  onSelect: (value: string) => void;
}) {
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.label}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            {group.label}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((item) => (
              <Card
                key={item.value}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(item.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(item.value);
                  }
                }}
                className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold">{item.label}</p>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {DESCRIPTIONS[item.value] ?? 'Open this planning tool'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
