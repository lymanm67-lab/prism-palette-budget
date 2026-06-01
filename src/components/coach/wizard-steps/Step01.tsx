import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { StepProps } from './index';

const OPTS = [
  { v: 'on_track', label: 'On track', sub: 'Spending matched the plan' },
  { v: 'a_little_off', label: 'A little off', sub: 'A category or two went over' },
  { v: 'way_off', label: 'Way off', sub: 'Several budgets blew up' },
];

export function Step01({ value, onChange }: StepProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-semibold">How did last month feel?</Label>
        <RadioGroup
          value={value?.feeling || ''}
          onValueChange={(v) => onChange({ ...value, feeling: v })}
          className="mt-2 space-y-2"
        >
          {OPTS.map(o => (
            <label key={o.v} className="flex items-start gap-3 rounded-lg border border-border/40 p-3 cursor-pointer hover:bg-muted/40">
              <RadioGroupItem value={o.v} id={`s1-${o.v}`} className="mt-0.5" />
              <div>
                <div className="text-sm font-medium">{o.label}</div>
                <div className="text-xs text-muted-foreground">{o.sub}</div>
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>
      <div>
        <Label className="text-sm font-semibold">Anything specific worth noting? (optional)</Label>
        <Textarea
          value={value?.notes || ''}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
          placeholder="e.g. dining out got out of hand the last two weeks"
          className="mt-2"
          rows={2}
        />
      </div>
    </div>
  );
}
