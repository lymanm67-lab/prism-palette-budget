import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import FdnCrudCard, { type FdnField } from './FdnCrudCard';
import { useFdnInvestments } from '@/hooks/use-foundation-ops';
import { useFdnSettings } from '@/hooks/use-foundation';
import { ASSET_CLASSES, rollupInvestments, currency0 } from '@/lib/legacy/foundationOps';

const empty = {
  id: '',
  name: '',
  asset_class: 'equity',
  market_value: 0,
  cost_basis: 0,
  income_yield: 0,
  target_allocation_pct: 0,
  custodian: '',
  notes: '',
};

const fields: FdnField[] = [
  { key: 'name', label: 'Holding / fund name' },
  { key: 'asset_class', label: 'Asset class', type: 'select', options: ASSET_CLASSES.map((v) => ({ value: v, label: v.replace(/_/g, ' ') })) },
  { key: 'market_value', label: 'Market value ($)', type: 'number' },
  { key: 'cost_basis', label: 'Cost basis ($)', type: 'number' },
  { key: 'income_yield', label: 'Income yield (%)', type: 'number' },
  { key: 'target_allocation_pct', label: 'Target allocation (%)', type: 'number' },
  { key: 'custodian', label: 'Custodian' },
  { key: 'notes', label: 'Notes', type: 'textarea', full: true },
];

export default function InvestmentsTab() {
  const { data: holdings = [] } = useFdnInvestments();
  const { data: settings } = useFdnSettings();
  const r = rollupInvestments(holdings as any[], settings ?? null);
  const grantBudget = Number(settings?.annual_grant_budget ?? 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Endowment market value</p>
            <p className="mt-1 text-2xl font-semibold text-prism-teal">{currency0(r.marketValue)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{r.holdingCount} holdings</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Unrealized gain</p>
            <p className="mt-1 text-2xl font-semibold text-prism-lime">{currency0(r.gain)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{Math.round(r.gainPct * 100)}% over basis</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Projected annual income</p>
            <p className="mt-1 text-2xl font-semibold">{currency0(r.income)}</p>
            <p className="mt-1 text-xs text-muted-foreground">From stated yields</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">5% distribution requirement</p>
            <p className="mt-1 text-2xl font-semibold text-prism-amber">{currency0(r.requiredDistribution)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {grantBudget >= r.requiredDistribution
                ? 'Planned giving covers the requirement'
                : `Planned giving short by ${currency0(r.requiredDistribution - grantBudget)}`}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Allocation vs policy</CardTitle>
          <p className="text-xs text-muted-foreground">
            Largest drift first. A written investment and spending policy statement is what turns a bank account into an
            endowment.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {r.drift.length === 0 && <p className="text-sm text-muted-foreground">Add holdings to see allocation drift.</p>}
          {r.drift.map((d) => (
            <div key={d.cls}>
              <div className="flex items-center justify-between text-sm">
                <span className="capitalize">{d.cls.replace(/_/g, ' ')}</span>
                <span className="text-muted-foreground">
                  {Math.round(d.actualPct)}% actual vs {Math.round(d.targetPct)}% target
                  {Math.abs(d.drift) >= 5 && (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      {d.drift > 0 ? 'Overweight' : 'Underweight'} {Math.abs(Math.round(d.drift))}pts
                    </Badge>
                  )}
                </span>
              </div>
              <Progress value={Math.min(100, d.actualPct)} className="mt-1 h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      <FdnCrudCard
        table="fdn_investments"
        title="Endowment holdings"
        description="Corpus investments with target allocations, yields, and custodians."
        addLabel="Add holding"
        fields={fields}
        empty={empty}
        rows={holdings as any[]}
        requiredKey="name"
        numericKeys={['market_value', 'cost_basis', 'income_yield', 'target_allocation_pct']}
        renderRow={(h) => (
          <div>
            <p className="text-sm font-medium">
              {h.name} — {currency0(Number(h.market_value))}
            </p>
            <p className="text-xs text-muted-foreground">
              {String(h.asset_class).replace(/_/g, ' ')} · target {Number(h.target_allocation_pct)}% · yield{' '}
              {Number(h.income_yield)}%{h.custodian ? ` · ${h.custodian}` : ''}
            </p>
          </div>
        )}
      />

      <p className="text-xs text-muted-foreground">
        Educational planning only. Not investment advice. Private foundations face excise tax on net investment income
        and penalties for failing the minimum distribution — confirm figures with your CPA and investment advisor.
      </p>
    </div>
  );
}
