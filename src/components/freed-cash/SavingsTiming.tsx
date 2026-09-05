import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { FreedCashRedirect, FreedCashSource, destinationLabel } from '@/hooks/use-freed-cash';
import {
  PERIOD_PRESETS,
  PeriodPreset,
  computeTimingMetrics,
  monthKey,
  monthLabel,
  neverCanceledReport,
  presetRange,
  yearEndReport,
} from '@/lib/freed-cash/timing';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

interface Props {
  sources: FreedCashSource[];
  redirects: FreedCashRedirect[];
}

export function SavingsTiming({ sources, redirects }: Props) {
  const now = new Date();
  const [preset, setPreset] = useState<PeriodPreset>('ytd');
  const [customFrom, setCustomFrom] = useState(`${now.getUTCFullYear()}-01`);
  const [customTo, setCustomTo] = useState(monthKey(now));
  const [year, setYear] = useState(now.getUTCFullYear());

  const { fromKey, toKey } = useMemo(() => {
    if (preset === 'custom') {
      const a = customFrom <= customTo ? customFrom : customTo;
      const b = customFrom <= customTo ? customTo : customFrom;
      return { fromKey: a, toKey: b };
    }
    return presetRange(preset, now);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, customFrom, customTo]);

  const metrics = useMemo(() => computeTimingMetrics(sources, fromKey, toKey, now), [sources, fromKey, toKey]);
  const whatIf = useMemo(() => neverCanceledReport(sources, fromKey, toKey), [sources, fromKey, toKey]);
  const yearReport = useMemo(() => yearEndReport(sources, redirects, year), [sources, redirects, year]);

  const years = useMemo(() => {
    const set = new Set<number>([now.getUTCFullYear()]);
    sources.forEach((s) => s.effective_date && set.add(Number(s.effective_date.slice(0, 4))));
    return [...set].sort((a, b) => b - a);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources]);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Reporting period</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              A cancellation is counted once as new savings created, repeatedly as realized savings, and once
              as an annual run-rate estimate. Cumulative totals are never shown as one month's savings.
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="w-48">
              <Label>Period</Label>
              <Select value={preset} onValueChange={(v) => setPreset(v as PeriodPreset)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {preset === 'custom' && (
              <>
                <div className="w-40">
                  <Label>From month</Label>
                  <Input type="month" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                </div>
                <div className="w-40">
                  <Label>To month</Label>
                  <Input type="month" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
                </div>
              </>
            )}
            <p className="pb-2 text-xs text-muted-foreground">
              Showing {monthLabel(fromKey)} – {monthLabel(toKey)} ({metrics.periodMonths} months)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Historical savings (already happened)</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Based on each expense's actual savings effective date — not the date you asked to cancel.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <Metric
              label="Savings Created This Month"
              value={`${money(metrics.createdThisMonth)}/mo`}
              tip="New recurring savings whose effective date falls inside the selected month. Savings created in earlier months are excluded."
            />
            <Metric
              label="Realized Savings This Month"
              value={money(metrics.realizedThisMonth)}
              tip="The recurring savings that actually applied during the selected month, prorated when savings started partway through."
            />
            <Metric
              label="Year-to-Date Realized Savings"
              value={money(metrics.ytdRealized)}
              tip="Realized savings from January of the selected year through the selected month."
            />
            <Metric
              label="Cumulative Realized Savings"
              value={money(metrics.cumulativeRealized)}
              tip="Every dollar actually saved from the first effective date through the selected month. This is a running total, not a monthly figure."
            />
            <Metric
              label="Average Monthly Realized Savings"
              value={money(metrics.averageMonthlyRealized)}
              tip="Total realized savings during the selected period divided by the number of months in that period."
            />
            <Metric
              label="Realized Savings This Period"
              value={money(metrics.periodRealized)}
              tip="Sum of realized savings across every month in the selected period."
            />
          </CardContent>
        </Card>

        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Forward-looking savings (estimates)</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Estimates of future spending avoided. Never added to realized savings above.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Metric
              label="Current Monthly Savings Run Rate"
              value={`${money(metrics.runRate)}/mo`}
              tip="How much lower your recurring monthly expenses are right now because of all active cancellations and reductions. Cumulative by design — it is a current expense level, not one month's savings."
            />
            <Metric
              label="Avoided Annual Spending"
              value={money(metrics.avoidedAnnual)}
              tip="Run rate × 12. A forward-looking estimate of what you would spend over the next 12 months if these expenses had continued. Not realized savings."
            />
          </CardContent>
        </Card>

        <SavingsBreakdown sources={sources} fromKey={fromKey} toKey={toKey} />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Monthly savings history</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Timing at a glance: what was created each month versus what was actually saved.
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {metrics.rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No savings recorded in this period yet.
              </p>
            ) : (
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3">Month</th>
                    <th className="py-2 pr-3 text-right">New cancellations</th>
                    <th className="py-2 pr-3 text-right">Savings created</th>
                    <th className="py-2 pr-3 text-right">Realized this month</th>
                    <th className="py-2 pr-3 text-right">Month-end run rate</th>
                    <th className="py-2 pr-3 text-right">Cumulative realized</th>
                    <th className="py-2 text-right">Avoided annual at month end</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.rows.map((r) => (
                    <tr key={r.month} className="border-b border-border/50">
                      <td className="py-2 pr-3 font-medium">{r.label}</td>
                      <td className="py-2 pr-3 text-right">
                        {r.newCancellations || '—'}
                        {r.newReductions > 0 && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            +{r.newReductions} reduced
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right">{r.createdMonthly ? money(r.createdMonthly) : '—'}</td>
                      <td className="py-2 pr-3 text-right">{money(r.realizedThisMonth)}</td>
                      <td className="py-2 pr-3 text-right">{money(r.runRateAtEnd)}</td>
                      <td className="py-2 pr-3 text-right font-medium">{money(r.cumulativeRealized)}</td>
                      <td className="py-2 text-right text-muted-foreground">{money(r.avoidedAnnualAtEnd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">What if I never canceled?</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {monthLabel(fromKey)} – {monthLabel(toKey)} comparison.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Metric
              label="Actual recurring spending"
              value={money(whatIf.actualRecurringSpend)}
              tip="What these expenses actually cost you during the period, after cancellations and reductions."
            />
            <Metric
              label="If they had continued"
              value={money(whatIf.hypotheticalSpend)}
              tip="Estimated cost over the same period if nothing had been canceled or reduced."
            />
            <Metric label="Difference" value={money(whatIf.difference)} tip="Spending avoided during the period." />
            <Metric
              label="Realized savings to date"
              value={money(whatIf.realizedSavings)}
              tip="Savings actually delivered during the period."
            />
            <Metric
              label="Projected next 12 months avoided"
              value={money(whatIf.projectedAvoidedNext12)}
              tip="Forward-looking estimate based on the current run rate."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
            <div>
              <CardTitle className="text-base">Year-end savings report</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Full-year timing plus where the freed cash was sent. Redirecting money is not a second savings
                event — it is the same dollars getting a job.
              </p>
            </div>
            <div className="w-32">
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="Cancellations this year" value={String(yearReport.cancellations)} />
              <Metric label="Reductions this year" value={String(yearReport.reductions)} />
              <Metric label="Total realized savings" value={money(yearReport.totalRealized)} />
              <Metric
                label="Average monthly realized"
                value={money(yearReport.averageMonthlyRealized)}
                tip="Realized savings divided by the months in which savings were active."
              />
              <Metric
                label="December-ending run rate"
                value={`${money(yearReport.yearEndRunRate)}/mo`}
                tip="Recurring monthly savings still in force at year end."
              />
              <Metric
                label="Avoided annual spending (year-end run rate)"
                value={money(yearReport.avoidedAnnualAtYearEnd)}
                tip="Forward-looking estimate: year-end run rate × 12."
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Where the freed cash goes</p>
              <div className="flex flex-wrap gap-2">
                {yearReport.redirectedByDestination.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nothing redirected yet.</p>
                )}
                {yearReport.redirectedByDestination.map((d) => (
                  <Badge key={d.destination} variant="secondary">
                    {destinationLabel(d.destination)}: {money(d.monthly)}/mo
                  </Badge>
                ))}
                <Badge variant="outline">Unallocated: {money(yearReport.unallocatedMonthly)}/mo</Badge>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3">Month</th>
                    <th className="py-2 pr-3 text-right">Savings created</th>
                    <th className="py-2 pr-3 text-right">Realized</th>
                    <th className="py-2 text-right">Run rate at month end</th>
                  </tr>
                </thead>
                <tbody>
                  {yearReport.byMonth.map((r) => (
                    <tr key={r.month} className="border-b border-border/50">
                      <td className="py-2 pr-3">{r.label}</td>
                      <td className="py-2 pr-3 text-right">{r.createdMonthly ? money(r.createdMonthly) : '—'}</td>
                      <td className="py-2 pr-3 text-right">{money(r.realizedThisMonth)}</td>
                      <td className="py-2 text-right">{money(r.runRateAtEnd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

function Metric({ label, value, tip }: { label: string; value: string; tip?: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-3">
      <div className="flex items-start gap-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {tip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help text-muted-foreground">
                <Info className="h-3 w-3" />
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">{tip}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
