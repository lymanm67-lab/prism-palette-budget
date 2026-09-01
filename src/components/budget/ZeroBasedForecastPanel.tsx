import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { RotateCcw, TrendingUp } from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';
import PrintInfographicButton from '@/components/reports/PrintInfographicButton';
import { useBufferOneTime, useBusinessExpenses, useRecurringPurposeLines, useMoneyRedirects } from '@/hooks/use-zero-based';
import { useHouseholdDebts } from '@/hooks/use-household-debts';
import { buildForecast, monthLabel, CHANGE_FLAG_LABEL, type ForecastMonth } from '@/lib/budgeting/forecastEngine';
import { buildAssumptions, DEFAULT_KNOBS, type WhatIfKnobs } from '@/lib/budgeting/forecastInputs';
import { buildRedirectFlows, redirectFlagInputs } from '@/lib/budgeting/redirects';
import { forecastInfographic } from '@/lib/reports/zeroBasedInfographics';

const HORIZONS: (12 | 24 | 60)[] = [12, 24, 60];
const currentMonth = () => new Date().toISOString().slice(0, 7);

export default function ZeroBasedForecastPanel() {
  const { formatCurrency } = useCurrency();
  const lines = useRecurringPurposeLines();
  const business = useBusinessExpenses();
  const oneTimes = useBufferOneTime();
  const redirects = useMoneyRedirects();
  const { data: debts } = useHouseholdDebts();

  const [knobs, setKnobs] = useState<WhatIfKnobs>(DEFAULT_KNOBS);
  const set = <K extends keyof WhatIfKnobs>(key: K, value: WhatIfKnobs[K]) =>
    setKnobs((k) => ({ ...k, [key]: value }));

  const vacationBalance = useMemo(
    () =>
      (debts || [])
        .filter((d: any) => /vacation/i.test(d.name || ''))
        .reduce((s: number, d: any) => s + Number(d.balance || 0), 0),
    [debts],
  );

  const redirectFlags = useMemo(
    () =>
      redirectFlagInputs(
        buildRedirectFlows((redirects.rows || []) as any, { currentMonth: currentMonth(), vacationBalance }),
      ),
    [redirects.rows, vacationBalance],
  );

  const months: ForecastMonth[] = useMemo(() => {
    if (!debts) return [];
    return buildForecast(
      buildAssumptions(
        {
          startMonth: currentMonth(),
          recurringLines: (lines.rows || []) as any,
          businessExpenses: (business.rows || []) as any,
          debts: debts as any[],
          bufferOneTimes: (oneTimes.rows || []) as any,
          employeePayrollWealth: 451.67,
          employerRetirement: 516.56,
          employerHsa: [
            { month: '2027-01', amount: 500 },
            { month: '2027-07', amount: 500 },
          ],
          wealthTakeHome: [{ fromMonth: currentMonth(), amount: 0 }, { fromMonth: '2028-01', amount: 250 }],
          redirects: redirectFlags,
        },
        knobs,
      ),
    );
  }, [debts, lines.rows, business.rows, oneTimes.rows, redirectFlags, knobs]);

  const chartData = useMemo(
    () =>
      months.map((m) => ({
        month: monthLabel(m.month),
        debt: Math.round(m.debtBalances.reduce((s, d) => s + d.balance, 0)),
        buffer: Math.round(m.bufferEnding),
        wealth: Math.round(m.buildWealthCombined),
        travel: Math.round(m.travelFund),
      })),
    [months],
  );

  const last = months[months.length - 1];
  const first = months[0];
  const debtStart = first ? first.debtBalances.reduce((s, d) => s + d.balance, 0) : 0;
  const debtEnd = last ? last.debtBalances.reduce((s, d) => s + d.balance, 0) : 0;
  const wealthContributed = months.reduce((s, m) => s + m.buildWealthCombined, 0);

  const buildSpec = () =>
    months.length
      ? forecastInfographic({
          months,
          horizon: knobs.months,
          debtStart,
          debtEnd,
          wealthContributed,
        })
      : null;

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-prism-lime" />
              Forecast horizon
            </CardTitle>
            <CardDescription>Real ledger numbers projected forward month by month.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={String(knobs.months)} onValueChange={(v) => set('months', Number(v) as 12 | 24 | 60)}>
              <TabsList>
                {HORIZONS.map((h) => (
                  <TabsTrigger key={h} value={String(h)}>{h} mo</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <PrintInfographicButton buildSpec={buildSpec} label="Infographic" filename="prism-forecast" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: 'Debt today', value: debtStart },
              { label: `Debt at month ${knobs.months}`, value: debtEnd },
              { label: 'Debt eliminated', value: Math.max(0, debtStart - debtEnd) },
              { label: 'Wealth contributed', value: wealthContributed },
            ].map((k) => (
              <div key={k.label} className="rounded-lg border border-border/60 bg-background/40 p-3">
                <div className="text-xs text-muted-foreground">{k.label}</div>
                <div className="text-xl font-bold">{formatCurrency(k.value)}</div>
              </div>
            ))}
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} interval={Math.max(0, Math.floor(chartData.length / 12))} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                <Legend />
                <Line type="monotone" dataKey="debt" name="Total debt" stroke="hsl(var(--destructive))" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="buffer" name="Buffer" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="travel" name="Travel fund" stroke="#1c8fb0" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>What-If simulator</CardTitle>
            <CardDescription>Nothing is saved — adjust and watch the plan re-run instantly.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => setKnobs(DEFAULT_KNOBS)}>
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Take-home per month</Label>
              <Input
                type="number"
                value={knobs.takeHome}
                onChange={(e) => set('takeHome', Number(e.target.value))}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Extra to snowball: {formatCurrency(knobs.extraDebt)}</Label>
              <Slider value={[knobs.extraDebt]} max={1000} step={25} onValueChange={([v]) => set('extraDebt', v)} />
            </div>
            <div>
              <Label className="text-xs">Extra to Build Wealth: {formatCurrency(knobs.extraWealth)}</Label>
              <Slider value={[knobs.extraWealth]} max={1000} step={25} onValueChange={([v]) => set('extraWealth', v)} />
            </div>
            <div>
              <Label className="text-xs">Live spending change: {knobs.livePctChange}%</Label>
              <Slider
                value={[knobs.livePctChange]}
                min={-25}
                max={25}
                step={1}
                onValueChange={([v]) => set('livePctChange', v)}
              />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Travel Fund once vacation debt clears</Label>
              <Input
                type="number"
                value={knobs.travelFundMonthly}
                onChange={(e) => set('travelFundMonthly', Number(e.target.value))}
                className="h-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Raise month</Label>
                <Input type="month" value={knobs.raiseMonth} onChange={(e) => set('raiseMonth', e.target.value)} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Raise amount</Label>
                <Input
                  type="number"
                  value={knobs.raiseAmount}
                  onChange={(e) => set('raiseAmount', Number(e.target.value))}
                  className="h-9"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Starting buffer</Label>
              <Input
                type="number"
                value={knobs.bufferStarting}
                onChange={(e) => set('bufferStarting', Number(e.target.value))}
                className="h-9"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div>
                <div className="text-sm font-medium">Snowball rollover</div>
                <div className="text-xs text-muted-foreground">Roll cleared payments into the next debt.</div>
              </div>
              <Switch checked={knobs.snowball} onCheckedChange={(v) => set('snowball', v)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Month-by-month plan</CardTitle>
          <CardDescription>Change flags mark every month the plan shifts.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Live</TableHead>
                <TableHead className="text-right">Enjoy</TableHead>
                <TableHead className="text-right">Build Wealth</TableHead>
                <TableHead className="text-right">Eliminate Debt</TableHead>
                <TableHead className="text-right">Buffer</TableHead>
                <TableHead className="text-right">Debt balance</TableHead>
                <TableHead>Changes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {months.map((m) => (
                <TableRow key={m.month}>
                  <TableCell className="font-medium">{monthLabel(m.month)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(m.live)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(m.enjoy)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(m.buildWealthCombined)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(m.eliminateDebt)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(m.bufferEnding)}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(m.debtBalances.reduce((s, d) => s + d.balance, 0))}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {m.flags.map((f, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">
                          {CHANGE_FLAG_LABEL[f.flag]}: {f.detail}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
