import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { StepProps } from './index';

const OPTS = [
  { v: 'fast', label: 'Fast', sub: 'Catch up this month with aggressive cuts' },
  { v: 'balanced', label: 'Balanced', sub: 'Spread the recovery over 2-3 months' },
  { v: 'system', label: 'System', sub: 'Redesign the budget so it actually fits' },
  { v: 'wealth', label: 'Wealth', sub: 'Pause recovery, protect long-term saving instead' },
];

export function Step03({ value, onChange }: StepProps) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold">Which recovery style fits you best?</Label>
      <RadioGroup
        value={value?.style || ''}
        onValueChange={(v) => onChange({ ...value, style: v })}
        className="space-y-2"
      >
        {OPTS.map(o => (
          <label key={o.v} className="flex items-start gap-3 rounded-lg border border-border/40 p-3 cursor-pointer hover:bg-muted/40">
            <RadioGroupItem value={o.v} id={`s3-${o.v}`} className="mt-0.5" />
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
