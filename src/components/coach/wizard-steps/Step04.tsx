import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { StepProps } from './index';

const AREAS = ['Dining', 'Subscriptions', 'Shopping', 'Groceries', 'Entertainment', 'Travel', 'Rideshare', 'Coffee'];

export function Step04({ value, onChange }: StepProps) {
  const selected: string[] = Array.isArray(value?.areas) ? value.areas : [];
  const toggle = (a: string) => {
    onChange({
      ...value,
      areas: selected.includes(a) ? selected.filter(x => x !== a) : [...selected, a],
    });
  };
  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold">Where should Coach enforce prevention rules?</Label>
      <p className="text-xs text-muted-foreground">Pick the categories most likely to slip. You can change these later.</p>
      <div className="grid grid-cols-2 gap-2">
        {AREAS.map(a => (
          <label key={a} className="flex items-center gap-2 rounded-md border border-border/40 p-2 cursor-pointer hover:bg-muted/40">
            <Checkbox checked={selected.includes(a)} onCheckedChange={() => toggle(a)} />
            <span className="text-sm">{a}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
