import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Utensils, Plus, Trash2, Coffee, Pencil } from 'lucide-react';
import {
  BOWL_CARBS,
  BOWL_PROTEINS,
  BOWL_PROTEIN_TARGET,
  BOWL_VEGETABLES,
  BREAKFAST_OPTIONS,
  SEASONINGS,
  bowlNutrition,
  todayISO,
} from '@/lib/health/healthEngine';
import {
  useHealthDelete,
  useHealthMeals,
  useHealthProfile,
  useHealthUpsert,
  useSaveDailyLog,
  useTodayLog,
} from '@/hooks/use-health';
import MealScanner from '@/components/health/MealScanner';
import SupplementsCard from '@/components/health/SupplementsCard';
import { toast } from 'sonner';



export default function NutritionTab() {
  const { data: profile } = useHealthProfile();
  const { data: meals = [] } = useHealthMeals();
  const { data: today } = useTodayLog();
  const saveMeal = useHealthUpsert('health_meals');
  const delMeal = useHealthDelete('health_meals');
  const saveLog = useSaveDailyLog();

  const [proteinKey, setProteinKey] = useState('chicken');
  const [servings, setServings] = useState(1);
  const [vegKeys, setVegKeys] = useState<string[]>(['onions', 'peppers', 'broccoli']);
  const [carbKey, setCarbKey] = useState('half_half');
  const [oil, setOil] = useState(true);
  const [seasoning, setSeasoning] = useState(SEASONINGS[0]);
  const [mealType, setMealType] = useState('lunch');

  const facts = useMemo(
    () => bowlNutrition({ proteinKey, vegKeys, carbKey, includeOil: oil, proteinServings: servings }),
    [proteinKey, vegKeys, carbKey, oil, servings],
  );

  const inTarget = facts.protein >= BOWL_PROTEIN_TARGET.min && facts.protein <= BOWL_PROTEIN_TARGET.max;

  const toggleVeg = (key: string) =>
    setVegKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const proteinLabel = BOWL_PROTEINS.find((p) => p.key === proteinKey)?.label ?? '';
  const bowlName = `${proteinLabel} Power Bowl (${seasoning})`;

  const logMeal = (name: string, f: typeof facts, type: string) => {
    saveMeal.mutate(
      {
        meal_date: todayISO(),
        meal_type: type,
        name,
        calories: Math.round(f.calories),
        protein_g: Math.round(f.protein),
        carbs_g: Math.round(f.carbs),
        fiber_g: Math.round(f.fiber),
        fat_g: Math.round(f.fat),
        components: {
          source: 'bowl_builder',
          protein: proteinKey,
          protein_servings: servings,
          carb: carbKey,
          vegetables: vegKeys,
          oil,
          seasoning,
        },
      },
      {
        onSuccess: () => {
          toast.success('Meal logged');
          saveLog.mutate({
            log_date: todayISO(),
            protein_g: (today?.protein_g ?? 0) + Math.round(f.protein),
          });
        },
      },
    );
  };


  const dayTotals = meals
    .filter((m) => m.meal_date === todayISO())
    .reduce(
      (s, m) => ({
        calories: s.calories + (Number(m.calories) || 0),
        protein: s.protein + (Number(m.protein_g) || 0),
        carbs: s.carbs + (Number(m.carbs_g) || 0),
        fiber: s.fiber + (Number(m.fiber_g) || 0),
        fat: s.fat + (Number(m.fat_g) || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fiber: 0, fat: 0 },
    );

  return (
    <div className="space-y-6">
      <MealScanner />
      <SupplementsCard />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Utensils className="h-4 w-4 text-prism-teal" /> Signature Power Bowl builder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Protein (6 oz base)</Label>
              <Select value={proteinKey} onValueChange={setProteinKey}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BOWL_PROTEINS.map((p) => (
                    <SelectItem key={p.key} value={p.key}>
                      {p.label} — {p.facts.protein}g
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                step="0.25"
                min="0.25"
                value={servings}
                onChange={(e) => setServings(Math.max(0.25, parseFloat(e.target.value) || 1))}
              />
              <p className="text-xs text-muted-foreground">Servings of the 6 oz portion</p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Carbohydrate base</Label>
              <Select value={carbKey} onValueChange={setCarbKey}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BOWL_CARBS.map((c) => (
                    <SelectItem key={c.key} value={c.key}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label className="text-xs text-muted-foreground">Seasoning</Label>
              <Select value={seasoning} onValueChange={setSeasoning}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEASONINGS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Vegetables</Label>
              <div className="flex flex-wrap gap-2">
                {BOWL_VEGETABLES.map((v) => (
                  <Button
                    key={v.key}
                    type="button"
                    size="sm"
                    variant={vegKeys.includes(v.key) ? 'default' : 'outline'}
                    onClick={() => toggleVeg(v.key)}
                  >
                    {v.label}
                  </Button>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-lg border p-2">
                <span className="text-xs">1 tbsp olive oil</span>
                <Switch checked={oil} onCheckedChange={setOil} />
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{bowlName}</p>
                <p className="text-xs text-muted-foreground">
                  {vegKeys.length} vegetables ·{' '}
                  {BOWL_CARBS.find((c) => c.key === carbKey)?.serving}
                </p>
              </div>
              <Badge
                variant="outline"
                className={
                  inTarget
                    ? 'border-prism-lime/30 bg-prism-lime/15 text-prism-lime'
                    : 'border-prism-amber/30 bg-prism-amber/15 text-prism-amber'
                }
              >
                {inTarget ? 'In 35-45g protein target' : `${Math.round(facts.protein)}g protein`}
              </Badge>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {([
                ['Calories', Math.round(facts.calories)],
                ['Protein', `${Math.round(facts.protein)}g`],
                ['Carbs', `${Math.round(facts.carbs)}g`],
                ['Fiber', `${facts.fiber.toFixed(1)}g`],
                ['Fat', `${Math.round(facts.fat)}g`],
              ] as const).map(([l, v]) => (
                <div key={l}>
                  <p className="text-xs text-muted-foreground">{l}</p>
                  <p className="text-lg font-semibold tabular-nums">{v}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Select value={mealType} onValueChange={setMealType}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                  <SelectItem value="snack">Snack</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={() => logMeal(bowlName, facts, mealType)}>
                <Plus className="mr-1 h-4 w-4" /> Log this bowl
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Coffee className="h-4 w-4 text-prism-amber" /> Breakfast options
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {BREAKFAST_OPTIONS.map((b) => (
            <div key={b.key} className="rounded-lg border p-4">
              <p className="text-sm font-medium">{b.label}</p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {b.items.map((i) => (
                  <li key={i}>• {i}</li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                <span>{b.facts.calories} kcal</span>
                <span>{b.facts.protein}g protein</span>
                <span>{b.facts.carbs}g carbs</span>
                <span>{b.facts.fat}g fat</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => logMeal(b.label, b.facts, 'breakfast')}
              >
                <Plus className="mr-1 h-4 w-4" /> Log breakfast
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Today's meals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {([
              ['Calories', Math.round(dayTotals.calories)],
              ['Protein', `${Math.round(dayTotals.protein)} / ${profile?.protein_goal_g ?? 140}g`],
              ['Carbs', `${Math.round(dayTotals.carbs)}g`],
              ['Fiber', `${dayTotals.fiber.toFixed(1)}g`],
              ['Fat', `${Math.round(dayTotals.fat)}g`],
            ] as const).map(([l, v]) => (
              <div key={l} className="rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground">{l}</p>
                <p className="mt-1 font-semibold tabular-nums">{v}</p>
              </div>
            ))}
          </div>

          {meals.filter((m) => m.meal_date === todayISO()).length === 0 ? (
            <p className="text-sm text-muted-foreground">No meals logged today yet.</p>
          ) : (
            <div className="divide-y rounded-lg border">
              {meals
                .filter((m) => m.meal_date === todayISO())
                .map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{m.name}</p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {m.meal_type} · {m.calories} kcal · {m.protein_g}g protein
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditing({ ...m })}
                        aria-label={`Edit ${m.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => delMeal.mutate(m.id)}
                        aria-label={`Remove ${m.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit meal</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Food / meal name</Label>
                <Input
                  value={editing.name ?? ''}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Date</Label>
                  <Input
                    type="date"
                    value={editing.meal_date ?? ''}
                    onChange={(e) => setEditing({ ...editing, meal_date: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Meal</Label>
                  <Select
                    value={editing.meal_type ?? 'lunch'}
                    onValueChange={(v) => setEditing({ ...editing, meal_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['breakfast', 'lunch', 'dinner', 'snack'].map((t) => (
                        <SelectItem key={t} value={t} className="capitalize">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {([
                  ['calories', 'Calories'],
                  ['protein_g', 'Protein (g)'],
                  ['carbs_g', 'Carbs (g)'],
                  ['fiber_g', 'Fiber (g)'],
                  ['fat_g', 'Fat (g)'],
                ] as const).map(([field, label]) => (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{label}</Label>
                    <Input
                      type="number"
                      value={editing[field] ?? 0}
                      onChange={(e) =>
                        setEditing({ ...editing, [field]: Number(e.target.value) || 0 })
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    saveMeal.mutate(
                      {
                        id: editing.id,
                        name: editing.name,
                        meal_date: editing.meal_date,
                        meal_type: editing.meal_type,
                        calories: Math.round(Number(editing.calories) || 0),
                        protein_g: Math.round(Number(editing.protein_g) || 0),
                        carbs_g: Math.round(Number(editing.carbs_g) || 0),
                        fiber_g: Number(editing.fiber_g) || 0,
                        fat_g: Math.round(Number(editing.fat_g) || 0),
                      },
                      {
                        onSuccess: () => {
                          toast.success('Meal updated');
                          setEditing(null);
                        },
                      },
                    )
                  }
                >
                  Save changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
