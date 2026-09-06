import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Droplet,
  FileText,
  Gauge,
  History,
  Printer,
  Table as TableIcon,
  Target,
} from 'lucide-react';
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
import { leakageReport } from '@/lib/freed-cash/leakage';
import { keepScenarios } from '@/lib/freed-cash/wins';
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

const SECTIONS = [
  { id: 'fc-narrative', label: 'The story', icon: FileText },
  { id: 'fc-summary', label: 'Summary', icon: BarChart3 },
  { id: 'fc-charts', label: 'Charts', icon: BarChart3 },
  { id: 'fc-tables', label: 'Tables', icon: TableIcon },
  { id: 'fc-scenarios', label: 'Scenarios', icon: Target },
  { id: 'fc-next', label: 'Next steps', icon: CheckCircle2 },
  { id: 'fc-pitfalls', label: 'Pitfalls', icon: AlertTriangle },
  { id: 'fc-ledger', label: 'History ledger', icon: History },
];

type Tone = 'green' | 'blue' | 'amber' | 'red' | 'neutral';

const TONE_CLASS: Record<Tone, string> = {
  green: 'border-emerald-500/40 bg-emerald-500/10',
  blue: 'border-sky-500/40 bg-sky-500/10',
  amber: 'border-amber-500/40 bg-amber-500/10',
  red: 'border-rose-500/40 bg-rose-500/10',
  neutral: 'border-border/60 bg-card/40',
};

export function FreedCashImpactReport({ sources, redirects }: Props) {
  const { data: reviews } = useFreedCashReviews();

  /* ------------------------------------------------------------ view state */
  const [inkSaver, setInkSaver] = useState(false);
  const [printPreview, setPrintPreview] = useState(false);
  const [returnPct, setReturnPct] = useState(7);
  const [horizon, setHorizon] = useState<1 | 3 | 5>(5);
  const [ledgerYear, setLedgerYear] = useState<'all' | string>('all');
  const [activeMetric, setActiveMetric] = useState<'realized' | 'runRate' | 'capture' | 'gap'>('runRate');

  /* ----------------------------------------------------------------- data */
  const ba = useMemo(() => beforeAfter(sources), [sources]);
  const capacity = useMemo(() => redirectCapacity(sources, redirects), [sources, redirects]);
  const trend = useMemo(() => creepTrend(reviews ?? []), [reviews]);
  const conv = useMemo(() => conversionMetrics(sources, redirects), [sources, redirects]);
  const vendors = useMemo(() => vendorRollup(sources).slice(0, 8), [sources]);
  const leaks = useMemo(() => leakageReport(sources, redirects), [sources, redirects]);
  const scenarios = useMemo(() => keepScenarios(redirects), [redirects]);

  const timing = useMemo(() => {
    const now = new Date();
    return computeTimingMetrics(sources, `${now.getUTCFullYear()}-01`, monthKey(now), now);
  }, [sources]);

  const history = useMemo(() => {
    const now = new Date();
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
    return buildMonthlyHistory(sources, monthKey(from), monthKey(now));
  }, [sources]);

  const fullLedger = useMemo(() => {
    const now = new Date();
    const from = new Date(Date.UTC(now.getUTCFullYear() - 4, 0, 1));
    return buildMonthlyHistory(sources, monthKey(from), monthKey(now)).slice().reverse();
  }, [sources]);

  const ledgerYears = useMemo(
    () => [...new Set(fullLedger.map((r) => r.month.slice(0, 4)))].sort().reverse(),
    [fullLedger],
  );

  const ledgerRows = useMemo(
    () => (ledgerYear === 'all' ? fullLedger : fullLedger.filter((r) => r.month.startsWith(ledgerYear))),
    [fullLedger, ledgerYear],
  );

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
        .map((s) => ({
          name: s.name.length > 18 ? `${s.name.slice(0, 17)}…` : s.name,
          before: s.before,
          after: s.after,
          saved: s.saved,
        })),
    [perSource],
  );

  const projections = useMemo(
    () => opportunityCost(capacity.verifiedMonthly, returnPct),
    [capacity.verifiedMonthly, returnPct],
  );

  const scenarioPick = (r: (typeof scenarios.rows)[number]) =>
    horizon === 1 ? r.year1 : horizon === 3 ? r.year3 : r.year5;
  const scenarioExecuted = (r: (typeof scenarios.rows)[number]) =>
    horizon === 1 ? r.executedYear1 : horizon === 3 ? r.executedYear3 : r.executedYear5;
  const scenarioTotal =
    horizon === 1 ? scenarios.totalYear1 : horizon === 3 ? scenarios.totalYear3 : scenarios.totalYear5;

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

  /* ------------------------------------------------------------ next steps */
  const nextSteps = useMemo(() => {
    const steps: { text: string; why: string; amount?: number }[] = [];
    if (capacity.unassignedMonthly > 0.5)
      steps.push({
        text: 'Give every freed dollar a job',
        why: 'Unassigned freed cash is still spendable, so it disappears into everyday spending.',
        amount: capacity.unassignedMonthly,
      });
    if (conv.executionGap > 0.5)
      steps.push({
        text: 'Actually move the money you already assigned',
        why: 'A plan only counts once the transfer happens — then mark the redirect as moved.',
        amount: conv.executionGap,
      });
    const unverified = ba.savedMonthly - capacity.verifiedMonthly;
    if (unverified > 0.5)
      steps.push({
        text: 'Confirm the rest of your savings on a real bill',
        why: 'Unconfirmed savings may never have taken effect. Use the Reconcile page.',
        amount: unverified,
      });
    if (leaks.highCount > 0)
      steps.push({
        text: `Fix ${leaks.highCount} high-risk saving${leaks.highCount === 1 ? '' : 's'}`,
        why: 'These are ending soon, likely to come back, or have no job — see Pitfalls below.',
        amount: leaks.atRiskMonthly,
      });
    if (steps.length === 0)
      steps.push({
        text: 'Keep it clean: re-check statements once a quarter',
        why: 'Everything is confirmed, assigned and moving. The only job left is protecting it.',
      });
    return steps;
  }, [capacity, conv, ba, leaks]);

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
        columns: [
          { label: 'Horizon' },
          { label: 'Contributed', align: 'right' as const },
          { label: 'Value', align: 'right' as const },
          { label: 'Growth', align: 'right' as const },
        ],
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

  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const printReport = () => {
    document.body.classList.add('fc-report-print-only');
    const cleanup = () => {
      document.body.classList.remove('fc-report-print-only');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
    setTimeout(cleanup, 1500);
  };

  const summaryMetrics = [
    {
      id: 'realized' as const,
      label: 'Realized this year',
      value: money2(timing.ytdRealized),
      detail: `${money2(timing.cumulativeRealized)} saved all-time`,
      progress: Math.min(100, (timing.ytdRealized / Math.max(timing.avoidedAnnual, 1)) * 100),
      icon: CircleDollarSign,
      tone: 'green' as Tone,
    },
    {
      id: 'runRate' as const,
      label: 'Current monthly run rate',
      value: `${money2(timing.runRate)}/mo`,
      detail: `${money2(timing.avoidedAnnual)} avoided over the next 12 months`,
      progress: Math.min(100, (timing.runRate / Math.max(ba.beforeMonthly, 1)) * 100),
      icon: Activity,
      tone: 'blue' as Tone,
    },
    {
      id: 'capture' as const,
      label: 'Confirmed on statements',
      value: `${ba.verifiedShare.toFixed(0)}%`,
      detail: `${money2(capacity.verifiedMonthly)}/mo is safe to redirect`,
      progress: Math.min(100, ba.verifiedShare),
      icon: Gauge,
      tone: 'green' as Tone,
    },
    {
      id: 'gap' as const,
      label: 'Execution gap',
      value: `${money2(conv.executionGap)}/mo`,
      detail: `${money2(capacity.unassignedMonthly)}/mo still needs a job`,
      progress: Math.min(100, (conv.executionGap / Math.max(capacity.verifiedMonthly, 1)) * 100),
      icon: AlertTriangle,
      tone: conv.executionGap > 0.5 ? 'amber' as Tone : 'green' as Tone,
    },
  ];
  const selectedMetric = summaryMetrics.find((metric) => metric.id === activeMetric) ?? summaryMetrics[0];
  const SelectedMetricIcon = selectedMetric.icon;

  return (
    <div
      id="fc-report-root"
      className={cn(
        'fc-report space-y-6 rounded-lg border border-border/70 bg-background p-4 text-foreground shadow-xl sm:p-6 print:space-y-3',
        printPreview && 'mx-auto max-w-[8.5in] rounded-xl border border-border/60 p-4 sm:p-6',
      )}
      style={inkSaver ? { filter: 'grayscale(1)' } : undefined}
    >
      <style>{`
        @media print {
          body.fc-report-print-only * { visibility: hidden !important; }
          body.fc-report-print-only #fc-report-root,
          body.fc-report-print-only #fc-report-root * { visibility: visible !important; }
          body.fc-report-print-only #fc-report-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
          }
          body.fc-report-print-only #fc-report-root .print\\:hidden { display: none !important; }
        }
      `}</style>

      {/* ------------------------------------------------------------- toolbar */}
      <header className="flex flex-col gap-5 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-prism-lime shadow-[0_0_12px_hsl(var(--prism-lime)/0.6)] motion-reduce:animate-none" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Savings engine active</span>
          </div>
          <h2 className="font-display text-3xl font-normal tracking-normal sm:text-4xl">
            Freed Cash <span className="font-bold text-prism-lime">Impact Report</span>
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">A live audit of savings created, confirmed, protected, and put to work.</p>
        </div>
        <div className="flex items-center gap-3 sm:text-right">
          <CalendarDays className="h-4 w-4 text-prism-lime" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Reporting period</p>
            <p className="text-sm font-semibold">Year to date · {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      </header>

      <Card className="sticky top-2 z-20 border-border/80 bg-card/90 print:hidden">
        <CardContent className="flex flex-wrap items-center gap-2 p-2.5">
          <div className="mr-auto flex flex-wrap gap-1.5">
            {SECTIONS.map((s) => (
              <Button key={s.id} variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs" onClick={() => jump(s.id)}>
                <s.icon className="h-3.5 w-3.5" /> {s.label}
              </Button>
            ))}
          </div>
          <Button
            variant={inkSaver ? 'default' : 'outline'}
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setInkSaver((v) => !v)}
          >
            <Droplet className="h-3.5 w-3.5" /> {inkSaver ? 'Ink saver on' : 'Ink saver'}
          </Button>
          <Button
            variant={printPreview ? 'default' : 'outline'}
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setPrintPreview((v) => !v)}
          >
            <FileText className="h-3.5 w-3.5" /> {printPreview ? 'Preview on' : 'Preview page'}
          </Button>
          <PrintInfographicButton buildSpec={buildSpec} label="Infographic" size="sm" filename="freed-cash-impact" />
          <Button size="sm" className="h-8 gap-1.5" onClick={printReport}>
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
        </CardContent>
      </Card>
      {/* ----------------------------------------------------------- narrative */}
      <section id="fc-narrative" className="scroll-mt-20">
        <div className="grid overflow-hidden rounded-lg border border-border/70 bg-card lg:grid-cols-[1.55fr_0.75fr]">
          <div className="p-5 sm:p-7">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-prism-lime">Executive brief</p>
            <h3 className="mt-2 font-display text-xl font-semibold tracking-normal">The story in plain English</h3>
            <div className="mt-5 space-y-3 border-l-2 border-prism-lime/50 pl-4">
              {narrative.map((line, i) => (
                <p key={i} className={cn('leading-relaxed', i === 0 ? 'text-base font-medium text-foreground' : 'text-sm text-muted-foreground')}>
                  {line}
                </p>
              ))}
            </div>
          </div>
          <div className="border-t border-border/70 bg-secondary/45 p-5 lg:border-l lg:border-t-0 sm:p-7">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Current position</p>
            <p className="mt-3 font-display text-3xl font-bold tabular-nums text-prism-lime">{money2(ba.savedMonthly)}<span className="text-base font-medium text-muted-foreground"> / month</span></p>
            <p className="mt-1 text-sm text-muted-foreground">Recurring spending permanently removed</p>
            <div className="mt-6 space-y-3">
              <BriefRow label="Annual impact" value={money2(ba.savedAnnual)} />
              <BriefRow label="Reduction" value={`${ba.reductionPct.toFixed(1)}%`} />
              <BriefRow label="Needs a job" value={money2(capacity.unassignedMonthly)} alert={capacity.unassignedMonthly > 0.5} />
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- summary */}
      <section id="fc-summary" className="scroll-mt-20 space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-prism-lime">Performance monitor</p>
            <h3 className="mt-1 font-display text-xl font-semibold tracking-normal">Freed Cash summary</h3>
          </div>
          <p className="hidden text-xs text-muted-foreground sm:block">Select a metric to inspect it</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryMetrics.map((metric) => (
            <button
              key={metric.id}
              type="button"
              onClick={() => setActiveMetric(metric.id)}
              className={cn(
                'group min-h-40 rounded-lg border bg-card/70 p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-prism-lime/50 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                activeMetric === metric.id ? 'border-prism-lime/60 shadow-[0_0_24px_hsl(var(--prism-lime)/0.10)]' : 'border-border/70',
              )}
              aria-pressed={activeMetric === metric.id}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{metric.label}</p>
                <span className="rounded-md bg-prism-lime/10 p-2 text-prism-lime"><metric.icon className="h-4 w-4" /></span>
              </div>
              <p className="mt-5 font-display text-2xl font-semibold tabular-nums tracking-normal">{metric.value}</p>
              <div className="mt-4 h-1 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-prism-lime transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${metric.progress}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{metric.detail}</p>
            </button>
          ))}
        </div>
        <div className="grid overflow-hidden rounded-lg border border-border/70 bg-card lg:grid-cols-[1.7fr_1fr]">
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="rounded-md bg-prism-lime/10 p-2 text-prism-lime"><SelectedMetricIcon className="h-5 w-5" /></span>
                <div><p className="text-xs text-muted-foreground">Selected signal</p><p className="font-semibold">{selectedMetric.label}</p></div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <BriefRow label="Before" value={`${money2(ba.beforeMonthly)}/mo`} stacked />
              <BriefRow label="After" value={`${money2(ba.afterMonthly)}/mo`} stacked />
              <BriefRow label="Assigned" value={`${money2(capacity.assignedMonthly)}/mo`} stacked />
              <BriefRow label="Moved" value={`${money2(conv.executedMonthly)}/mo`} stacked />
            </div>
          </div>
          <div className="border-t border-border/70 bg-secondary/40 p-5 lg:border-l lg:border-t-0 sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Signal interpretation</p>
            <p className="mt-3 text-sm leading-relaxed text-foreground">{selectedMetric.detail}. {activeMetric === 'gap' ? 'Close this gap to turn planning into measurable progress.' : 'This figure updates as savings are confirmed and redirects are completed.'}</p>
          </div>
        </div>
      </section>


      {/* -------------------------------------------------------------- charts */}
      <section id="fc-charts" className="scroll-mt-20 space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Savings over the last 12 months</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                The shaded area is what actually hit the budget each month; the line is your running total.
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
              Your top expenses side by side: what they cost before, what they cost now, and what you freed.
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

        {trend.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Capture trend</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                From your saved monthly reviews — is freed cash getting a job, or drifting back into spending?
              </p>
            </CardHeader>
            <CardContent className="h-64">
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
            </CardContent>
          </Card>
        )}
      </section>

      {/* -------------------------------------------------------------- tables */}
      <section id="fc-tables" className="scroll-mt-20 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Every saving, before and after</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Each cancellation, reduction and negotiation with what it cost before and now.
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {perSource.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No savings recorded yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Expense</th>
                    <th className="py-2 pr-3 font-medium">Type</th>
                    <th className="py-2 pr-3 text-right font-medium">Before</th>
                    <th className="py-2 pr-3 text-right font-medium">After</th>
                    <th className="py-2 pr-3 text-right font-medium">Freed / mo</th>
                    <th className="py-2 text-right font-medium">Freed / yr</th>
                  </tr>
                </thead>
                <tbody>
                  {perSource.map((s) => (
                    <tr key={s.id} className="border-b border-border/40 last:border-0">
                      <td className="py-2 pr-3 font-medium">
                        {s.name}
                        {s.vendor ? <span className="block text-xs text-muted-foreground">{s.vendor}</span> : null}
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {s.source_type.replace(/_/g, ' ')} · {s.status}
                      </td>
                      <td className="py-2 pr-3 text-right text-muted-foreground">{money2(s.before)}</td>
                      <td className="py-2 pr-3 text-right">{money2(s.after)}</td>
                      <td className="py-2 pr-3 text-right font-semibold">{money2(s.saved)}</td>
                      <td className="py-2 text-right">{money2(s.saved * 12)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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
                    <th className="py-2 pr-3 text-right font-medium">Confirmed / mo</th>
                    <th className="py-2 pr-3 text-right font-medium">Pending / mo</th>
                    <th className="py-2 pr-3 text-right font-medium">Came back / mo</th>
                    <th className="py-2 text-right font-medium">Confirmed / yr</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((v) => (
                    <tr key={v.vendor} className="border-b border-border/40 last:border-0">
                      <td className="py-2 pr-3 font-medium">{v.vendor}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{v.count}</td>
                      <td className="py-2 pr-3 text-right">{money2(v.verifiedMonthly)}</td>
                      <td className="py-2 pr-3 text-right text-muted-foreground">{money2(v.pipelineMonthly)}</td>
                      <td className="py-2 pr-3 text-right text-muted-foreground">{money2(v.reversedMonthly)}</td>
                      <td className="py-2 text-right font-semibold">{money2(v.annualVerified)}</td>
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
              Redirected {money2(capacity.assignedMonthly)}/mo of the confirmed {money2(capacity.verifiedMonthly)}/mo.
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
                <Badge variant={r.confirmed_moved ? 'default' : 'outline'} className="text-[11px]">
                  {r.confirmed_moved ? 'Money moved' : 'Not moved yet'}
                </Badge>
                <p className="text-sm font-semibold">
                  {money2(Number(r.monthly_amount))}/mo · {money2(Number(r.monthly_amount) * 12)}/yr
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* ----------------------------------------------------------- scenarios */}
      <section id="fc-scenarios" className="scroll-mt-20 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">What happens if you keep these savings</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Each goal, if the money keeps flowing. Pick a horizon to see the outcome.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              {([1, 3, 5] as const).map((h) => (
                <Button
                  key={h}
                  size="sm"
                  variant={horizon === h ? 'default' : 'outline'}
                  className="h-7 px-3 text-xs"
                  onClick={() => setHorizon(h)}
                >
                  {h === 1 ? '12 months' : `${h} years`}
                </Button>
              ))}
              <span className="text-xs text-muted-foreground">
                Showing {horizon === 1 ? '12-month' : `${horizon}-year`} outcomes
              </span>
            </div>

            {scenarios.rows.length === 0 ? (
              <Empty text="Assign freed cash to a goal to see scenarios." />
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Stat tone="green" label="If you keep it all" value={money(scenarioTotal)} sub={`${money2(scenarios.totalMonthly)}/mo assigned`} />
                  <Stat tone="amber" label="Based on money actually moved" value={money(horizon === 1 ? scenarios.rows.reduce((t, r) => t + r.executedYear1, 0) : horizon === 3 ? scenarios.rows.reduce((t, r) => t + r.executedYear3, 0) : scenarios.executedYear5)} sub={`${money2(scenarios.executedMonthly)}/mo moving`} />
                  <Stat tone="red" label="Cost of not moving it (5 yr)" value={money(scenarios.gapYear5)} sub="The gap between plan and action" />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">Goal</th>
                        <th className="py-2 pr-3 text-right font-medium">Per month</th>
                        <th className="py-2 pr-3 text-right font-medium">Growth used</th>
                        <th className="py-2 pr-3 text-right font-medium">{horizon === 1 ? '12 months' : `${horizon} years`}</th>
                        <th className="py-2 text-right font-medium">If only what moved</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scenarios.rows.map((r) => (
                        <tr key={r.destination} className="border-b border-border/40 last:border-0">
                          <td className="py-2 pr-3 font-medium">{r.label}</td>
                          <td className="py-2 pr-3 text-right">{money2(r.monthly)}</td>
                          <td className="py-2 pr-3 text-right text-muted-foreground">{(r.growthRate * 100).toFixed(1)}%</td>
                          <td className="py-2 pr-3 text-right font-semibold">{money(scenarioPick(r))}</td>
                          <td className="py-2 text-right text-muted-foreground">{money(scenarioExecuted(r))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Opportunity cost of not redirecting</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              If your confirmed {money2(capacity.verifiedMonthly)}/mo is invested instead of absorbed back into spending.
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
                  <Bar dataKey="contributed" name="Money in" stackId="a" fill="hsl(var(--muted-foreground))" />
                  <Bar dataKey="growth" name="Growth" stackId="a" fill={CHART_COLORS[0]} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ---------------------------------------------------------- next steps */}
      <section id="fc-next" className="scroll-mt-20">
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Next steps</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">The highest-value moves right now, in order.</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {nextSteps.map((s, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{s.text}</p>
                  <p className="text-xs text-muted-foreground">{s.why}</p>
                </div>
                {s.amount !== undefined && (
                  <p className="whitespace-nowrap text-sm font-semibold">{money2(s.amount)}/mo</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* ------------------------------------------------------------ pitfalls */}
      <section id="fc-pitfalls" className="scroll-mt-20">
        <Card className="border-amber-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Pitfalls to avoid
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {money2(leaks.atRiskMonthly)}/mo is at risk and {money2(leaks.driftMonthly)}/mo drifts back by default if
              nothing changes.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {leaks.rows.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nothing at risk right now — every saving is confirmed, assigned and moving.
              </p>
            )}
            {leaks.rows.slice(0, 12).map((r) => (
              <div
                key={r.id}
                className={cn(
                  'flex flex-wrap items-center gap-2 rounded-lg border p-3',
                  r.severity === 'high'
                    ? 'border-rose-500/40 bg-rose-500/5'
                    : r.severity === 'medium'
                      ? 'border-amber-500/40 bg-amber-500/5'
                      : 'border-border/60 bg-card/40',
                )}
              >
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] uppercase',
                    r.severity === 'high' && 'border-rose-500/50 text-rose-500',
                    r.severity === 'medium' && 'border-amber-500/50 text-amber-500',
                  )}
                >
                  {r.severity}
                </Badge>
                <div className="min-w-[12rem] flex-1">
                  <p className="text-sm font-medium">
                    {r.name} — {r.reason}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ArrowRight className="h-3 w-3" /> {r.action}
                  </p>
                </div>
                <p className="text-sm font-semibold">{money2(r.monthly)}/mo</p>
              </div>
            ))}
            {leaks.rows.length > 12 && (
              <p className="text-xs text-muted-foreground">
                Showing the 12 most urgent of {leaks.rows.length}. The Forward look tab has the rest.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* -------------------------------------------------------------- ledger */}
      <section id="fc-ledger" className="scroll-mt-20">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" /> History saving ledger
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Month by month, newest first: what was created, what was actually saved, and the running total.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1.5 print:hidden">
              <Button
                size="sm"
                variant={ledgerYear === 'all' ? 'default' : 'outline'}
                className="h-7 px-3 text-xs"
                onClick={() => setLedgerYear('all')}
              >
                All time
              </Button>
              {ledgerYears.map((y) => (
                <Button
                  key={y}
                  size="sm"
                  variant={ledgerYear === y ? 'default' : 'outline'}
                  className="h-7 px-3 text-xs"
                  onClick={() => setLedgerYear(y)}
                >
                  {y}
                </Button>
              ))}
            </div>
            <div className="overflow-x-auto">
              {ledgerRows.length === 0 ? (
                <Empty text="No ledger entries yet." />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Month</th>
                      <th className="py-2 pr-3 text-right font-medium">New savings created</th>
                      <th className="py-2 pr-3 text-right font-medium">Cancels / reductions</th>
                      <th className="py-2 pr-3 text-right font-medium">Saved that month</th>
                      <th className="py-2 pr-3 text-right font-medium">Run rate at month end</th>
                      <th className="py-2 text-right font-medium">Running total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerRows.map((r) => (
                      <tr key={r.month} className="border-b border-border/40 last:border-0">
                        <td className="py-2 pr-3 font-medium">{r.label}</td>
                        <td className="py-2 pr-3 text-right">{money2(r.createdMonthly)}</td>
                        <td className="py-2 pr-3 text-right text-muted-foreground">
                          {r.newCancellations} / {r.newReductions}
                        </td>
                        <td className="py-2 pr-3 text-right font-semibold">{money2(r.realizedThisMonth)}</td>
                        <td className="py-2 pr-3 text-right">{money2(r.runRateAtEnd)}</td>
                        <td className="py-2 text-right">{money2(r.cumulativeRealized)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

interface Props {
  sources: FreedCashSource[];
  redirects: FreedCashRedirect[];
}

function Stat({
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
}) {
  return (
    <div className={cn('rounded-lg border p-3', TONE_CLASS[tone])}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex h-full min-h-24 items-center justify-center text-sm text-muted-foreground">{text}</div>
  );
}
