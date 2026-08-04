import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useInvestmentHoldings } from '@/hooks/use-investment-data';
import { TrendingUp, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

function pct(n: number | null | undefined, digits = 2) {
  if (n == null) return '—';
  return `${n.toFixed(digits)}%`;
}

function money(n: number | null | undefined) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export function ActualReturnsCard() {
  const { data: holdings, isLoading } = useInvestmentHoldings();
  const [showAll, setShowAll] = useState(false);

  const rows = useMemo(() => {
    if (!holdings) return [];
    return holdings
      .filter((h: any) => h.return_1yr_pct != null || h.return_ytd_pct != null)
      .map((h: any) => ({
        id: h.id,
        account: h.accounts?.name ?? 'Unknown account',
        symbol: h.symbol,
        name: h.name,
        marketValue: Number(h.market_value ?? 0),
        return1yr: h.return_1yr_pct != null ? Number(h.return_1yr_pct) : null,
        returnYtd: h.return_ytd_pct != null ? Number(h.return_ytd_pct) : null,
      }))
      .sort((a, b) => b.marketValue - a.marketValue);
  }, [holdings]);

  const weighted = useMemo(() => {
    const total = rows.reduce((sum, r) => sum + r.marketValue, 0);
    if (total === 0) return { total, return1yr: null, returnYtd: null };
    const w1yr = rows.reduce((sum, r) => sum + (r.return1yr ?? 0) * r.marketValue, 0) / total;
    const wytd = rows.reduce((sum, r) => sum + (r.returnYtd ?? 0) * r.marketValue, 0) / total;
    return { total, return1yr: w1yr, returnYtd: wytd };
  }, [rows]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">Loading actual returns…</CardContent>
      </Card>
    );
  }

  if (rows.length === 0) return null;

  const visibleRows = showAll ? rows : rows.slice(0, 4);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Actual Reported Returns
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-card/60 border border-border/50 p-3">
            <div className="text-xs text-muted-foreground">Weighted 1-year</div>
            <div className="text-2xl font-bold text-primary">{pct(weighted.return1yr)}</div>
          </div>
          <div className="rounded-xl bg-card/60 border border-border/50 p-3">
            <div className="text-xs text-muted-foreground">Weighted YTD</div>
            <div className="text-2xl font-bold text-primary">{pct(weighted.returnYtd)}</div>
          </div>
          <div className="rounded-xl bg-card/60 border border-border/50 p-3">
            <div className="text-xs text-muted-foreground">Tracked balance</div>
            <div className="text-2xl font-bold">{money(weighted.total)}</div>
          </div>
        </div>

        <div className="rounded-xl border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Account / Holding</th>
                <th className="text-right px-3 py-2 font-medium">Balance</th>
                <th className="text-right px-3 py-2 font-medium">1-year</th>
                <th className="text-right px-3 py-2 font-medium">YTD</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => (
                <tr key={r.id} className="border-t border-border/30">
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.account}</div>
                    <div className="text-xs text-muted-foreground">{r.symbol} · {r.name}</div>
                  </td>
                  <td className="px-3 py-2 text-right">{money(r.marketValue)}</td>
                  <td className={cn('px-3 py-2 text-right font-medium', (r.return1yr ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                    {pct(r.return1yr)}
                  </td>
                  <td className={cn('px-3 py-2 text-right font-medium', (r.returnYtd ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                    {pct(r.returnYtd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length > 4 && (
          <button
            onClick={() => setShowAll((s) => !s)}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            {showAll ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showAll ? 'Show fewer accounts' : `Show all ${rows.length} accounts`}
          </button>
        )}

        <p className="text-xs text-muted-foreground">
          Returns are weighted by current market value. Past performance does not guarantee future results.
        </p>
      </CardContent>
    </Card>
  );
}
