import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { money, pct } from '@/lib/retirement/investmentTracker';
import {
  KNOWN_TIAA_FUNDS, groupByCustodian, share,
  type PortfolioAccount, type PositionRow,
} from '@/lib/investment/portfolio';
import { PositionsPanel } from './PositionsPanel';

interface Props {
  accounts: PortfolioAccount[];
  positions: PositionRow[];
  retirementTotal: number;
  onSavePosition: (input: Partial<PositionRow> & { account_id: string; name: string }) => Promise<unknown>;
  onDeletePosition: (id: string) => void;
  onAddKnownTiaa: (accountId: string) => void;
}

const DONUT_COLORS = ['hsl(var(--primary))', 'hsl(var(--prism-amber, 38 92% 50%))', 'hsl(var(--muted-foreground))'];

export function RetirementBreakdown({
  accounts, positions, retirementTotal, onSavePosition, onDeletePosition, onAddKnownTiaa,
}: Props) {
  const groups = groupByCustodian(accounts);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Total retirement investments
          </p>
          <p className="text-3xl font-semibold tabular-nums mt-1">{money(retirementTotal, 2)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Employer retirement plans only. Taxable brokerage money is excluded from every retirement
            withdrawal, RMD, Roth and contribution-limit calculation.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-3 sm:grid-cols-2 content-start">
          {groups.map((g) => (
            <Card key={g.custodian}>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{g.custodian}</p>
                <p className="text-2xl font-semibold tabular-nums mt-1">{money(g.total, 2)}</p>
                <p className="text-[11px] text-muted-foreground">
                  {pct(share(g.total, retirementTotal), 1)} of retirement portfolio · {g.accounts.length} accounts
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
              Recordkeeper mix
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={groups.map((g) => ({ name: g.custodian, value: g.total }))}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {groups.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => money(v, 2)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1">
              {groups.map((g, i) => (
                <div key={g.custodian} className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                    {g.custodian}
                  </span>
                  <span className="tabular-nums">{pct(share(g.total, retirementTotal), 1)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {groups.map((g) => (
        <Card key={`accounts-${g.custodian}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>{g.custodian} accounts</span>
              <span className="tabular-nums text-muted-foreground text-xs">{money(g.total, 2)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {g.accounts.map((a) => {
              const own = positions.filter((p) => p.account_id === a.id);
              const balance = Number(a.current_balance || 0);
              const isTiaa = (a.custodian ?? a.institution) === 'TIAA';
              return (
                <Collapsible
                  key={a.id}
                  open={!!open[a.id]}
                  onOpenChange={(o) => setOpen((s) => ({ ...s, [a.id]: o }))}
                >
                  <div className="rounded-lg border border-border/60">
                    <CollapsibleTrigger className="w-full p-3 text-left">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{a.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {a.plan_type ?? a.account_kind}
                            {a.fund_name ? ` · ${a.fund_name}` : ''}
                            {a.ticker ? ` (${a.ticker})` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold tabular-nums">{money(balance, 2)}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {pct(share(balance, g.total), 1)} of {g.custodian} · {pct(share(balance, retirementTotal), 1)} of retirement
                          </p>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open[a.id] ? 'rotate-180' : ''}`} />
                      </div>
                      {own.length ? (
                        <Badge variant="outline" className="mt-2 text-[10px]">{own.length} investments</Badge>
                      ) : null}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-3 pb-3">
                      <PositionsPanel
                        account={a}
                        positions={own}
                        groupTotal={g.total}
                        classTotal={retirementTotal}
                        labels={{ group: g.custodian, class: 'retirement' }}
                        onSave={onSavePosition}
                        onDelete={onDeletePosition}
                        onAddKnownFunds={
                          isTiaa && own.length === 0
                            ? () => onAddKnownTiaa(a.id)
                            : undefined
                        }
                      />
                      {isTiaa ? (
                        <p className="text-[10px] text-muted-foreground mt-2">
                          Known TIAA funds: {KNOWN_TIAA_FUNDS.join(', ')}. Zero-balance positions are kept so
                          historical performance is never lost.
                        </p>
                      ) : null}
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
