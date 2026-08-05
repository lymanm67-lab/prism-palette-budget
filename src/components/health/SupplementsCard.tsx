import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pill, Check, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { todayISO } from '@/lib/health/healthEngine';
import { useHealthMeals, useHealthUpsert } from '@/hooks/use-health';

// Veyttisy Men's 50+ sugar-free multivitamin gummies — 2 per day.
export const SUPPLEMENT_REGIMEN = {
  name: "Veyttisy Men's 50+ multivitamin (sugar-free gummies)",
  dailyCount: 2,
  caloriesEach: 5,
  carbsEachG: 2,
};

export default function SupplementsCard() {
  const { data: meals = [] } = useHealthMeals();
  const saveMeal = useHealthUpsert('health_meals');
  const [count, setCount] = useState(SUPPLEMENT_REGIMEN.dailyCount);

  const takenToday = meals.find(
    (m) => m.meal_date === todayISO() && m.meal_type === 'supplement',
  );

  const log = () => {
    const n = Math.max(1, Math.round(count));
    saveMeal.mutate({
      ...(takenToday ? { id: takenToday.id } : {}),
      meal_date: todayISO(),
      meal_type: 'supplement',
      name: `${SUPPLEMENT_REGIMEN.name} ×${n}`,
      calories: n * SUPPLEMENT_REGIMEN.caloriesEach,
      protein_g: 0,
      carbs_g: n * SUPPLEMENT_REGIMEN.carbsEachG,
      fiber_g: 0,
      fat_g: 0,
      components: { source: 'supplement', gummies: n },
    });
    toast.success(takenToday ? 'Supplement log updated' : 'Supplements logged');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Pill className="h-4 w-4 text-prism-amber" /> Daily supplements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">{SUPPLEMENT_REGIMEN.name}</p>
            <p className="text-xs text-muted-foreground">
              {SUPPLEMENT_REGIMEN.dailyCount} gummies/day · ~
              {SUPPLEMENT_REGIMEN.dailyCount * SUPPLEMENT_REGIMEN.caloriesEach} kcal ·{' '}
              {SUPPLEMENT_REGIMEN.dailyCount * SUPPLEMENT_REGIMEN.carbsEachG}g carbs · no added
              sugar
            </p>
          </div>
          {takenToday ? (
            <Badge
              variant="outline"
              className="border-prism-lime/30 bg-prism-lime/15 text-prism-lime"
            >
              <Check className="mr-1 h-3 w-3" /> Taken today
            </Badge>
          ) : (
            <Badge variant="outline">Not logged today</Badge>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gummies taken</Label>
            <Input
              type="number"
              min="1"
              max="6"
              className="w-24"
              value={count}
              onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
          <Button size="sm" onClick={log}>
            <Plus className="mr-1 h-4 w-4" /> {takenToday ? 'Update today' : 'Log supplements'}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Educational tracking only — not medical advice. Gummy calories are counted in your daily
          totals so calorie math stays honest.
        </p>
      </CardContent>
    </Card>
  );
}
