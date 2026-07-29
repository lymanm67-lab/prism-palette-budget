import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Calculator, ShieldCheck, TrendingDown } from 'lucide-react';
import {
  runWithdrawalSequencer, DEFAULT_SEQUENCER_INPUT, type SequencerInput,
} from '@/lib/investment/withdrawalSequencer';
import { LegacyStepNav } from '@/components/legacy/LegacyStepNav';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Line, ComposedChart,
} from 'recharts';

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export default function WithdrawalSequencer() {
  const [input, setInput] = useState<SequencerInput>(DEFAULT_SEQUENCER_INPUT);
  const set = <K extends keyof SequencerInput>(k: K, v: SequencerInput[K]) =>
    setInput((p) => ({ ...p, [k]: v }));
  const setBal = (k: keyof SequencerInput['balances'], v: number) =>
    setInput((p) => ({ ...p, balances: { ...p.balances, [k]: v } }));

  const result = useMemo(() => runWithdrawalSequencer(input), [input]);

  const chartData = result.years.map((y) => ({
    age: y.age,
    'Pre-tax': y.fromTraditional,
    Taxable: y.fromTaxable,
    Roth: y.fromRoth,
    Conversion: y.rothConversion,
    'Total tax': y.totalTax,
  }));

  return (
    <div className="container mx-auto max-w-6xl p-4 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Dynamic Withdrawal &amp; Tax Sequencer™</h1>
        <p className="text-sm text-muted-foreground">
          Fills your target federal bracket each year, blends buckets to avoid bracket creep, and steers around
          Medicare IRMAA thresholds.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Lifetime tax" value={usd(result.totals.totalTax)} sub={`Effective ${pct(result.totals.lifetimeEffectiveRate)}`} />
        <Kpi label="Tax saved vs. rule-of-thumb" value={usd(Math.max(0, result.savingsVsNaive.taxSaved))} sub={`Naive: ${usd(result.naive.totalTax)}`} tone="good" />
        <Kpi label="Roth converted" value={usd(result.totals.rothConverted)} sub="Using leftover bracket headroom" />
        <Kpi label={`Ending balance @ ${input.endAge}`} value={usd(result.totals.endingTotal)} sub={`Roth: ${usd(result.totals.endingRoth)}`} />
      </div>

      <Tabs defaultValue="plan">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="plan">1. Year-by-year plan</TabsTrigger>
          <TabsTrigger value="chart">2. Bucket blend</TabsTrigger>
          <TabsTrigger value="irmaa">3. IRMAA &amp; brackets</TabsTrigger>
          <TabsTrigger value="settings">4. Assumptions</TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calculator className="h-4 w-4 text-primary" /> Sequenced withdrawals
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Age</TableHead>
                    <TableHead className="text-right">Need</TableHead>
                    <TableHead className="text-right">RMD</TableHead>
                    <TableHead className="text-right">Pre-tax</TableHead>
                    <TableHead className="text-right">Taxable</TableHead>
                    <TableHead className="text-right">Roth</TableHead>
                    <TableHead className="text-right">Conversion</TableHead>
                    <TableHead className="text-right">Total tax</TableHead>
                    <TableHead className="text-right">Marginal</TableHead>
                    <TableHead>IRMAA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.years.map((y) => (
                    <TableRow key={y.age}>
                      <TableCell className="font-medium">{y.age}</TableCell>
                      <TableCell className="text-right">{usd(y.spendingNeed)}</TableCell>
                      <TableCell className="text-right">{y.rmd ? usd(y.rmd) : '—'}</TableCell>
                      <TableCell className="text-right">{usd(y.fromTraditional)}</TableCell>
                      <TableCell className="text-right">{usd(y.fromTaxable)}</TableCell>
                      <TableCell className="text-right">{usd(y.fromRoth)}</TableCell>
                      <TableCell className="text-right">{y.rothConversion ? usd(y.rothConversion) : '—'}</TableCell>
                      <TableCell className="text-right">{usd(y.totalTax)}</TableCell>
                      <TableCell className="text-right">{pct(y.marginalRate)}</TableCell>
                      <TableCell>
                        <Badge variant={y.irmaaSurcharge > 0 ? 'destructive' : 'secondary'}>{y.irmaaTier}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chart" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Where each dollar comes from</CardTitle></CardHeader>
            <CardContent className="h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="age" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `$${Math.round(v / 1000)}k`} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => usd(v)} />
                  <Legend />
                  <Bar dataKey="Pre-tax" stackId="a" fill="hsl(var(--primary))" />
                  <Bar dataKey="Taxable" stackId="a" fill="hsl(var(--muted-foreground))" />
                  <Bar dataKey="Roth" stackId="a" fill="hsl(var(--accent))" />
                  <Bar dataKey="Conversion" stackId="a" fill="hsl(var(--secondary))" />
                  <Line type="monotone" dataKey="Total tax" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="irmaa" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-primary" /> Bracket &amp; IRMAA control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Age</TableHead>
                    <TableHead className="text-right">MAGI</TableHead>
                    <TableHead className="text-right">Taxable income</TableHead>
                    <TableHead className="text-right">Bracket fill</TableHead>
                    <TableHead className="text-right">IRMAA cost</TableHead>
                    <TableHead>Flags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.years.map((y) => (
                    <TableRow key={y.age}>
                      <TableCell className="font-medium">{y.age}</TableCell>
                      <TableCell className="text-right">{usd(y.magi)}</TableCell>
                      <TableCell className="text-right">{usd(y.taxableIncome)}</TableCell>
                      <TableCell className="text-right">{pct(y.bracketHeadroomUsedPct)}</TableCell>
                      <TableCell className="text-right">{y.irmaaSurcharge ? usd(y.irmaaSurcharge) : '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {y.warnings.length ? y.warnings.join(' ') : 'On plan'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingDown className="h-4 w-4 text-primary" /> Sequencer vs. static rule-of-thumb
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Static order (taxable → pre-tax → Roth)</p>
                <p className="text-lg font-semibold">{usd(result.naive.totalTax)} lifetime tax</p>
                <p className="text-xs text-muted-foreground">Ending balance {usd(result.naive.endingTotal)}</p>
              </div>
              <div className="rounded-md border border-primary/40 p-3">
                <p className="text-xs text-muted-foreground">Bracket-filling sequencer</p>
                <p className="text-lg font-semibold">{usd(result.totals.totalTax)} lifetime tax</p>
                <p className="text-xs text-muted-foreground">Ending balance {usd(result.totals.endingTotal)}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Assumptions</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border bg-muted/40 p-3 text-xs flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p>2025 federal brackets, standard deduction, and IRMAA tiers. Estimates only — confirm with a tax professional.</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Num label="Start age" value={input.startAge} onChange={(v) => set('startAge', v)} />
                <Num label="End age" value={input.endAge} onChange={(v) => set('endAge', v)} />
                <div>
                  <Label>Filing status</Label>
                  <Select value={input.filing} onValueChange={(v) => set('filing', v as SequencerInput['filing'])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="mfj">Married filing jointly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Num label="Annual spending need" value={input.spendingNeed} onChange={(v) => set('spendingNeed', v)} />
                <Num label="Other ordinary income (pension)" value={input.otherOrdinaryIncome} onChange={(v) => set('otherOrdinaryIncome', v)} />
                <Num label="Social Security (annual)" value={input.socialSecurity} onChange={(v) => set('socialSecurity', v)} />
                <Num label="Social Security start age" value={input.ssStartAge} onChange={(v) => set('ssStartAge', v)} />
                <Num label="Taxable brokerage balance" value={input.balances.taxable} onChange={(v) => setBal('taxable', v)} />
                <Num label="Pre-tax balance" value={input.balances.traditional} onChange={(v) => setBal('traditional', v)} />
                <Num label="Roth balance" value={input.balances.roth} onChange={(v) => setBal('roth', v)} />
                <Num label="Expected return %" value={input.returnPct} step={0.1} onChange={(v) => set('returnPct', v)} />
                <Num label="Inflation %" value={input.inflationPct} step={0.1} onChange={(v) => set('inflationPct', v)} />
                <Num label="State tax %" value={input.stateTaxPct} step={0.05} onChange={(v) => set('stateTaxPct', v)} />
                <Num label="Medicare enrollees" value={input.medicareEnrollees} onChange={(v) => set('medicareEnrollees', v)} />
                <div>
                  <Label>Fill to top of bracket</Label>
                  <Select value={String(input.targetBracket)} onValueChange={(v) => set('targetBracket', Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.12">12%</SelectItem>
                      <SelectItem value="0.22">22%</SelectItem>
                      <SelectItem value="0.24">24%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={input.avoidIrmaa} onCheckedChange={(v) => set('avoidIrmaa', v)} />
                  Stay under the next IRMAA threshold
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={input.fillWithRothConversions} onCheckedChange={(v) => set('fillWithRothConversions', v)} />
                  Convert leftover headroom to Roth
                </label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <LegacyStepNav />
    </div>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-xl font-bold ${tone === 'good' ? 'text-prism-lime' : 'text-foreground'}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function Num({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type="number" step={step} value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} />
    </div>
  );
}
