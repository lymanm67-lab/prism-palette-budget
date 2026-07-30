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
import { useMoneyBlueprint, useSaveMoneyBlueprint, useBlueprintPrefill, LYMAN_GROSS_ANNUAL, KATERI_GROSS_ANNUAL, kateriGarnishmentActive, KATERI_NET_MONTHLY_POST_BK, KATERI_GARNISHMENT_MONTHLY } from '@/hooks/use-money-blueprint';
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

/** Refreshes saved rows from live figures and appends any new default rows. */
function mergeLive(rows: BlueprintRow[], live: BlueprintRow[]): BlueprintRow[] {
  const merged = rows.map((r) => {
    const hit = live.find((p) => p.key === r.key);
    return hit ? { ...r, label: hit.label, amount: hit.amount, lyman: hit.lyman, kateri: hit.kateri } : r;
  });
  const known = new Set(rows.map((r) => r.key));
  return [...merged, ...live.filter((p) => !known.has(p.key)).map((p) => ({ ...p }))];
}

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

  // Per-spouse take-home: fall back to live figures (never to the household total).
  const kateriNetVal = state.income.kateriNet ?? prefill?.source?.kateriNet ?? 0;
  const lymanNetVal = state.income.lymanNet
    ?? prefill?.source?.lymanNet
    ?? Math.max(0, Math.round((state.income.netMonthly - kateriNetVal) * 100) / 100);

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
        [bucket]: [...s.buckets[bucket], { key: `custom_${Date.now()}`, label: 'New line', amount: 0, lyman: 0, kateri: 0, custom: true }],
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
        foundation: mergeLive(s.buckets.foundation, prefill.foundation),
        wealthEngine: mergeLive(s.buckets.wealthEngine, prefill.wealthEngine),
        futureFund: mergeLive(s.buckets.futureFund, prefill.futureFund),
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
    .map((r) => ({ name: r.label.split(' (')[0], value: rowAmount(r, view) }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);

  const viewLabel = OWNER_VIEWS.find((v) => v.key === view)!.label;

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
        <div className="inline-flex rounded-lg border border-border/60 p-0.5">
          {OWNER_VIEWS.map((v) => (
            <Button
              key={v.key}
              size="sm"
              variant={view === v.key ? 'default' : 'ghost'}
              className="h-7 px-3 text-xs"
              onClick={() => setView(v.key)}
            >
              {v.label}
            </Button>
          ))}
        </div>
        <Button size="sm" onClick={onSave} disabled={save.isPending}>
          <Save className="h-3.5 w-3.5 mr-1" /> {save.isPending ? 'Saving…' : 'Save plan'}
        </Button>
        <Button size="sm" variant="outline" onClick={resync}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Re-sync from live data
        </Button>
        <Button size="sm" variant="ghost" onClick={() => window.print()}>Print / PDF</Button>
        <span className="text-xs text-muted-foreground">Viewing: <span className="font-semibold">{viewLabel}</span></span>
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
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Monthly Income — {view === 'combined' ? 'Household' : view === 'lyman' ? 'Lyman' : 'Kateri'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {view === 'combined' ? (
              <>
                <div className="grid grid-cols-[1fr_140px] items-center gap-3">
                  <Label className="text-xs">Gross monthly income (all income before taxes)</Label>
                  <MoneyInput
                    value={state.income.grossMonthly}
                    onChange={(n) => setState((s) => ({ ...s, income: { ...s.income, grossMonthly: n } }))}
                  />
                </div>
                <div className="grid grid-cols-[1fr_140px] items-center gap-3">
                  <Label className="text-xs">Net monthly income (household take-home)</Label>
                  <MoneyInput
                    value={state.income.netMonthly}
                    onChange={(n) => setState((s) => ({ ...s, income: { ...s.income, netMonthly: n } }))}
                  />
                </div>
              </>
            ) : (
              <div className="grid grid-cols-[1fr_140px] items-center gap-3">
                <Label className="text-xs">Gross monthly income (before taxes)</Label>
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-right text-sm font-semibold tabular-nums">
                  {money2(
                    view === 'lyman' ? LYMAN_GROSS_ANNUAL / 12 : KATERI_GROSS_ANNUAL / 12,
                  )}
                </div>
              </div>
            )}
            {(view === 'combined' || view === 'lyman') && (
              <div className="grid grid-cols-[1fr_140px] items-center gap-3">
                <Label className="text-xs">Lyman take-home</Label>
                <MoneyInput
                  value={lymanNetVal}
                  onChange={(n) => setState((s) => ({
                    ...s,
                    income: { ...s.income, lymanNet: n, netMonthly: Math.round((n + kateriNetVal) * 100) / 100 },
                  }))}
                />
              </div>
            )}
            {(view === 'combined' || view === 'kateri') && (
              <div className="grid grid-cols-[1fr_140px] items-center gap-3">
                <Label className="text-xs">Kateri take-home</Label>
                <MoneyInput
                  value={kateriNetVal}
                  onChange={(n) => setState((s) => ({
                    ...s,
                    income: { ...s.income, kateriNet: n, netMonthly: Math.round((lymanNetVal + n) * 100) / 100 },
                  }))}
                />
              </div>
            )}
            {prefill?.source && view === 'combined' && (
              <>
                <p className="text-[11px] text-muted-foreground">
                  Live take-home: Lyman {money2(prefill.source.lymanNet)} (IU paystub 07/31/2026: $4,464.91 net,
                  split across five checking accounts) + Kateri {money2(prefill.source.kateriNet)} (DODD paystub
                  07/24/2026: $1,951.10 net × 26 ÷ 12, after taxes, benefits and the $958.62/pay garnishment) ={' '}
                  <span className="font-semibold">{money2(prefill.income.netMonthly)}</span>/mo.
                </p>
                {kateriGarnishmentActive() && (
                  <p className="text-[11px] text-muted-foreground">
                    Kateri's Chapter 13 is released <span className="font-semibold">April 2027</span> — the
                    $958.62/pay garnishment stops, raising her take-home to{' '}
                    <span className="font-semibold">{money2(KATERI_NET_MONTHLY_POST_BK)}</span>/mo (+
                    {money2(KATERI_GARNISHMENT_MONTHLY)}/mo household).
                  </p>
                )}
              </>
            )}


            <div className="rounded-lg border border-primary/30 bg-primary/5 p-2 space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                Debt-free redirect plan
              </p>
              <p className="text-[11px] text-muted-foreground">
                Jan 2027 — consumer debt is eliminated
                {prefill?.debtFreeRedirect?.debtRedirect
                  ? <> and {money2(prefill.debtFreeRedirect.debtRedirect)}/mo redirects to retirement</>
                  : <>; that payment redirects to retirement</>}.
              </p>
              <p className="text-[11px] text-muted-foreground">
                Apr 2027 — $500/mo from Education / Marketing also redirects to retirement.
              </p>
              {prefill?.debtFreeRedirect?.total ? (
                <p className="text-[11px] font-semibold">
                  Currently active redirect: {money2(prefill.debtFreeRedirect.total)}/mo added to Wealth Engine.
                </p>
              ) : null}
            </div>




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

      {/* Editable buckets — worksheet style */}
      <div className={view === 'combined' ? 'grid gap-4 2xl:grid-cols-3' : 'grid gap-4 lg:grid-cols-3'}>
        {(['foundation', 'wealthEngine', 'futureFund'] as BucketName[]).map((bucket, bIdx) => {
          const meta = BUCKET_META[bucket];
          const res = result.buckets.find((b) => b.key === bucket)!;
          const accent = BUCKET_COLORS[bIdx % BUCKET_COLORS.length];
          const cols = view === 'combined'
            ? 'grid grid-cols-[minmax(0,1fr)_repeat(3,minmax(64px,88px))_52px_2rem] items-center gap-1.5'
            : 'grid grid-cols-[minmax(0,1fr)_minmax(90px,120px)_52px_2rem] items-center gap-1.5';
          const base = view === 'lyman'
            ? lymanNetVal
            : view === 'kateri'
              ? kateriNetVal
              : state.income.netMonthly;
          const pctOf = (n: number) => (base > 0 ? `${Math.round((n / base) * 100)}%` : '—');
          return (
            <Card key={bucket} className="overflow-hidden border-border/70">
              {/* Worksheet header band */}
              <div
                className="flex items-center justify-between px-3 py-2 text-primary-foreground"
                style={{ backgroundColor: accent }}
              >
                <span className="text-sm font-bold uppercase tracking-wide">{meta.label}</span>
                <span className="text-[11px] font-semibold tabular-nums">
                  {meta.min}–{meta.max === 100 ? '∞' : meta.max}% target · {res.pct}% now
                </span>
              </div>
              <CardContent className="p-0">
                {/* Column headers */}
                <div className={`${cols} border-b border-border bg-muted/60 px-2 py-1.5 text-[10px] font-semibold uppercase text-muted-foreground`}>
                  <span>Category</span>
                  {view === 'combined' ? (
                    <>
                      <span className="text-right">Lyman</span>
                      <span className="text-right">Kateri</span>
                      <span className="text-right">Total</span>
                    </>
                  ) : (
                    <span className="text-right">Monthly</span>
                  )}
                  <span className="text-right">%</span>
                  <span />
                </div>

                {state.buckets[bucket].map((raw, idx) => {
                  const row = normalizeRow(raw);
                  const amt = rowAmount(row, view);
                  return (
                    <div
                      key={row.key}
                      className={`${cols} border-b border-border/50 px-2 py-1 ${idx % 2 ? 'bg-muted/25' : ''}`}
                    >
                      {row.custom ? (
                        <Input
                          className="h-8 border-0 bg-transparent px-1 text-xs shadow-none min-w-0 focus-visible:bg-background"
                          value={row.label}
                          onChange={(e) => setRow(bucket, idx, { label: e.target.value })}
                        />
                      ) : (
                        <span className="text-xs break-words leading-tight min-w-0">{row.label}</span>
                      )}

                      {view === 'combined' ? (
                        <>
                          <MoneyInput className="h-8 border-0 bg-transparent px-1 text-right text-xs tabular-nums shadow-none min-w-0 focus-visible:bg-background" value={row.lyman!} onChange={(n) => setOwner(bucket, idx, 'lyman', n)} />
                          <MoneyInput className="h-8 border-0 bg-transparent px-1 text-right text-xs tabular-nums shadow-none min-w-0 focus-visible:bg-background" value={row.kateri!} onChange={(n) => setOwner(bucket, idx, 'kateri', n)} />
                          <span className="text-right text-xs font-semibold tabular-nums truncate">{money2(row.amount)}</span>
                        </>
                      ) : (
                        <MoneyInput
                          className="h-8 border-0 bg-transparent px-1 text-right text-xs tabular-nums shadow-none min-w-0 focus-visible:bg-background"
                          value={view === 'lyman' ? row.lyman! : row.kateri!}
                          onChange={(n) => setOwner(bucket, idx, view === 'lyman' ? 'lyman' : 'kateri', n)}
                        />
                      )}
                      <span className="text-right text-[11px] tabular-nums text-muted-foreground">{pctOf(amt)}</span>
                      {row.custom ? (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeRow(bucket, idx)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : <span />}
                    </div>
                  );
                })}

                {bucket === 'foundation' && (
                  <div className="flex items-center justify-between border-b border-border/50 bg-muted/40 px-2 py-1.5">
                    <span className="text-xs italic">Buffer — auto {Math.round(BUFFER_RATE * 100)}% for what you forgot</span>
                    <span className="text-xs font-semibold tabular-nums">{money2(result.bufferAmount)}</span>
                  </div>
                )}

                {/* Total row */}
                <div className="flex items-center justify-between border-t-2 px-2 py-2" style={{ borderTopColor: accent }}>
                  <span className="text-xs font-bold uppercase tracking-wide">Total</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[11px] tabular-nums text-muted-foreground">{res.pct}%</span>
                    <span className="text-sm font-bold tabular-nums">{money2(res.total)}</span>
                  </div>
                </div>
                <div className="px-2 py-1">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => addRow(bucket)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add line
                  </Button>
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
