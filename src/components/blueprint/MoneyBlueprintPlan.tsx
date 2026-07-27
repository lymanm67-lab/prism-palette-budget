import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  computeBlueprint, emptyBlueprint, BUCKET_META, BUFFER_RATE, OWNER_VIEWS, normalizeRow, rowAmount,
  type BlueprintRow, type BlueprintState, type OwnerView,
} from '@/lib/budgeting/moneyBlueprint';
import { BlueprintBucketBar } from './BlueprintBucketBar';
import { useMoneyBlueprint, useSaveMoneyBlueprint, useBlueprintPrefill } from '@/hooks/use-money-blueprint';
import { useWealthOSData } from '@/hooks/use-wealth-os';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const money2 = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

const BUCKET_COLORS = ['hsl(var(--primary))', 'hsl(var(--prism-teal))', 'hsl(var(--prism-lime))', 'hsl(var(--prism-amber))'];

/** Currency input that shows comma/decimal formatting when not focused. */
function MoneyInput({ value, onChange, className }: { value: number; onChange: (n: number) => void; className?: string }) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState(String(value ?? 0));
  useEffect(() => { if (!focused) setRaw(String(value ?? 0)); }, [value, focused]);
  return (
    <Input
      className={className}
      inputMode="decimal"
      value={focused ? raw : money2(Number(value) || 0)}
      onFocus={() => { setFocused(true); setRaw(String(value ?? 0)); }}
      onBlur={() => { setFocused(false); onChange(Number(raw.replace(/[^0-9.-]/g, '')) || 0); }}
      onChange={(e) => setRaw(e.target.value)}
    />
  );
}

type BucketName = 'foundation' | 'wealthEngine' | 'futureFund';

export function MoneyBlueprintPlan() {
  const { data: saved, isLoading } = useMoneyBlueprint();
  const { data: prefill } = useBlueprintPrefill();
  const { data: wealth } = useWealthOSData();
  const save = useSaveMoneyBlueprint();

  const [state, setState] = useState<BlueprintState>(emptyBlueprint());
  const [view, setView] = useState<OwnerView>('combined');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!saved || hydrated) return;
    if (saved.id) {
      setState(saved.state);
      setHydrated(true);
    } else if (prefill && wealth) {
      setState((s) => ({
        ...s,
        income: prefill.income,
        balanceSheet: {
          assets: Math.round(wealth.totalAssets - wealth.buckets.retirement - wealth.buckets.brokerage),
          investments: Math.round(wealth.buckets.retirement + wealth.buckets.brokerage + wealth.buckets.hsa),
          savings: Math.round(wealth.buckets.cash + wealth.buckets.emergency),
          debt: Math.round(wealth.totalLiabilities),
        },
        buckets: {
          foundation: prefill.foundation,
          wealthEngine: prefill.wealthEngine,
          futureFund: prefill.futureFund,
        },
      }));
      setHydrated(true);
    }
  }, [saved, prefill, wealth, hydrated]);

  const result = useMemo(() => computeBlueprint(state, view), [state, view]);

  const setRow = (bucket: BucketName, idx: number, patch: Partial<BlueprintRow>) =>
    setState((s) => ({
      ...s,
      buckets: {
        ...s.buckets,
        [bucket]: s.buckets[bucket].map((r, i) => (i === idx ? normalizeRow({ ...normalizeRow(r), ...patch }) : r)),
      },
    }));

  /** Edits one spouse's slice; the combined amount re-totals automatically. */
  const setOwner = (bucket: BucketName, idx: number, owner: 'lyman' | 'kateri', n: number) =>
    setRow(bucket, idx, { [owner]: n } as Partial<BlueprintRow>);


  const addRow = (bucket: BucketName) =>
    setState((s) => ({
      ...s,
      buckets: {
        ...s.buckets,
        [bucket]: [...s.buckets[bucket], { key: `custom_${Date.now()}`, label: 'New line', amount: 0, custom: true }],
      },
    }));

  const removeRow = (bucket: BucketName, idx: number) =>
    setState((s) => ({
      ...s,
      buckets: { ...s.buckets, [bucket]: s.buckets[bucket].filter((_, i) => i !== idx) },
    }));

  const resync = () => {
    if (!prefill || !wealth) return;
    setState((s) => ({
      ...s,
      income: prefill.income,
      balanceSheet: {
        assets: Math.round(wealth.totalAssets - wealth.buckets.retirement - wealth.buckets.brokerage),
        investments: Math.round(wealth.buckets.retirement + wealth.buckets.brokerage + wealth.buckets.hsa),
        savings: Math.round(wealth.buckets.cash + wealth.buckets.emergency),
        debt: Math.round(wealth.totalLiabilities),
      },
      buckets: {
        foundation: s.buckets.foundation.map((r) => {
          const live = prefill.foundation.find((p) => p.key === r.key);
          return live ? { ...r, amount: live.amount } : r;
        }),
        wealthEngine: s.buckets.wealthEngine.map((r) => {
          const live = prefill.wealthEngine.find((p) => p.key === r.key);
          return live ? { ...r, amount: live.amount } : r;
        }),
        futureFund: s.buckets.futureFund.map((r) => {
          const live = prefill.futureFund.find((p) => p.key === r.key);
          return live ? { ...r, amount: live.amount } : r;
        }),
      },
    }));
    toast.success('Re-synced from Track Money + budgets');

  };

  const onSave = () =>
    save.mutate(
      { id: saved?.id ?? null, state },
      { onSuccess: () => toast.success('Money Blueprint saved'), onError: (e: any) => toast.error(e.message) },
    );

  const donut = result.buckets
    .map((b) => ({ name: b.label, value: Math.max(Math.round(b.total), 0) }))
    .filter((d) => d.value > 0);

  const foundationChart = state.buckets.foundation
    .filter((r) => (Number(r.amount) || 0) > 0)
    .map((r) => ({ name: r.label.split(' (')[0], value: Number(r.amount) || 0 }))
    .sort((a, b) => b.value - a.value);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading your blueprint…</p>;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card/70 backdrop-blur p-3 print:hidden">
        <Input
          className="max-w-xs font-semibold"
          value={state.name}
          onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
        />
        <Button size="sm" onClick={onSave} disabled={save.isPending}>
          <Save className="h-3.5 w-3.5 mr-1" /> {save.isPending ? 'Saving…' : 'Save plan'}
        </Button>
        <Button size="sm" variant="outline" onClick={resync}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Re-sync from live data
        </Button>
        <Button size="sm" variant="ghost" onClick={() => window.print()}>Print / PDF</Button>
      </div>

      {/* Bucket scoreboard */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3"><CardTitle className="text-base">Bucket scoreboard</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {result.buckets.map((b) => (
              <div key={b.key}>
                <BlueprintBucketBar bucket={b} />
                <p className="text-[11px] text-muted-foreground mt-0.5">{BUCKET_META[b.key].blurb}</p>
              </div>
            ))}
            {result.freedomTotal < 0 && (
              <p className="text-xs text-rose-600 dark:text-rose-400">
                Your first three buckets exceed take-home by {money(Math.abs(result.freedomTotal))} — trim Foundation Costs
                or lower a goal to get Freedom Spending back above zero.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Where take-home goes</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donut} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {donut.map((_, i) => <Cell key={i} fill={BUCKET_COLORS[i % BUCKET_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => money(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Balance sheet + income */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Household Balance Sheet</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {([
              ['assets', 'Assets (car, home, property, business)'],
              ['investments', 'Investments (401k, non-retirement — all investments)'],
              ['savings', 'Savings'],
              ['debt', 'Debt (student loans, credit cards, mortgage)'],
            ] as const).map(([k, label]) => (
              <div key={k} className="grid grid-cols-[1fr_140px] items-center gap-3">
                <Label className="text-xs">{label}</Label>
                <MoneyInput
                  value={state.balanceSheet[k]}
                  onChange={(n) => setState((s) => ({ ...s, balanceSheet: { ...s.balanceSheet, [k]: n } }))}
                />
              </div>
            ))}
            <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2">
              <span className="text-sm font-semibold">Total Net Worth</span>
              <span className="text-lg font-bold tabular-nums">{money2(result.netWorth)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Monthly Income</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-[1fr_140px] items-center gap-3">
              <Label className="text-xs">Gross monthly income (all income before taxes)</Label>
              <MoneyInput
                value={state.income.grossMonthly}
                onChange={(n) => setState((s) => ({ ...s, income: { ...s.income, grossMonthly: n } }))}
              />
            </div>
            <div className="grid grid-cols-[1fr_140px] items-center gap-3">
              <Label className="text-xs">Net monthly income (take-home after taxes)</Label>
              <MoneyInput
                value={state.income.netMonthly}
                onChange={(n) => setState((s) => ({ ...s, income: { ...s.income, netMonthly: n } }))}
              />
            </div>
            {prefill?.source && (
              <p className="text-[11px] text-muted-foreground">
                Live take-home: Lyman {money2(prefill.source.lymanNet)} (tracked deposits) + Kateri{' '}
                {money2(prefill.source.kateriNet)} (est. from $113,000 salary) ={' '}
                <span className="font-semibold">{money2(prefill.income.netMonthly)}</span>/mo.
              </p>
            )}

            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="rounded-lg border border-border/50 p-2">
                <p className="text-[10px] uppercase text-muted-foreground">Allocated</p>
                <p className="text-sm font-bold tabular-nums">{money(result.allocated)}</p>
              </div>
              <div className="rounded-lg border border-border/50 p-2">
                <p className="text-[10px] uppercase text-muted-foreground">Savings rate</p>
                <p className="text-sm font-bold tabular-nums">{result.savingsRatePct}%</p>
              </div>
              <div className="rounded-lg border border-border/50 p-2">
                <p className="text-[10px] uppercase text-muted-foreground">Buffer (15%)</p>
                <p className="text-sm font-bold tabular-nums">{money(result.bufferAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Editable buckets */}
      <div className="grid gap-4 lg:grid-cols-3">
        {(['foundation', 'wealthEngine', 'futureFund'] as BucketName[]).map((bucket) => {
          const meta = BUCKET_META[bucket];
          const res = result.buckets.find((b) => b.key === bucket)!;
          return (
            <Card key={bucket}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{meta.label}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Target {meta.min}–{meta.max === 100 ? '∞' : meta.max}% · now {res.pct}%
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {state.buckets[bucket].map((row, idx) => (
                  <div key={row.key} className="grid grid-cols-[1fr_120px_auto] items-center gap-2">
                    {row.custom ? (
                      <Input
                        className="h-9 text-xs"
                        value={row.label}
                        onChange={(e) => setRow(bucket, idx, { label: e.target.value })}
                      />
                    ) : (
                      <span className="text-xs">{row.label}</span>
                    )}
                    <MoneyInput className="h-9 text-right tabular-nums" value={row.amount} onChange={(n) => setRow(bucket, idx, { amount: n })} />
                    {row.custom ? (
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeRow(bucket, idx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : <span className="w-8" />}
                  </div>
                ))}
                {bucket === 'foundation' && (
                  <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
                    <span className="text-xs">Buffer — auto {Math.round(BUFFER_RATE * 100)}% for what you forgot</span>
                    <span className="text-xs font-semibold tabular-nums">{money2(result.bufferAmount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1">
                  <Button size="sm" variant="ghost" onClick={() => addRow(bucket)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add line
                  </Button>
                  <span className="text-sm font-bold tabular-nums">{money2(res.total)}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Freedom + foundation chart */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-prism-teal/10 via-card to-card">
          <CardHeader className="pb-3"><CardTitle className="text-base">Freedom Spending</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-4xl font-bold tabular-nums text-prism-teal">{money2(result.freedomTotal)}</p>
            <p className="text-xs text-muted-foreground">
              Take-home minus Foundation Costs, Wealth Engine, and Future Fund. Dining out, movies, travel — anything you want.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Foundation Costs breakdown</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={foundationChart} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" tickFormatter={(v) => `$${Math.round(Number(v))}`} fontSize={11} />
                <YAxis type="category" dataKey="name" width={110} fontSize={11} />
                <Tooltip formatter={(v: any) => money2(Number(v))} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
