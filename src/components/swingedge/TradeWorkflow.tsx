import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import CollapsibleSection from '@/components/swingedge/CollapsibleSection';
import { useTradeJournal } from '@/hooks/use-swingedge-lists';
import type { PerformanceStats } from '@/lib/swingedge/performance';

interface ReadinessCheck {
  label: string;
  detail: string;
  passed: boolean;
}

type Light = 'RED' | 'AMBER' | 'GREEN';

function readinessChecks(stats: PerformanceStats, journaledCount: number): ReadinessCheck[] {
  return [
    {
      label: '10 closed paper trades',
      detail: `${stats.trades} of 10 closed so far`,
      passed: stats.trades >= 10,
    },
    {
      label: 'Followed your rules at least 80% of the time',
      detail:
        stats.disciplinePct === null
          ? 'No trades rated yet'
          : `${stats.disciplinePct}% discipline across ${stats.disciplineAnswered} rated trades`,
      passed: stats.disciplinePct !== null && stats.disciplinePct >= 80,
    },
    {
      label: 'Positive expectancy (average trade makes money)',
      detail: `Expectancy is $${stats.expectancy.toFixed(2)} per trade`,
      passed: stats.trades > 0 && stats.expectancy > 0,
    },
    {
      label: 'Every closed trade journaled',
      detail: `${journaledCount} trade${journaledCount === 1 ? '' : 's'} still missing a journal entry`,
      passed: stats.trades > 0 && journaledCount === 0,
    },
  ];
}

function lightFor(checks: ReadinessCheck[]): Light {
  const passed = checks.filter((c) => c.passed).length;
  if (passed === checks.length) return 'GREEN';
  if (passed >= 1) return 'AMBER';
  return 'RED';
}

const LIGHT_STYLE: Record<Light, { dot: string; badge: string; label: string; note: string }> = {
  RED: {
    dot: 'bg-prism-rose',
    badge: 'border-prism-rose/50 bg-prism-rose/10 text-prism-rose',
    label: 'NOT READY',
    note: 'Keep trading paper money. The light turns green only when the checks below all pass.',
  },
  AMBER: {
    dot: 'bg-prism-amber',
    badge: 'border-prism-amber/50 bg-prism-amber/10 text-prism-amber',
    label: 'BUILDING',
    note: 'Progress is real — but the checks below are not all green yet. Stay on paper.',
  },
  GREEN: {
    dot: 'bg-prism-lime',
    badge: 'border-prism-lime/50 bg-prism-lime/10 text-prism-lime',
    label: 'READY FOR SMALL LIVE TRADES',
    note: 'Your paper record shows discipline and a positive edge. Start small — one position, half your normal size.',
  },
};

const STEPS: { n: number; title: string; body: string; to: string; cta: string }[] = [
  {
    n: 1,
    title: 'Find & qualify',
    body: 'Check the market condition, then scan your watchlist. Only open the QUALIFIES and WATCH rows — everything else is a pass.',
    to: '/swingedge/scanner',
    cta: 'Open Scanner',
  },
  {
    n: 2,
    title: 'Analyze & plan',
    body: 'Read the trend and the setup in the Analyzer, then write your own entry, stop and target in the Trade Planner. This gives you share size and dollar risk — the numbers you can act on.',
    to: '/swingedge/planner',
    cta: 'Open Trade Planner',
  },
  {
    n: 3,
    title: 'Trade it on paper & review',
    body: 'Take the plan in Paper Trading (or your broker’s paper account, e.g. thinkorswim paperMoney), manage it to the exit, then journal what happened. Performance Review tells you whether the process is working.',
    to: '/swingedge/journal',
    cta: 'Open Journal',
  },
];

export default function TradeWorkflow() {
  const { stats, tradesMissingJournal } = useTradeJournal();
  const checks = readinessChecks(stats, tradesMissingJournal.length);
  const light = lightFor(checks);
  const style = LIGHT_STYLE[light];

  return (
    <CollapsibleSection
      id="dash-trade-workflow"
      title="Your trade workflow"
      description="The 1-2-3 routine for every trade. The light shows when your paper record justifies small live trades."
      headerRight={
        <Badge variant="outline" className={cn('gap-2 px-3 py-1 text-xs font-bold', style.badge)}>
          <span className={cn('h-2.5 w-2.5 rounded-full', style.dot)} aria-hidden="true" />
          {style.label}
        </Badge>
      }
    >
      <ol className="grid gap-3 md:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.n} className="flex flex-col rounded-lg border bg-card/50 p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border bg-muted/40 text-sm font-bold">
                {s.n}
              </span>
              <h3 className="text-sm font-semibold">{s.title}</h3>
            </div>
            <p className="mt-2 flex-1 text-xs text-muted-foreground">{s.body}</p>
            <Button asChild variant="outline" size="sm" className="mt-3 self-start">
              <Link to={s.to}>
                {s.cta}
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </li>
        ))}
      </ol>

      <div className="mt-4 rounded-lg border bg-muted/30 p-4">
        <p className="text-sm font-semibold">Live-trade readiness</p>
        <p className="mt-1 text-xs text-muted-foreground">{style.note}</p>
        <ul className="mt-3 space-y-1.5">
          {checks.map((c) => (
            <li key={c.label} className="flex items-start gap-2 text-sm">
              {c.passed ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-prism-lime" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
              )}
              <span>
                {c.label}
                <span className="block text-xs text-muted-foreground">{c.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </CollapsibleSection>
  );
}
