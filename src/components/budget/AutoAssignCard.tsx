import { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLayerAAssignments } from '@/hooks/use-layer-a-assignments';
import { planAutoAssign } from '@/lib/budgeting/autoAssign';
import type { Reconciliation } from '@/lib/budgeting/blueprint5010';

interface Props {
  reconciliation: Reconciliation;
  month: string;
}

/**
 * One-click (or automatic) Layer A balancing: business costs get covered by an
 * owner advance and the remainder is parked in Buffer, so unassigned = $0.00.
 */
export default function AutoAssignCard({ reconciliation, month }: Props) {
  const { assignment, save } = useLayerAAssignments(month);
  const plan = planAutoAssign(reconciliation);
  const ranFor = useRef<string | null>(null);

  const apply = async (silent = false) => {
    if (plan.balanced) return;
    await save.mutateAsync(plan.patch);
    if (!silent) toast.success('Layer A balanced — unassigned cash is $0.00');
  };

  // Auto mode: balance the month as soon as it drifts, once per month key.
  useEffect(() => {
    if (!assignment.auto_balance || plan.balanced || save.isPending) return;
    if (ranFor.current === month) return;
    ranFor.current = month;
    void apply(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignment.auto_balance, plan.balanced, month]);

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <Wand2 className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <p className="font-display text-sm font-bold">Auto-assign Layer A</p>
              <p className="text-[11px] text-muted-foreground">
                Business costs you front are covered by an owner advance and land on the personal buckets; the rest
                is parked in Buffer. No numbers to pick.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="auto-balance"
              checked={assignment.auto_balance}
              onCheckedChange={async (v) => {
                ranFor.current = null;
                await save.mutateAsync({ auto_balance: v } as any);
                toast.success(v ? 'Auto-assign on — every month balances itself' : 'Auto-assign off');
              }}
            />
            <Label htmlFor="auto-balance" className="text-xs">
              Every month
            </Label>
          </div>
        </div>

        {plan.balanced ? (
          <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Nothing to assign — Layer A already balances to $0.00.
          </p>
        ) : (
          <>
            <ul className="space-y-1">
              {plan.steps.map((s, i) => (
                <li key={i} className="flex gap-2 text-[11px] text-muted-foreground">
                  <Badge variant="outline" className="h-4 shrink-0 px-1 text-[9px]">
                    {i + 1}
                  </Badge>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
            <Button size="sm" className="h-8 text-xs" disabled={save.isPending} onClick={() => apply()}>
              {save.isPending ? 'Assigning…' : 'Assign it for me'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
