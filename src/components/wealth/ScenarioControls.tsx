import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HORIZONS, RETURN_OPTIONS, STRATEGIES, StrategyKey } from '@/lib/wealth/sourceOfFunds';

interface Props {
  strategy: StrategyKey;
  onStrategy: (s: StrategyKey) => void;
  returnPct: number;
  onReturn: (r: number) => void;
  horizon: number;
  onHorizon: (h: number) => void;
}

export function ScenarioControls({
  strategy,
  onStrategy,
  returnPct,
  onReturn,
  horizon,
  onHorizon,
}: Props) {
  const active = STRATEGIES.find((s) => s.key === strategy);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Contribution strategy and return are separate choices</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Contribution strategy</p>
          <div className="flex flex-wrap gap-2">
            {STRATEGIES.map((s) => (
              <Button
                key={s.key}
                size="sm"
                variant={strategy === s.key ? 'default' : 'outline'}
                onClick={() => onStrategy(s.key)}
              >
                {s.label}
              </Button>
            ))}
          </div>
          {active && <p className="text-xs text-muted-foreground">{active.blurb}</p>}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Average annual return assumption</p>
          <div className="flex flex-wrap gap-2">
            {RETURN_OPTIONS.map((r) => (
              <Button
                key={r}
                size="sm"
                variant={returnPct === r ? 'default' : 'outline'}
                onClick={() => onReturn(r)}
              >
                {r}%
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Return assumptions are illustrative and are not guaranteed. A return never implies a different
            contribution level.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Horizon</p>
          <div className="flex flex-wrap items-center gap-2">
            {HORIZONS.map((h) => (
              <Button
                key={h}
                size="sm"
                variant={horizon === h ? 'default' : 'outline'}
                onClick={() => onHorizon(h)}
              >
                {h} years
              </Button>
            ))}
            <Badge variant="secondary">{horizon * 12} months</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
