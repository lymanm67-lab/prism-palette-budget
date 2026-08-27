import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Lock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

/**
 * Baseline locking for planned income and pre-tax deduction categories.
 *
 * A locked category's planned amount is protected by a database safeguard, so
 * CSV imports, paystub parsing, provider re-syncs and the monthly hygiene job
 * can never overwrite the baseline. Unlock to edit it by hand.
 */
const isBaselineGroup = (name?: string | null) =>
  /income|salary|payroll|pre[\s-]?tax|deduction|withhold|revenue/i.test(name || '');

export default function BaselineLockManager() {
  const { household } = useHousehold();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['baseline-lock-categories', household?.id],
    enabled: !!household?.id,
    queryFn: async () => {
      const { data: cats, error } = await supabase
        .from('categories')
        .select('id, name, baseline_locked, category_groups(name)')
        .eq('household_id', household!.id)
        .order('name');
      if (error) throw error;
      return (cats ?? []).filter((c: any) =>
        isBaselineGroup(c.category_groups?.name) || isBaselineGroup(c.name),
      ) as any[];
    },
  });

  const setLock = async (ids: string[], locked: boolean) => {
    const { error } = await supabase
      .from('categories')
      .update({ baseline_locked: locked } as any)
      .in('id', ids);
    if (error) {
      toast({ title: 'Could not update lock', description: error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: locked ? 'Baseline locked' : 'Baseline unlocked',
      description: locked
        ? 'Imports and provider re-syncs can no longer change these planned amounts.'
        : 'Planned amounts can be edited again.',
    });
    qc.invalidateQueries({ queryKey: ['baseline-lock-categories'] });
    qc.invalidateQueries({ queryKey: ['budget-planner'] });
  };

  const rows = data ?? [];
  const lockedCount = rows.filter((r: any) => r.baseline_locked).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4 text-prism-teal" /> Baseline locking
            <Badge variant="outline" className="text-[10px]">
              {lockedCount}/{rows.length} locked
            </Badge>
          </CardTitle>
          {rows.length > 0 && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLock(rows.map((r: any) => r.id), true)}
              >
                Lock all
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setLock(rows.map((r: any) => r.id), false)}
              >
                Unlock all
              </Button>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Locked income and pre-tax deduction baselines are protected at the database level — CSV
          imports, paystub parsing, provider re-syncs and the monthly hygiene job cannot overwrite
          them. Unlock a row to change its planned amount yourself.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading categories…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No income or pre-tax deduction categories found yet.
          </p>
        ) : (
          <div className="divide-y">
            {rows.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between gap-3 py-2">
                <div>
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.category_groups?.name ?? 'Ungrouped'}
                  </div>
                </div>
                <Switch
                  checked={!!c.baseline_locked}
                  onCheckedChange={(v) => setLock([c.id], v)}
                  aria-label={`Lock baseline for ${c.name}`}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
