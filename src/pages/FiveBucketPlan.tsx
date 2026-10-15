import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Download, Printer, RotateCcw, Save } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import {
  BASELINE, BUCKETS, STAGE_LABEL, allocate, exampleSplit, milestoneDates, project, surplusCents, targets, toCsv,
  vacationSlice, toCents, type BucketKey, type PlanInputs,
} from '@/lib/fiveBucket/engine';
import { cn } from '@/lib/utils';

const KEY = 'five-bucket-plan:v1';
const SCEN_KEY = 'five-bucket-plan:scenarios:v1';

const usd = (cents: number) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
const usd0 = (cents: number) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const RULES: Record<BucketKey, string> = {
  retire: 'Base $500/mo payroll contribution continues in every stage. After the three-month milestone, the investing share of surplus is added on top. Once six months is funded, leftover goes here as a budget allocation toward Roth IRA and HSA room you enter.',
  emergency: 'Gets all surplus until three months of expenses is saved (the $2,000 starter counts inside it). After that it receives whatever remains after the other buckets, until six months is reached.',
  vacation: 'Funds the annual vacation target in monthly slices that add up to exactly the yearly amount. Starts after the three-month milestone. Does not count toward emergency savings.',
  housing: 'A percentage of the full surplus after the three-month milestone. Does not count toward emergency savings.',
  guilt: 'A percentage of the full surplus after the three-month milestone. Planned spending comes out of it each month.',
};

function NumField({ label, value, onChange, step = 0.01, suffix, hint }: {
  label: string; value: number; onChange: (n: number) => void; step?: number; suffix?: string; hint?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-1">
        <Input type="number" step={step} value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number(e.target.value))} className="h-8 tabular-nums" />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function FiveBucketPlan() {
  const reduce = useReducedMotion();
  const [inp, setInp] = useState<PlanInputs>(() => {
    try { return { ...BASELINE, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return BASELINE; }
  });
  const [horizon, setHorizon] = useState(12);
  const [selected, setSelected] = useState<BucketKey>('emergency');
  const [scenarios, setScenarios] = useState<{ name: string; inputs: PlanInputs }[]>(() => {
    try { return JSON.parse(localStorage.getItem(SCEN_KEY) || '[]'); } catch { return []; }
  });

  useEffect(() => { document.title = 'Five-Bucket Wealth Plan | PrismMoney'; }, []);
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(inp)); }, [inp]);

  const set = <K extends keyof PlanInputs>(k: K) => (v: PlanInputs[K]) => setInp((p) => ({ ...p, [k]: v }));

  const surplus = surplusCents(inp);
  const t = targets(inp);
  const rows = useMemo(() => project(inp, 36), [inp]);
  const baseRows = useMemo(() => project(BASELINE, 36), []);
  const miles = milestoneDates(inp, rows);
  const ex = exampleSplit(inp);
  const thisMonth = rows[0];
  const startE = toCents(inp.startEmergency);
  const pctSum = inp.investPct + inp.housingPct + inp.guiltPct;
  const fixedEx = ex.retire + ex.housing + ex.guilt + ex.vacation;
  const exShortfall = Math.max(0, fixedEx - surplus);

  const chartData = rows.slice(0, horizon).map((r) => ({
    label: r.label,
    retire: r.retireContribCum / 100,
    emergency: r.closing.emergency / 100,
    vacation: r.closing.vacation / 100,
    housing: r.closing.housing / 100,
    guilt: r.closing.guilt / 100,
  }));
  const end = rows[horizon - 1];
  const baseEnd = baseRows[horizon - 1];

  const exportCsv = () => {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'five-bucket-plan.csv';
    a.click();
  };
  const saveScenario = () => {
    const name = prompt('Name this scenario');
    if (!name) return;
    const next = [...scenarios.filter((s) => s.name !== name), { name, inputs: inp }];
    setScenarios(next);
    localStorage.setItem(SCEN_KEY, JSON.stringify(next));
  };

  // Flow geometry
  const flowItems = BUCKETS.map((b) => ({ ...b, cents: ex[b.key] }));

  return (
    <div className="container max-w-6xl space-y-6 py-6 print:bg-white print:text-black">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">The Montgomery Five-Bucket Wealth Plan</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Where each dollar of surplus goes: build the emergency reserve in stages, invest more, and fund
            vacations, housing and planned enjoyment. Planning tool only - no money moves.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={saveScenario}><Save className="h-4 w-4 mr-1" />Save scenario</Button>
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />CSV</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Print</Button>
          <Button variant="ghost" size="sm" onClick={() => setInp(BASELINE)}><RotateCcw className="h-4 w-4 mr-1" />Reset to baseline</Button>
        </div>
      </header>

      {/* Headline numbers */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ['Monthly surplus', usd(surplus), `${usd(toCents(inp.takeHome))} - ${usd(toCents(inp.takeHomeReduction))} - ${usd(toCents(inp.expenses))}`],
          ['Current stage', STAGE_LABEL[thisMonth.stage], 'Based on your starting emergency balance'],
          ['Emergency today', usd(startE), 'Entered by you - not verified'],
          ['Monthly retirement funding', usd(toCents(inp.newRetirement) + ex.retire), `$${inp.newRetirement} base + ${usd(ex.retire)} extra (after 3 months)`],
        ].map(([l, v, h]) => (
          <Card key={l} className="glass-card"><CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{l}</p>
            <p className="text-lg font-semibold tabular-nums">{v}</p>
            <p className="text-[11px] text-muted-foreground">{h}</p>
          </CardContent></Card>
        ))}
      </div>

      {exShortfall > 0 && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive" />
          <span>Allocations exceed available surplus by <strong>{usd(exShortfall)}</strong> per month. Emergency gets $0 and no bucket was reduced - lower a percentage or the vacation target.</span>
        </div>
      )}

      <Tabs defaultValue="flow">
        <TabsList className="flex flex-wrap h-auto print:hidden">
          <TabsTrigger value="flow">1. Money flow</TabsTrigger>
          <TabsTrigger value="studio">2. Allocation studio</TabsTrigger>
          <TabsTrigger value="roadmap">3. Emergency roadmap</TabsTrigger>
          <TabsTrigger value="projection">4. Projection explorer</TabsTrigger>
          <TabsTrigger value="details">5. Funding details</TabsTrigger>
        </TabsList>

        {/* 1. FLOW */}
        <TabsContent value="flow" className="space-y-4">
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-base">From paycheck to five buckets (split after the 3-month milestone)</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                <div className="space-y-2 text-sm">
                  {[
                    ['Take-home pay', toCents(inp.takeHome), 'text-foreground'],
                    ['Retirement increase', -toCents(inp.takeHomeReduction), 'text-muted-foreground'],
                    ['Regular expenses', -toCents(inp.expenses), 'text-muted-foreground'],
                  ].map(([l, c, cls]) => (
                    <div key={l as string} className="flex justify-between border-b border-border/50 pb-1">
                      <span className={cls as string}>{l}</span><span className="tabular-nums">{usd(c as number)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold text-prism-teal">
                    <span>Available surplus</span><span className="tabular-nums">{usd(surplus)}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">The earlier $451 contribution is already inside take-home pay; only the extra amount is subtracted.</p>
                </div>
                <div className="space-y-2">
                  {flowItems.map((b, k) => {
                    const pct = surplus > 0 ? (b.cents / surplus) * 100 : 0;
                    return (
                      <button key={b.key} onClick={() => setSelected(b.key)}
                        className={cn('w-full text-left rounded-md p-2 transition-colors', selected === b.key ? 'bg-muted' : 'hover:bg-muted/50')}>
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{b.label}</span>
                          <span className="tabular-nums">{usd(b.cents)} <span className="text-muted-foreground">({pct.toFixed(1)}%)</span></span>
                        </div>
                        <div className="h-2.5 rounded-full bg-muted overflow-hidden mt-1">
                          <motion.div className="h-full rounded-full" style={{ background: b.color }}
                            initial={{ width: reduce ? `${pct}%` : 0 }} animate={{ width: `${pct}%` }}
                            transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : k * 0.12 }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-border p-3 text-sm space-y-1">
                <p className="font-semibold">{BUCKETS.find((b) => b.key === selected)!.label}</p>
                <p className="text-muted-foreground text-xs">{RULES[selected]}</p>
                <p className="text-xs tabular-nums">
                  Starting balance: {usd(selected === 'retire' ? 0 : toCents((inp as any)[{ emergency: 'startEmergency', vacation: 'startVacation', housing: 'startHousing', guilt: 'startGuilt' }[selected as Exclude<BucketKey, 'retire'>]]))}
                  {' '}| In {horizon} months: {usd(selected === 'retire' ? end.retireContribCum : end.closing[selected])}
                  {selected === 'emergency' && <> | Target: {usd(t.six)} (six months)</>}
                  {selected === 'vacation' && <> | Target: {usd(toCents(inp.vacationAnnual))} per year</>}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. STUDIO */}
        <TabsContent value="studio" className="space-y-4">
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-base">Allocation studio</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <NumField label="Take-home pay" value={inp.takeHome} onChange={set('takeHome')} suffix="/mo" />
              <NumField label="Actual take-home reduction" value={inp.takeHomeReduction} onChange={set('takeHomeReduction')} suffix="/mo" hint="Pre-tax change may be less than $49" />
              <NumField label="Regular expenses" value={inp.expenses} onChange={set('expenses')} suffix="/mo" hint="After both vacation loans are paid" />
              <NumField label="Annual vacation target" value={inp.vacationAnnual} onChange={set('vacationAnnual')} step={100} hint={`${usd(vacationSlice(toCents(inp.vacationAnnual), 0))}/mo, trued up to the exact year`} />
              <NumField label="Investing" value={inp.investPct} onChange={set('investPct')} step={1} suffix={`% = ${usd(ex.retire)}`} />
              <NumField label="Housing" value={inp.housingPct} onChange={set('housingPct')} step={1} suffix={`% = ${usd(ex.housing)}`} />
              <NumField label="Guilt Free" value={inp.guiltPct} onChange={set('guiltPct')} step={1} suffix={`% = ${usd(ex.guilt)}`} />
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Emergency (automatic remainder)</Label>
                <p className={cn('h-8 flex items-center font-semibold tabular-nums', exShortfall > 0 && 'text-destructive')}>
                  {usd(ex.emergency)} ({surplus > 0 ? ((ex.emergency / surplus) * 100).toFixed(1) : 0}%)
                </p>
                {pctSum > 100 && <p className="text-[10px] text-destructive">Percentages total {pctSum}%</p>}
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-base">Balances, spending and earnings</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <NumField label="Starting emergency savings" value={inp.startEmergency} onChange={set('startEmergency')} hint="Entered by you - unverified" />
              <NumField label="Starting vacation" value={inp.startVacation} onChange={set('startVacation')} />
              <NumField label="Starting housing" value={inp.startHousing} onChange={set('startHousing')} />
              <NumField label="Starting guilt free" value={inp.startGuilt} onChange={set('startGuilt')} />
              <NumField label="Planned trip amount" value={inp.vacationTripAmount} onChange={set('vacationTripAmount')} step={100} hint="Spent once a year" />
              <NumField label="Trip month (1-12)" value={inp.vacationTripMonth} onChange={(n) => set('vacationTripMonth')(Math.min(12, Math.max(1, Math.round(n))))} step={1} />
              <NumField label="Guilt free spent each month" value={inp.guiltSpendPct} onChange={set('guiltSpendPct')} step={5} suffix="%" />
              <NumField label="Cash APY" value={inp.cashApyPct} onChange={set('cashApyPct')} step={0.1} suffix="%" hint="Hypothetical and variable - e.g. 4% is not a current bank offer. High-yield savings suits emergency and near-term goals." />
              <NumField label="Investment return (illustrative)" value={inp.investReturnPct} onChange={set('investReturnPct')} step={0.5} suffix="%" hint="0% by default. Not guaranteed." />
              <NumField label="Roth IRA limit (you enter)" value={inp.rothLimit ?? 0} onChange={(n) => set('rothLimit')(n || null)} step={100} hint="Tax-year limit; not invented here" />
              <NumField label="HSA limit incl. employer (you enter)" value={inp.hsaLimit ?? 0} onChange={(n) => set('hsaLimit')(n || null)} step={100} hint="Employer HSA money counts toward it" />
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Quarterly consulting income</CardTitle>
              <Switch checked={inp.consultingEnabled} onCheckedChange={set('consultingEnabled')} aria-label="Include consulting income" />
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <NumField label="Gross per quarter" value={inp.consultingGross} onChange={set('consultingGross')} />
              <NumField label="Tax reserve" value={inp.consultingTaxPct} onChange={set('consultingTaxPct')} step={1} suffix="%" />
              <p className="text-xs text-muted-foreground self-center">Received Mar, Jun, Sep, Dec. The amount after taxes follows the current stage. Vacation is never funded twice in a year.</p>
            </CardContent>
          </Card>
          {scenarios.length > 0 && (
            <Card className="glass-card"><CardContent className="p-4 flex flex-wrap gap-2 items-center">
              <span className="text-xs text-muted-foreground">Saved scenarios:</span>
              {scenarios.map((s) => (
                <Button key={s.name} size="sm" variant="outline" onClick={() => setInp({ ...BASELINE, ...s.inputs })}>{s.name}</Button>
              ))}
            </CardContent></Card>
          )}
        </TabsContent>

        {/* 3. ROADMAP */}
        <TabsContent value="roadmap">
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-base">Emergency roadmap</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              {[
                ['$2,000 starter reserve', t.starter, miles.starter],
                ['Three months of expenses', t.three, miles.three],
                ['Six months of expenses', t.six, miles.six],
              ].map(([l, target, when]) => {
                const tg = target as number;
                const pct = Math.min(100, (startE / tg) * 100);
                return (
                  <div key={l as string} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{l} - {usd(tg)}</span>
                      <Badge variant="outline">{when as string}</Badge>
                    </div>
                    <Progress value={pct} aria-label={`${l} progress`} />
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {usd(startE)} saved ({pct.toFixed(0)}%) - {usd(Math.max(0, tg - startE))} to go
                    </p>
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground">The $2,000 starter is part of the three- and six-month targets, never added on top. Vacation, Housing and Guilt Free money do not count here. Starting balance {usd(startE)} is entered by you.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. PROJECTION */}
        <TabsContent value="projection" className="space-y-4">
          <div className="flex gap-2 print:hidden">
            {[12, 24, 36].map((h) => (
              <Button key={h} size="sm" variant={horizon === h ? 'default' : 'outline'} onClick={() => setHorizon(h)}>{h} months</Button>
            ))}
          </div>
          <Card className="glass-card">
            <CardContent className="pt-4 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip formatter={(v: number) => usd0(v * 100)} contentStyle={{ background: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', border: '1px solid hsl(var(--border))' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {BUCKETS.map((b) => (
                    <Area key={b.key} type="monotone" dataKey={b.key} name={b.key === 'retire' ? 'New Retirement & HSA (contributions)' : b.label}
                      stroke={b.color} fill={b.color} fillOpacity={0.15} isAnimationActive={!reduce} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="glass-card"><CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="text-left p-3 text-xs text-muted-foreground">After {horizon} months vs the agreed baseline. Investment contributions are shown apart from earnings and are not cash.</caption>
              <thead><tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left p-2">Bucket</th><th className="text-right p-2">This plan</th><th className="text-right p-2">Baseline</th><th className="text-right p-2">Difference</th>
              </tr></thead>
              <tbody>
                {BUCKETS.map((b) => {
                  const v = b.key === 'retire' ? end.retireContribCum : end.closing[b.key];
                  const bv = b.key === 'retire' ? baseEnd.retireContribCum : baseEnd.closing[b.key];
                  return (
                    <tr key={b.key} className="border-b border-border/50">
                      <td className="p-2">{b.label}</td>
                      <td className="p-2 text-right tabular-nums">{usd(v)}</td>
                      <td className="p-2 text-right tabular-nums text-muted-foreground">{usd(bv)}</td>
                      <td className={cn('p-2 text-right tabular-nums', v - bv >= 0 ? 'text-prism-teal' : 'text-destructive')}>{usd(v - bv)}</td>
                    </tr>
                  );
                })}
                <tr><td className="p-2 text-xs text-muted-foreground">Investment earnings (illustrative)</td><td className="p-2 text-right tabular-nums">{usd(end.retireEarnCum)}</td><td colSpan={2} /></tr>
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        {/* 5. DETAILS */}
        <TabsContent value="details">
          <Card className="glass-card"><CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border text-muted-foreground">
                <th className="text-left p-2">Month</th><th className="text-left p-2">Stage</th><th className="text-right p-2">Available</th>
                {BUCKETS.map((b) => <th key={b.key} className="text-right p-2">{b.label.split(' ')[0]} in / out / int / end</th>)}
              </tr></thead>
              <tbody>
                {rows.slice(0, horizon).map((r) => (
                  <tr key={r.index} className="border-b border-border/40 align-top">
                    <td className="p-2 whitespace-nowrap">{r.label}</td>
                    <td className="p-2 whitespace-nowrap">{STAGE_LABEL[r.stage].split(' - ')[0]}</td>
                    <td className="p-2 text-right tabular-nums">{usd(r.available)}{r.consulting > 0 && <div className="text-prism-teal">+{usd(r.consulting)} consulting</div>}</td>
                    {BUCKETS.map((b) => (
                      <td key={b.key} className="p-2 text-right tabular-nums whitespace-nowrap">
                        <div>+{usd(r.alloc[b.key])}</div>
                        {r.withdrawals[b.key] > 0 && <div className="text-destructive">-{usd(r.withdrawals[b.key])}</div>}
                        {r.earnings[b.key] > 0 && <div className="text-muted-foreground">int {usd(r.earnings[b.key])}</div>}
                        <div className="font-semibold">{usd(b.key === 'retire' ? r.closing.retire : r.closing[b.key])}</div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="p-3 text-[11px] text-muted-foreground">Interest is earned on each month's opening balance; deposits post at month end. Funding for vacation and guilt-free spending is money set aside to spend, not guaranteed savings. Once six months is funded, extra retirement money is a budget allocation until Roth IRA and HSA eligibility and room are confirmed.</p>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
