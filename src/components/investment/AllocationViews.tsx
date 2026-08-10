import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { money, pct } from '@/lib/retirement/investmentTracker';
import {
  UNCLASSIFIED, allocationByAccount, allocationByAssetClass, allocationByInstitution,
  allocationByType, assetLocation,
  type AllocationSlice, type PortfolioAccount, type PositionRow,
} from '@/lib/investment/portfolio';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(38 92% 50%)',
  'hsl(160 60% 40%)',
  'hsl(215 45% 35%)',
  'hsl(280 40% 55%)',
  'hsl(20 70% 50%)',
  'hsl(var(--muted-foreground))',
];

const VIEWS = [
  { key: 'type', label: 'By investment type' },
  { key: 'institution', label: 'By institution' },
  { key: 'account', label: 'By account' },
  { key: 'assetClass', label: 'By asset class' },
] as const;

interface Props {
  accounts: PortfolioAccount[];
  positions: PositionRow[];
  investmentTotal: number;
}

export function AllocationViews({ accounts, positions, investmentTotal }: Props) {
  const [view, setView] = useState<(typeof VIEWS)[number]['key']>('type');

  const slices: AllocationSlice[] =
    view === 'type' ? allocationByType(accounts)
      : view === 'institution' ? allocationByInstitution(accounts)
        : view === 'account' ? allocationByAccount(accounts)
          : allocationByAssetClass(accounts, positions);

  const location = assetLocation(accounts, positions);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm uppercase tracking-wider">Where my money is invested</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {VIEWS.map((v) => (
              <Button
                key={v.key}
                size="sm"
                variant={view === v.key ? 'default' : 'outline'}
                className="h-7 text-[11px]"
                onClick={() => setView(v.key)}
              >
                {v.label}
              </Button>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[300px_1fr] items-center">
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={slices} dataKey="value" nameKey="label" innerRadius={55} outerRadius={95} paddingAngle={2}>
                    {slices.map((s, i) => (
                      <Cell key={i} fill={s.unclassified ? 'hsl(var(--muted-foreground))' : COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => money(v, 2)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1">
              {slices.map((s, i) => (
                <div key={s.label} className="flex items-center justify-between text-xs border-b border-border/40 py-1">
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ background: s.unclassified ? 'hsl(var(--muted-foreground))' : COLORS[i % COLORS.length] }}
                    />
                    <span className={`truncate ${s.unclassified ? 'text-muted-foreground' : ''}`}>{s.label}</span>
                  </span>
                  <span className="tabular-nums shrink-0">
                    {money(s.value, 2)} · {pct(s.pct, 1)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {view === 'assetClass' ? (
            <p className="text-[10px] text-muted-foreground">
              Asset allocation is never estimated. Balances without published fund-level allocation appear as{' '}
              {UNCLASSIFIED} until you classify the underlying investments.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm uppercase tracking-wider">What I own · where I own it</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th className="text-left py-1.5">Asset class</th>
                  <th className="text-right">Retirement account</th>
                  <th className="text-right">Taxable brokerage</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">% of portfolio</th>
                </tr>
              </thead>
              <tbody>
                {location.map((r) => (
                  <tr key={r.assetClass} className="border-b border-border/30">
                    <td className={`py-1.5 ${r.assetClass === UNCLASSIFIED ? 'text-muted-foreground' : ''}`}>
                      {r.assetClass}
                    </td>
                    <td className="text-right tabular-nums">{money(r.retirement, 2)}</td>
                    <td className="text-right tabular-nums">{money(r.taxable, 2)}</td>
                    <td className="text-right tabular-nums font-medium">{money(r.total, 2)}</td>
                    <td className="text-right tabular-nums">
                      {pct(investmentTotal > 0 ? (r.total / investmentTotal) * 100 : 0, 1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Asset location matters for future tax planning: the same asset class is taxed differently inside a
            retirement plan than inside a taxable brokerage account.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
