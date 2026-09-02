import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ROLES, ROLE_META, money, pct, type InvestmentRole } from '@/lib/investing/roles';
import { useInvestingMetrics } from '@/hooks/use-investing-metrics';
import { useUpdateRoleTarget, useUpdateInvSettings, useSaveDecision } from '@/hooks/use-investing';

const COLORS: Record<InvestmentRole, string> = {
  CORE: 'hsl(var(--primary))',
  MOMENTUM: '#34d399',
  GUARDRAIL: '#38bdf8',
  CONVICTION: '#fbbf24',
  CATALYST: '#e879f9',
};

export function AllocationTargets() {
  const { targetRows, allocation, driftBand, settings } = useInvestingMetrics();
  const updateTarget = useUpdateRoleTarget();
  const updateSettings = useUpdateInvSettings();
  const journal = useSaveDecision();
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [band, setBand] = useState(driftBand);

  useEffect(() => {
    setDraft(Object.fromEntries(targetRows.map((t) => [t.role, Number(t.target_pct ?? 0)])));
  }, [targetRows]);
  useEffect(() => setBand(driftBand), [driftBand]);

  const total = ROLES.reduce((s, r) => s + Number(draft[r] ?? 0), 0);
  const balanced = Math.abs(total - 100) < 0.01;

  const apply = async () => {
    for (const t of targetRows) {
      const next = Number(draft[t.role] ?? 0);
      if (next !== Number(t.target_pct)) {
        await updateTarget.mutateAsync({ id: t.id, patch: { target_pct: next } });
      }
    }
    if (band !== driftBand) await updateSettings.mutateAsync({ drift_band_pct: band });
    await journal.mutateAsync({
      action: 'target_change',
      reason: `Role targets set to ${ROLES.map((r) => `${r} ${Number(draft[r] ?? 0)}%`).join(', ')}`,
      expected_outcome: 'Allocation matches the intended job of each role',
    });
  };

  const chartData = allocation.rows.filter((r) => r.value > 0).map((r) => ({ name: r.role, value: r.value }));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="border-border/60 bg-card/60 backdrop-blur lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Allocation targets</CardTitle>
          <CardDescription>
            You set these. They must total 100%. Nothing here is a default recommendation — use Scenario Testing to compare mixes first.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead className="w-28">Target %</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">Drift</TableHead>
                <TableHead className="text-right">Dollar gap</TableHead>
                <TableHead>State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allocation.rows.map((row) => (
                <TableRow key={row.role}>
                  <TableCell>
                    <Badge variant="outline" className={ROLE_META[row.role].accent}>{row.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="1"
                      value={draft[row.role] ?? 0}
                      onChange={(e) => setDraft((d) => ({ ...d, [row.role]: Number(e.target.value) }))}
                    />
                  </TableCell>
                  <TableCell className="text-right">{pct(row.currentPct)}</TableCell>
                  <TableCell className={`text-right ${Math.abs(row.driftPp) > band ? 'text-amber-400' : ''}`}>
                    {row.driftPp >= 0 ? '+' : ''}{row.driftPp.toFixed(1)} pp
                  </TableCell>
                  <TableCell className="text-right">{money(row.dollarGap)}</TableCell>
                  <TableCell className="capitalize">{row.state.replace('_', ' ')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <Label>Rebalancing drift band (percentage points)</Label>
              <div className="flex gap-2">
                {[3, 5, 10].map((b) => (
                  <Button key={b} size="sm" variant={band === b ? 'default' : 'outline'} onClick={() => setBand(b)}>{b}pp</Button>
                ))}
                <Input className="w-24" type="number" step="0.5" value={band} onChange={(e) => setBand(Number(e.target.value))} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm ${balanced ? 'text-emerald-400' : 'text-destructive'}`}>
                Targets total {total.toFixed(1)}%
              </span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={!balanced}>Save targets</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Update your role targets?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This changes the plan every recommendation is measured against and is written to your decision journal. No trades are placed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={apply}>Save targets</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          {settings && (
            <p className="text-xs text-muted-foreground">
              CONVICTION + CATALYST warning line: {settings.conviction_catalyst_warn_pct}% of the portfolio. It warns, it never blocks.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Current mix</CardTitle>
          <CardDescription>Live weight by role</CardDescription>
        </CardHeader>
        <CardContent className="h-64">
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add positions to see your role mix.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {chartData.map((d) => <Cell key={d.name} fill={COLORS[d.name as InvestmentRole]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => money(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
