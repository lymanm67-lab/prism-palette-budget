import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { FreedCashRedirect, FreedCashSource } from '@/hooks/use-freed-cash';
import { earliestMonth, monthKey } from '@/lib/freed-cash/timing';
import { realizedByMonth, realizedYears } from '@/lib/freed-cash/reality';
import { SavingsStoryCard } from './SavingsStoryCard';


const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

interface Props {
  sources: FreedCashSource[];
  redirects: FreedCashRedirect[];
}

export function RealizedByMonth({ sources, redirects }: Props) {
  const now = new Date();
  const years = useMemo(() => realizedYears(sources, now), [sources]);
  const [year, setYear] = useState<string>(String(now.getUTCFullYear()));
  const [showPipeline, setShowPipeline] = useState(false);

  const rows = useMemo(() => {
    if (year === 'all') {
      const first = earliestMonth(sources) ?? monthKey(now);
      const last = years.length ? `${Math.max(...years)}-12` : monthKey(now);
      return realizedByMonth(sources, redirects, first, last, now);
    }
    return realizedByMonth(sources, redirects, `${year}-01`, `${year}-12`, now);
  }, [sources, redirects, year, years]);

  const totalRealized = rows.reduce((sum, r) => sum + r.realized, 0);
  const totalCreated = rows.reduce((sum, r) => sum + r.created, 0);
  const endRunRate = rows.length ? rows[rows.length - 1].runRate : 0;
  const anyEstimated = rows.some((r) => r.estimated);

  const chartData = rows.map((r) => ({
    label: r.label.replace(/ \d{4}$/, ''),
    Realized: r.realized,
    'Run rate': r.runRate,
    Redirected: r.redirected,
    Pipeline: r.pipeline,
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Realized savings by month</CardTitle>
              <CardDescription>
                Each month counts only the savings whose cancellation or payoff date had already happened.
                Nothing is counted before its effective date, and no month is filled in from the run rate.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {years.map((y) => (
                <Button
                  key={y}
                  size="sm"
                  variant={String(y) === year ? 'default' : 'outline'}
                  onClick={() => setYear(String(y))}
                >
                  {y}
                </Button>
              ))}
              <Button size="sm" variant={year === 'all' ? 'default' : 'outline'} onClick={() => setYear('all')}>
                All years
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">
                {year === 'all' ? 'Realized, all years' : `Realized in ${year}`}
              </p>
              <p className="text-xl font-semibold text-emerald-600">{money(totalRealized)}</p>
              <p className="text-[11px] text-muted-foreground">Money actually not spent</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">New savings created</p>
              <p className="text-xl font-semibold">{money(totalCreated)}/mo</p>
              <p className="text-[11px] text-muted-foreground">Counted once, on its effective date</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Run rate at period end</p>
              <p className="text-xl font-semibold">{money(endRunRate)}/mo</p>
              <p className="text-[11px] text-muted-foreground">
                Forward annualized {money(endRunRate * 12)} — not money already saved
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch id="show-pipeline" checked={showPipeline} onCheckedChange={setShowPipeline} />
            <Label htmlFor="show-pipeline" className="text-xs text-muted-foreground">
              Show savings still in the pipeline
            </Label>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => money(Number(v))} width={70} />
                <ReTooltip formatter={(v: number) => money(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Realized" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Run rate" stroke="hsl(var(--chart-2, 173 58% 39%))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Redirected" stroke="hsl(var(--chart-4, 43 74% 66%))" strokeWidth={2} dot={false} />
                {showPipeline && (
                  <Line
                    type="monotone"
                    dataKey="Pipeline"
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto">
            <TooltipProvider delayDuration={0}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">New savings created</TableHead>
                    <TableHead className="text-right">Realized</TableHead>
                    <TableHead className="text-right">Cumulative</TableHead>
                    <TableHead className="text-right">Run rate</TableHead>
                    <TableHead className="text-right">Pipeline</TableHead>
                    <TableHead className="text-right">Redirected</TableHead>
                    <TableHead className="text-right">Unallocated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.month}>
                      <TableCell className="whitespace-nowrap font-medium">
                        {r.sources.length ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help underline decoration-dotted">{r.label}</span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="mb-1 text-xs font-medium">Savings realized this month</p>
                              {r.sources.map((s) => (
                                <p key={s.name} className="text-xs">
                                  {s.name} — {money(s.amount)} (effective {s.effectiveDate})
                                  {s.estimated ? ' · estimated' : ''}
                                </p>
                              ))}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          r.label
                        )}
                        {r.estimated && (
                          <Badge variant="outline" className="ml-2 text-[10px]">
                            est.
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{r.created > 0 ? money(r.created) : '—'}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">
                        {r.realized > 0 ? money(r.realized) : '—'}
                      </TableCell>
                      <TableCell className="text-right">{money(r.cumulativeRealized)}</TableCell>
                      <TableCell className="text-right">{money(r.runRate)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {r.pipeline > 0 ? money(r.pipeline) : '—'}
                      </TableCell>
                      <TableCell className="text-right">{r.redirected > 0 ? money(r.redirected) : '—'}</TableCell>
                      <TableCell className="text-right">{r.unallocated > 0 ? money(r.unallocated) : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TooltipProvider>
          </div>

          {anyEstimated && (
            <p className="text-xs text-muted-foreground">
              Months marked “est.” are prorated because no original billing day was recorded for that source.
              Add the billing day to the source to count the exact avoided charge.
            </p>
          )}
        </CardContent>
      </Card>

      <SavingsStoryCard
        year={year === 'all' ? now.getUTCFullYear() : Number(year)}
        realizedInYear={totalRealized}
        runRate={endRunRate}
        pipeline={rows.length ? rows[rows.length - 1].pipeline : 0}
      />
    </div>
  );
}

