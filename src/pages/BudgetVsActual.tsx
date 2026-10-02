import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowLeft, ArrowRight, ChevronDown, ChevronRight, CircleDollarSign, Loader2, ReceiptText, Scale, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCurrency } from '@/hooks/use-currency';
import { useBudgetActual } from '@/hooks/use-budget-actual';
import { usePaycheckTree } from '@/components/coach/usePaycheckTree';
import type { BudgetActualMode } from '@/lib/budgeting/budgetActual';
import type { PaycheckDeployment } from '@/hooks/use-paycheck-deploy';
import { cn } from '@/lib/utils';

const emptyDeployment: PaycheckDeployment = { pay_date: '', net_amount: 0, frequency: 'monthly', bills_amount: 0, min_debt_amount: 0, extra_debt_amount: 0, savings_amount: 0, investment_amount: 0, buffer_amount: 0, safe_to_spend_amount: 0, bills_breakdown: [], rationale: null, confidence: 'low', status: 'suggested', source: 'manual' };
const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const statusFor = (budgeted: number, actual: number) => {
  if (budgeted <= 0 && actual > 0) return { label: 'No Budget', cls: 'text-prism-rose border-prism-rose/30 bg-prism-rose/10' };
  if (budgeted <= 0) return { label: 'No Activity', cls: 'text-muted-foreground' };
  const used = actual / budgeted;
  if (used > 1) return { label: 'Over Budget', cls: 'text-prism-rose border-prism-rose/30 bg-prism-rose/10' };
  if (used >= .8) return { label: 'Watch', cls: 'text-prism-amber border-prism-amber/30 bg-prism-amber/10' };
  return { label: 'On Track', cls: 'text-prism-teal border-prism-teal/30 bg-prism-teal/10' };
};

export default function BudgetVsActual() {
  const { formatCurrency } = useCurrency();
  const [date, setDate] = useState(() => new Date());
  const [mode, setMode] = useState<BudgetActualMode>('combined');
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const month = monthKey(date);
  const { data, isLoading, error } = useBudgetActual(month, mode);
  const deployment = data?.deployment || { ...emptyDeployment, pay_date: `${month}-01` };
  const tree = usePaycheckTree(deployment, { all: true });
  const totals = useMemo(() => {
    const pillars = data?.pillars || [];
    const budgeted = pillars.reduce((sum, p) => sum + p.budgeted, 0);
    const actual = pillars.reduce((sum, p) => sum + p.actual, 0) + (data?.uncategorized.reduce((sum, line) => sum + line.actual, 0) || 0);
    return { budgeted, actual, variance: budgeted - actual, used: budgeted > 0 ? actual / budgeted * 100 : 0 };
  }, [data]);
  const chartData = data?.pillars.map(p => ({ ...p, short: p.label.replace(' & Essentials', '').replace(' & Investing', '').replace(' Expenses', '').replace(' Spend', '') })) || [];
  const largestOver = chartData.map(p => ({ ...p, over: p.actual - p.budgeted })).sort((a, b) => b.over - a.over)[0];
  const largestRoom = chartData.map(p => ({ ...p, room: p.budgeted - p.actual })).sort((a, b) => b.room - a.room)[0];
  const now = new Date();
  const selectedIsCurrent = now.getFullYear() === date.getFullYear() && now.getMonth() === date.getMonth();
  const calendarPct = selectedIsCurrent ? now.getDate() / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() * 100 : date < now ? 100 : 0;
  const treeTotal = tree.pillars.reduce((sum, p) => sum + p.takeHome, 0);
  const tooltipStyle = { background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, color: 'hsl(var(--popover-foreground))' };
  const moveMonth = (delta: number) => setDate(current => new Date(current.getFullYear(), current.getMonth() + delta, 1));

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-prism-teal">Monthly reconciliation</div>
          <h1 className="text-2xl font-bold md:text-3xl">Budget vs Actual</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your plan and cleared spending, organized into the same six areas as the paycheck tree.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => moveMonth(-1)} aria-label="Previous month"><ArrowLeft /></Button>
          <div className="min-w-40 text-center text-sm font-semibold">{date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
          <Button variant="outline" size="icon" onClick={() => moveMonth(1)} aria-label="Next month"><ArrowRight /></Button>
          <Select value={mode} onValueChange={value => setMode(value as BudgetActualMode)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="combined">Combined</SelectItem><SelectItem value="personal">Personal</SelectItem><SelectItem value="business">Business</SelectItem></SelectContent>
          </Select>
        </div>
      </header>

      {isLoading ? <div className="flex min-h-96 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 animate-spin" /> Loading month…</div> : error ? <Card><CardContent className="py-10 text-center text-prism-rose">This month could not be loaded.</CardContent></Card> : data && <>
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['Budgeted', totals.budgeted, Wallet, 'text-prism-sky'], ['Actual spent', totals.actual, ReceiptText, 'text-prism-orange'],
            [totals.variance >= 0 ? 'Remaining' : 'Over budget', Math.abs(totals.variance), Scale, totals.variance >= 0 ? 'text-prism-teal' : 'text-prism-rose'],
            ['Income received', data.incomeReceived, CircleDollarSign, 'text-prism-lime'], ['Budget used', totals.used, ReceiptText, totals.used > 100 ? 'text-prism-rose' : 'text-prism-amber'],
          ].map(([label, value, Icon, color]) => <Card key={String(label)}><CardContent className="p-4"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground"><Icon className={cn('h-4 w-4', color)} />{label}</div><div className={cn('mt-2 text-xl font-extrabold tabular-nums', color)}>{label === 'Budget used' ? `${Number(value).toFixed(1)}%` : formatCurrency(Number(value))}</div></CardContent></Card>)}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card><CardContent className="p-4"><h2 className="mb-1 font-semibold">Plan against real spending</h2><p className="mb-3 text-xs text-muted-foreground">Each pair uses the same color-coded money area as Paycheck Deployment.</p><ResponsiveContainer width="100%" height={310}><BarChart data={chartData} margin={{ left: 4, right: 8, top: 15, bottom: 10 }}><CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="short" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} interval={0} /><YAxis tickFormatter={v => `$${Math.round(v / 1000)}k`} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} /><Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'hsl(var(--popover-foreground))' }} formatter={(v: number) => formatCurrency(v)} /><Legend /><Bar dataKey="budgeted" name="Budget" fill="hsl(var(--muted-foreground))" radius={[4,4,0,0]} /><Bar dataKey="actual" name="Actual" radius={[4,4,0,0]}>{chartData.map(p => <Cell key={p.key} fill={`hsl(${p.color})`} />)}</Bar></BarChart></ResponsiveContainer></CardContent></Card>
          <Card><CardContent className="p-4"><h2 className="mb-1 font-semibold">Where actual spending went</h2><p className="mb-3 text-xs text-muted-foreground">Cleared outflows only; transfers and deleted transactions stay out.</p><ResponsiveContainer width="100%" height={240}><PieChart><Pie data={chartData.filter(p => p.actual > 0)} dataKey="actual" nameKey="label" innerRadius={52} outerRadius={86} paddingAngle={2}>{chartData.filter(p => p.actual > 0).map(p => <Cell key={p.key} fill={`hsl(${p.color})`} />)}</Pie><Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'hsl(var(--popover-foreground))' }} itemStyle={{ color: 'hsl(var(--popover-foreground))' }} formatter={(v: number) => formatCurrency(v)} /></PieChart></ResponsiveContainer><div className="grid grid-cols-2 gap-2">{chartData.map(p => <div key={p.key} className="flex items-center justify-between gap-2 text-xs"><span className="truncate">{p.label}</span><span className="font-semibold tabular-nums" style={{ color: `hsl(${p.color})` }}>{formatCurrency(p.actual)}</span></div>)}</div></CardContent></Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card><CardContent className="p-4"><h2 className="font-semibold">How the month is moving</h2><p className="mt-1 text-sm text-muted-foreground">{largestOver?.over > 0 ? `${largestOver.label} is the largest overage at ${formatCurrency(largestOver.over)} over plan.` : 'No pillar is over its monthly plan.'} {largestRoom?.room > 0 ? `${largestRoom.label} has ${formatCurrency(largestRoom.room)} remaining.` : ''}</p><div className="mt-4 flex justify-between text-xs"><span>Calendar elapsed</span><span>{Math.round(calendarPct)}%</span></div><Progress value={calendarPct} className="mt-1 h-2" indicatorClassName="bg-prism-sky" /><div className="mt-3 flex justify-between text-xs"><span>Budget used</span><span>{totals.used.toFixed(1)}%</span></div><Progress value={Math.min(totals.used, 100)} className="mt-1 h-2" indicatorClassName={totals.used > 100 ? 'bg-prism-rose' : 'bg-prism-teal'} /></CardContent></Card>
          <Card><CardContent className="p-4"><h2 className="font-semibold">Paycheck-tree reconciliation</h2>{data.deployment ? <><p className="mt-1 text-sm text-muted-foreground">The latest {date.toLocaleDateString('en-US', { month: 'long' })} deployment allocates <strong className="text-foreground">{formatCurrency(treeTotal)}</strong> across its six areas. This page uses those same area definitions while comparing the full calendar-month budget with cleared transactions.</p><div className="mt-3 grid grid-cols-2 gap-2">{tree.pillars.map(p => <div key={p.label} className="flex justify-between rounded-md border border-border/60 p-2 text-xs"><span>{p.label}</span><strong style={{ color: `hsl(${p.color})` }}>{formatCurrency(p.takeHome)}</strong></div>)}</div></> : <p className="mt-1 text-sm text-muted-foreground">No paycheck deployment exists for this month. The comparison is budget-only, and no deployment values were inferred.</p>}</CardContent></Card>
        </section>

        <Card><CardContent className="p-0"><div className="border-b border-border p-4"><h2 className="font-semibold">Pillar and category audit</h2><p className="text-xs text-muted-foreground">Open any area to see exactly which categories make up its totals.</p></div><Table><TableHeader><TableRow><TableHead>Area</TableHead><TableHead className="text-right">Budget</TableHead><TableHead className="text-right">Actual</TableHead><TableHead className="text-right">Variance</TableHead><TableHead className="text-right">Used</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{data.pillars.map(p => { const expanded = open.has(p.key); const variance = p.budgeted - p.actual; const used = p.budgeted > 0 ? p.actual / p.budgeted * 100 : 0; const status = statusFor(p.budgeted, p.actual); return [<TableRow key={p.key} className="cursor-pointer" onClick={() => setOpen(prev => { const next = new Set(prev); next.has(p.key) ? next.delete(p.key) : next.add(p.key); return next; })}><TableCell><div className="flex items-center gap-2">{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}<span className="h-2.5 w-2.5 rounded-full" style={{ background: `hsl(${p.color})` }} /><strong>{p.label}</strong></div></TableCell><TableCell className="text-right tabular-nums">{formatCurrency(p.budgeted)}</TableCell><TableCell className="text-right font-semibold tabular-nums">{formatCurrency(p.actual)}</TableCell><TableCell className={cn('text-right tabular-nums', variance < 0 ? 'text-prism-rose' : 'text-prism-teal')}>{variance < 0 ? '-' : '+'}{formatCurrency(Math.abs(variance))}</TableCell><TableCell className="text-right tabular-nums">{used.toFixed(1)}%</TableCell><TableCell><Badge variant="outline" className={status.cls}>{status.label}</Badge></TableCell></TableRow>, ...(expanded ? p.lines.map(line => { const v = line.budgeted - line.actual; return <TableRow key={`${p.key}-${line.key}`} className="bg-muted/20"><TableCell className="pl-12"><div>{line.name}</div><div className="text-[11px] text-muted-foreground">{line.groupName}</div></TableCell><TableCell className="text-right tabular-nums">{formatCurrency(line.budgeted)}</TableCell><TableCell className="text-right tabular-nums">{formatCurrency(line.actual)}</TableCell><TableCell className={cn('text-right tabular-nums', v < 0 && 'text-prism-rose')}>{v < 0 ? '-' : '+'}{formatCurrency(Math.abs(v))}</TableCell><TableCell className="text-right">{line.budgeted > 0 ? `${(line.actual / line.budgeted * 100).toFixed(1)}%` : '—'}</TableCell><TableCell><Badge variant="outline" className={statusFor(line.budgeted, line.actual).cls}>{statusFor(line.budgeted, line.actual).label}</Badge></TableCell></TableRow> }) : [])]; })}{data.uncategorized.length > 0 && <TableRow className="bg-prism-rose/5"><TableCell><div className="flex items-center gap-2 text-prism-rose"><AlertTriangle className="h-4 w-4" /><strong>Uncategorized review</strong></div></TableCell><TableCell className="text-right">—</TableCell><TableCell className="text-right font-semibold">{formatCurrency(data.uncategorized.reduce((sum, line) => sum + line.actual, 0))}</TableCell><TableCell colSpan={3} className="text-right"><Button variant="outline" size="sm" asChild><Link to="/transactions">Review transactions</Link></Button></TableCell></TableRow>}</TableBody></Table></CardContent></Card>
      </>}
    </div>
  );
}