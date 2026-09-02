import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  runStressTest,
  LTC_COST_PRESETS,
  type StressAssumptions,
  type StressGoals,
  type StressResult,
} from '@/lib/retirement/stressTest';
import { AlertTriangle } from 'lucide-react';

const money = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n).toLocaleString()}`;

const SHOCKS: { key: string; label: string; patch: (a: StressAssumptions) => Partial<StressAssumptions> }[] = [
  { key: 'market', label: 'Major market decline at retirement (35%)', patch: (a) => ({ marketShockPct: 35, marketShockAge: a.retirementAge }) },
  { key: 'inflation', label: 'High general inflation (5%)', patch: () => ({ inflationPct: 5 }) },
  { key: 'healthcare', label: 'Healthcare inflation 9%', patch: () => ({ healthcareInflationPct: 9 }) },
  { key: 'returns', label: 'Returns 2 points below plan', patch: (a) => ({ returnHaircutPct: a.returnHaircutPct + 2 }) },
  { key: 'early', label: 'Retire 3 years earlier', patch: (a) => ({ retirementAge: Math.max(a.currentAge + 1, a.retirementAge - 3) }) },
  { key: 'ss', label: 'Social Security cut to 77%', patch: (a) => ({ socialSecurityAnnual: a.socialSecurityAnnual * 0.77 }) },
  { key: 'pension', label: 'Pension income cut 25%', patch: (a) => ({ pensionAnnual: a.pensionAnnual * 0.75 }) },
  { key: 'ltc', label: '3 years nursing-facility care', patch: () => ({ ltcSetting: 'nursing', ltcAnnualCost: LTC_COST_PRESETS.nursing, ltcYears: 3 }) },
  { key: 'income', label: 'Consulting/business income lost', patch: (a) => ({ otherGuaranteedAnnual: 0, employeeContribution: a.employeeContribution * 0.8 }) },
  { key: 'emergency', label: 'Large $50k emergency expense', patch: (a) => ({ extraOneTimeExpense: 50_000, extraOneTimeExpenseAge: a.retirementAge + 2 }) },
];

export function WorstCasePanel({ assumptions, goals }: { assumptions: StressAssumptions; goals: StressGoals }) {
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<StressResult | null>(null);
  const [worst, setWorst] = useState<{ label: string; damage: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const run = () => {
    setBusy(true);
    setTimeout(() => {
      const chosen = SHOCKS.filter((s) => active[s.key]);
      let combined: StressAssumptions = { ...assumptions };
      for (const s of chosen) combined = { ...combined, ...s.patch(combined) };
      const base = runStressTest(assumptions, goals, 800);
      const res = runStressTest(combined, goals, 1500);

      let biggest: { label: string; damage: number } | null = null;
      for (const s of chosen) {
        const single = runStressTest({ ...assumptions, ...s.patch(assumptions) }, goals, 600);
        const damage = base.medianEnding - single.medianEnding;
        if (!biggest || damage > biggest.damage) biggest = { label: s.label, damage };
      }
      setWorst(biggest);
      setResult(res);
      setBusy(false);
    }, 0);
  };

  return (
    <Card className="border-destructive/40 bg-card/60 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-destructive" /> What Could Break My Plan?
        </CardTitle>
        <CardDescription>
          Stack several adverse events at once and see which one does the most damage, when the plan turns
          vulnerable, and whether the legacy target still survives.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {SHOCKS.map((s) => (
            <label key={s.key} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 p-3 text-sm">
              <span>{s.label}</span>
              <Switch checked={!!active[s.key]} onCheckedChange={(v) => setActive((p) => ({ ...p, [s.key]: v }))} />
            </label>
          ))}
        </div>

        <Button onClick={run} disabled={busy || !Object.values(active).some(Boolean)}>
          {busy ? 'Running…' : 'Run worst-case scenario'}
        </Button>

        {result && (
          <div className="space-y-3 rounded-lg border border-border/50 bg-muted/20 p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Success probability</p>
                <p className="text-xl font-bold tabular-nums text-destructive">{result.successProbability.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lowest balance (median run)</p>
                <p className="text-xl font-bold tabular-nums">{money(result.medianLowestBalance)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Plan turns vulnerable at age</p>
                <p className="text-xl font-bold tabular-nums">{result.medianDepletionAge ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Legacy target survives</p>
                <p className="text-xl font-bold tabular-nums">{result.legacyProbability.toFixed(1)}%</p>
              </div>
            </div>
            {worst && (
              <p className="text-sm">
                <Badge variant="outline" className="mr-2 text-destructive">Greatest damage</Badge>
                {worst.label} — roughly {money(Math.max(0, worst.damage))} off the median ending balance on its own.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Suggested correction: strengthen whichever lever above shows the biggest gain in the Recommended
              Actions section — typically more contributions, a later retirement date, or firmer LTC protection.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
