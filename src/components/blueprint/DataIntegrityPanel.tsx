import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, GitCompare, Plus, Trash2 } from 'lucide-react';
import { money, SectionNote } from './shared';
import { useWealthOSData } from '@/hooks/use-wealth-os';
import {
  validateBlueprint, applyScenario, projectPortfolio, milestoneHits,
  type AssumptionState, type SavedScenario,
} from '@/lib/blueprint/model';

export function DataIntegrityPanel({ state }: { state: AssumptionState }) {
  const { data: wealth } = useWealthOSData();
  const issues = useMemo(
    () => validateBlueprint(state, {
      netWorth: wealth?.netWorth,
      liabilities: wealth?.liabilities,
      portfolio: wealth ? wealth.buckets.retirement + wealth.buckets.brokerage + wealth.buckets.hsa : undefined,
      assets: wealth?.assets?.map((a) => ({ name: a.name, balance: a.balance })),
    }),
    [state, wealth],
  );

  const errors = issues.filter((i) => i.severity === 'error');

  return (
    <Card className="wos-page">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {errors.length
            ? <AlertTriangle className="h-4 w-4 text-destructive" />
            : <CheckCircle2 className="h-4 w-4 text-prism-teal" />}
          {errors.length ? 'DATA REVIEW REQUIRED' : 'Data integrity checks passed'}
        </CardTitle>
        <SectionNote>
          Conflicts are flagged, never silently resolved. Nothing is auto-corrected on your behalf.
        </SectionNote>
      </CardHeader>
      <CardContent className="space-y-2">
        {issues.map((i) => (
          <Alert key={i.id} variant={i.severity === 'error' ? 'destructive' : 'default'}>
            <AlertTitle className="text-sm">{i.title}</AlertTitle>
            <AlertDescription className="text-xs">{i.detail}</AlertDescription>
          </Alert>
        ))}
        {!issues.length && <SectionNote>No conflicts detected across assets, liabilities, contributions and milestones.</SectionNote>}
      </CardContent>
    </Card>
  );
}

const PRESETS: { name: string; overrides: Partial<AssumptionState> }[] = [
  { name: '8% Return Plan', overrides: { primaryReturnPct: 8 } },
  { name: '10% Return Plan', overrides: { primaryReturnPct: 10 } },
  { name: 'Retire at 80', overrides: { retirementAge: 80 } },
  { name: 'Retire at 85', overrides: { retirementAge: 85 } },
  { name: 'High Healthcare Cost', overrides: { healthcareInflationPct: 7 } },
];

export function ScenarioPanel({
  state, patch,
}: { state: AssumptionState; patch: (p: Partial<AssumptionState>) => void }) {
  const [name, setName] = useState('');
  const [compare, setCompare] = useState<string[]>([]);

  const addScenario = (n: string, overrides: Partial<AssumptionState>) => {
    const s: SavedScenario = {
      id: `s-${Date.now()}`, name: n, createdAt: new Date().toISOString().slice(0, 10), overrides,
    };
    patch({ scenarios: [...state.scenarios, s] });
  };

  const rowsFor = (sc?: SavedScenario) => {
    const st = applyScenario(state, sc);
    const path = projectPortfolio(st, st.primaryReturnPct);
    const end = path[path.length - 1];
    const m1 = milestoneHits(st, st.primaryReturnPct).find((h) => h.amount === 1_000_000);
    return {
      label: sc?.name ?? 'BASE PLAN',
      retirementAge: st.retirementAge,
      returnPct: st.primaryReturnPct,
      endBalance: end?.balance ?? 0,
      millionYear: m1?.year ?? null,
    };
  };

  const selected = state.scenarios.filter((s) => compare.includes(s.id));
  const table = [rowsFor(undefined), ...selected.map((s) => rowsFor(s))];

  return (
    <Card className="wos-page">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <GitCompare className="h-4 w-4 text-prism-teal" /> Scenario Planning
        </CardTitle>
        <SectionNote>
          Saved scenarios never change the official Money Blueprint — they layer overrides on top for comparison.
        </SectionNote>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 print:hidden">
          {PRESETS.map((p) => (
            <Button key={p.name} size="sm" variant="outline" onClick={() => addScenario(p.name, p.overrides)}>
              <Plus className="h-3.5 w-3.5 mr-1" />{p.name}
            </Button>
          ))}
        </div>
        <div className="flex gap-2 print:hidden">
          <Input
            placeholder="Save current assumptions as scenario…"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            size="sm"
            disabled={!name.trim()}
            onClick={() => {
              addScenario(name.trim(), {
                retirementAge: state.retirementAge,
                primaryReturnPct: state.primaryReturnPct,
                salaryGrowthPct: state.salaryGrowthPct,
                healthcareInflationPct: state.healthcareInflationPct,
              });
              setName('');
            }}
          >
            Save
          </Button>
        </div>

        <div className="space-y-1">
          {state.scenarios.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 p-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={compare.includes(s.id)}
                  onChange={(e) => setCompare(e.target.checked ? [...compare, s.id] : compare.filter((x) => x !== s.id))}
                />
                {s.name}
                <Badge variant="outline" className="text-[10px]">{s.createdAt}</Badge>
              </label>
              <Button
                size="icon" variant="ghost" className="h-7 w-7 print:hidden"
                onClick={() => patch({ scenarios: state.scenarios.filter((x) => x.id !== s.id) })}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th className="text-left py-1.5">Scenario</th><th className="text-left">Retirement age</th>
                <th className="text-left">Return</th><th className="text-right">Balance at retirement</th>
                <th className="text-left">$1M reached</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {table.map((r) => (
                <tr key={r.label} className="border-b border-border/40">
                  <td className="py-1.5 font-medium">{r.label}</td>
                  <td>{r.retirementAge}</td>
                  <td>{r.returnPct}%</td>
                  <td className="text-right">{money(r.endBalance)}</td>
                  <td>{r.millionYear ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
