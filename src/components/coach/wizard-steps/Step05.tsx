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

const WEEKS = [
  { v: 'w1', label: 'Week 1', sub: '1st–7th' },
  { v: 'w2', label: 'Week 2', sub: '8th–14th' },
  { v: 'w3', label: 'Week 3', sub: '15th–21st' },
  { v: 'w4', label: 'Week 4', sub: '22nd–end' },
  { v: 'spread', label: 'Evenly spread', sub: 'No single bad week' },
];

export function Step05({ value, onChange }: StepProps) {
  return (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-semibold">How often are you paid?</Label>
        <RadioGroup
          value={value?.frequency || ''}
          onValueChange={(v) => onChange({ ...value, frequency: v })}
          className="grid grid-cols-2 gap-2 mt-2"
        >
          {FREQ.map(o => (
            <label key={o.v} className="flex items-center gap-2 rounded-md border border-border/40 p-2 cursor-pointer hover:bg-muted/40">
              <RadioGroupItem value={o.v} id={`s5f-${o.v}`} />
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

      <div>
        <Label className="text-sm font-semibold">Which week of the month is hardest?</Label>
        <p className="text-xs text-muted-foreground mt-1">Coach will shift bill due-dates away from this week.</p>
        <RadioGroup
          value={value?.stressWeek || ''}
          onValueChange={(v) => onChange({ ...value, stressWeek: v })}
          className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2"
        >
          {WEEKS.map(o => (
            <label key={o.v} className="flex items-start gap-2 rounded-md border border-border/40 p-2.5 cursor-pointer hover:bg-muted/40">
              <RadioGroupItem value={o.v} id={`s5w-${o.v}`} className="mt-0.5" />
              <div>
                <div className="text-sm font-medium">{o.label}</div>
                <div className="text-[11px] text-muted-foreground">{o.sub}</div>
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
}
