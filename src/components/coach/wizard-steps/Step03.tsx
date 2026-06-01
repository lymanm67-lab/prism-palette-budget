import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import type { StepProps } from './index';

const LEAK_OPTS = [
  { v: 'auto_cancel', label: 'Auto-flag for cancel', sub: 'Surface every detected leak with a one-click action' },
  { v: 'review_each', label: 'Review each one', sub: 'Alert me — I decide' },
  { v: 'leave_alone', label: 'Leave them alone', sub: 'I want full control' },
];

const AREAS = ['Dining', 'Subscriptions', 'Shopping', 'Groceries', 'Entertainment', 'Travel', 'Rideshare', 'Coffee'];

export function Step03({ value, onChange }: StepProps) {
  const threshold = typeof value?.threshold === 'number' ? value.threshold : 50;
  const selected: string[] = Array.isArray(value?.areas) ? value.areas : [];
  const customAreas: string[] = Array.isArray(value?.customAreas) ? value.customAreas : [];
  const [draft, setDraft] = useState('');
  const toggle = (a: string) => {
    onChange({
      ...value,
      areas: selected.includes(a) ? selected.filter(x => x !== a) : [...selected, a],
    });
  };
  const addCustom = () => {
    const v = draft.trim();
    if (!v) return;
    const all = [...customAreas, v];
    onChange({ ...value, customAreas: all, areas: [...selected, v] });
    setDraft('');
  };
  const removeCustom = (a: string) => {
    onChange({
      ...value,
      customAreas: customAreas.filter(x => x !== a),
      areas: selected.filter(x => x !== a),
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-semibold">Purchase Guard threshold</Label>
        <p className="text-xs text-muted-foreground mt-1">Non-essential purchases above this trigger a 48-hour pause.</p>
        <div className="rounded-lg border border-border/40 p-3 bg-muted/30 mt-2">
          <div className="text-2xl font-bold font-mono text-prism-teal text-center mb-2">${threshold}</div>
          <Slider
            value={[threshold]}
            min={25}
            max={500}
            step={25}
            onValueChange={(v) => onChange({ ...value, threshold: v[0] })}
          />
          <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5">
            <span>$25</span>
            <span>$500</span>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-semibold">Money Leaks — how aggressive?</Label>
        <RadioGroup
          value={value?.leakMode || ''}
          onValueChange={(v) => onChange({ ...value, leakMode: v })}
          className="mt-2 space-y-2"
        >
          {LEAK_OPTS.map(o => (
            <label key={o.v} className="flex items-start gap-3 rounded-lg border border-border/40 p-2.5 cursor-pointer hover:bg-muted/40">
              <RadioGroupItem value={o.v} id={`s3l-${o.v}`} className="mt-0.5" />
              <div>
                <div className="text-sm font-medium">{o.label}</div>
                <div className="text-[11px] text-muted-foreground">{o.sub}</div>
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div>
        <Label className="text-sm font-semibold">Prevention areas</Label>
        <p className="text-xs text-muted-foreground mt-1">Categories most likely to slip — change anytime.</p>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {AREAS.map(a => (
            <label key={a} className="flex items-center gap-2 rounded-md border border-border/40 p-2 cursor-pointer hover:bg-muted/40">
              <Checkbox checked={selected.includes(a)} onCheckedChange={() => toggle(a)} />
              <span className="text-sm">{a}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
