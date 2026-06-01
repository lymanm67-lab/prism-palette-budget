import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { StepProps } from './index';

const OPTS = [
  { v: 'one_time', label: 'One-time event', sub: 'Travel, repair, gift, etc.' },
  { v: 'lifestyle_creep', label: 'Lifestyle creep', sub: 'Spending crept up gradually' },
  { v: 'income_timing', label: 'Income timing', sub: 'Paycheck arrived late or off-cycle' },
  { v: 'unrealistic_budget', label: 'Budget was unrealistic', sub: 'The number was never going to fit' },
];

export function Step02({ value, onChange }: StepProps) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold">Most likely cause?</Label>
      <RadioGroup
        value={value?.cause || ''}
        onValueChange={(v) => onChange({ ...value, cause: v })}
        className="space-y-2"
      >
        {OPTS.map(o => (
          <label key={o.v} className="flex items-start gap-3 rounded-lg border border-border/40 p-3 cursor-pointer hover:bg-muted/40">
            <RadioGroupItem value={o.v} id={`s2-${o.v}`} className="mt-0.5" />
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
