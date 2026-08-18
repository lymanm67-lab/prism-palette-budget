import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Scale } from 'lucide-react';
import { money, SectionNote, ConfidenceBadge } from './shared';
import { useWealthOSData } from '@/hooks/use-wealth-os';
import { type AssumptionState } from '@/lib/blueprint/model';

/** Reuses the existing Wealth OS engine as the single source of truth for balances. */
export function NetWorthPanel({ state }: { state: AssumptionState }) {
  const { data: w } = useWealthOSData();
  const b = w?.buckets;
  const pslf = state.debts.find((d) => d.forgiveness);

  const assetRows: [string, number][] = [
    ['Retirement', b?.retirement ?? 0],
    ['HSA', b?.hsa ?? 0],
    ['Brokerage', b?.brokerage ?? 0],
    ['Cash & emergency', (b?.cash ?? 0) + (b?.emergency ?? 0)],
    ['Real estate', b?.realEstate ?? 0],
    ['Business interests', b?.business ?? 0],
    ['Intellectual property', b?.intellectualProperty ?? 0],
    ['Vehicles', b?.vehicles ?? 0],
    ['Other personal property', b?.personalProperty ?? 0],
  ];

  return (
    <div className="space-y-4">
      <Card className="wos-page">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="h-4 w-4 text-prism-teal" /> Net Worth Dashboard
          </CardTitle>
          <SectionNote>
            Total assets − total liabilities. Future pension and Social Security are deliberately excluded.
          </SectionNote>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Total assets', money(w?.totalAssets ?? 0)],
              ['Total liabilities', money(w?.totalLiabilities ?? 0)],
              ['Net worth', money(w?.netWorth ?? 0)],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg border border-border/60 p-3">
                <p className="text-[11px] uppercase text-muted-foreground">{l}</p>
                <p className="text-lg font-bold tabular-nums">{v}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold mb-2">Assets</p>
              <div className="space-y-1 text-xs">
                {assetRows.map(([l, v]) => (
                  <div key={l} className="flex justify-between border-b border-border/40 py-1">
                    <span>{l}</span><span className="tabular-nums">{money(v)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">Liabilities</p>
              <div className="space-y-1 text-xs">
                {(w?.liabilities ?? []).map((l) => (
                  <div key={l.name} className="flex justify-between border-b border-border/40 py-1">
                    <span>{l.name}</span><span className="tabular-nums">{money(l.balance)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {(w?.history?.length ?? 0) > 1 && (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={w!.history}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => money(v)} />
                  <Area dataKey="netWorth" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          <ConfidenceBadge level="current" />
        </CardContent>
      </Card>

      {pslf?.forgiveness && (
        <Card className="wos-page">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Student loan forgiveness pathway (shown separately)</CardTitle>
            <SectionNote>PSLF balances remain a liability above until legally forgiven.</SectionNote>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-4 text-sm">
            <div><p className="text-[11px] uppercase text-muted-foreground">Current balance</p><p className="font-bold tabular-nums">{money(pslf.balance)}</p></div>
            <div><p className="text-[11px] uppercase text-muted-foreground">Payments remaining</p><p className="font-bold tabular-nums">{pslf.forgiveness.qualifyingPaymentsRemaining}</p></div>
            <div><p className="text-[11px] uppercase text-muted-foreground">Projected forgiveness</p><p className="font-bold">{pslf.forgiveness.forgivenessDate}</p></div>
            <div><p className="text-[11px] uppercase text-muted-foreground">Payment redirect after</p><p className="font-bold tabular-nums">{money(pslf.forgiveness.monthlyQualifyingPayment)}/mo</p></div>
            <div className="sm:col-span-4"><Badge variant="outline" className="text-[10px]">PROJECTED — not netted from liabilities</Badge></div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
