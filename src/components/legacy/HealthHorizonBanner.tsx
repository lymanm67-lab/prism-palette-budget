// Health-adjusted horizon banner — lets retirement models adopt the health engine's
// planning age instead of a hardcoded end age.
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HeartPulse } from 'lucide-react';
import { useHealthHorizon } from '@/hooks/use-longevity';

export default function HealthHorizonBanner({
  currentEndAge,
  onApply,
}: {
  currentEndAge?: number;
  onApply?: (planningAge: number) => void;
}) {
  const { horizon, isLoading } = useHealthHorizon();
  if (isLoading) return null;

  const target = Math.round(horizon.planningAge);
  const matches = currentEndAge != null && Math.round(currentEndAge) === target;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <HeartPulse className="mt-0.5 h-5 w-5 text-prism-rose" />
        <div className="text-sm">
          <p className="font-semibold">
            Health-adjusted planning horizon: age {target}
          </p>
          <p className="text-xs text-muted-foreground">
            Family-history baseline {horizon.baselineAge} {horizon.extraYears >= 0 ? '+' : ''}
            {horizon.extraYears.toFixed(1)} yrs from your logged habits · healthspan to{' '}
            {Math.round(horizon.healthspanAge)} · {horizon.confidence} confidence
            {!horizon.hasData && ' (no health data yet — using baseline)'}
          </p>
        </div>
      </div>
      {onApply && (
        matches ? (
          <Badge variant="secondary">Applied to this model</Badge>
        ) : (
          <Button size="sm" variant="outline" onClick={() => onApply(target)}>
            Use age {target} in this model
          </Button>
        )
      )}
    </div>
  );
}
