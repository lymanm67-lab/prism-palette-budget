import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { beforeAfter, creepTrend, opportunityCost, vendorRollup } from '@/lib/freed-cash/analytics';
import { buildMonthlyHistory, computeTimingMetrics, monthKey } from '@/lib/freed-cash/timing';
import { conversionMetrics } from '@/lib/freed-cash/conversion';
import PrintInfographicButton from '@/components/reports/PrintInfographicButton';
import type { InfographicSpec } from '@/lib/reports/infographic';
import {
  FreedCashRedirect,
  FreedCashSource,
  destinationLabel,
  monthlySavings,
  redirectCapacity,
  toMonthly,
  useFreedCashReviews,
} from '@/hooks/use-freed-cash';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const money2 = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2, 173 58% 39%))',
  'hsl(var(--chart-3, 197 37% 44%))',
  'hsl(var(--chart-4, 43 74% 55%))',
  'hsl(var(--chart-5, 27 87% 61%))',
  'hsl(var(--muted-foreground))',
];

interface Props {
  sources: FreedCashSource[];
  redirects: FreedCashRedirect[];
}

export function FreedCashImpactReport({ sources, redirects }: Props) {
  const { data: reviews } = useFreedCashReviews();
  const ba = useMemo(() => beforeAfter(sources), [sources]);
  const capacity = useMemo(() => redirectCapacity(sources, redirects), [sources, redirects]);
  const trend = useMemo(() => creepTrend(reviews ?? []), [reviews]);
  const conv = useMemo(() => conversionMetrics(sources, redirects), [sources, redirects]);
  const vendors = useMemo(() => vendorRollup(sources).slice(0, 8), [sources]);

  const timing = useMemo(() => {
    const now = new Date();
    return computeTimingMetrics(sources, `${now.getUTCFullYear()}-01`, monthKey(now), now);
  }, [sources]);

  const history = useMemo(() => {
    const now = new Date();
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
    return buildMonthlyHistory(sources, monthKey(from), monthKey(now));
  }, [sources]);

  const perSource = useMemo(
    () =>
      sources
        .map((s) => ({
          ...s,
          before: toMonthly(Number(s.original_amount), s.billing_frequency),
          after:
            toMonthly(Number(s.new_amount), s.billing_frequency) +
            toMonthly(Number(s.added_fees), s.billing_frequency),
          saved: monthlySavings(s),
        }))
        .sort((a, b) => b.saved - a.saved),
    [sources],
  );

  const redirectRows = useMemo(() => {
    const names = new Map(sources.map((s) => [s.id, s.name]));
    return redirects
      .filter((r) => r.status !== 'cancelled')
      .map((r) => ({
        ...r,
        sourceName: (r.source_id && names.get(r.source_id)) || 'Pooled freed cash',
      }))
      .sort((a, b) => Number(b.monthly_amount) - Number(a.monthly_amount));
  }, [sources, redirects]);

  const destinationSlices = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of redirectRows) {
      const key = r.destination_label || destinationLabel(r.destination_type);
      map.set(key, (map.get(key) ?? 0) + Number(r.monthly_amount));
    }
    const rows = [...map.entries()]
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
    if (capacity.unassignedMonthly > 0.5)
      rows.push({ name: 'Still needs a job', value: Math.round(capacity.unassignedMonthly * 100) / 100 });
    return rows;
  }, [redirectRows, capacity.unassignedMonthly]);

  const topSavers = useMemo(
    () =>
      perSource
        .filter((s) => s.saved > 0)
        .slice(0, 8)
        .map((s) => ({ name: s.name.length > 18 ? `${s.name.slice(0, 17)}…` : s.name, before: s.before, after: s.after, saved: s.saved })),
    [perSource],
  );

  const [returnPct, setReturnPct] = useState(7);
  const projections = useMemo(
    () => opportunityCost(capacity.verifiedMonthly, returnPct),
    [capacity.verifiedMonthly, returnPct],
  );

  /* ------------------------------------------------------------- narrative */
  const narrative = useMemo(() => {
    const lines: string[] = [];
    const biggest = perSource.find((s) => s.saved > 0);
    lines.push(
      ba.savedMonthly > 0
        ? `You have cut your recurring costs from ${money2(ba.beforeMonthly)} to ${money2(
            ba.afterMonthly,
          )} a month — ${money2(ba.savedMonthly)} freed every month, or ${money2(
            ba.savedAnnual,
          )} a year, a ${ba.reductionPct.toFixed(1)}% reduction.`
        : 'No recurring savings have been recorded yet, so there is nothing freed up to report.',
    );
    if (biggest)
      lines.push(
        `${biggest.name} is the single biggest win at ${money2(biggest.saved)} a month (${money2(
          biggest.saved * 12,
        )} a year).`,
      );
    lines.push(
      `${ba.verifiedShare.toFixed(0)}% of that has been confirmed on a real bill or statement. Confirmed savings are the only ones safe to spend or redirect.`,
    );
    lines.push(
      capacity.unassignedMonthly > 0.5
        ? `${money2(capacity.assignedMonthly)} a month already has a job, but ${money2(
            capacity.unassignedMonthly,
          )} a month still does not — that is the money most likely to quietly drift back into everyday spending.`
        : `Every freed dollar has a job: ${money2(capacity.assignedMonthly)} a month is assigned.`,
    );
    if (conv.executionGap > 0.5)
      lines.push(
        `${money2(conv.executionGap)} a month is assigned but has not actually moved yet. Assigning is a plan; moving the money is progress.`,
      );
    lines.push(
      `So far this year you have realized ${money2(timing.ytdRealized)}, and all-time ${money2(
        timing.cumulativeRealized,
      )}. At today's run rate of ${money2(timing.runRate)} a month you avoid ${money2(
        timing.avoidedAnnual,
      )} of spending over the next 12 months.`,
    );
    if (capacity.verifiedMonthly > 0) {
      const twenty = projections.find((p) => p.years === 20);
      if (twenty)
        lines.push(
          `Invested at ${returnPct}%, the confirmed ${money2(
            capacity.verifiedMonthly,
          )} a month would grow to about ${money(twenty.value)} in 20 years — ${money(
            twenty.growth,
          )} of that is growth you would never see if the money is absorbed back into spending.`,
        );
    }
    return lines;
  }, [ba, perSource, capacity, conv, timing, projections, returnPct]);

  /* ----------------------------------------------------------- infographic */
  const buildSpec = (): InfographicSpec => ({
    title: 'FREED CASH IMPACT',
    period: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    tagline: 'Every freed dollar needs a new job.',
    glanceTitle: 'At a glance',
    glance: [
      { label: 'Freed / month', value: money2(ba.savedMonthly), tone: 'green' },
      { label: 'Annual impact', value: money2(ba.savedAnnual), tone: 'blue' },
      { label: 'Confirmed', value: `${ba.verifiedShare.toFixed(0)}%`, tone: 'navy' },
      { label: 'No job yet', value: money2(capacity.unassignedMonthly), tone: 'red' },
    ],
    kpis: [
      { title: 'Before', value: `${money2(ba.beforeMonthly)}/mo`, sub: 'Old recurring cost', tone: 'grey' },
      { title: 'After', value: `${money2(ba.afterMonthly)}/mo`, sub: 'Including new fees', tone: 'blue' },
      { title: 'Run rate', value: `${money2(timing.runRate)}/mo`, sub: 'Current savings level', tone: 'green' },
      { title: 'YTD realized', value: money2(timing.ytdRealized), sub: 'Actually saved this year', tone: 'purple' },
    ],
    donut: destinationSlices.length
      ? {
          title: 'Where the freed money goes',
          legendHeader: 'Destination',
          totalLabel: 'Freed / mo',
          slices: destinationSlices.map((s) => ({ label: s.name, value: s.value })),
          footerNote: `Assigned ${money2(capacity.assignedMonthly)}/mo of ${money2(capacity.verifiedMonthly)}/mo confirmed.`,
        }
      : undefined,
    tables: [
      {
        title: 'Biggest wins',
        columns: [
          { label: 'Expense' },
          { label: 'Before', align: 'right' as const },
          { label: 'After', align: 'right' as const },
          { label: 'Freed / mo', align: 'right' as const },
        ],
        rows: perSource
          .slice(0, 8)
          .map((s) => [s.name, money2(s.before), money2(s.after), money2(s.saved)]),
      },
      {
        title: 'Long-term value of the freed cash',
        columns: ['Horizon', 'Contributed', 'Value', 'Growth'],
        rows: projections.map((p) => [`${p.years} yr`, money(p.contributed), money(p.value), money(p.growth)]),
      },
    ],
    trend: history.length
      ? {
          title: 'Realized savings vs run rate',
          points: history.map((h) => ({
            label: h.label,
            primary: h.realizedThisMonth,
            secondary: h.runRateAtEnd,
          })),
          primaryLabel: 'Realized',
          secondaryLabel: 'Run rate',
        }
      : undefined,
    commitment: {
      label: 'Commitment',
      text: 'Freed cash is only real once it is confirmed on a statement and moved to a goal.',
      steps: [
        'Confirm every saving against a real bill',
        'Give each freed dollar one job',
        'Move the money, then mark it moved',
      ],
    },
    slogan: 'Cut it once. Keep it forever.',
    zoom: 0.9,
  });

  return (
    <div className="space-y-4 print:space-y-3">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
          <div>
            <CardTitle className="text-base">The story in plain English</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              A written summary of what your freed cash has done, and what still needs attention.
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            <PrintInfographicButton buildSpec={buildSpec} label="Infographic" size="sm" filename="freed-cash-impact" />
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              Print report
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {narrative.map((line, i) => (
            <p key={i} className="text-sm leading-relaxed text-muted-foreground">
              {line}
            </p>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Before and after</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            What these recurring expenses used to cost versus what they cost now.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <Stat label="Before" value={`${money2(ba.beforeMonthly)}/mo`} />
          <Stat label="After (incl. fees)" value={`${money2(ba.afterMonthly)}/mo`} />
          <Stat label="Freed" value={`${money2(ba.savedMonthly)}/mo`} />
          <Stat label="Annual impact" value={money2(ba.savedAnnual)} />
          <Stat label="Cost reduction" value={`${ba.reductionPct.toFixed(1)}%`} />
          <Stat label="Verified share" value={`${ba.verifiedShare.toFixed(1)}%`} />
          <Stat label="Redirected" value={`${money2(capacity.assignedMonthly)}/mo`} />
          <Stat label="Still needs a job" value={`${money2(capacity.unassignedMonthly)}/mo`} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Savings over the last 12 months</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Bars are what actually hit the budget each month; the line is your running total.
            </p>
          </CardHeader>
          <CardContent className="h-72">
            {history.length === 0 ? (
              <Empty text="No monthly history yet." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => money(Number(v))} />
                  <ReTooltip formatter={(v: number, n) => [money2(Number(v)), String(n)]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area
                    type="monotone"
                    dataKey="realizedThisMonth"
                    name="Realized this month"
                    stroke={CHART_COLORS[0]}
                    fill={CHART_COLORS[0]}
                    fillOpacity={0.25}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulativeRealized"
                    name="Running total"
                    stroke={CHART_COLORS[3]}
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Where the freed money goes</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Each slice is a monthly amount assigned to a goal. Grey means it has no job yet.
            </p>
          </CardHeader>
          <CardContent className="h-72">
            {destinationSlices.length === 0 ? (
              <Empty text="No freed cash has been given a job yet." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={destinationSlices} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95}>
                    {destinationSlices.map((s, i) => (
                      <Cell
                        key={s.name}
                        fill={
                          s.name === 'Still needs a job'
                            ? 'hsl(var(--muted-foreground))'
                            : CHART_COLORS[i % CHART_COLORS.length]
                        }
                      />
                    ))}
                  </Pie>
                  <ReTooltip formatter={(v: number, n) => [`${money2(Number(v))}/mo`, String(n)]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Biggest wins, before versus after</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Your top expenses, side by side: what they cost before and what they cost now.
          </p>
        </CardHeader>
        <CardContent className="h-80">
          {topSavers.length === 0 ? (
            <Empty text="No savings recorded yet." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topSavers} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => money(Number(v))} />
                <ReTooltip formatter={(v: number, n) => [money2(Number(v)), String(n)]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="before" name="Before" fill="hsl(var(--muted-foreground))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="after" name="After" fill={CHART_COLORS[2]} radius={[3, 3, 0, 0]} />
                <Bar dataKey="saved" name="Freed" fill={CHART_COLORS[0]} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Before and after by expense</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Every cancellation, reduction and negotiation, with what it cost before and now.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {perSource.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No savings recorded yet.</p>
          )}
          {perSource.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/40 p-3"
            >
              <div className="min-w-[10rem]">
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {s.vendor ? `${s.vendor} · ` : ''}
                  {s.source_type.replace(/_/g, ' ')} · {s.status}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Before {money2(s.before)}/mo → after {money2(s.after)}/mo
              </p>
              <p className="text-sm font-semibold">
                {money2(s.saved)}/mo · {money2(s.saved * 12)}/yr
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {vendors.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">By vendor</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Which companies your savings came from, and where savings came back.
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Vendor</th>
                  <th className="py-2 pr-3 font-medium">Changes</th>
                  <th className="py-2 pr-3 font-medium">Confirmed / mo</th>
                  <th className="py-2 pr-3 font-medium">Pending / mo</th>
                  <th className="py-2 pr-3 font-medium">Came back / mo</th>
                  <th className="py-2 font-medium">Confirmed / yr</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v) => (
                  <tr key={v.vendor} className="border-b border-border/40 last:border-0">
                    <td className="py-2 pr-3 font-medium">{v.vendor}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{v.count}</td>
                    <td className="py-2 pr-3">{money2(v.verifiedMonthly)}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{money2(v.pipelineMonthly)}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{money2(v.reversedMonthly)}</td>
                    <td className="py-2 font-semibold">{money2(v.annualVerified)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Where the freed money went</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Redirected {money2(capacity.assignedMonthly)}/mo of the verified {money2(capacity.verifiedMonthly)}/mo.
            Still needs a job: {money2(capacity.unassignedMonthly)}/mo.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {redirectRows.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No freed cash has been given a job yet.
            </p>
          )}
          {redirectRows.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/40 p-3"
            >
              <div className="min-w-[10rem]">
                <p className="text-sm font-medium">
                  {r.destination_label || destinationLabel(r.destination_type)}
                </p>
                <p className="text-xs text-muted-foreground">
                  From {r.sourceName} · since {r.start_date}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {r.status}
                {r.confirmed_moved ? ' · money confirmed moved' : ' · not confirmed yet'}
              </p>
              <p className="text-sm font-semibold">
                {money2(Number(r.monthly_amount))}/mo · {money2(Number(r.monthly_amount) * 12)}/yr
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Opportunity cost of not redirecting</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            If your verified {money2(capacity.verifiedMonthly)}/mo is invested instead of absorbed back
            into spending.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="w-40 print:hidden">
            <Label>Assumed annual return %</Label>
            <Input
              type="number"
              step="0.5"
              value={returnPct}
              onChange={(e) => setReturnPct(Number(e.target.value) || 0)}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-5">
            {projections.map((p) => (
              <div key={p.years} className="rounded-lg border border-border/60 bg-card/40 p-3">
                <p className="text-xs text-muted-foreground">{p.years} yr</p>
                <p className="text-lg font-semibold">{money(p.value)}</p>
                <p className="text-xs text-muted-foreground">
                  {money(p.contributed)} in · {money(p.growth)} growth
                </p>
              </div>
            ))}
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projections} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="years" tickFormatter={(v) => `${v} yr`} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => money(Number(v))} />
                <ReTooltip formatter={(v: number, n) => [money(Number(v)), String(n)]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="contributed" name="Money you put in" stackId="a" fill={CHART_COLORS[2]} />
                <Bar dataKey="growth" name="Growth" stackId="a" fill={CHART_COLORS[0]} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Capture trend</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            From your saved monthly reviews — is freed cash getting a job, or drifting back into spending?
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {trend.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Log a monthly review to start the trend.
            </p>
          )}
          {trend.length > 0 && (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => money(Number(v))} />
                  <ReTooltip formatter={(v: number, n) => [money2(Number(v)), String(n)]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area
                    type="monotone"
                    dataKey="verifiedMonthly"
                    name="Confirmed savings"
                    stroke={CHART_COLORS[2]}
                    fill={CHART_COLORS[2]}
                    fillOpacity={0.2}
                  />
                  <Area
                    type="monotone"
                    dataKey="redirectedMonthly"
                    name="Given a job"
                    stroke={CHART_COLORS[0]}
                    fill={CHART_COLORS[0]}
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          {trend.map((t) => (
            <div
              key={t.month}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/40 p-3"
            >
              <p className="text-sm font-medium">{t.month}</p>
              <p className="text-xs text-muted-foreground">
                Verified {money2(t.verifiedMonthly)} · redirected {money2(t.redirectedMonthly)} · capture{' '}
                {t.captureRate.toFixed(1)}%
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{text}</div>
  );
}
