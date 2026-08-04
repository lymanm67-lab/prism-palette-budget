import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save, User } from 'lucide-react';
import { useHealthProfile, useUpdateHealthProfile } from '@/hooks/use-health';

const NUM_FIELDS = [
  ['start_weight', 'Starting weight (lb)', '0.1'],
  ['current_weight', 'Current weight (lb)', '0.1'],
  ['goal_weight', 'Goal weight (lb)', '0.1'],
  ['height_inches', 'Height (inches)', '0.5'],
  ['waist_inches', 'Waist (inches)', '0.25'],
  ['body_fat_pct', 'Body fat % (if measured)', '0.1'],
  ['daily_miles_goal', 'Daily walking goal (miles)', '0.1'],
  ['walk_days_per_week', 'Walking days per week', '1'],
  ['protein_goal_g', 'Daily protein goal (g)', '1'],
  ['water_goal_oz', 'Daily water goal (oz)', '1'],
  ['veg_goal_servings', 'Vegetable servings goal', '1'],
  ['fruit_goal_servings', 'Fruit servings goal', '1'],
] as const;

export default function HealthProfileTab() {
  const { data: profile } = useHealthProfile();
  const update = useUpdateHealthProfile();
  const [form, setForm] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (profile) setForm({ ...profile });
  }, [profile]);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    const patch: Record<string, unknown> = {
      person_name: form.person_name || null,
      birth_date: form.birth_date || null,
      sex: form.sex || null,
      start_date: form.start_date,
      target_date: form.target_date || null,
      notes: form.notes || null,
    };
    for (const [key] of NUM_FIELDS) {
      const raw = form[key];
      const n = parseFloat(String(raw));
      patch[key] = Number.isFinite(n) ? n : null;
    }
    update.mutate(patch);
  };

  if (!profile) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="h-4 w-4 text-prism-teal" /> Health profile &amp; goals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input
              value={String(form.person_name ?? '')}
              onChange={(e) => set('person_name', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Birth date</Label>
            <Input
              type="date"
              value={String(form.birth_date ?? '')}
              onChange={(e) => set('birth_date', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sex (for body-fat estimate)</Label>
            <Select value={String(form.sex ?? '')} onValueChange={(v) => set('sex', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Journey start date</Label>
            <Input
              type="date"
              value={String(form.start_date ?? '')}
              onChange={(e) => set('start_date', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Target date for goal weight</Label>
            <Input
              type="date"
              value={String(form.target_date ?? '')}
              onChange={(e) => set('target_date', e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {NUM_FIELDS.map(([key, label, step]) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs text-muted-foreground">{label}</Label>
              <Input
                type="number"
                step={step}
                value={String(form[key] ?? '')}
                onChange={(e) => set(key, e.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Notes</Label>
          <Textarea
            rows={3}
            value={String(form.notes ?? '')}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Medical considerations, coaching context, reminders…"
          />
        </div>

        <Button onClick={submit} disabled={update.isPending}>
          <Save className="mr-1 h-4 w-4" /> Save profile
        </Button>
      </CardContent>
    </Card>
  );
}
