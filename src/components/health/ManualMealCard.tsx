import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { PencilLine, Sparkles, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { todayISO } from '@/lib/health/healthEngine';
import { useHealthUpsert, useSaveDailyLog, useTodayLog } from '@/hooks/use-health';

type Totals = { calories: number; protein_g: number; carbs_g: number; fiber_g: number; fat_g: number };
type Item = { label: string; portion: string } & Totals;

const EMPTY: Totals = { calories: 0, protein_g: 0, carbs_g: 0, fiber_g: 0, fat_g: 0 };

const FIELDS = [
  ['calories', 'Calories'],
  ['protein_g', 'Protein g'],
  ['carbs_g', 'Carbs g'],
  ['fiber_g', 'Fiber g'],
  ['fat_g', 'Fat g'],
] as const;

export default function ManualMealCard() {
  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const [mealType, setMealType] = useState('lunch');
  const [mealDate, setMealDate] = useState(todayISO());
  const [totals, setTotals] = useState<Totals>(EMPTY);
  const [items, setItems] = useState<Item[]>([]);
  const [confidence, setConfidence] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const saveMeal = useHealthUpsert('health_meals');
  const saveLog = useSaveDailyLog();
  const { data: today } = useTodayLog();

  const estimate = async () => {
    if (!description.trim()) return toast.error('Describe what you ate first');
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-meal-photo', {
        body: { description },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const res = data as any;
      setItems(res.items ?? []);
      setTotals({ ...EMPTY, ...(res.totals ?? {}) });
      setConfidence(res.confidence ?? null);
      setNotes(res.notes ?? '');
      if (!name.trim()) setName(res.name || description.slice(0, 60));
      if (res.meal_type) setMealType(res.meal_type);
      if (!res.items?.length) toast.error(res.notes || 'Could not identify any food');
      else toast.success('Nutrition estimated');
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not estimate that meal');
    } finally {
      setBusy(false);
    }
  };

  const logIt = () => {
    const mealName = name.trim() || description.trim().slice(0, 60);
    if (!mealName) return toast.error('Add a meal name');
    saveMeal.mutate(
      {
        meal_date: mealDate,
        meal_type: mealType,
        name: mealName,
        calories: Math.round(totals.calories),
        protein_g: Math.round(totals.protein_g),
        carbs_g: Math.round(totals.carbs_g),
        fiber_g: Math.round(totals.fiber_g),
        fat_g: Math.round(totals.fat_g),
        components: { source: 'manual_entry', description, confidence, items },
      },
      {
        onSuccess: () => {
          toast.success('Meal logged');
          if (mealDate === todayISO()) {
            saveLog.mutate({
              log_date: todayISO(),
              protein_g: (today?.protein_g ?? 0) + Math.round(totals.protein_g),
            });
          }
          setDescription('');
          setName('');
          setTotals(EMPTY);
          setItems([]);
          setConfidence(null);
          setNotes('');
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <PencilLine className="h-4 w-4 text-prism-teal" /> Add a meal manually
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Type what you ate and let AI estimate calories and macros from standard nutritional
          values. Every number stays editable before you log it.
        </p>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">What did you eat?</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="e.g. 6 oz grilled salmon, 1 cup roasted brussels sprouts, 1/2 cup brown rice, 1 tsp olive oil"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={estimate} disabled={busy}>
            {busy ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1 h-4 w-4" />
            )}
            {busy ? 'Estimating…' : 'Estimate with AI'}
          </Button>
          {confidence && (
            <Badge variant="outline" className="self-center capitalize">
              {confidence} confidence
            </Badge>
          )}
        </div>

        {items.length > 0 && (
          <div className="divide-y rounded-lg border bg-card">
            {items.map((i, idx) => (
              <div key={`${i.label}-${idx}`} className="flex justify-between gap-3 p-2 text-xs">
                <span className="min-w-0 truncate">
                  {i.label}
                  {i.portion ? ` · ${i.portion}` : ''}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {Math.round(i.calories)} kcal · {Math.round(i.protein_g)}g P
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1 sm:col-span-1">
            <Label className="text-xs text-muted-foreground">Meal name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Meal name" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Meal type</Label>
            <Select value={mealType} onValueChange={setMealType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="breakfast">Breakfast</SelectItem>
                <SelectItem value="lunch">Lunch</SelectItem>
                <SelectItem value="dinner">Dinner</SelectItem>
                <SelectItem value="snack">Snack</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Date</Label>
            <Input type="date" value={mealDate} onChange={(e) => setMealDate(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {FIELDS.map(([key, label]) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs text-muted-foreground">{label}</Label>
              <Input
                type="number"
                min="0"
                value={totals[key]}
                onChange={(e) =>
                  setTotals({ ...totals, [key]: Math.max(0, parseFloat(e.target.value) || 0) })
                }
              />
            </div>
          ))}
        </div>

        {notes && <p className="text-xs text-muted-foreground">{notes}</p>}

        <Button size="sm" onClick={logIt} disabled={saveMeal.isPending}>
          <Plus className="mr-1 h-4 w-4" /> Log this meal
        </Button>
      </CardContent>
    </Card>
  );
}
