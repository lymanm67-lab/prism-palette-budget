import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ChefHat, ShoppingCart, Printer, Trash2 } from 'lucide-react';
import {
  PREP_COOK_ITEMS,
  PREP_SHOPPING_LIST,
  formatDate,
  prepStatus,
  todayISO,
} from '@/lib/health/healthEngine';
import { useHealthDelete, useHealthPrep, useHealthUpsert } from '@/hooks/use-health';

export default function MealPrepTab() {
  const { data: preps = [] } = useHealthPrep();
  const save = useHealthUpsert('health_meal_prep');
  const del = useHealthDelete('health_meal_prep');

  const current = preps[0] ?? null;
  const status = prepStatus(current);

  const [prepDate, setPrepDate] = useState(todayISO());
  const [containers, setContainers] = useState(12);

  const checked: string[] = useMemo(() => {
    const raw = current?.checklist;
    return Array.isArray(raw) ? (raw as string[]) : [];
  }, [current]);

  const shopChecked: string[] = useMemo(() => {
    const raw = current?.shopping_list;
    return Array.isArray(raw) ? (raw as string[]) : [];
  }, [current]);

  const toggle = (field: 'checklist' | 'shopping_list', list: string[], item: string) => {
    if (!current) return;
    const next = list.includes(item) ? list.filter((i) => i !== item) : [...list, item];
    save.mutate({ id: current.id, [field]: next });
  };

  const startSession = () =>
    save.mutate({
      prep_date: prepDate,
      containers_packed: containers,
      meals_consumed: 0,
      checklist: [],
      shopping_list: [],
    });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ChefHat className="h-4 w-4 text-prism-teal" /> Sunday prep session
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Prep date</Label>
              <Input type="date" value={prepDate} onChange={(e) => setPrepDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Containers to pack</Label>
              <Input
                type="number"
                value={containers}
                onChange={(e) => setContainers(parseInt(e.target.value) || 0)}
              />
            </div>
            <Button onClick={startSession}>New prep session</Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-1 h-4 w-4" /> Print plan
            </Button>
          </div>

          {current && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Prep of {formatDate(current.prep_date)}</p>
                  <p className="text-xs text-muted-foreground">
                    {status.packed} packed · {status.eaten} eaten · {status.remaining} left ·{' '}
                    {status.daysRemaining} days of meals covered
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      save.mutate({ id: current.id, meals_consumed: status.eaten + 1 })
                    }
                  >
                    Mark a meal eaten
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => del.mutate(current.id)}
                    aria-label="Delete prep session"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Progress value={status.completionPct * 100} className="mt-3 h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cook checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {PREP_COOK_ITEMS.map((item) => (
              <label key={item} className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/50">
                <Checkbox
                  checked={checked.includes(item)}
                  disabled={!current}
                  onCheckedChange={() => toggle('checklist', checked, item)}
                />
                <span className={checked.includes(item) ? 'text-sm line-through opacity-60' : 'text-sm'}>
                  {item}
                </span>
              </label>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-4 w-4 text-prism-amber" /> Shopping list
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {PREP_SHOPPING_LIST.map((item) => (
              <label key={item} className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/50">
                <Checkbox
                  checked={shopChecked.includes(item)}
                  disabled={!current}
                  onCheckedChange={() => toggle('shopping_list', shopChecked, item)}
                />
                <span
                  className={shopChecked.includes(item) ? 'text-sm line-through opacity-60' : 'text-sm'}
                >
                  {item}
                </span>
              </label>
            ))}
          </CardContent>
        </Card>
      </div>

      {preps.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Past prep sessions</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {preps.slice(1).map((p) => {
              const s = prepStatus(p);
              return (
                <div key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{formatDate(p.prep_date)}</span>
                  <span className="text-muted-foreground">
                    {s.eaten}/{s.packed} meals eaten
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
