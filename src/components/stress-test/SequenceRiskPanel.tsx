import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { StressAssumptions } from '@/lib/retirement/stressTest';

type Props = {
  assumptions: StressAssumptions;
  onChange: (patch: Partial<StressAssumptions>) => void;
};

/**
 * Explicit sequence-of-returns controls: the three defenses that matter most
 * when a bad market shows up in the first years of retirement.
 */
export function SequenceRiskPanel({ assumptions: a, onChange }: Props) {
  const num = (v: string) => (v === '' ? 0 : Number(v));

  const bridgeDollars = Math.round(
    Math.max(0, a.cashBridgeYears) * ((a.essentialSpend || 0) + (a.healthcareSpend || 0)),
  );

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">Sequence-of-returns risk</CardTitle>
          <Badge variant="outline" className="text-[10px]">Estimates, not guarantees</Badge>
        </div>
        <CardDescription>
          Losses early in retirement hurt far more than the same losses later, because you are selling while
          prices are down. Turn these on to test how well your plan survives that — and how much each defense
          helps.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 1. Bad first decade ordering */}
        <div className="space-y-3 rounded-lg border border-border/60 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Bad-first-decade ordering</p>
              <p className="text-xs text-muted-foreground">
                Forces the weak returns into the early retirement years instead of letting them fall randomly.
                This is the classic worst case.
              </p>
            </div>
            <Switch
              checked={!!a.badFirstDecadeEnabled}
              onCheckedChange={(v) => onChange({ badFirstDecadeEnabled: v })}
              aria-label="Bad first decade ordering"
            />
          </div>
          {a.badFirstDecadeEnabled && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Stressed years after retirement</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={a.badFirstDecadeYears}
                  onChange={(e) => onChange({ badFirstDecadeYears: num(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Return haircut in those years (pts)</Label>
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={a.badFirstDecadeHaircutPct}
                  onChange={(e) => onChange({ badFirstDecadeHaircutPct: num(e.target.value) })}
                />
              </div>
            </div>
          )}
        </div>

        {/* 2. Cash bridge */}
        <div className="space-y-3 rounded-lg border border-border/60 p-4">
          <div>
            <p className="text-sm font-medium">Cash bridge years</p>
            <p className="text-xs text-muted-foreground">
              Carves a cash / short-bond sleeve out of the portfolio at retirement, sized to cover essentials
              plus healthcare. It is spent first in down years so shares are not sold low. Separate from your
              SoFi emergency fund, which is never used here.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Years of spending held in cash (0 = off)</Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={a.cashBridgeYears}
                onChange={(e) => onChange({ cashBridgeYears: num(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bridge yield %</Label>
              <Input
                type="number"
                min={0}
                max={10}
                step="0.1"
                value={a.cashBridgeYieldPct}
                onChange={(e) => onChange({ cashBridgeYieldPct: num(e.target.value) })}
              />
            </div>
          </div>
          {a.cashBridgeYears > 0 && (
            <p className="text-xs text-muted-foreground">
              Approximate bridge at retirement: ${bridgeDollars.toLocaleString()} in today's dollars.
            </p>
          )}
        </div>

        {/* 3. Guardrail rules */}
        <div className="space-y-3 rounded-lg border border-border/60 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Dynamic guardrail spending rules</p>
              <p className="text-xs text-muted-foreground">
                If the portfolio falls below its plan path, flexible spending (discretionary and travel) is
                trimmed; if it runs well ahead, spending gets a raise. Essentials, healthcare and long-term care
                are never cut.
              </p>
            </div>
            <Switch
              checked={!!a.guardrailRulesEnabled}
              onCheckedChange={(v) => onChange({ guardrailRulesEnabled: v })}
              aria-label="Guardrail spending rules"
            />
          </div>
          {a.guardrailRulesEnabled && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">Trigger band %</Label>
                <Input
                  type="number"
                  min={5}
                  max={40}
                  value={a.guardrailBandPct}
                  onChange={(e) => onChange({ guardrailBandPct: num(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cut when below %</Label>
                <Input
                  type="number"
                  min={0}
                  max={40}
                  value={a.guardrailCutPct}
                  onChange={(e) => onChange({ guardrailCutPct: num(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Raise when above %</Label>
                <Input
                  type="number"
                  min={0}
                  max={20}
                  value={a.guardrailRaisePct}
                  onChange={(e) => onChange({ guardrailRaisePct: num(e.target.value) })}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
