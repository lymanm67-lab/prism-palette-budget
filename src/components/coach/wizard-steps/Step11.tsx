import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { StepProps } from './index';

const OPTS = [
  { v: 'debt', label: 'Pay down debt', sub: 'High-interest balances first' },
  { v: 'emergency', label: 'Emergency fund', sub: 'Until I hit my target reserve' },
  { v: 'invest', label: 'Investments', sub: 'Brokerage, retirement, or HSA' },
  { v: 'split', label: 'Split evenly', sub: 'A bit to each priority' },
];

export function Step11({ value, onChange }: StepProps) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold">When surplus appears, where should it go first?</Label>
      <RadioGroup
        value={value?.target || ''}
        onValueChange={(v) => onChange({ ...value, target: v })}
        className="space-y-2"
      >
        {OPTS.map(o => (
          <label key={o.v} className="flex items-start gap-3 rounded-lg border border-border/40 p-3 cursor-pointer hover:bg-muted/40">
            <RadioGroupItem value={o.v} id={`s11-${o.v}`} className="mt-0.5" />
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
