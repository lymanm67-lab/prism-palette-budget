import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Car, Info, Minus, Plus } from 'lucide-react';
import { ReserveTxnDialog } from './ReserveTxnDialog';
import { useReserves } from '@/hooks/use-reserves';
import { summarizeReserve, VEHICLE_CATEGORIES } from '@/lib/reserves/emergencyFund';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const money2 = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

export function VehicleMaintenanceCard() {
  const { vehicle, txns, updateFund, removeTxn, isLoading } = useReserves();
  const [editing, setEditing] = useState(false);
  const [contrib, setContrib] = useState('');
  const [target, setTarget] = useState('');

  const summary = useMemo(() => (vehicle ? summarizeReserve(vehicle, txns) : null), [vehicle, txns]);

  const spendByCategory = useMemo(() => {
    if (!vehicle) return [];
    const map = new Map<string, number>();
    for (const t of txns) {
      if (t.fund_id !== vehicle.id || t.direction !== 'withdrawal') continue;
      const key = t.category || 'Other maintenance';
      map.set(key, (map.get(key) || 0) + Math.abs(Number(t.amount || 0)));
    }
    return [...VEHICLE_CATEGORIES]
      .map((c) => ({ category: c as string, total: map.get(c) || 0 }))
      .filter((r) => r.total > 0 || map.size === 0);
  }, [vehicle, txns]);

  if (isLoading) return <Card className="h-48 animate-pulse" />;
  if (!vehicle || !summary) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Vehicle Maintenance Fund</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">No vehicle sinking fund configured yet.</CardContent>
      </Card>
    );
  }

  const s = summary;
  const startEdit = () => {
    setContrib(String(vehicle.monthly_contribution));
    setTarget(String(vehicle.primary_target));
    setEditing(true);
  };
  const saveEdit = async () => {
    await updateFund.mutateAsync({
      id: vehicle.id,
      monthly_contribution: Number(contrib) || 0,
      primary_target: Number(target) || 0,
    });
    setEditing(false);
  };

  const vTxns = txns.filter((t) => t.fund_id === vehicle.id).slice(0, 6);

  return (
    <Card className="wos-page">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Car className="h-4 w-4 text-prism-teal" /> Vehicle Maintenance Fund
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Sinking fund for three paid-off vehicles. Routine maintenance never draws on the Emergency Fund.
            </p>
          </div>
          <div className="flex gap-2">
            <ReserveTxnDialog fund={vehicle} defaultDirection="contribution"
              trigger={<Button size="sm" variant="outline"><Plus className="mr-1 h-3.5 w-3.5" />Add</Button>} />
            <ReserveTxnDialog fund={vehicle} defaultDirection="withdrawal"
              trigger={<Button size="sm" variant="outline"><Minus className="mr-1 h-3.5 w-3.5" />Spend</Button>} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <p className="text-2xl font-bold tabular-nums">{money2(s.balance)}</p>
          <p className="text-xs text-muted-foreground">
            {money2(vehicle.monthly_contribution)}/mo toward a {money(vehicle.primary_target)} reserve
          </p>
          <Progress value={s.pctFunded * 100} className="mt-3 h-2" />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">Monthly contribution</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{money2(vehicle.monthly_contribution)}</p>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">Spent on repairs & service</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{money2(s.withdrawn)}</p>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">Remaining to target</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{money2(s.remainingToPrimary)}</p>
          </div>
        </div>

        {spendByCategory.some((r) => r.total > 0) && (
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-sm font-medium">Spend by category</p>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {spendByCategory.filter((r) => r.total > 0).map((r) => (
                <div key={r.category} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{r.category}</span>
                  <span className="tabular-nums">{money2(r.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            If this fund is short for a genuinely major, unexpected transportation failure, the Emergency
            Fund may cover the gap — log it as “Major unexpected transportation expense”.
          </AlertDescription>
        </Alert>

        <div className="rounded-lg border border-border/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Settings</p>
            {editing ? (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" onClick={saveEdit} disabled={updateFund.isPending}>Save</Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={startEdit}>Edit</Button>
            )}
          </div>
          {editing && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="vm-contrib">Monthly contribution</Label>
                <Input id="vm-contrib" type="number" step="0.01" value={contrib} onChange={(e) => setContrib(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vm-target">Target reserve</Label>
                <Input id="vm-target" type="number" step="0.01" value={target} onChange={(e) => setTarget(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {vTxns.length > 0 && (
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-sm font-medium">Recent activity</p>
            <div className="mt-2 space-y-1.5">
              {vTxns.map((t) => (
                <div key={t.id} className="flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium">{t.category || (t.direction === 'withdrawal' ? 'Maintenance' : 'Contribution')}</p>
                    {t.reason && <p className="truncate text-muted-foreground">{t.reason}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`tabular-nums ${t.direction === 'withdrawal' ? 'text-destructive' : 'text-emerald-500'}`}>
                      {t.direction === 'withdrawal' ? '−' : '+'}{money2(Math.abs(t.amount))}
                    </span>
                    <span className="text-muted-foreground">{t.txn_date}</span>
                    <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px]"
                      onClick={() => removeTxn.mutate(t.id)}>Remove</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default VehicleMaintenanceCard;
