import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { plannedHourTiers, type GapStrategyState } from '@/lib/ltc/gapstrategy';

/** Real planned care hours — free entry, with comparison points built around the plan. */
export function PlannedHoursControl({ g, patchG, compact }: {
  g: GapStrategyState; patchG: (p: Partial<GapStrategyState>) => void; compact?: boolean;
}) {
  const hours = g.weeklyHours;
  const tiers = plannedHourTiers(hours);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <Label className="text-xs">My planned care hours / week</Label>
          <Input
            type="number"
            min={1}
            max={168}
            value={hours}
            onChange={(e) => patchG({ weeklyHours: Math.max(1, Math.min(168, Number(e.target.value) || 0)) })}
          />
        </div>
        <div className="flex-1 min-w-[180px] pb-2">
          <Slider
            value={[hours]}
            min={2}
            max={60}
            step={1}
            onValueChange={([v]) => patchG({ weeklyHours: v })}
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            {hours} hrs/week ≈ {(hours / 7).toFixed(1)} hrs/day
          </p>
        </div>
      </div>
      {!compact && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Compare around my plan:</span>
          {tiers.map((t) => (
            <Button key={t} size="sm" variant={t === hours ? 'default' : 'outline'} onClick={() => patchG({ weeklyHours: t })}>
              {t}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
