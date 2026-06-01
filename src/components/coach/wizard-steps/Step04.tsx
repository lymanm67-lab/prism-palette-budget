import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import type { StepProps } from './index';

export function Step04({ value, onChange }: StepProps) {
  const bufferPct = typeof value?.bufferPct === 'number' ? value.bufferPct : 20;
  const adaptive = value?.adaptive ?? true;

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-semibold">Comfort buffer</Label>
        <p className="text-xs text-muted-foreground mt-1">How much of your spendable money should Coach hold back as cushion?</p>
        <div className="rounded-lg border border-border/40 p-4 bg-muted/30 mt-2">
          <div className="text-3xl font-bold font-mono text-prism-lime text-center mb-3">{bufferPct}%</div>
          <Slider
            value={[bufferPct]}
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

      <label className="flex items-start gap-3 rounded-lg border border-border/40 p-3 cursor-pointer hover:bg-muted/40">
        <Switch
          checked={!!adaptive}
          onCheckedChange={(v) => onChange({ ...value, adaptive: v })}
          className="mt-0.5"
        />
        <div>
          <div className="text-sm font-medium">Let Coach adapt this buffer automatically</div>
          <div className="text-[11px] text-muted-foreground">
            Coach widens the buffer when risk signals appear (volatile income, recent overdrafts) and tightens it when things are calm.
            Turn off if you want to set it manually.
          </div>
        </div>
      </label>
    </div>
  );
}
