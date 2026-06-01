import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { StepProps } from './index';

const WEEKS = [
  { v: 'w1', label: 'Week 1', sub: '1st–7th' },
  { v: 'w2', label: 'Week 2', sub: '8th–14th' },
  { v: 'w3', label: 'Week 3', sub: '15th–21st' },
  { v: 'w4', label: 'Week 4', sub: '22nd–end' },
  { v: 'spread', label: 'Spread evenly', sub: 'No single bad week' },
];

export function Step10({ value, onChange }: StepProps) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold">Which week of the month is hardest?</Label>
      <RadioGroup
        value={value?.stressWeek || ''}
        onValueChange={(v) => onChange({ ...value, stressWeek: v })}
        className="grid grid-cols-2 gap-2"
      >
        {WEEKS.map(o => (
          <label key={o.v} className="flex items-start gap-2 rounded-md border border-border/40 p-2.5 cursor-pointer hover:bg-muted/40">
            <RadioGroupItem value={o.v} id={`s10-${o.v}`} className="mt-0.5" />
            <div>
              <div className="text-sm font-medium">{o.label}</div>
              <div className="text-[11px] text-muted-foreground">{o.sub}</div>
            </div>
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}
