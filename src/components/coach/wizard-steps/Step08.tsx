import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { StepProps } from './index';

const OPTS = [
  { v: 'yes', label: 'Yes, adapt automatically', sub: 'Coach widens or tightens my buffer as income/expenses change' },
  { v: 'suggest', label: 'Only suggest changes', sub: 'I want to approve every adjustment' },
  { v: 'no', label: 'Keep buffer fixed', sub: 'Use exactly what I set in step 7' },
];

export function Step08({ value, onChange }: StepProps) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold">Adaptive buffer?</Label>
      <RadioGroup
        value={value?.adaptive || ''}
        onValueChange={(v) => onChange({ ...value, adaptive: v })}
        className="space-y-2"
      >
        {OPTS.map(o => (
          <label key={o.v} className="flex items-start gap-3 rounded-lg border border-border/40 p-3 cursor-pointer hover:bg-muted/40">
            <RadioGroupItem value={o.v} id={`s8-${o.v}`} className="mt-0.5" />
            <div>
              <div className="text-sm font-medium">{o.label}</div>
              <div className="text-xs text-muted-foreground">{o.sub}</div>
            </div>
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}
