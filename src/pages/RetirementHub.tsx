import { lazy, Suspense, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Layers, TrendingUp, ShieldCheck, Coins, Wallet, Gauge, HeartPulse,
} from 'lucide-react';

const RetirementDashboard = lazy(() => import('@/pages/RetirementDashboard'));
const RetirementPreservation = lazy(() => import('@/pages/RetirementPreservation'));
const SequenceRisk = lazy(() => import('@/pages/SequenceRisk'));
const ContributionWaterfall = lazy(() => import('@/pages/ContributionWaterfall'));
const WithdrawalSequencer = lazy(() => import('@/pages/WithdrawalSequencer'));
const CompoundingCrossover = lazy(() => import('@/pages/CompoundingCrossover'));
const CrossoverTracker = lazy(() => import('@/pages/CrossoverTracker'));

type TabDef = {
  key: string;
  label: string;
  blurb: string;
  icon: typeof Layers;
  Component: React.LazyExoticComponent<() => JSX.Element> | React.LazyExoticComponent<React.ComponentType<Record<string, never>>>;
};

const TABS: TabDef[] = [
  {
    key: 'optimizer',
    label: 'Optimizer',
    blurb: 'Contribution and account-order optimization for the household plan.',
    icon: Gauge,
    Component: RetirementDashboard as TabDef['Component'],
  },
  {
    key: 'preservation',
    label: 'Preservation',
    blurb: 'Accumulation, transition and preservation phases across the horizon.',
    icon: TrendingUp,
    Component: RetirementPreservation as TabDef['Component'],
  },
  {
    key: 'sequence-risk',
    label: 'Sequence Risk',
    blurb: 'Stress-test the plan against unfavorable early-retirement returns.',
    icon: ShieldCheck,
    Component: SequenceRisk as TabDef['Component'],
  },
  {
    key: 'waterfall',
    label: 'Contribution Waterfall',
    blurb: 'Where the next dollar of savings should go, in priority order.',
    icon: Layers,
    Component: ContributionWaterfall as TabDef['Component'],
  },
  {
    key: 'withdrawal-tax',
    label: 'Withdrawal & Tax',
    blurb: 'Bracket-filling withdrawal sequencing and lifetime tax impact.',
    icon: Wallet,
    Component: WithdrawalSequencer as TabDef['Component'],
  },
  {
    key: 'crossover',
    label: 'Compounding Crossover',
    blurb: 'The year growth out-earns contributions — and what accelerates it.',
    icon: Coins,
    Component: CompoundingCrossover as TabDef['Component'],
  },
  {
    key: 'crossover-tracker',
    label: 'Crossover Tracker',
    blurb: 'Annual contribution versus expected return tracking.',
    icon: HeartPulse,
    Component: CrossoverTracker as TabDef['Component'],
  },
];

function PanelLoader() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function RetirementHub() {
  const [params, setParams] = useSearchParams();
  const active = params.get('tab') ?? TABS[0].key;
  const current = useMemo(() => TABS.find((t) => t.key === active) ?? TABS[0], [active]);
  const Panel = current.Component;

  const select = (key: string) => {
    const next = new URLSearchParams(params);
    next.set('tab', key);
    setParams(next, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-4">
      <header className="p-4 md:p-6 pb-0 max-w-7xl mx-auto">
        <p className="text-[11px] uppercase tracking-[0.2em] text-prism-amber">
          Montgomery Family Wealth Operating System
        </p>
        <h1 className="text-2xl md:text-3xl font-semibold text-foreground mt-1">Retirement Hub</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          Every retirement model in one place — optimization, preservation, sequence risk, contribution
          order, withdrawal tax sequencing and the compounding crossover.
        </p>
      </header>

      <div className="px-4 md:px-6 max-w-7xl mx-auto">
        <Card>
          <CardContent className="p-3">
            <div
              role="tablist"
              aria-label="Retirement models"
              className="flex gap-2 overflow-x-auto pb-1"
            >
              {TABS.map((t) => {
                const Icon = t.icon;
                const on = t.key === current.key;
                return (
                  <button
                    key={t.key}
                    role="tab"
                    aria-selected={on}
                    onClick={() => select(t.key)}
                    className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition ${
                      on
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'text-muted-foreground border-border hover:bg-muted'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3 px-1">{current.blurb}</p>
          </CardContent>
        </Card>
      </div>

      <Suspense fallback={<PanelLoader />}>
        <Panel />
      </Suspense>
    </div>
  );
}
