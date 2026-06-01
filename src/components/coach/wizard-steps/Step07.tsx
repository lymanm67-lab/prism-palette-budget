import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import type { StepProps } from './index';

export function Step07({ value, onChange }: StepProps) {
  const b = typeof value?.bufferPct === 'number' ? value.bufferPct : 20;
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-semibold">Comfort buffer (%)</Label>
        <p className="text-xs text-muted-foreground mt-1">How much of your spendable money should Coach hold back as a safety cushion?</p>
      </div>
      <div className="rounded-lg border border-border/40 p-4 bg-muted/30">
        <div className="text-3xl font-bold font-mono text-prism-lime text-center mb-3">{b}%</div>
        <Slider
          value={[b]}
          min={5}
          max={35}
          step={5}
          onValueChange={(v) => onChange({ ...value, bufferPct: v[0] })}
        />
        <div className="flex justify-between text-[11px] text-muted-foreground mt-2">
          <span>5% — tight</span>
          <span>35% — conservative</span>
        </div>
      </div>
    </div>
  );
}
