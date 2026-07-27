import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { UserCog } from 'lucide-react';
import { useWealthOSData, useSetAssetOwner, type Owner } from '@/hooks/use-wealth-os';
import { toast } from 'sonner';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const OWNER_OPTIONS: { value: Owner; label: string }[] = [
  { value: 'lyman', label: 'Lyman (Individual)' },
  { value: 'kateri', label: 'Kateri (Separate Property)' },
  { value: 'joint', label: 'Joint Household' },
];

const OWNER_COLORS: Record<Owner, string> = {
  lyman: 'hsl(var(--prism-teal))',
  kateri: 'hsl(var(--prism-amber))',
  joint: 'hsl(var(--primary))',
};

/** Assign each asset account to Lyman, Kateri, or Joint Household. */
export function OwnershipTagger() {
  const { data: live } = useWealthOSData();
  const setOwner = useSetAssetOwner();

  const assets = live?.assets ?? [];
  const slices = (['lyman', 'kateri', 'joint'] as Owner[])
    .map((o) => ({
      name: OWNER_OPTIONS.find((x) => x.value === o)!.label,
      owner: o,
      value: Math.round(live?.byOwner[o].total ?? 0),
    }))
    .filter((s) => s.value > 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ownership mix</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {slices.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={slices} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                    {slices.map((s) => (
                      <Cell key={s.owner} fill={OWNER_COLORS[s.owner]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => money(Number(v))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">No asset accounts yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserCog className="h-4 w-4" /> Why Joint Household may show $0
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Ownership was previously guessed from the account name. Any account you have not tagged
              yet defaults to Lyman (Individual), which is why the Joint Household total can read $0.
            </p>
            <p>
              Set the owner on each account below — the household snapshot, allocation charts, and the
              Wealth OS Binder all update immediately.
            </p>
            {live && (
              <Badge variant={live.untaggedAssets ? 'secondary' : 'outline'}>
                {live.untaggedAssets
                  ? `${live.untaggedAssets} account${live.untaggedAssets === 1 ? '' : 's'} still untagged`
                  : 'All accounts tagged'}
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assign ownership</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {assets.map((a) => (
            <div
              key={a.id ?? a.name}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 py-2"
            >
              <div className="min-w-[180px]">
                <p className="text-sm font-medium">{a.name}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{money(a.balance)}</p>
              </div>
              <div className="flex items-center gap-2">
                {!a.ownerTag && <Badge variant="secondary">Assumed</Badge>}
                <Select
                  value={a.owner}
                  disabled={!a.id || setOwner.isPending}
                  onValueChange={(v) =>
                    a.id &&
                    setOwner.mutate(
                      { accountId: a.id, owner: v as Owner },
                      { onError: () => toast.error('Could not save ownership') },
                    )
                  }
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OWNER_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
          {!assets.length && <p className="text-sm text-muted-foreground">No asset accounts found.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
