import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { StepProps } from './index';

const FREQ = [
  { v: 'weekly', label: 'Weekly' },
  { v: 'biweekly', label: 'Every 2 weeks' },
  { v: 'semimonthly', label: 'Twice a month' },
  { v: 'monthly', label: 'Monthly' },
];

export function Step09({ value, onChange }: StepProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-semibold">How often are you paid?</Label>
        <RadioGroup
          value={value?.frequency || ''}
          onValueChange={(v) => onChange({ ...value, frequency: v })}
          className="grid grid-cols-2 gap-2 mt-2"
        >
          {FREQ.map(o => (
            <label key={o.v} className="flex items-center gap-2 rounded-md border border-border/40 p-2 cursor-pointer hover:bg-muted/40">
              <RadioGroupItem value={o.v} id={`s9-${o.v}`} />
              <span className="text-sm">{o.label}</span>
            </label>
          ))}
        </RadioGroup>
      </div>
      <div>
        <Label className="text-sm font-semibold">Next paycheck date</Label>
        <Input
          type="date"
          value={value?.nextDate || ''}
          onChange={(e) => onChange({ ...value, nextDate: e.target.value })}
          className="mt-2"
        />
      </div>
    </div>
  );
}
