import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CupSoda, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  DRINK_OPTIONS,
  drinkNutrition,
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

const SIZES = [8, 12, 16, 20, 24, 32];

export default function DrinksCard() {
  const { data: profile } = useHealthProfile();
  const { data: meals = [] } = useHealthMeals();
  const { data: today } = useTodayLog();
  const saveMeal = useHealthUpsert('health_meals');
  const delMeal = useHealthDelete('health_meals');
  const saveLog = useSaveDailyLog();

  const [drinkKey, setDrinkKey] = useState('water');
  const [ounces, setOunces] = useState('16');

  const oz = Math.max(0, Number(ounces) || 0);
  const calc = useMemo(() => drinkNutrition(drinkKey, oz), [drinkKey, oz]);

  const todaysDrinks = meals.filter(
    (m) => m.meal_date === todayISO() && m.meal_type === 'drink',
  );
  const drinkCalories = todaysDrinks.reduce((s, m) => s + (Number(m.calories) || 0), 0);
  const waterGoal = profile?.water_goal_oz ?? 100;
  const waterLogged = Number(today?.water_oz ?? 0);

  const log = () => {
    if (oz <= 0) {
      toast.error('Enter how many ounces');
      return;
    }
    saveMeal.mutate(
      {
        meal_date: todayISO(),
        meal_type: 'drink',
        name: `${calc.drink.label} — ${oz} oz`,
        calories: Math.round(calc.calories),
        protein_g: 0,
        carbs_g: 0,
        fiber_g: 0,
        fat_g: 0,
        components: { source: 'drinks', drink: drinkKey, ounces: oz },
      },
      {
        onSuccess: () => {
          toast.success('Drink logged');
          saveLog.mutate({
            log_date: todayISO(),
            water_oz: Math.round(waterLogged + calc.waterOz),
            ...(calc.drink.sugary ? { avoided_sugary_drinks: false } : {}),
          });
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CupSoda className="h-4 w-4 text-prism-sky" /> Drinks &amp; hydration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Type of drink</Label>
            <Select value={drinkKey} onValueChange={setDrinkKey}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DRINK_OPTIONS.map((d) => (
                  <SelectItem key={d.key} value={d.key}>
                    {d.label} — {d.caloriesPer8oz} cal / 8 oz
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Ounces</Label>
            <Input
              type="number"
              min="0"
              step="1"
              value={ounces}
              onChange={(e) => setOunces(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {SIZES.map((s) => (
            <Button key={s} size="sm" variant="outline" onClick={() => setOunces(String(s))}>
              {s} oz
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Calories</p>
              <p className="text-lg font-semibold tabular-nums">{Math.round(calc.calories)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Counts toward water</p>
              <p className="text-lg font-semibold tabular-nums">{Math.round(calc.waterOz)} oz</p>
            </div>
          </div>
          <Button size="sm" onClick={log} disabled={saveMeal.isPending}>
            <Plus className="mr-1 h-4 w-4" /> Log drink
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">{Math.round(drinkCalories)} cal from drinks today</Badge>
          <Badge variant="outline">
            Hydration {Math.round(waterLogged)} / {waterGoal} oz
          </Badge>
        </div>

        {todaysDrinks.length > 0 && (
          <div className="divide-y rounded-lg border">
            {todaysDrinks.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{Math.round(Number(m.calories) || 0)} kcal</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => delMeal.mutate(m.id)}
                  aria-label={`Remove ${m.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
