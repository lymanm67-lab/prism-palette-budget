import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Target, Info, ChevronDown, ChevronUp, DollarSign, Percent, Plus, X, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, ResponsiveContainer } from 'recharts';
import { computeSummary, projectGrowth, findMilestones, projectWithRate, type CrossoverInputs } from '@/lib/crossover-calc';
import InsightCard from '@/components/credit-health/InsightCard';

const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
const fmtD = (n: number) => '$' + fmt(n);

const SCENARIOS = [0, 1.5, 2.5, 3.0];
const DEFAULT_MILESTONES = [250_000, 500_000, 1_000_000];

export default function CrossoverTracker() {
  const [balance, setBalance] = useState(165_000);
  const [annualContrib, setAnnualContrib] = useState(9_000);
  const [returnRate, setReturnRate] = useState(8);
  const [contribIncrease, setContribIncrease] = useState(2.5);
  const [milestones, setMilestones] = useState<number[]>(DEFAULT_MILESTONES);
  const [newMilestone, setNewMilestone] = useState('');
  const [timing, setTiming] = useState<'end' | 'monthly'>('end');
  const [showEducation, setShowEducation] = useState(false);

  const inputs: CrossoverInputs = useMemo(() => ({
    currentBalance: balance,
    annualContribution: annualContrib,
    expectedReturn: returnRate,
    contributionIncrease: contribIncrease,
    milestones,
    contributionTiming: timing,
  }), [balance, annualContrib, returnRate, contribIncrease, milestones, timing]);

  const summary = useMemo(() => computeSummary(inputs), [inputs]);
  const projections = useMemo(() => projectGrowth(inputs), [inputs]);
  const milestoneResults = useMemo(() => findMilestones(projections, milestones), [projections, milestones]);

  // Scenario comparison
  const scenarioData = useMemo(() => {
    return SCENARIOS.map((ci) => {
      const proj = projectWithRate(inputs, ci);
      const ms = findMilestones(proj, milestones);
      return { rate: ci, milestones: ms };
    });
  }, [inputs, milestones]);

  // Chart data — multiple lines
  const chartData = useMemo(() => {
    const allProj = SCENARIOS.map((ci) => projectWithRate(inputs, ci, 40));
    const maxLen = Math.max(...allProj.map((p) => p.length));
    const data: Record<string, number | string>[] = [];
    for (let i = 0; i < maxLen; i++) {
      const row: Record<string, number | string> = { year: allProj[0]?.[i]?.calendarYear ?? '' };
      SCENARIOS.forEach((ci, idx) => {
        row[`s${ci}`] = Math.round(allProj[idx]?.[i]?.endBalance ?? 0);
      });
      data.push(row);
    }
    return data;
  }, [inputs]);

  const chartConfig = Object.fromEntries(
    SCENARIOS.map((ci, i) => [
      `s${ci}`,
      { label: `${ci}% increase`, color: ['hsl(var(--muted-foreground))', 'hsl(var(--primary) / 0.5)', 'hsl(var(--primary))', 'hsl(var(--accent-foreground))'][i] },
    ]),
  );

  const addMilestone = () => {
    const val = parseInt(newMilestone.replace(/[^0-9]/g, ''));
    if (val && val > 0 && !milestones.includes(val)) {
      setMilestones([...milestones, val].sort((a, b) => a - b));
      setNewMilestone('');
    }
  };

  // Insights
  const insights = useMemo(() => {
    const list: { title: string; description: string; type: 'success' | 'info' | 'insight' }[] = [];
    if (summary.isPastCrossover) {
      list.push({ title: 'You\'re past your crossover point!', description: 'At your current balance, your money may be contributing more to growth than your yearly additions. This is a powerful milestone.', type: 'success' });
    } else {
      list.push({ title: 'Working toward crossover', description: `You need ${fmtD(summary.crossoverPoint)} invested for your portfolio growth to exceed your annual contributions at ${returnRate}%.`, type: 'info' });
    }
    list.push({ title: 'Contribution increases matter', description: `A 2.5% annual increase in contributions may help you reach ${fmtD(milestones[milestones.length - 1])} faster without drastically changing your lifestyle.`, type: 'insight' });
    if (summary.breakoutReturnNeeded > returnRate) {
      list.push({ title: 'Growth is building', description: `Right now you'd need a ${summary.breakoutReturnNeeded.toFixed(1)}% return for growth to match contributions. As your balance grows, this number drops naturally.`, type: 'info' });
    }
    return list;
  }, [summary, returnRate, milestones]);

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          Crossover Point & Milestone Tracker
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          See when your investments start growing faster than your contributions
        </p>
      </div>

      {/* Calculator Inputs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Your Numbers</CardTitle>
          <CardDescription>Adjust to see how changes impact your timeline</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="balance">Current Investment Balance</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="balance" type="number" className="pl-8" value={balance} onChange={(e) => setBalance(Number(e.target.value))} />
              </div>
              <p className="text-xs text-muted-foreground">Total across all retirement & investment accounts</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contrib">Annual Contribution</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="contrib" type="number" className="pl-8" value={annualContrib} onChange={(e) => setAnnualContrib(Number(e.target.value))} />
              </div>
              <p className="text-xs text-muted-foreground">How much you add per year (personal + employer)</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Expected Annual Return</Label>
              <Badge variant="secondary">{returnRate}%</Badge>
            </div>
            <Slider value={[returnRate]} onValueChange={([v]) => setReturnRate(v)} min={1} max={15} step={0.5} />
            <p className="text-xs text-muted-foreground">Historical stock market average ≈ 7–10%. This is not guaranteed.</p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Annual Contribution Increase</Label>
              <Badge variant="secondary">{contribIncrease}%</Badge>
            </div>
            <Slider value={[contribIncrease]} onValueChange={([v]) => setContribIncrease(v)} min={0} max={10} step={0.5} />
            <p className="text-xs text-muted-foreground">Raise your contributions each year to keep up with inflation</p>
          </div>

          {/* Timing toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Contribution Timing</p>
              <p className="text-xs text-muted-foreground">{timing === 'end' ? 'Lump sum at year-end' : 'Spread across 12 months'}</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className={timing === 'end' ? 'font-semibold' : 'text-muted-foreground'}>Year-end</span>
              <Switch checked={timing === 'monthly'} onCheckedChange={(v) => setTiming(v ? 'monthly' : 'end')} />
              <span className={timing === 'monthly' ? 'font-semibold' : 'text-muted-foreground'}>Monthly</span>
            </div>
          </div>

          {/* Custom milestones */}
          <div className="space-y-2">
            <Label>Milestone Goals</Label>
            <div className="flex flex-wrap gap-2">
              {milestones.map((m) => (
                <Badge key={m} variant="outline" className="gap-1 text-sm">
                  {fmtD(m)}
                  {!DEFAULT_MILESTONES.includes(m) && (
                    <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setMilestones(milestones.filter((x) => x !== m))} />
                  )}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input placeholder="Add custom milestone" value={newMilestone} onChange={(e) => setNewMilestone(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addMilestone()} />
              <Button size="sm" variant="outline" onClick={addMilestone}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className={summary.isPastCrossover ? 'border-emerald-500/30 bg-emerald-500/5' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Crossover Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Crossover Point</p>
                <p className="text-lg font-bold">{fmtD(Math.round(summary.crossoverPoint))}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Current Annual Growth</p>
                <p className="text-lg font-bold text-emerald-600">{fmtD(Math.round(summary.currentAnnualGrowth))}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Breakout Return Needed</p>
                <p className="text-lg font-bold">{summary.breakoutReturnNeeded.toFixed(1)}%</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant={summary.isPastCrossover ? 'default' : 'secondary'} className={summary.isPastCrossover ? 'bg-emerald-600' : ''}>
                  {summary.isPastCrossover ? '✓ Past Crossover' : 'Building'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Milestone Cards */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Milestone Projections</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {milestoneResults.map((m) => (
            <motion.div key={m.target} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card>
                <CardContent className="pt-5 text-center space-y-2">
                  <p className="text-2xl font-bold text-primary">{fmtD(m.target)}</p>
                  {m.yearsToGoal > 0 ? (
                    <>
                      <div className="flex items-center justify-center gap-1 text-sm">
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{m.yearsToGoal.toFixed(2)} years</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Likely reached by <span className="font-semibold">{m.calendarYear}</span></p>
                      <p className="text-xs text-muted-foreground">Projected year-end balance: {fmtD(m.projectedBalance)}</p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Beyond projection horizon</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Contribution Growth Scenarios</CardTitle>
          <CardDescription>How annual contribution increases change your timeline</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Increase</TableHead>
                {milestones.map((m) => (
                  <TableHead key={m} className="text-right">{fmtD(m)}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {scenarioData.map((s) => (
                <TableRow key={s.rate} className={s.rate === contribIncrease ? 'bg-primary/5 font-semibold' : ''}>
                  <TableCell>{s.rate}%</TableCell>
                  {s.milestones.map((m) => (
                    <TableCell key={m.target} className="text-right">
                      {m.yearsToGoal > 0 ? (
                        <span>{m.yearsToGoal.toFixed(1)} yr <span className="text-muted-foreground text-xs">({m.calendarYear})</span></span>
                      ) : '50+ yr'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Growth Projection</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="aspect-[4/3] sm:aspect-video w-full">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} interval={4} />
              <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} width={55} />
              <ChartTooltip content={<ChartTooltipContent formatter={(val) => fmtD(val as number)} />} />
              {milestones.map((m) => (
                <ReferenceLine key={m} y={m} stroke="hsl(var(--primary) / 0.3)" strokeDasharray="4 4" label={{ value: fmtD(m), position: 'right', fontSize: 10 }} />
              ))}
              {SCENARIOS.map((ci, i) => (
                <Line key={ci} type="monotone" dataKey={`s${ci}`} stroke={chartConfig[`s${ci}`].color} strokeWidth={ci === contribIncrease ? 2.5 : 1.5} dot={false} strokeDasharray={ci === 0 ? '5 5' : undefined} />
              ))}
            </LineChart>
          </ChartContainer>
          <div className="flex flex-wrap gap-3 mt-3 justify-center">
            {SCENARIOS.map((ci) => (
              <div key={ci} className="flex items-center gap-1.5 text-xs">
                <div className="h-2 w-4 rounded" style={{ backgroundColor: chartConfig[`s${ci}`].color }} />
                <span className={ci === contribIncrease ? 'font-semibold' : 'text-muted-foreground'}>{ci}% increase</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Insights</h2>
        {insights.map((ins, i) => (
          <InsightCard key={i} title={ins.title} description={ins.description} type={ins.type} />
        ))}
      </div>

      {/* Education Section */}
      <Card>
        <CardHeader className="pb-2 cursor-pointer" onClick={() => setShowEducation(!showEducation)}>
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2"><Info className="h-5 w-5 text-primary" /> What is a crossover point?</span>
            {showEducation ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CardTitle>
        </CardHeader>
        {showEducation && (
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground">The crossover point</strong> is when your portfolio's expected annual growth becomes greater than what you personally contribute each year. It's a tipping point where your money starts doing more of the heavy lifting.
            </p>
            <p>
              <strong className="text-foreground">Why does it matter?</strong> Once you pass this point, compound growth accelerates dramatically. Every dollar your portfolio earns generates even more earnings the following year — a snowball effect that can transform your long-term wealth.
            </p>
            <p>
              <strong className="text-foreground">Stay motivated.</strong> The early years of investing can feel slow. But once you cross this point, your trajectory changes. Consistency is the key — keep contributing, keep increasing, and let time do the rest.
            </p>
            <p>
              <strong className="text-foreground">A word of caution.</strong> Average return assumptions (like 8%) smooth out real-world volatility. In any given year, returns could be much higher or lower. These projections show a long-term trend, not a guarantee.
            </p>
          </CardContent>
        )}
      </Card>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground text-center px-4">
        This is an educational planning tool. Results are estimates based on assumed average returns and do not guarantee future performance.
      </p>
    </div>
  );
}
