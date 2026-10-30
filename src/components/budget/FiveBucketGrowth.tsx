import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addMonths, startOfMonth } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/use-currency';
import { BUCKETS, type BucketKey } from '@/lib/fiveBucket/engine';
import { fundingName } from '@/lib/fiveBucket/budgetFunding';
import { bucketGrowth, type FundingMonth } from '@/lib/fiveBucket/growth';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { EMERGENCY_OPENING } from '@/lib/fiveBucket/monthlyBalance';

const ACTIVE_BUCKETS = BUCKETS.filter(b => b.key !== 'retire');

export default function FiveBucketGrowth({ householdId }: { householdId: string }) {
  const { formatCurrency } = useCurrency();
  const [selected, setSelected] = useState<BucketKey>('emergency');
  const [repeat, setRepeat] = useState(true);
  const [startBalance, setStartBalance] = useState<number>(() => {
    const v = Number(localStorage.getItem(`five-bucket-start:v2:${householdId}`));
    return Number.isFinite(v) && v >= 0 && localStorage.getItem(`five-bucket-start:v2:${householdId}`) !== null ? v : EMERGENCY_OPENING;
  });
  const updateStart = (v: number) => {
    const n = Number.isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : 0;
    setStartBalance(n);
    localStorage.setItem(`five-bucket-start:v2:${householdId}`, String(n));
  };
  const start = format(addMonths(startOfMonth(new Date()), 1), 'yyyy-MM-01');
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['budgets', 'five-bucket-growth', householdId, start],
    queryFn: async () => {
      const rows: { month: string; planned_amount: number; categories: { name: string } | null }[] = [];
      for (let offset = 0; ; offset += 1000) {
        const result = await supabase.from('budgets').select('month,planned_amount,categories(name)').eq('household_id', householdId).gte('month', start).order('month').order('id').range(offset, offset + 999);
        if (result.error) throw result.error;
        rows.push(...result.data);
        if (result.data.length < 1000) break;
      }
      const months = new Map<string, FundingMonth>();
      for (const row of rows) {
        const bucket = ACTIVE_BUCKETS.find(b => fundingName(b.key) === row.categories?.name);
        if (!bucket) continue;
        const m = months.get(row.month) || { month: row.month, amounts: {} };
        m.amounts[bucket.key] = (m.amounts[bucket.key] || 0) + Number(row.planned_amount);
        months.set(row.month, m);
      }
      return [...months.values()];
    },
  });
  const rows = useMemo(() => bucketGrowth(data, { emergency: startBalance }, start, 36, repeat), [data, start, repeat, startBalance]);
  const target = selected === 'emergency' ? 700000 : selected === 'vacation' ? 500000 : null;
  const reached = target ? rows.find(r => r.balances[selected] >= target) : undefined;
  const end = rows.at(-1);
  const config = Object.fromEntries(ACTIVE_BUCKETS.map(b => [b.key, { label: b.label, color: b.color }]));
  const chart = rows.map(r => ({ month: format(new Date(r.month + 'T00:00:00'), 'MMM yy'), ...Object.fromEntries(ACTIVE_BUCKETS.map(b => [b.key, r.balances[b.key] / 100])) }));
  return <section aria-label="Five-Bucket growth" className="min-w-0 space-y-4 border-b py-6">
    <div><h2 className="text-xl font-semibold">Five-Bucket growth</h2><p className="text-sm text-muted-foreground">Starting Emergency balance: {formatCurrency(startBalance)}. October’s unconfirmed contribution is excluded.</p>
      <div className="mt-2 flex flex-wrap items-center gap-2"><Label htmlFor="five-bucket-start">Starting Emergency balance ($)</Label>
        <input id="five-bucket-start" type="number" min={0} step="0.01" defaultValue={startBalance} key={startBalance} onBlur={e => updateStart(Number(e.target.value))} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} className="h-9 w-36 rounded-md border border-input bg-background px-2 text-sm tabular-nums" /></div></div>
    <Tabs value={selected} onValueChange={v => { const b = ACTIVE_BUCKETS.find(b => b.key === v); if (b) setSelected(b.key); }}>
      <TabsList className="h-auto flex-wrap justify-start">{ACTIVE_BUCKETS.map(b => <TabsTrigger key={b.key} value={b.key}>{b.label}</TabsTrigger>)}</TabsList>
    </Tabs>
    <div className="flex flex-wrap items-center gap-2"><Switch id="repeat-bucket-funding" checked={repeat} onCheckedChange={setRepeat} /><Label htmlFor="repeat-bucket-funding">Repeat last saved month after saved budgets end</Label></div>
    <p className="text-sm text-muted-foreground">Saved budget amounts are planned, not confirmed deposits. Repeated months are estimates. No withdrawals, interest or payroll retirement contributions are included. Other starting balances are unconfirmed; their lines show added funding only.</p>
    {isLoading ? <p>Loading funding…</p> : error ? <p role="alert" className="text-destructive">Could not load saved funding.</p> : <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm text-muted-foreground">{selected === 'emergency' ? 'Projected balance' : 'Projected added funding'} after 36 months</p><p className="text-2xl font-semibold tabular-nums">{formatCurrency((end?.balances[selected] || 0) / 100)}</p></div>
        <p className="text-sm">{target ? `Target ${formatCurrency(target / 100)} · ${reached ? format(new Date(reached.month + 'T00:00:00'), 'MMMM yyyy') : 'Not reached within 36 months'}` : 'No confirmed target saved'}</p>
      </div>
      {target && <Progress aria-label="Projected target progress" value={Math.min(100, (end?.balances[selected] || 0) / target * 100)} />}
      <ChartContainer config={config} className="h-72 w-full aspect-auto" aria-label="Monthly bucket growth chart">
        <LineChart data={chart} margin={{ left: 8, right: 12, top: 16, bottom: 8 }}><CartesianGrid vertical={false} /><XAxis dataKey="month" minTickGap={35} /><YAxis width={70} tickFormatter={v => formatCurrency(Number(v))} /><ChartTooltip content={<ChartTooltipContent formatter={(v) => formatCurrency(Number(v))} />} />{target && <ReferenceLine y={target / 100} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />}<Line type="monotone" dataKey={selected} stroke={`var(--color-${selected})`} strokeWidth={3} dot={false} isAnimationActive={false} /></LineChart>
      </ChartContainer>
      <div className="overflow-x-auto"><table className="w-full text-sm tabular-nums"><caption className="pb-2 text-left text-muted-foreground">Monthly planned funding → projected balance (or added funding when starting balance is unknown)</caption><thead><tr className="border-b"><th className="p-2 text-left">Month</th>{ACTIVE_BUCKETS.map(b => <th className="min-w-36 p-2 text-right" key={b.key}>{b.label}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.month} className="border-b"><th className="whitespace-nowrap p-2 text-left font-medium">{format(new Date(r.month + 'T00:00:00'), 'MMM yyyy')}<span className="block text-xs text-muted-foreground">{r.assumed ? 'Estimated repeat' : r.saved ? 'Saved plan' : 'No saved funding'}</span></th>{ACTIVE_BUCKETS.map(b => <td key={b.key} className="p-2 text-right"><span className="block text-muted-foreground">+{formatCurrency(r.deposits[b.key] / 100)}</span><span className="font-medium">{formatCurrency(r.balances[b.key] / 100)}</span></td>)}</tr>)}</tbody></table></div>
    </>}
  </section>;
}