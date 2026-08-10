import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Info } from 'lucide-react';
import { money, pct } from '@/lib/retirement/investmentTracker';
import {
  deriveHolding, selfDirectedGoalStatus, share,
  type InvestmentGoalRow, type PortfolioAccount, type PositionRow,
} from '@/lib/investment/portfolio';
import { PositionsPanel } from './PositionsPanel';

interface Props {
  accounts: PortfolioAccount[];
  positions: PositionRow[];
  selfDirectedTotal: number;
  goal: InvestmentGoalRow | null;
  monthContributions: number;
  ytdContributions: number;
  onSavePosition: (input: Partial<PositionRow> & { account_id: string; name: string }) => Promise<unknown>;
  onDeletePosition: (id: string) => void;
  onSaveGoal: (input: Partial<InvestmentGoalRow> & { scope: string }) => Promise<unknown>;
}

export function SelfDirectedPanel({
  accounts, positions, selfDirectedTotal, goal, monthContributions, ytdContributions,
  onSavePosition, onDeletePosition, onSaveGoal,
}: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [planned, setPlanned] = useState(String(goal?.planned_monthly ?? ''));
  const [annual, setAnnual] = useState(String(goal?.annual_goal ?? ''));
  const [alloc, setAlloc] = useState<Record<string, string>>(() => {
    const a = goal?.allocation ?? {};
    return Object.fromEntries(accounts.map((acc) => [acc.name, String(a[acc.name] ?? '')]));
  });
  const [saving, setSaving] = useState(false);

  const monthsRemaining = 12 - (new Date().getMonth() + 1);
  const status = selfDirectedGoalStatus(
    goal, monthContributions, ytdContributions, selfDirectedTotal, monthsRemaining,
  );

  const saveGoal = async () => {
    setSaving(true);
    try {
      await onSaveGoal({
        scope: 'self_directed',
        planned_monthly: Number(planned || 0),
        annual_goal: Number(annual || 0),
        allocation: Object.fromEntries(
          Object.entries(alloc).filter(([, v]) => v !== '').map(([k, v]) => [k, Number(v)]),
        ),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Self-directed investments
          </p>
          <p className="text-3xl font-semibold tabular-nums mt-1">{money(selfDirectedTotal, 2)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Taxable brokerage money — accessible before retirement. Kept fully separate from retirement
            accounts for tax, capital-gains and dividend reporting.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        {[...accounts]
          .sort((a, b) => Number(b.current_balance) - Number(a.current_balance))
          .map((a) => {
            const balance = Number(a.current_balance || 0);
            const own = positions.filter((p) => p.account_id === a.id);
            return (
              <Card key={a.id}>
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{a.name}</p>
                  <p className="text-2xl font-semibold tabular-nums mt-1">{money(balance, 2)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {pct(share(balance, selfDirectedTotal), 1)} of self-directed · {own.length} holdings
                  </p>
                </CardContent>
              </Card>
            );
          })}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Holdings by brokerage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {accounts.map((a) => {
            const own = positions.filter((p) => p.account_id === a.id);
            const balance = Number(a.current_balance || 0);
            return (
              <Collapsible key={a.id} open={!!open[a.id]} onOpenChange={(o) => setOpen((s) => ({ ...s, [a.id]: o }))}>
                <div className="rounded-lg border border-border/60">
                  <CollapsibleTrigger className="w-full p-3 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{a.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold tabular-nums">{money(balance, 2)}</span>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open[a.id] ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-3 pb-3">
                    <PositionsPanel
                      account={a}
                      positions={own}
                      groupTotal={balance || selfDirectedTotal}
                      classTotal={selfDirectedTotal}
                      labels={{ group: a.name, class: 'self-directed' }}
                      onSave={onSavePosition}
                      onDelete={onDeletePosition}
                    />
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Self-directed investment goal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-[11px]">Planned monthly investment</Label>
                <Input type="number" value={planned} onChange={(e) => setPlanned(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Annual goal</Label>
                <Input type="number" value={annual} onChange={(e) => setAnnual(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground mb-1">Monthly allocation by brokerage</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {accounts.map((a) => (
                  <div key={a.id} className="space-y-1">
                    <Label className="text-[10px]">{a.name}</Label>
                    <Input
                      type="number"
                      value={alloc[a.name] ?? ''}
                      onChange={(e) => setAlloc((s) => ({ ...s, [a.name]: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
            <Button size="sm" onClick={saveGoal} disabled={saving}>
              {saving ? 'Saving…' : 'Save goal'}
            </Button>

            <div className="grid gap-2 sm:grid-cols-2 text-[11px]">
              {[
                ['Planned monthly', money(status.plannedMonthly, 2)],
                ['Actual this month', money(status.actualMonthly, 2)],
                ['YTD invested', money(status.ytdInvested, 2)],
                ['Annual goal', money(status.annualGoal, 2)],
                ['Difference vs plan', money(status.difference, 2)],
                ['Projected year-end balance', money(status.projectedYearEnd, 2)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-border/40 py-1">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="tabular-nums font-medium">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" /> Brokerage complexity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-[11px] text-muted-foreground">
              Current self-directed platforms: {accounts.length}. This card is informational — it does not
              recommend consolidation. Use it to judge whether several small accounts still earn their keep.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border/60">
                    <th className="text-left py-1">Brokerage</th>
                    <th className="text-right">Value</th>
                    <th className="text-right">Holdings</th>
                    <th className="text-right">Gain / loss</th>
                    <th className="text-right">Dividends</th>
                    <th className="text-right">Monthly</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => {
                    const own = positions.filter((p) => p.account_id === a.id);
                    const gains = own.map(deriveHolding).filter((d) => d.gainDollars != null);
                    const gain = gains.length ? gains.reduce((s, d) => s + (d.gainDollars ?? 0), 0) : null;
                    const dividends = own.reduce((s, p) => s + Number(p.dividends || 0), 0);
                    const monthly = own.reduce((s, p) => s + Number(p.monthly_contribution || 0), 0);
                    return (
                      <tr key={a.id} className="border-b border-border/30">
                        <td className="py-1">{a.name}</td>
                        <td className="text-right tabular-nums">{money(Number(a.current_balance), 2)}</td>
                        <td className="text-right">{own.length}</td>
                        <td className={`text-right tabular-nums ${gain == null ? 'text-muted-foreground' : gain >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                          {gain == null ? 'NOT AVAILABLE' : money(gain, 2)}
                        </td>
                        <td className="text-right tabular-nums">{money(dividends, 2)}</td>
                        <td className="text-right tabular-nums">{money(monthly, 2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Fees, tax documents, automatic investing and fractional-share support can be tracked in each
              holding's notes until statement data is imported.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
