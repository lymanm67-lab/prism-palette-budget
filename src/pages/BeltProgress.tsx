import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useUserProgression, useLegacyWorth } from '@/hooks/use-financial-os';
import { BELT_ORDER, BELT_META, computeBelt, nextBeltRequirements, type Belt } from '@/lib/progression/beltRules';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Lock } from 'lucide-react';

export default function BeltProgress() {
  const { data: prog, recompute } = useUserProgression();
  const { data: lw } = useLegacyWorth();

  const currentBelt = (prog?.current_belt as Belt) ?? 'white';
  const currentIdx = BELT_ORDER.indexOf(currentBelt);
  const meta = BELT_META[currentBelt];

  const beltInputs = useMemo(() => {
    if (!lw) return null;
    const i = lw.inputs;
    return {
      emergencyFundStarted: i.liquidSavings >= 1000,
      emergencyMonths: i.monthlyExpenses > 0 ? i.liquidSavings / i.monthlyExpenses : 0,
      highInterestDebtZero: i.highInterestDebt <= 0,
      employerMatchMaxed: false,
      rothActive: i.rothPct > 0,
      netWorth: lw.netWorth,
      legacyWorth: lw.score,
      fiPercentage: i.fiPercentage,
      estateChecklistPct: i.estateItemsComplete / Math.max(i.estateItemsTotal, 1),
      trustFunded: i.trustFunded,
      constitutionPublished: i.hasConstitution,
      generationsSupportedInSim: 0,
    };
  }, [lw]);

  const required = beltInputs ? nextBeltRequirements(currentBelt, beltInputs) : [];
  const eligibleBelt = beltInputs ? computeBelt(beltInputs) : currentBelt;
  const canPromote = BELT_ORDER.indexOf(eligibleBelt) > currentIdx;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Belt Progression</h1>
        <p className="text-sm text-muted-foreground mt-1">Real financial milestones, ranked like martial arts. Earn your next belt.</p>
      </div>

      <Card className="bg-gradient-to-br from-muted/30 to-transparent">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold shrink-0"
               style={{ background: meta.color, color: meta.color === '#111827' ? '#fff' : '#000' }}>
            🥋
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase text-muted-foreground">Current rank</div>
            <div className="text-2xl font-bold">{meta.label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{meta.description}</div>
          </div>
          <div>
            <Button onClick={() => recompute.mutate()} disabled={recompute.isPending}>
              {recompute.isPending ? 'Checking…' : canPromote ? '✨ Claim belt!' : 'Check for promotion'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {required.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Requirements for the next belt</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {required.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Circle />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">All ranks</h2>
        <div className="grid gap-2 md:grid-cols-2">
          {BELT_ORDER.map((b, i) => {
            const m = BELT_META[b];
            const earned = i <= currentIdx;
            return (
              <div key={b} className={`flex items-center gap-3 p-3 rounded-lg border ${earned ? 'border-prism-teal/40 bg-muted/20' : 'border-border/40 opacity-70'}`}>
                <div className="h-9 w-9 rounded-full flex items-center justify-center text-xs shrink-0" style={{ background: m.color, color: m.color === '#111827' ? '#fff' : '#000' }}>
                  {earned ? '✓' : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{m.label}</div>
                  <div className="text-xs text-muted-foreground truncate">{m.description}</div>
                </div>
                {earned ? <CheckCircle2 className="h-4 w-4 text-prism-teal" /> : <Lock className="h-4 w-4 text-muted-foreground/50" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Circle() {
  return <div className="h-4 w-4 rounded-full border-2 border-prism-amber mt-0.5 shrink-0" />;
}
