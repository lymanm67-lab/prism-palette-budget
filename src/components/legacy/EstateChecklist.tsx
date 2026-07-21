import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useEstateChecklist, useUpsertEstateItem } from '@/hooks/use-financial-os';
import { ESTATE_CHECKLIST_ITEMS } from '@/lib/progression/beltRules';

export function EstateChecklist() {
  const { data: rows = [] } = useEstateChecklist();
  const upsert = useUpsertEstateItem();
  const status = new Map<string, any>((rows as any[]).map((r: any) => [r.item_key, r]));

  const complete = ESTATE_CHECKLIST_ITEMS.filter(i => status.get(i.key)?.is_complete).length;
  const pct = (complete / ESTATE_CHECKLIST_ITEMS.length) * 100;

  const byCategory = ESTATE_CHECKLIST_ITEMS.reduce<Record<string, typeof ESTATE_CHECKLIST_ITEMS>>((acc, it) => {
    (acc[it.category] ||= []).push(it);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Estate Planning Checklist</span>
            <span className="text-xs font-normal text-muted-foreground">{complete}/{ESTATE_CHECKLIST_ITEMS.length} complete</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={pct} className="h-2" />
        </CardContent>
      </Card>

      {Object.entries(byCategory).map(([cat, items]) => (
        <Card key={cat}>
          <CardHeader><CardTitle className="text-sm">{cat}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {items.map(item => {
              const row = status.get(item.key);
              return (
                <div key={item.key} className="flex items-center gap-3 p-2 rounded border border-border/40">
                  <Checkbox
                    checked={!!row?.is_complete}
                    onCheckedChange={(v) => upsert.mutate({ item_key: item.key, is_complete: !!v, notes: row?.notes || '', professional_name: row?.professional_name || '' })}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{item.label}</div>
                  </div>
                  <Input
                    placeholder="Professional / firm"
                    className="max-w-[220px] h-8 text-xs"
                    defaultValue={row?.professional_name || ''}
                    onBlur={(e) => upsert.mutate({ item_key: item.key, is_complete: !!row?.is_complete, professional_name: e.target.value, notes: row?.notes || '' })}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
