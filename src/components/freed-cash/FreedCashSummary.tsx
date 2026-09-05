import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import type { FreedCashRedirect, FreedCashSource, FreedCashTotals } from '@/hooks/use-freed-cash';
import { computeTimingMetrics, monthKey } from '@/lib/freed-cash/timing';
import { conversionMetrics } from '@/lib/freed-cash/conversion';

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

interface Props {
  totals: FreedCashTotals;
  sources: FreedCashSource[];
  redirects?: FreedCashRedirect[];
}

export function FreedCashSummary({ totals, sources, redirects = [] }: Props) {
  const timing = useMemo(() => {
    const now = new Date();
    const key = monthKey(now);
    return computeTimingMetrics(sources, `${now.getUTCFullYear()}-01`, key, now);
  }, [sources]);

  const conv = useMemo(() => conversionMetrics(sources, redirects), [sources, redirects]);


  const historical = [
    {
      label: 'Savings Created This Month',
      value: `${fmt(timing.createdThisMonth)}/mo`,
      hint: 'New recurring savings effective this month',
      tip: 'Only savings whose effective date falls in the current month. Savings created in earlier months are not repeated here.',
    },
    {
      label: 'Realized Savings This Month',
      value: fmt(timing.realizedThisMonth),
      hint: 'What actually hit the budget this month',
      tip: 'Recurring savings that actually applied during this calendar month, prorated when savings started partway through.',
    },
    {
      label: 'Year-to-Date Realized Savings',
      value: fmt(timing.ytdRealized),
      hint: 'January through this month',
      tip: 'Sum of realized savings for each month so far this year.',
    },
    {
      label: 'Cumulative Realized Savings',
      value: fmt(timing.cumulativeRealized),
      hint: 'All-time, from each effective date',
      tip: 'A running total of every dollar actually saved since the first effective date. Not a monthly figure.',
    },
    {
      label: 'Freed Cash Conversion Rate',
      value: `${conv.conversionRate.toFixed(0)}%`,
      hint: `${fmt(conv.executedMonthly)}/mo actually moved`,
      tip: 'The share of realized savings that became measurable financial progress — money actually transferred or contributed. Separate from the Savings Capture Rate, which only measures assignment.',
    },
  ];


  const forward = [
    {
      label: 'Current Monthly Savings Run Rate',
      value: `${fmt(timing.runRate)}/mo`,
      hint: 'How much lower your recurring expenses are now',
      tip: 'The combined effect of all active cancellations and reductions on your current monthly expenses. Cumulative by design — it is a current expense level, not one month of new savings.',
    },
    {
      label: 'Avoided Annual Spending',
      value: fmt(timing.avoidedAnnual),
      hint: 'Forward-looking estimate (run rate × 12)',
      tip: 'What you would spend over the next 12 months if these expenses had continued. An estimate — never added to realized savings.',
    },
    {
      label: 'Average Monthly Realized Savings',
      value: fmt(timing.averageMonthlyRealized),
      hint: `Year to date, over ${timing.periodMonths} months`,
      tip: 'Total realized savings this year divided by the number of months elapsed.',
    },
    {
      label: 'In the pipeline',
      value: fmt(totals.monthlyPipeline),
      hint: 'Requested or awaiting proof — not counted yet',
      tip: 'Claimed savings that are not yet confirmed or verified. Excluded from realized savings and the run rate.',
    },
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-4">
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Historical savings (already happened)</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {historical.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Forward-looking savings (estimates)</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {forward.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>
        </section>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Capture rate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={Math.min(100, totals.captureRate)} />
            <p className="text-xs text-muted-foreground">
              {totals.captureRate.toFixed(0)}% of claimed savings are verified ({totals.verifiedCount} of{' '}
              {totals.count} sources). Every freed dollar needs a new job — unverified savings are not spendable
              yet. Reversed / reactivated: {fmt(totals.monthlyReversed)}/mo.
            </p>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

function StatCard({ label, value, hint, tip }: { label: string; value: string; hint: string; tip?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-start gap-1 text-xs font-medium text-muted-foreground">
          {label}
          {tip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help">
                  <Info className="h-3 w-3" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">{tip}</TooltipContent>
            </Tooltip>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
