import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import type { StepProps } from './index';

export function Step05({ value, onChange }: StepProps) {
  const t = typeof value?.threshold === 'number' ? value.threshold : 50;
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-semibold">Cooling-off threshold</Label>
        <p className="text-xs text-muted-foreground mt-1">Any non-essential purchase above this triggers a 48-hour pause.</p>
      </div>
      <div className="rounded-lg border border-border/40 p-4 bg-muted/30">
        <div className="text-3xl font-bold font-mono text-prism-teal text-center mb-3">
          ${t}
        </div>
        <Slider
          value={[t]}
          min={25}
          max={500}
          step={25}
          onValueChange={(v) => onChange({ ...value, threshold: v[0] })}
        />
        <div className="flex justify-between text-[11px] text-muted-foreground mt-2">
          <span>$25</span>
          <span>$500</span>
        </div>
      </div>
    </div>
  );
}
