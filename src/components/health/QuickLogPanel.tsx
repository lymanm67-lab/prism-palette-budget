import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Droplets, Footprints, Beef, Scale, Save } from 'lucide-react';
import { useSaveDailyLog, useTodayLog, useHealthProfile } from '@/hooks/use-health';
import { todayISO } from '@/lib/health/healthEngine';

export default function QuickLogPanel() {
  const { data: profile } = useHealthProfile();
  const { data: today } = useTodayLog();
  const save = useSaveDailyLog();

  const initial = useMemo(
    () => ({
      miles: today?.miles ?? 0,
      steps: today?.steps ?? '',
      minutes_walked: today?.minutes_walked ?? '',
      protein_g: today?.protein_g ?? 0,
      water_oz: today?.water_oz ?? 0,
      veg_servings: today?.veg_servings ?? 0,
      fruit_servings: today?.fruit_servings ?? 0,
      weight: today?.weight ?? '',
      sleep_hours: today?.sleep_hours ?? '',
      energy_rating: today?.energy_rating ?? 3,
      focus_rating: today?.focus_rating ?? 3,
      stress_rating: today?.stress_rating ?? 3,
      mood_rating: today?.mood_rating ?? 3,
      avoided_processed_carbs: today?.avoided_processed_carbs ?? false,
      avoided_sugary_drinks: today?.avoided_sugary_drinks ?? false,
      notes: today?.notes ?? '',
    }),
    [today],
  );

  const [form, setForm] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const view = dirty ? form : initial;

  const set = (patch: Partial<typeof initial>) => {
    setForm({ ...view, ...patch });
    setDirty(true);
  };

  const num = (v: unknown) => {
    const n = parseFloat(String(v));
    return Number.isFinite(n) ? n : null;
  };

  const commit = (patch?: Partial<typeof initial>) => {
    const v = { ...view, ...(patch ?? {}) };
    save.mutate(
      {
        log_date: todayISO(),
        miles: num(v.miles) ?? 0,
        steps: num(v.steps),
        minutes_walked: num(v.minutes_walked),
        protein_g: num(v.protein_g) ?? 0,
        water_oz: num(v.water_oz) ?? 0,
        veg_servings: num(v.veg_servings) ?? 0,
        fruit_servings: num(v.fruit_servings) ?? 0,
        weight: num(v.weight),
        sleep_hours: num(v.sleep_hours),
        energy_rating: v.energy_rating,
        focus_rating: v.focus_rating,
        stress_rating: v.stress_rating,
        mood_rating: v.mood_rating,
        avoided_processed_carbs: v.avoided_processed_carbs,
        avoided_sugary_drinks: v.avoided_sugary_drinks,
        notes: v.notes || null,
      },
      { onSuccess: () => setDirty(false) },
    );
  };

  const bumpWater = (oz: number) => {
    const next = Math.max(0, (num(view.water_oz) ?? 0) + oz);
    set({ water_oz: next });
    commit({ water_oz: next });
  };

  const addMiles = (mi: number) => {
    const next = Math.max(0, (num(view.miles) ?? 0) + mi);
    set({ miles: next });
    commit({ miles: next });
  };

  const proteinLeft = Math.max(0, (profile?.protein_goal_g ?? 140) - (num(view.protein_g) ?? 0));
  const waterLeft = Math.max(0, (profile?.water_goal_oz ?? 100) - (num(view.water_oz) ?? 0));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span>Today's deposits</span>
          <Button size="sm" onClick={() => commit()} disabled={save.isPending}>
            <Save className="mr-1 h-4 w-4" /> Save
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Footprints className="h-4 w-4 text-prism-teal" /> Miles walked
            </Label>
            <Input
              type="number"
              step="0.1"
              value={String(view.miles)}
              onChange={(e) => set({ miles: e.target.value as never })}
              onBlur={() => commit()}
            />
            <div className="flex gap-2">
              {[0.5, 1, 3.5].map((mi) => (
                <Button key={mi} variant="outline" size="sm" onClick={() => addMiles(mi)}>
                  +{mi}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Droplets className="h-4 w-4 text-prism-sky" /> Water (oz) — {waterLeft} oz to go
            </Label>
            <Input
              type="number"
              value={String(view.water_oz)}
              onChange={(e) => set({ water_oz: e.target.value as never })}
              onBlur={() => commit()}
            />
            <div className="flex gap-2">
              {[8, 16, 24].map((oz) => (
                <Button key={oz} variant="outline" size="sm" onClick={() => bumpWater(oz)}>
                  +{oz} oz
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Beef className="h-4 w-4 text-prism-orange" /> Protein (g) — {proteinLeft} g to go
            </Label>
            <Input
              type="number"
              value={String(view.protein_g)}
              onChange={(e) => set({ protein_g: e.target.value as never })}
              onBlur={() => commit()}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Scale className="h-4 w-4 text-prism-amber" /> Weight (lb)
            </Label>
            <Input
              type="number"
              step="0.1"
              placeholder="Log a weigh-in"
              value={String(view.weight)}
              onChange={(e) => set({ weight: e.target.value as never })}
              onBlur={() => commit()}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { k: 'veg_servings' as const, label: 'Vegetable servings' },
            { k: 'fruit_servings' as const, label: 'Fruit servings' },
            { k: 'steps' as const, label: 'Steps' },
            { k: 'sleep_hours' as const, label: 'Sleep (hrs)' },
          ].map((f) => (
            <div className="space-y-1" key={f.k}>
              <Label className="text-xs text-muted-foreground">{f.label}</Label>
              <Input
                type="number"
                step={f.k === 'sleep_hours' ? '0.25' : '1'}
                value={String(view[f.k])}
                onChange={(e) => set({ [f.k]: e.target.value } as never)}
                onBlur={() => commit()}
              />
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <span className="text-sm">No soft drinks or sugary beverages</span>
            <Switch
              checked={view.avoided_sugary_drinks}
              onCheckedChange={(c) => {
                set({ avoided_sugary_drinks: c });
                commit({ avoided_sugary_drinks: c });
              }}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <span className="text-sm">Limited bread, pasta, processed carbs</span>
            <Switch
              checked={view.avoided_processed_carbs}
              onCheckedChange={(c) => {
                set({ avoided_processed_carbs: c });
                commit({ avoided_processed_carbs: c });
              }}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          {([
            ['energy_rating', 'Energy'],
            ['focus_rating', 'Focus'],
            ['stress_rating', 'Stress'],
            ['mood_rating', 'Mood'],
          ] as const).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                {label}: {view[key]}/5
              </Label>
              <Slider
                min={1}
                max={5}
                step={1}
                value={[Number(view[key]) || 3]}
                onValueChange={([v]) => set({ [key]: v } as never)}
                onValueCommit={([v]) => commit({ [key]: v } as never)}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
