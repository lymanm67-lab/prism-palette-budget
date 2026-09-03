import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, ArrowUp } from 'lucide-react';
import {
  FreedCashRedirect,
  FreedCashSource,
  REDIRECT_DESTINATIONS,
  buildWaterfall,
  destinationLabel,
  redirectCapacity,
  useFreedCashSettings,
  useSaveFreedCashSettings,
  useSaveRedirect,
} from '@/hooks/use-freed-cash';
import { useReserves } from '@/hooks/use-reserves';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

interface Props {
  sources: FreedCashSource[];
  redirects: FreedCashRedirect[];
}

export function SweepWaterfall({ sources, redirects }: Props) {
  const { data: settings } = useFreedCashSettings();
  const saveSettings = useSaveFreedCashSettings();
  const saveRedirect = useSaveRedirect();
  const { emergency } = useReserves();

  const [floorDraft, setFloorDraft] = useState<string>('');

  const capacity = useMemo(() => redirectCapacity(sources, redirects), [sources, redirects]);
  const emergencyBalance = Number(emergency?.market_value ?? 0);
  const order = settings?.waterfall ?? [];

  const steps = useMemo(
    () =>
      settings
        ? buildWaterfall(capacity.unassignedMonthly, settings, emergencyBalance)
        : [],
    [settings, capacity.unassignedMonthly, emergencyBalance],
  );

  const move = (index: number, dir: -1 | 1) => {
    if (!settings) return;
    const next = [...order];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    saveSettings.mutate({ ...settings, waterfall: next });
  };

  const applySweep = async () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const step of steps) {
      if (step.amount <= 0.01) continue;
      await saveRedirect.mutateAsync({
        source_id: null,
        destination_type: step.destination,
        destination_label: step.destination === 'emergency_fund' ? emergency?.name ?? 'Emergency fund' : null,
        monthly_amount: Number(step.amount.toFixed(2)),
        start_date: today,
        status: 'planned',
        confirmed_moved: false,
        notes: `Created by monthly sweep — ${step.reason}`,
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Priority waterfall</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Unassigned verified freed cash flows down this order. The emergency fund is filled to its floor
            before anything else gets funded.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Emergency fund floor</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="50"
                  value={floorDraft !== '' ? floorDraft : (settings?.emergency_floor ?? 0)}
                  onChange={(e) => setFloorDraft(e.target.value)}
                />
                <Button
                  variant="outline"
                  disabled={!settings || floorDraft === ''}
                  onClick={() => {
                    if (!settings) return;
                    saveSettings.mutate({ ...settings, emergency_floor: Number(floorDraft) });
                    setFloorDraft('');
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Current emergency cash</Label>
              <p className="pt-2 text-lg font-semibold">{money(emergencyBalance)}</p>
            </div>
            <div className="space-y-1">
              <Label>Unassigned freed cash</Label>
              <p className="pt-2 text-lg font-semibold text-primary">{money(capacity.unassignedMonthly)}/mo</p>
            </div>
          </div>

          <div className="space-y-2">
            {order.map((dest, i) => (
              <div
                key={dest}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/40 p-2.5"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {i + 1}
                  </Badge>
                  <span className="text-sm">{destinationLabel(dest)}</span>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => move(i, -1)} aria-label="Move up">
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => move(i, 1)} aria-label="Move down">
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {settings && order.length < REDIRECT_DESTINATIONS.length && (
              <div className="flex flex-wrap gap-2 pt-1">
                {REDIRECT_DESTINATIONS.filter((d) => !order.includes(d.value)).map((d) => (
                  <Button
                    key={d.value}
                    size="sm"
                    variant="outline"
                    onClick={() => saveSettings.mutate({ ...settings, waterfall: [...order, d.value] })}
                  >
                    + {d.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">Monthly sweep preview</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Nothing moves automatically — review the plan, then create the redirects.
            </p>
          </div>
          <Button
            size="sm"
            disabled={capacity.unassignedMonthly <= 0.01 || saveRedirect.isPending}
            onClick={applySweep}
          >
            Create these redirects
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {steps.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No unassigned freed cash to sweep. Verify more savings or free up a redirect.
            </p>
          )}
          {steps.map((s) => (
            <div
              key={s.destination}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/40 p-3"
            >
              <div>
                <p className="text-sm font-medium">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.reason}</p>
              </div>
              <span className={`text-sm font-semibold ${s.amount > 0 ? '' : 'text-muted-foreground'}`}>
                {money(s.amount)}/mo
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
