import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { successBand, type StressResult } from '@/lib/retirement/stressTest';
import { AlertTriangle, ShieldCheck, TrendingUp, Info } from 'lucide-react';

const toneClass: Record<string, string> = {
  strong: 'text-prism-lime',
  good: 'text-prism-teal',
  watch: 'text-prism-amber',
  risk: 'text-destructive',
};

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SuccessProbabilityCard({ result, legacyTarget, legacyAge }: { result: StressResult; legacyTarget: number | null; legacyAge: number }) {
  const band = successBand(result.successProbability);
  const Icon = band.tone === 'risk' ? AlertTriangle : band.tone === 'watch' ? Info : band.tone === 'strong' ? TrendingUp : ShieldCheck;

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span>Retirement Success Probability</span>
          <Badge variant="outline" className={toneClass[band.tone]}>
            <Icon className="mr-1 h-3 w-3" />
            {band.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className={`text-5xl font-bold tabular-nums ${toneClass[band.tone]}`}>
            {result.successProbability.toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            of {result.runs.toLocaleString()} simulated lifetimes met every goal you selected.
          </p>
          <Progress value={result.successProbability} className="mt-3 h-2" />
          <p className="mt-2 text-xs text-muted-foreground">{band.note}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Portfolio runs out" value={`${result.depletionProbability.toFixed(1)}%`} hint={result.medianDepletionAge ? `Typical depletion age ${result.medianDepletionAge}` : 'No typical depletion'} />
          <Stat
            label="Reaches legacy goal"
            value={legacyTarget ? `${result.legacyProbability.toFixed(1)}%` : '—'}
            hint={legacyTarget ? `$${(legacyTarget / 1_000_000).toFixed(2)}M by age ${legacyAge}` : 'No legacy target set'}
          />
          <Stat label="Holds income floor" value={`${result.incomeFloorProbability.toFixed(1)}%`} hint="Minimum annual income maintained" />
          <Stat label="Needs spending cuts" value={`${result.spendingCutProbability.toFixed(1)}%`} hint="At least one lean year" />
        </div>
      </CardContent>
    </Card>
  );
}
