import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useRolePositions, usePositionLots, useInvDividends } from '@/hooks/use-investing';
import { buildGainLossReport, gainLossCsv, type GainLossPosition } from '@/lib/investing/gainLoss';
import { ROLE_META, money, pct } from '@/lib/investing/roles';
import { CostBasisImport } from './CostBasisImport';

const signClass = (n: number) => (n > 0 ? 'text-emerald-400' : n < 0 ? 'text-rose-400' : 'text-muted-foreground');

function GainCell({ p }: { p: GainLossPosition }) {
  if (p.basisMissing) {
    return <Badge variant="outline" className="border-amber-500/40 text-amber-400">Basis missing</Badge>;
  }
  return (
    <span className={signClass(p.gain)}>
      {p.gain >= 0 ? '+' : '−'}{money(Math.abs(p.gain), 2)}
      {p.gainPct != null && <span className="ml-1 text-xs">({pct(p.gainPct)})</span>}
    </span>
  );
}

export function GainLossPanel() {
  const { data: positions = [] } = useRolePositions();
  const { data: lots = [] } = usePositionLots();
  const { data: dividends = [] } = useInvDividends();

  const year = new Date().getFullYear();

  const { dividendsByPosition, lotCounts } = useMemo(() => {
    const divs: Record<string, number> = {};
    dividends
      .filter((d) => new Date(`${d.pay_date}T00:00:00`).getFullYear() === year)
      .forEach((d) => {
        const match = d.position_id ?? positions.find((p) => p.ticker.toUpperCase() === d.ticker.toUpperCase())?.id;
        if (match) divs[match] = (divs[match] ?? 0) + Number(d.amount || 0);
      });
    const counts: Record<string, number> = {};
    lots.forEach((l) => {
      const match = l.position_id ?? positions.find((p) => p.ticker.toUpperCase() === l.ticker.toUpperCase())?.id;
      if (match) counts[match] = (counts[match] ?? 0) + 1;
    });
    return { dividendsByPosition: divs, lotCounts: counts };
  }, [dividends, lots, positions, year]);

  const report = useMemo(
    () => buildGainLossReport(positions as any, dividendsByPosition, lotCounts),
    [positions, dividendsByPosition, lotCounts],
  );

  const download = () => {
    const blob = new Blob([gainLossCsv(report)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prism-gain-loss-by-role-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const t = report.totals;

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Gain / loss by role</CardTitle>
            <CardDescription>
              Cost basis, current value and gain/loss for every position, grouped by the job it does. Positions without a recorded
              basis are flagged rather than shown as pure gain.
            </CardDescription>
          </div>
          <div className="flex shrink-0 gap-2">
            <CostBasisImport />
            <Button variant="outline" onClick={download} disabled={t.positionCount === 0}>
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Current value', value: money(t.currentValue, 2) },
            { label: 'Total cost basis', value: money(t.costBasis, 2), sub: t.basisMissingCount > 0 ? `${t.basisMissingCount} position(s) missing basis` : 'All positions have a basis' },
            { label: 'Unrealized gain / loss', value: `${t.gain >= 0 ? '+' : '−'}${money(Math.abs(t.gain), 2)}`, cls: signClass(t.gain), sub: t.gainPct == null ? undefined : pct(t.gainPct) },
            { label: `Dividends received ${year}`, value: money(t.dividendsYtd, 2) },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border/60 bg-background/40 p-3">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className={`text-lg font-semibold ${s.cls ?? ''}`}>{s.value}</div>
              {s.sub && <div className="mt-0.5 text-xs text-muted-foreground">{s.sub}</div>}
            </div>
          ))}
        </CardContent>
      </Card>

      {report.groups.map((g) => (
        <Card key={g.role} className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={ROLE_META[g.role].accent}>{g.role}</Badge>
              <span className="text-sm text-muted-foreground">{ROLE_META[g.role].purpose}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Value </span>
              <span className="font-medium">{money(g.currentValue, 2)}</span>
              <span className="mx-2 text-muted-foreground">·</span>
              <span className={signClass(g.gain)}>
                {g.gain >= 0 ? '+' : '−'}{money(Math.abs(g.gain), 2)}
                {g.gainPct != null && ` (${pct(g.gainPct)})`}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {g.positions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No positions assigned to this role yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticker</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Shares</TableHead>
                      <TableHead className="text-right">Cost basis</TableHead>
                      <TableHead className="text-right">Current value</TableHead>
                      <TableHead className="text-right">Gain / loss</TableHead>
                      <TableHead className="text-right">Dividends {year}</TableHead>
                      <TableHead className="text-right">Lots</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.positions.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-medium">{p.ticker}</div>
                          {p.name && <div className="text-xs text-muted-foreground">{p.name}</div>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.account_type}</TableCell>
                        <TableCell className="text-right">{p.shares}</TableCell>
                        <TableCell className="text-right">{p.basisMissing ? '—' : money(p.costBasis, 2)}</TableCell>
                        <TableCell className="text-right">{money(p.currentValue, 2)}</TableCell>
                        <TableCell className="text-right"><GainCell p={p} /></TableCell>
                        <TableCell className="text-right">{money(p.dividendsYtd, 2)}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">{p.lotCount || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <p className="text-xs text-muted-foreground">
        Gain/loss figures are estimates based on the prices and cost basis you have recorded. They are not a brokerage statement and
        not tax advice.
      </p>
    </div>
  );
}
