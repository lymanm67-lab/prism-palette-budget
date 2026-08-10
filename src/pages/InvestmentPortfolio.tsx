import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Layers, PiggyBank, Wallet, PieChart, CalendarClock, Gauge, Trophy, ClipboardList, Coins } from 'lucide-react';
import { useRetirementTracker } from '@/hooks/use-retirement-tracker';
import { money, deriveStatement } from '@/lib/retirement/investmentTracker';
import {
  KNOWN_TIAA_FUNDS, RETIREMENT_MILESTONES, accountClass,
} from '@/lib/investment/portfolio';
import { PortfolioExecutive } from '@/components/investment/PortfolioExecutive';
import { RetirementBreakdown } from '@/components/investment/RetirementBreakdown';
import { SelfDirectedPanel } from '@/components/investment/SelfDirectedPanel';
import { AllocationViews } from '@/components/investment/AllocationViews';
import { SnapshotWaterfall } from '@/components/investment/SnapshotWaterfall';
import { ComparisonCards, type ComparisonGroup } from '@/components/investment/ComparisonCards';
import { ProjectionsPanel } from '@/components/investment/ProjectionsPanel';
import { InvestmentScorecard } from '@/components/investment/InvestmentScorecard';
import { CashflowEngineTab } from '@/components/investment/cashflow/CashflowEngineTab';

const SECTIONS = [
  { key: 'overview', label: 'Portfolio', icon: Layers },
  { key: 'retirement', label: 'Retirement', icon: PiggyBank },
  { key: 'self-directed', label: 'Self-Directed', icon: Wallet },
  { key: 'allocation', label: 'Allocation', icon: PieChart },
  { key: 'snapshot', label: 'Monthly Snapshot', icon: CalendarClock },
  { key: 'performance', label: 'Performance', icon: Gauge },
  { key: 'projections', label: 'Projections', icon: Trophy },
  { key: 'cashflow', label: 'Cash Flow Engine', icon: Coins },
  { key: 'scorecard', label: 'Scorecard', icon: ClipboardList },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];

export default function InvestmentPortfolio() {
  const t = useRetirementTracker();
  const [section, setSection] = useState<SectionKey>('overview');

  const {
    isLoading, accounts, retirementAccounts, selfDirectedAccounts, statements, positions, goals,
    fundReturns, timeline, allTimeline, retirementTotal, selfDirectedTotal, investmentTotal,
  } = t;

  const selfDirectedIds = useMemo(
    () => new Set(selfDirectedAccounts.map((a) => a.id)),
    [selfDirectedAccounts],
  );

  const latest = allTimeline[allTimeline.length - 1];
  const previous = allTimeline[allTimeline.length - 2];
  const currentYear = String(new Date().getFullYear());

  const monthKey = latest?.month;

  const monthStatements = useMemo(
    () => statements.filter((s) => String(s.period_month).slice(0, 7) === monthKey),
    [statements, monthKey],
  );

  const dividends = monthStatements.reduce((s, r) => s + Number((r as unknown as { dividend_income?: number }).dividend_income ?? 0), 0);
  const interest = monthStatements.reduce((s, r) => s + Number((r as unknown as { interest_income?: number }).interest_income ?? 0), 0);

  const ytdRows = allTimeline.filter((m) => m.month.startsWith(currentYear));
  const ytdGain = ytdRows.reduce((s, m) => s + m.investmentGain, 0);
  const ytdContribAll = ytdRows.reduce((s, m) => s + m.contributions, 0);
  const avgBalance = ytdRows.length ? ytdRows.reduce((s, m) => s + m.balance, 0) / ytdRows.length : 0;
  const ytdReturnPct = avgBalance > 0 && ytdRows.length >= 2 ? (ytdGain / avgBalance) * 100 : null;

  const retYtd = timeline.filter((m) => m.month.startsWith(currentYear));
  const retAvg = retYtd.length ? retYtd.reduce((s, m) => s + m.balance, 0) / retYtd.length : 0;
  const retGain = retYtd.reduce((s, m) => s + m.investmentGain, 0);
  const retReturnPct = retAvg > 0 && retYtd.length >= 2 ? (retGain / retAvg) * 100 : null;

  const sdStatements = useMemo(
    () => statements.filter((s) => selfDirectedIds.has(s.account_id)),
    [statements, selfDirectedIds],
  );
  const sdYtd = sdStatements.filter((s) => String(s.period_month).startsWith(currentYear));
  const sdYtdContrib = sdYtd.reduce(
    (sum, s) => sum + Number(s.employee_contributions) + Number((s as unknown as { other_contributions?: number }).other_contributions ?? 0),
    0,
  );
  const sdMonthContrib = sdStatements
    .filter((s) => String(s.period_month).slice(0, 7) === monthKey)
    .reduce((sum, s) => sum + Number(s.employee_contributions), 0);
  const sdGain = sdYtd.reduce((sum, s) => sum + deriveStatement(s).estimatedInvestmentGain, 0);
  const sdAvg = sdYtd.length ? sdYtd.reduce((sum, s) => sum + Number(s.ending_balance), 0) / sdYtd.length : 0;
  const sdReturnPct = sdAvg > 0 && sdYtd.length >= 2 ? (sdGain / sdAvg) * 100 : null;

  const accountMonthlyGain = useMemo(() => {
    const out: Record<string, number> = {};
    for (const s of monthStatements) out[s.account_id] = deriveStatement(s).estimatedInvestmentGain;
    return out;
  }, [monthStatements]);

  const custodianStats = (custodian: string): ComparisonGroup | null => {
    const ids = new Set(accounts.filter((a) => (a.custodian ?? a.institution) === custodian).map((a) => a.id));
    if (!ids.size) return null;
    const value = accounts.filter((a) => ids.has(a.id)).reduce((s, a) => s + Number(a.current_balance), 0);
    const rows = statements.filter((s) => ids.has(s.account_id));
    const monthRows = rows.filter((s) => String(s.period_month).slice(0, 7) === monthKey);
    const yearRows = rows.filter((s) => String(s.period_month).startsWith(currentYear));
    const monthlyChange = monthRows.length
      ? monthRows.reduce((s, r) => s + deriveStatement(r).estimatedInvestmentGain, 0)
      : null;
    const ytdChange = yearRows.length >= 2
      ? yearRows.reduce((s, r) => s + deriveStatement(r).estimatedInvestmentGain, 0)
      : null;
    const reported = fundReturns.find((f) =>
      custodian.includes('TIAA')
        ? f.label.toLowerCase().includes('tiaa')
        : f.ticker === 'VFIFX',
    );
    return {
      label: custodian,
      currentValue: value,
      monthlyChange,
      ytdChange,
      ytdReturn: reported?.ytd_return ?? null,
      oneYear: reported?.one_year_return ?? null,
      threeYear: reported?.three_year_return ?? null,
      fiveYear: reported?.five_year_return ?? null,
      returnKind: custodian.includes('TIAA') ? 'personal' : 'fund',
      source: reported?.label ?? 'Institution statements',
    };
  };

  const comparisonGroups = useMemo(() => {
    const groups: ComparisonGroup[] = [];
    for (const c of ['Fidelity / IU', 'TIAA']) {
      const g = custodianStats(c);
      if (g) groups.push(g);
    }
    groups.push({
      label: 'Self-Directed',
      currentValue: selfDirectedTotal,
      monthlyChange: sdMonthContrib || sdStatements.length ? sdStatements
        .filter((s) => String(s.period_month).slice(0, 7) === monthKey)
        .reduce((s, r) => s + deriveStatement(r).estimatedInvestmentGain, 0) : null,
      ytdChange: sdYtd.length >= 2 ? sdGain : null,
      ytdReturn: sdReturnPct,
      oneYear: null,
      threeYear: null,
      fiveYear: null,
      returnKind: 'portfolio',
      source: 'Brokerage statements entered in this app',
    });
    return groups;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, statements, fundReturns, selfDirectedTotal, monthKey, sdGain, sdReturnPct]);

  const nextRetirement = RETIREMENT_MILESTONES.find((m) => m > retirementTotal) ?? RETIREMENT_MILESTONES.at(-1)!;
  const nextTotal = RETIREMENT_MILESTONES.find((m) => m > investmentTotal) ?? RETIREMENT_MILESTONES.at(-1)!;

  const monthlyEmployee = latest?.employeeContributions ?? 451.66;
  const monthlyEmployer = latest?.employerContributions ?? 516.56;

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 md:p-6 max-w-7xl mx-auto">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const addKnownTiaa = (accountId: string) =>
    t.addPositions(
      KNOWN_TIAA_FUNDS.map((name, i) => ({
        account_id: accountId,
        name,
        asset_type: name.includes('Traditional') ? 'Annuity / Traditional' : name.includes('Real Estate') ? 'REIT' : 'Mutual Fund',
        current_value: 0,
        sort_order: i,
        notes: 'Added from the known TIAA fund list. Enter value, units and price from your TIAA statement.',
      })),
    );

  return (
    <div className="space-y-5 p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap gap-1.5">
        {SECTIONS.map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            size="sm"
            variant={section === key ? 'default' : 'outline'}
            className="h-8 text-[11px]"
            onClick={() => setSection(key)}
          >
            <Icon className="h-3.5 w-3.5 mr-1" /> {label}
          </Button>
        ))}
      </div>

      {section === 'overview' ? (
        <>
          <PortfolioExecutive
            investmentTotal={investmentTotal}
            retirementTotal={retirementTotal}
            selfDirectedTotal={selfDirectedTotal}
            accounts={accounts}
            monthlyGain={latest ? latest.investmentGain : null}
            monthlyContributions={latest ? latest.contributions : null}
            ytdReturnPct={ytdReturnPct}
            nextMilestoneLabel={`${money(nextTotal)} · ${money(Math.max(0, nextTotal - investmentTotal), 2)} to go`}
            projectedMillionDate="See Projections"
            onSelect={(v) => setSection(v === 'retirement' ? 'retirement' : 'self-directed')}
          />
          <Card>
            <CardContent className="p-4 text-[11px] text-muted-foreground space-y-1">
              <p className="font-medium text-foreground text-xs">Investment hierarchy</p>
              <pre className="font-mono text-[10px] leading-relaxed whitespace-pre overflow-x-auto">{`MONTGOMERY INVESTMENT PORTFOLIO
├── RETIREMENT INVESTMENTS  ${money(retirementTotal, 2)}
│   ├── Fidelity / IU — IU Retirement, IU TDA, IU 457(b)
│   └── TIAA — IU Retirement, IU TDA 403(b), IU 457(b) → individual TIAA investments
└── SELF-DIRECTED INVESTMENTS  ${money(selfDirectedTotal, 2)}
    ├── Stash
    ├── SoFi
    └── Charles Schwab → individual holdings`}</pre>
              <p>
                Combined only for total portfolio, net worth, asset allocation and total growth. Never combined
                for withdrawals, RMDs, contribution limits, Roth analysis, taxable income or capital gains.
              </p>
            </CardContent>
          </Card>
        </>
      ) : null}

      {section === 'retirement' ? (
        <RetirementBreakdown
          accounts={retirementAccounts}
          positions={positions}
          retirementTotal={retirementTotal}
          onSavePosition={t.savePosition}
          onDeletePosition={t.deletePosition}
          onAddKnownTiaa={addKnownTiaa}
        />
      ) : null}

      {section === 'self-directed' ? (
        <SelfDirectedPanel
          accounts={selfDirectedAccounts}
          positions={positions}
          selfDirectedTotal={selfDirectedTotal}
          goal={goals.find((g) => g.scope === 'self_directed') ?? null}
          monthContributions={sdMonthContrib}
          ytdContributions={sdYtdContrib}
          onSavePosition={t.savePosition}
          onDeletePosition={t.deletePosition}
          onSaveGoal={t.saveGoal}
        />
      ) : null}

      {section === 'allocation' ? (
        <AllocationViews accounts={accounts} positions={positions} investmentTotal={investmentTotal} />
      ) : null}

      {section === 'snapshot' ? (
        <SnapshotWaterfall
          monthPoint={latest}
          previousBalance={previous?.balance ?? latest?.balance ?? investmentTotal}
          investmentTotal={investmentTotal}
          retirementTotal={retirementTotal}
          selfDirectedTotal={selfDirectedTotal}
          dividends={dividends}
          interest={interest}
          transfersNet={latest?.transfersNet ?? 0}
        />
      ) : null}

      {section === 'performance' ? (
        <ComparisonCards groups={comparisonGroups} fundReturns={fundReturns} />
      ) : null}

      {section === 'projections' ? (
        <ProjectionsPanel
          retirementStart={retirementTotal}
          totalStart={investmentTotal}
          monthlyEmployee={monthlyEmployee}
          monthlyEmployer={monthlyEmployer}
          monthlySelfDirected={sdMonthContrib}
        />
      ) : null}

      {section === 'cashflow' ? (
        <CashflowEngineTab
          retirementTotal={retirementTotal}
          selfDirectedTotal={selfDirectedTotal}
          investmentTotal={investmentTotal}
        />
      ) : null}

      {section === 'scorecard' ? (
        <InvestmentScorecard
          monthLabel={latest?.label ?? 'Current month'}
          investmentTotal={investmentTotal}
          retirementTotal={retirementTotal}
          selfDirectedTotal={selfDirectedTotal}
          monthlyContributions={latest?.employeeContributions ?? 0}
          employerContributions={latest?.employerContributions ?? 0}
          investmentGains={latest?.investmentGain ?? 0}
          dividends={dividends}
          interest={interest}
          ytdReturnPct={ytdReturnPct}
          retirementReturnPct={retReturnPct}
          selfDirectedReturnPct={sdReturnPct}
          nextRetirementMilestone={`${money(nextRetirement)} · ${money(Math.max(0, nextRetirement - retirementTotal), 2)} to go`}
          nextTotalMilestone={`${money(nextTotal)} · ${money(Math.max(0, nextTotal - investmentTotal), 2)} to go`}
          projectedMillion="See Projections tab"
          projectedFourM="See Projections tab"
          accounts={accounts}
          positions={positions}
          accountMonthlyGain={accountMonthlyGain}
        />
      ) : null}

      <p className="text-[10px] text-muted-foreground">
        Educational planning tool. {accounts.length} accounts tracked ·{' '}
        {accounts.filter((a) => accountClass(a) === 'retirement').length} retirement,{' '}
        {selfDirectedAccounts.length} self-directed. Every balance keeps its source institution and every
        month of history is preserved.
      </p>
    </div>
  );
}
