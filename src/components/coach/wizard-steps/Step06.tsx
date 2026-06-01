import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { StepProps } from './index';

const OPTS = [
  { v: 'auto_cancel', label: 'Auto-flag for cancel', sub: 'Coach surfaces every detected leak with a one-click action' },
  { v: 'review_each', label: 'Review each one', sub: 'Coach alerts me — I decide what to keep' },
  { v: 'leave_alone', label: 'Leave them alone', sub: 'I want full control' },
];

export function Step06({ value, onChange }: StepProps) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold">How aggressive should Coach be with money leaks?</Label>
      <RadioGroup
        value={value?.mode || ''}
        onValueChange={(v) => onChange({ ...value, mode: v })}
        className="space-y-2"
      >
        {OPTS.map(o => (
          <label key={o.v} className="flex items-start gap-3 rounded-lg border border-border/40 p-3 cursor-pointer hover:bg-muted/40">
            <RadioGroupItem value={o.v} id={`s6-${o.v}`} className="mt-0.5" />
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
