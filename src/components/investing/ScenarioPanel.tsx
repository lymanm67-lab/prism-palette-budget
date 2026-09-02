import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { ROLES, ROLE_META, stressLevels, money, pct } from '@/lib/investing/roles';
import { useInvestingMetrics } from '@/hooks/use-investing-metrics';
import { useInvScenarios, useSaveScenario } from '@/hooks/use-investing';

export function ScenarioPanel() {
  const { allocation, totals, risk } = useInvestingMetrics();
  const scenarios = useInvScenarios();
  const save = useSaveScenario();
  const [name, setName] = useState('What-if mix');
  const [monthly, setMonthly] = useState(250);
  const [years, setYears] = useState(26);
  const [mix, setMix] = useState<Record<string, number>>(
    Object.fromEntries(allocation.rows.map((r) => [r.role, Math.round(r.targetPct)])),
  );

  const total = ROLES.reduce((s, r) => s + Number(mix[r] ?? 0), 0);
  const balanced = Math.abs(total - 100) < 0.01;

  // Illustrative expected return per role, used only for scenario comparison.
  const roleReturn: Record<string, number> = { CORE: 7.5, MOMENTUM: 8.5, GUARDRAIL: 5, CONVICTION: 9.5, CATALYST: 9 };
  const roleVol: Record<string, number> = { CORE: 16, MOMENTUM: 20, GUARDRAIL: 10, CONVICTION: 30, CATALYST: 24 };

  const blended = useMemo(() => {
    const r = ROLES.reduce((s, role) => s + (Number(mix[role] ?? 0) / 100) * roleReturn[role], 0);
    const v = ROLES.reduce((s, role) => s + (Number(mix[role] ?? 0) / 100) * roleVol[role], 0);
    return { r, v };
  }, [mix]);

  const projected = useMemo(() => {
    const monthlyRate = blended.r / 100 / 12;
    const months = years * 12;
    let value = totals.value;
    for (let i = 0; i < months; i++) value = value * (1 + monthlyRate) + monthly;
    return value;
  }, [blended.r, years, monthly, totals.value]);

  const higherRiskPct = Number(mix.CONVICTION ?? 0) + Number(mix.CATALYST ?? 0);
  const stress = stressLevels(totals.value);

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Scenario preview</CardTitle>
          <CardDescription>
            Compare a hypothetical role mix before you change anything. Nothing here modifies your live targets or places a trade.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-5">
            {ROLES.map((r) => (
              <div key={r} className="space-y-1">
                <Label className="text-xs">{r}</Label>
                <Input type="number" step="1" value={mix[r] ?? 0} onChange={(e) => setMix({ ...mix, [r]: Number(e.target.value) })} />
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Scenario name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Monthly contribution</Label>
              <Input type="number" step="25" value={monthly} onChange={(e) => setMonthly(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label>Years</Label>
              <Input type="number" step="1" value={years} onChange={(e) => setYears(Number(e.target.value))} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { label: 'Blended expected return', value: `${blended.r.toFixed(2)}%` },
              { label: 'Blended volatility', value: `${blended.v.toFixed(1)}%` },
              { label: 'Higher-risk share', value: pct(higherRiskPct, 0) },
              { label: `Illustrative value in ${years}y`, value: money(projected) },
            ].map((s) => (
              <div key={s.label} className="rounded-md border border-border/60 bg-background/40 p-3">
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="text-lg font-semibold">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="text-sm text-muted-foreground">
            Drawdown check on today's {money(totals.value)}:{' '}
            {stress.map((s) => `${s.label} → ${money(s.value)}`).join(' · ')}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className={`text-sm ${balanced ? 'text-emerald-400' : 'text-destructive'}`}>Mix totals {total.toFixed(1)}%</span>
            <Button
              disabled={!balanced || save.isPending}
              onClick={() =>
                save.mutate({
                  name,
                  allocations: mix,
                  results: {
                    monthly_contribution: monthly,
                    years,
                    expected_return: blended.r,
                    volatility: blended.v,
                    projected_value: projected,
                    higher_risk_pct: higherRiskPct,
                  },
                })
              }
            >
              Save scenario
            </Button>
            <Button asChild variant="outline">
              <Link to="/planning/stress-test"><Activity className="mr-2 h-4 w-4" /> Run this through the Monte Carlo stress test</Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Expected returns and volatility per role are illustrative planning inputs, not forecasts. Results are estimates, not guarantees.
          </p>
        </CardContent>
      </Card>

      {(scenarios.data ?? []).length > 0 && (
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Saved scenarios</CardTitle>
            <CardDescription>Compare mixes you have modelled</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scenario</TableHead>
                  <TableHead>Mix</TableHead>
                  <TableHead className="text-right">Expected return</TableHead>
                  <TableHead className="text-right">Monthly</TableHead>
                  <TableHead className="text-right">Illustrative value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {((scenarios.data ?? []) as any[]).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {ROLES.map((r) => `${r.slice(0, 3)} ${Number((s.mix ?? {})[r] ?? 0)}%`).join(' · ')}
                    </TableCell>
                    <TableCell className="text-right">{Number(s.expected_return ?? 0).toFixed(2)}%</TableCell>
                    <TableCell className="text-right">{money(Number(s.monthly_contribution ?? 0))}</TableCell>
                    <TableCell className="text-right">{money(Number(s.projected_value ?? 0))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Current risk budget for reference</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Live higher-risk share is {pct(risk.higherRiskPct)} ({money(risk.higherRiskValue)}) against your {pct(risk.warnPct, 0)} warning line.
          {allocation.rows.some((r) => r.state !== 'on_target') && ' Some roles are outside their drift band today.'}
        </CardContent>
      </Card>
    </div>
  );
}
