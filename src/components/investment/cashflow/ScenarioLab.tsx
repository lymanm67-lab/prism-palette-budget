import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { RotateCcw } from 'lucide-react';
import { money } from '@/lib/retirement/investmentTracker';
import {
  monthLabel, RETURN_SCENARIOS, type EngineConfig, type ProjectionResult,
} from '@/lib/retirement/cashflowEngine';

interface Props {
  config: EngineConfig;
  scenarios: ProjectionResult[];
  onPatch: (patch: Partial<EngineConfig>) => void;
  onReset: () => void;
}

const EXTRAS = [0, 100, 250, 500, 1000];

export function ScenarioLab({ config, scenarios, onPatch, onReset }: Props) {
  const current = scenarios.find((s) => s.returnPct === config.returnPct) ?? scenarios[1];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Scenario testing</CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Every change instantly recalculates milestone dates, crossovers and the age-85 projection.
            </p>
          </div>
          <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={onReset}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Return assumption</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {RETURN_SCENARIOS.map((r) => (
                <Button
                  key={r}
                  size="sm"
                  variant={config.returnPct === r ? 'default' : 'outline'}
                  className="h-8 text-[11px]"
                  onClick={() => onPatch({ returnPct: r })}
                >
                  {r}%
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Extra monthly contribution / confirmed raise reallocation
            </Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {EXTRAS.map((v) => (
                <Button
                  key={v}
                  size="sm"
                  variant={config.extraMonthly === v ? 'default' : 'outline'}
                  className="h-8 text-[11px]"
                  onClick={() => onPatch({ extraMonthly: v })}
                >
                  {v === 0 ? 'None' : `+${money(v)}`}
                </Button>
              ))}
              <Input
                type="number"
                value={config.extraMonthly}
                onChange={(e) => onPatch({ extraMonthly: Number(e.target.value) || 0 })}
                className="h-8 w-24 text-xs"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Raises are only invested when you confirm the amount here.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Tax refund amount</Label>
              <Input
                type="number"
                value={config.refundAmount}
                onChange={(e) => onPatch({ refundAmount: Number(e.target.value) || 0 })}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Refund month</Label>
              <Input
                type="number" min={1} max={12}
                value={config.refundMonth}
                onChange={(e) => onPatch({ refundMonth: Math.min(12, Math.max(1, Number(e.target.value) || 1)) })}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Refund first year</Label>
              <Input
                type="number"
                value={config.refundStartYear}
                onChange={(e) => onPatch({ refundStartYear: Number(e.target.value) || 2028 })}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Negative return year</Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={config.badYear != null}
                  onCheckedChange={(v) => onPatch({ badYear: v ? new Date().getFullYear() + 1 : null })}
                />
                <Input
                  type="number"
                  disabled={config.badYear == null}
                  value={config.badYear ?? ''}
                  onChange={(e) => onPatch({ badYear: Number(e.target.value) || null })}
                  className="h-8 w-24 text-xs"
                />
                <Input
                  type="number"
                  disabled={config.badYear == null}
                  value={config.badYearReturnPct}
                  onChange={(e) => onPatch({ badYearReturnPct: Number(e.target.value) || 0 })}
                  className="h-8 w-20 text-xs"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Current age</Label>
              <Input
                type="number"
                value={config.currentAge}
                onChange={(e) => onPatch({ currentAge: Number(e.target.value) || 59 })}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Project to age</Label>
              <Input
                type="number"
                value={config.projectToAge}
                onChange={(e) => onPatch({ projectToAge: Number(e.target.value) || 85 })}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {config.disabledSources.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Paused sources:</span>
              {config.disabledSources.map((id) => (
                <Badge key={id} variant="outline" className="text-[10px]">{id}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Scenario results</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="py-1.5">Return</th>
                <th>$250K</th>
                <th>$500K</th>
                <th>$1M</th>
                <th>$4M</th>
                <th>Crossover</th>
                <th>Age {config.projectToAge}</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((s) => {
                const at = (t: number) => {
                  const m = s.milestones.find((x) => x.target === t);
                  return m?.month ? monthLabel(m.month) : '—';
                };
                return (
                  <tr key={s.returnPct} className={`border-t border-border ${s.returnPct === config.returnPct ? 'bg-primary/5 font-medium' : ''}`}>
                    <td className="py-1.5">{s.returnPct}%</td>
                    <td>{at(250_000)}</td>
                    <td>{at(500_000)}</td>
                    <td>{at(1_000_000)}</td>
                    <td>{at(4_000_000)}</td>
                    <td>{s.personalCrossover.month ? monthLabel(s.personalCrossover.month) : '—'}</td>
                    <td className="tabular-nums">{money(s.endingBalance)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-[10px] text-muted-foreground mt-2">
            Current selection: {current?.returnPct}% · projected age-{config.projectToAge} value{' '}
            {money(current?.endingBalance ?? 0)}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
