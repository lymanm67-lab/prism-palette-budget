import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { useRetirementTracker } from '@/hooks/use-retirement-tracker';
import {
  BASELINE_DATE,
  money,
  projectMilestone,
  projectWealth,
  type ProjectionInputs,
} from '@/lib/retirement/investmentTracker';
import { ExecutiveHeader } from '@/components/retirement/tracker/ExecutiveHeader';
import { AccountCards } from '@/components/retirement/tracker/AccountCards';
import { MonthlyEntryForm } from '@/components/retirement/tracker/MonthlyEntryForm';
import { PerformanceCharts } from '@/components/retirement/tracker/PerformanceCharts';
import { WealthSourcesCard } from '@/components/retirement/tracker/WealthSourcesCard';
import { BenchmarksCard } from '@/components/retirement/tracker/BenchmarksCard';
import { ProjectionPanel } from '@/components/retirement/tracker/ProjectionPanel';
import { ScorecardPanel } from '@/components/retirement/tracker/ScorecardPanel';

const INCOME_MODULES = [
  { label: 'Investment plan (Social Security, pensions, HSA)', to: '/planning/investments' },
  { label: 'Withdrawal & tax sequencing (RMDs, Roth, taxable)', to: '/retirement?tab=withdrawal-tax' },
  { label: 'Contribution waterfall', to: '/retirement?tab=waterfall' },
  { label: 'Family legacy, trust funding & foundation giving', to: '/legacy/family' },
];

export default function RetirementTracker() {
  const {
    isLoading,
    accounts,
    statements,
    fundReturns,
    timeline,
    totalPortfolio,
    sources,
  } = useRetirementTracker();
  const tracker = useRetirementTracker();

  const [inputs, setInputs] = useState<ProjectionInputs>({
    startingBalance: 0,
    currentAge: 59,
    targetAge: 85,
    monthlyEmployee: 451.66,
    monthlyEmployer: 516.56,
    annualContributionIncreasePct: 3,
    annualLumpSum: 0,
    expectedReturnPct: 7,
    inflationPct: 3,
    startYear: new Date().getFullYear(),
  });
  const [touchedBalance, setTouchedBalance] = useState(false);

  const effectiveInputs = useMemo<ProjectionInputs>(
    () => (touchedBalance ? inputs : { ...inputs, startingBalance: totalPortfolio }),
    [inputs, touchedBalance, totalPortfolio],
  );

  const projection = useMemo(() => projectWealth(effectiveInputs), [effectiveInputs]);

  const ytd = useMemo(() => {
    const year = String(new Date().getFullYear());
    const rows = timeline.filter((m) => m.month.startsWith(year));
    const contributions = rows.reduce((s, m) => s + m.contributions, 0);
    const employer = rows.reduce((s, m) => s + m.employerContributions, 0);
    const gain = rows.reduce((s, m) => s + m.investmentGain, 0);
    const avgBalance = rows.length ? rows.reduce((s, m) => s + m.balance, 0) / rows.length : 0;
    return {
      contributions,
      employer,
      gain,
      returnPct: avgBalance > 0 && rows.length >= 2 ? (gain / avgBalance) * 100 : null,
    };
  }, [timeline]);

  const trailing12Pct = useMemo(() => {
    const window = timeline.slice(-12);
    if (window.length < 3) return null;
    const gain = window.reduce((s, m) => s + m.investmentGain, 0);
    const avg = window.reduce((s, m) => s + m.balance, 0) / window.length;
    if (avg <= 0) return null;
    return (gain / avg) * 100 * (12 / window.length);
  }, [timeline]);

  const monthlyGain = timeline.length ? timeline[timeline.length - 1].investmentGain : null;
  const million = projectMilestone(1_000_000, effectiveInputs.startingBalance, projection, effectiveInputs.currentAge);
  const fourM = projectMilestone(4_000_000, effectiveInputs.startingBalance, projection, effectiveInputs.currentAge);
  const at85 = projection.find((r) => r.age === 85)?.endingBalance ?? projection[projection.length - 1]?.endingBalance ?? totalPortfolio;

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 md:p-6 max-w-7xl mx-auto">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 md:p-6 max-w-7xl mx-auto">
      <ExecutiveHeader
        totalPortfolio={totalPortfolio}
        monthlyGain={monthlyGain}
        ytdGain={ytd.gain}
        ytdContributions={ytd.contributions}
        ytdReturnPct={ytd.returnPct}
        projectedMillionDate={million.projectedYear ? `${million.projectedYear} · age ${million.projectedAge}` : 'Reached'}
        projectedFourMDate={fourM.projectedYear ? `${fourM.projectedYear} · age ${fourM.projectedAge}` : 'Beyond age 85'}
        projectedAt85={at85}
      />

      <p className="text-[11px] text-muted-foreground">
        Baseline date {BASELINE_DATE} · baseline portfolio {money(sources.startingPrincipal, 2)}. Historical
        statements are preserved — entering a new month never overwrites a prior one.
      </p>

      <AccountCards accounts={accounts} statements={statements} totalPortfolio={totalPortfolio} />

      <MonthlyEntryForm
        accounts={accounts}
        statements={statements}
        onSave={tracker.saveStatement}
        isSaving={tracker.isSaving}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <WealthSourcesCard sources={sources} />
        <ScorecardPanel
          timeline={timeline}
          statements={statements}
          accounts={accounts}
          projection={projection}
          inputs={effectiveInputs}
          totalPortfolio={totalPortfolio}
          ytd={ytd}
          trailing12Pct={trailing12Pct}
        />
      </div>

      <PerformanceCharts timeline={timeline} accounts={accounts} />

      <BenchmarksCard
        fundReturns={fundReturns}
        actualTrailingReturnPct={trailing12Pct}
        baseInputs={effectiveInputs}
      />

      <ProjectionPanel
        inputs={effectiveInputs}
        onChange={(patch) => {
          if ('startingBalance' in patch) setTouchedBalance(true);
          setInputs((prev) => ({ ...prev, ...effectiveInputs, ...patch }));
        }}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Retirement income integration</CardTitle>
          <p className="text-xs text-muted-foreground">
            Accumulation is tracked here and stays separate from income planning — these modules read the same
            portfolio total.
          </p>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {INCOME_MODULES.map((m) => (
            <Link
              key={m.to}
              to={m.to}
              className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-xs hover:bg-muted transition"
            >
              <span className="text-foreground">{m.label}</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardContent className="p-4 flex gap-3">
          <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
          <div className="text-[11px] text-muted-foreground space-y-1">
            <p className="text-foreground font-medium text-xs">Data integrity rules in force</p>
            <p>Balance growth is never treated as investment return; contributions are never counted as earnings.</p>
            <p>Transfers between retirement accounts are excluded from new wealth, and no account is counted twice.</p>
            <p>
              Institution-reported returns, calculated estimates, published fund returns, planning assumptions and
              projections are all stored and labeled separately.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
