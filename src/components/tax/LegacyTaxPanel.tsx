import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import type { HeirResult } from '@/lib/tax/legacyTax';
import { money } from './TaxExecutiveDashboard';

interface Props {
  heir: HeirResult;
  heirCount: number;
  pretaxAtDeath: number;
  rothAtDeath: number;
  planningEndAge: number;
}

export function LegacyTaxPanel({ heir, heirCount, pretaxAtDeath, rothAtDeath, planningEndAge }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: `Pre-tax left at age ${planningEndAge}`, value: money(pretaxAtDeath), sub: 'Fully taxable to heirs' },
          { label: 'Roth left', value: money(rothAtDeath), sub: 'Tax-free to heirs' },
          { label: 'Estimated heir tax', value: money(heir.totalHeirTax), sub: `${heir.effectiveHeirRate.toFixed(1)}% of pre-tax dollars` },
          { label: 'Net to heirs', value: money(heir.netToHeirs), sub: `${heirCount} beneficiary(ies)` },
        ].map((s) => (
          <Card key={s.label} className="glass-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="font-display text-xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-card">
        <CardContent className="p-4 space-y-2">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" /> The 10-year payout squeeze
          </h3>
          <p className="text-sm text-muted-foreground">
            Most non-spouse heirs must empty an inherited pre-tax account within 10 years. That stacks
            {' '}{money(heir.annualDistribution)} per year on top of each heir's own income, often during their peak
            earning years.
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• Each heir's share of pre-tax dollars: <strong>{money(heir.perHeirPretax)}</strong></li>
            <li>• Estimated extra tax per heir: <strong>{money(heir.taxDragPerHeir)}</strong></li>
            <li>• Roth dollars pass fully tax-free: <strong>{money(heir.rothTaxFree)}</strong></li>
          </ul>
          <Badge variant="outline" className="mt-2 text-xs">
            Every dollar moved to Roth now removes a taxable dollar from your heirs' highest-earning decade.
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}
