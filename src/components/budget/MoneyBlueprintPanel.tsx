import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useCurrency } from '@/hooks/use-currency';
import { useMoneyPurposeSnapshot, type AverageWindow } from '@/hooks/use-money-purpose';
import { PHASE_LABEL, PURPOSE_META } from '@/lib/budgeting/moneyPurpose';
import { cn } from '@/lib/utils';
import { Info, PiggyBank, ShieldCheck, Sparkles, TrendingUp, Wallet } from 'lucide-react';
import BlueprintHistoryChart from '@/components/blueprint/BlueprintHistoryChart';
import BlueprintDriftAlerts from '@/components/blueprint/BlueprintDriftAlerts';
import ReconciliationDrilldown from '@/components/blueprint/ReconciliationDrilldown';
import BlueprintExportButton from '@/components/blueprint/BlueprintExportButton';

interface ExpenseStructure {
  fixed: { budget: number; actual: number };
  flexible: { budget: number; actual: number };
  non_monthly: { budget: number; actual: number };
}

interface Props {
  month: string;
  /** Fixed / Flexible / Non-Monthly totals — expense BEHAVIOUR, never purpose. */
  expenseStructure?: ExpenseStructure;
}

const STATUS_STYLES = {
  on: 'border-emerald-500/40 bg-emerald-500/5',
  watch: 'border-amber-500/40 bg-amber-500/5',
  off: 'border-red-500/40 bg-red-500/5',
} as const;

const STATUS_TEXT = {
  on: 'text-emerald-600 dark:text-emerald-400',
  watch: 'text-amber-600 dark:text-amber-400',
  off: 'text-red-600 dark:text-red-400',
} as const;

const STATUS_LABEL = { on: 'On Target', watch: 'Watch', off: 'Outside Target' } as const;

const WINDOWS: { value: AverageWindow; label: string }[] = [
  { value: 1, label: 'This Month' },
  { value: 3, label: '3-Mo Avg' },
  { value: 6, label: '6-Mo Avg' },
  { value: 12, label: '12-Mo Avg' },
];

export default function MoneyBlueprintPanel({ month, expenseStructure }: Props) {
  const { formatCurrency } = useCurrency();
  const [window, setWindow] = useState<AverageWindow>(1);
  const snap = useMoneyPurposeSnapshot(month, window);
  const bp = snap.blueprint;

  const segTotal = bp.cards.reduce((s, c) => s + Math.max(0, c.actualAmount), 0) || 1;

  return (
    <div className="space-y-4">
      {/* ---------------- Header ---------------- */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="font-display flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                50 / 10 / 20 / 20 Money Blueprint
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Every dollar has a purpose. Personal money only — business and employer-paid dollars are excluded.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <BlueprintExportButton snap={snap} month={month} />
              <Badge variant="outline" className="border-primary/40 text-[10px] uppercase tracking-wide">
                {PHASE_LABEL[bp.phase]}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                Alignment {bp.alignmentScore}/100
              </Badge>
              <ToggleGroup
                type="single"
                size="sm"
                value={String(window)}
                onValueChange={(v) => v && setWindow(Number(v) as AverageWindow)}
              >
                {WINDOWS.map((w) => (
                  <ToggleGroupItem key={w.value} value={String(w.value)} className="h-7 px-2 text-[11px]">
                    {w.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {bp.cards.map((c) => (
              <Tooltip key={c.key}>
                <TooltipTrigger asChild>
                  <div className={cn('rounded-xl border p-3 text-left', STATUS_STYLES[c.status])}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: c.color }}>
                        {PURPOSE_META[c.key].short}
                      </span>
                      <Badge variant="outline" className={cn('text-[9px]', STATUS_TEXT[c.status])}>
                        {STATUS_LABEL[c.status]}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-xl font-bold tabular-nums">{c.actualPct.toFixed(1)}%</p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {formatCurrency(c.actualAmount)} of {formatCurrency(c.targetAmount)}
                    </p>
                    <div className="mt-2 space-y-0.5 text-[10px] text-muted-foreground">
                      <p>
                        Target {c.key === 'build_wealth' ? '≥' : '≤'} {c.targetPct}%
                      </p>
                      <p className={cn('tabular-nums', c.variance === 0 ? '' : STATUS_TEXT[c.status])}>
                        {c.aboveTargetLabel ||
                          `Variance ${c.variance >= 0 ? '+' : ''}${formatCurrency(c.variance)}`}
                      </p>
                      {c.key === 'build_wealth' && (
                        <p className="text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(c.fundedByPayroll || 0)} already funded via payroll ·{' '}
                          {formatCurrency(c.remainingToTarget || 0)} remaining
                        </p>
                      )}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">{c.tooltip}</TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* Segmented visualization */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">Actual allocation</span>
              <span>
                {window === 1 ? 'Selected month' : `${window}-month average`} · take-home{' '}
                {formatCurrency(snap.netIncome)}
              </span>
            </div>
            <div className="flex h-6 w-full overflow-hidden rounded-full border bg-muted/40">
              {bp.cards.map((c) => {
                const w = (Math.max(0, c.actualAmount) / segTotal) * 100;
                if (w <= 0) return null;
                return (
                  <Tooltip key={c.key}>
                    <TooltipTrigger asChild>
                      <div
                        className="flex items-center justify-center text-[9px] font-semibold text-white"
                        style={{ width: `${w}%`, backgroundColor: c.color }}
                      >
                        {w > 9 ? `${c.actualPct.toFixed(0)}%` : ''}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      {c.label}: {formatCurrency(c.actualAmount)} ({c.actualPct.toFixed(1)}%)
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
            <div className="flex h-3 w-full overflow-hidden rounded-full border border-dashed bg-muted/20">
              {bp.cards.map((c) => (
                <div
                  key={c.key}
                  className="opacity-40"
                  style={{ width: `${c.targetPct}%`, backgroundColor: c.color }}
                />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Dashed band = target allocation ({bp.cards.map((c) => `${c.targetPct}%`).join(' / ')})
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ---------------- Drift alerts ---------------- */}
      <BlueprintDriftAlerts snap={snap} />

      {/* ---------------- History chart ---------------- */}
      <BlueprintHistoryChart month={month} />

      {/* ---------------- Wealth building ---------------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display flex items-center gap-2 text-sm">
              <PiggyBank className="h-4 w-4 text-emerald-500" />
              Wealth Building
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {[
              ['Employee Retirement & HSA (payroll)', bp.wealth.employeePayroll],
              ['Investing from take-home', bp.wealth.fromTakeHome],
            ].map(([label, value]) => (
              <div key={label as string} className="flex justify-between rounded bg-muted/30 px-2 py-1.5">
                <span>{label as string}</span>
                <span className="font-medium tabular-nums">{formatCurrency(value as number)}</span>
              </div>
            ))}
            <div className="flex justify-between rounded border border-teal-500/20 bg-teal-500/10 px-2 py-1.5">
              <span className="font-medium">Employer Wealth Boost</span>
              <span className="font-medium tabular-nums">{formatCurrency(bp.wealth.employerBoost)}</span>
            </div>
            <div className="flex justify-between rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-2">
              <span className="font-semibold">Total Monthly Wealth Funding</span>
              <span className="font-bold tabular-nums">{formatCurrency(bp.wealth.combinedTotal)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="rounded-lg border p-2 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Employee Wealth Rate</p>
                <p className="text-base font-bold tabular-nums">{bp.wealth.employeeWealthRate.toFixed(1)}%</p>
              </div>
              <div className="rounded-lg border p-2 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Wealth Funding</p>
                <p className="text-base font-bold tabular-nums">{bp.wealth.totalWealthFundingRate.toFixed(1)}%</p>
              </div>
            </div>
            <p className="flex gap-1.5 pt-1 text-[10px] text-muted-foreground">
              <Info className="mt-px h-3 w-3 shrink-0" />
              Employer contributions increase wealth, not take-home pay. Payroll contributions are already deducted
              before net pay — they are never charged against your checking balance twice.
            </p>
          </CardContent>
        </Card>

        {/* ---------------- Every dollar has a purpose ---------------- */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display flex items-center gap-2 text-sm">
              <Wallet className="h-4 w-4 text-primary" />
              Every Dollar Has a Purpose
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs">
            {[
              ['Net household cash available', bp.reconciliation.netIncome, ''],
              ['− Live', bp.reconciliation.live, ''],
              ['− Enjoy', bp.reconciliation.enjoy, ''],
              ['− Build Wealth from take-home', bp.reconciliation.buildWealthFromTakeHome, ''],
              ['− Eliminate Debt', bp.reconciliation.eliminateDebt, ''],
            ].map(([label, value]) => (
              <div key={label as string} className="flex justify-between px-2 py-1">
                <span>{label as string}</span>
                <span className="tabular-nums">{formatCurrency(value as number)}</span>
              </div>
            ))}
            <div
              className={cn(
                'flex justify-between rounded border px-2 py-2 font-semibold',
                bp.reconciliation.unallocated >= 0
                  ? 'border-emerald-500/30 bg-emerald-500/10'
                  : 'border-red-500/30 bg-red-500/10',
              )}
            >
              <span>Unallocated cash</span>
              <span className="tabular-nums">{formatCurrency(bp.reconciliation.unallocated)}</span>
            </div>
            <p className="pt-1 text-[10px] text-muted-foreground">
              Payroll deductions ({formatCurrency(snap.payrollDeductions)}) and employer contributions are excluded —
              they never touch this balance. Business expenses only appear here when personal funds were actually
              transferred in as an Owner Capital Contribution.
            </p>

            {bp.enjoy.unused > 0 && (
              <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
                <p className="text-xs font-medium">
                  You kept {formatCurrency(bp.enjoy.unused)} of your Enjoy allowance. Put it to work?
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Button size="sm" variant={bp.enjoy.suggestion === 'debt' ? 'default' : 'outline'} className="h-7 text-[11px]" asChild>
                    <a href="/debt">Apply to Debt</a>
                  </Button>
                  <Button size="sm" variant={bp.enjoy.suggestion === 'wealth' ? 'default' : 'outline'} className="h-7 text-[11px]" asChild>
                    <a href="/planning/investments">Invest It</a>
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" asChild>
                    <a href="/goals">Save It</a>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---------------- Two measurements, never mixed ---------------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        {expenseStructure && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-sm">Expense Structure</CardTitle>
              <p className="text-[11px] text-muted-foreground">
                How expenses <em>behave</em> — this is not a share of take-home pay.
              </p>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {(
                [
                  ['Fixed', expenseStructure.fixed],
                  ['Flexible', expenseStructure.flexible],
                  ['Non-Monthly', expenseStructure.non_monthly],
                ] as const
              ).map(([label, v]) => {
                const total =
                  expenseStructure.fixed.actual + expenseStructure.flexible.actual + expenseStructure.non_monthly.actual;
                const share = total > 0 ? (v.actual / total) * 100 : 0;
                return (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between">
                      <span>{label}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatCurrency(v.actual)} · {share.toFixed(0)}% of expenses
                      </span>
                    </div>
                    <Progress value={share} className="h-1.5" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Money Purpose
            </CardTitle>
            <p className="text-[11px] text-muted-foreground">
              What each dollar is <em>for</em> — measured against take-home pay.
            </p>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {bp.cards.map((c) => (
              <div key={c.key} className="space-y-1">
                <div className="flex justify-between">
                  <span style={{ color: c.color }} className="font-medium">
                    {c.label}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatCurrency(c.actualAmount)} · {c.actualPct.toFixed(1)}%
                  </span>
                </div>
                <Progress value={Math.min(100, c.actualPct * 2)} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ---------------- Freedom indicators ---------------- */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-display flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-primary" />
            Financial Freedom Indicators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {bp.indicators.map((i) => (
              <div key={i.key} className="rounded-lg border p-2.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{i.label}</p>
                <p className="text-sm font-bold tabular-nums">{i.value}</p>
                {i.hint && <p className="text-[9px] text-muted-foreground">{i.hint}</p>}
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground">
            Raises build wealth. Debt payoffs build wealth. Lower expenses build wealth. Unused Enjoy money can build
            wealth. Lifestyle inflation requires an intentional decision.
          </p>
        </CardContent>
      </Card>

      {/* ---------------- Every-dollar audit ---------------- */}
      <ReconciliationDrilldown snap={snap} />
    </div>
  );
}
