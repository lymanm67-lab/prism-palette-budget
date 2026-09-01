import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Building2, PiggyBank, ShieldCheck, Sparkles, Wallet, TrendingDown } from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';
import {
  useBufferMonths,
  useBufferOneTime,
  useBufferSettings,
  useBusinessExpenses,
  useRecurringPurposeLines,
  DEFAULT_BUFFER_SETTINGS,
} from '@/hooks/use-zero-based';
import { useDebtActuals } from '@/hooks/use-debt-actuals';
import { rollBuffer, bufferStatus, BUFFER_STATUS_LABEL } from '@/lib/budgeting/bufferLedger';
import { PHASE_TARGETS, PURPOSE_META } from '@/lib/budgeting/moneyPurpose';
import { monthLabel } from '@/lib/budgeting/forecastEngine';

const TARGETS = PHASE_TARGETS[1];
const round2 = (n: number) => Math.round(n * 100) / 100;
const thisMonth = () => new Date().toISOString().slice(0, 7);

interface Props {
  /** Household take-home for the current month. */
  takeHome?: number;
  /** Employee wealth withheld from pay. */
  payrollWealth?: number;
  /** Employer retirement + HSA contributions. */
  employerWealth?: number;
}

export default function ZeroBasedPlanBoard({
  takeHome = 4250.02,
  payrollWealth = 451.67,
  employerWealth = 516.56,
}: Props) {
  const { formatCurrency } = useCurrency();
  const lines = useRecurringPurposeLines();
  const business = useBusinessExpenses();
  const bufferMonths = useBufferMonths();
  const oneTimes = useBufferOneTime();
  const { settings } = useBufferSettings();
  const { actuals } = useDebtActuals(4);

  const month = thisMonth();
  const activeLines = (purpose: string) =>
    (lines.rows || [])
      .filter((l) => l.purpose === purpose)
      .filter((l) => (!l.start_month || l.start_month <= month) && (!l.end_month || l.end_month >= month));

  const live = round2(activeLines('live').reduce((s, l) => s + Number(l.amount || 0), 0));
  const enjoy = round2(activeLines('enjoy').reduce((s, l) => s + Number(l.amount || 0), 0));

  const debtCash = round2(
    actuals.reduce((s, a) => s + (a.latestMonthly || a.observedMonthly || a.storedMonthly), 0),
  );

  const businessOut = round2(
    (business.rows || [])
      .filter((b: any) => !b.month || b.month === month)
      .reduce((s: number, b: any) => s + Number(b.amount || 0), 0),
  );

  const thresholds = useMemo(
    () => ({
      healthy_min: Number(settings?.healthy_min ?? DEFAULT_BUFFER_SETTINGS.healthy_min),
      caution_min: Number(settings?.caution_min ?? DEFAULT_BUFFER_SETTINGS.caution_min),
      tight_min: Number(settings?.tight_min ?? DEFAULT_BUFFER_SETTINGS.tight_min),
    }),
    [settings],
  );

  const rolled = useMemo(
    () =>
      rollBuffer(
        (bufferMonths.rows || []).map((m) => ({
          month: m.month,
          startingBalance: Number(m.starting_balance || 0),
          additions: Number(m.additions || 0),
          withdrawals: Number(m.withdrawals || 0),
          oneTimes: (oneTimes.rows || []).map((o) => ({
            id: o.id,
            label: o.label,
            amount: Number(o.amount || 0),
            dueDate: o.due_date,
          })),
        })),
        thresholds,
      ),
    [bufferMonths.rows, oneTimes.rows, thresholds],
  );

  const bufferNow = rolled.find((r) => r.month === month) || rolled[rolled.length - 1];
  const bufferEnding = bufferNow ? bufferNow.endingBalance : 0;
  const bStatus = bufferStatus(bufferEnding, thresholds);

  const wealthCombined = round2(payrollWealth + employerWealth);
  const pct = (n: number) => (takeHome > 0 ? round2((n / takeHome) * 100) : 0);

  const cards = [
    {
      key: 'live',
      icon: Wallet,
      label: PURPOSE_META.live.label,
      amount: live,
      pct: pct(live),
      target: TARGETS.live,
      note: `${activeLines('live').length} itemized lines`,
      ceiling: true,
    },
    {
      key: 'enjoy',
      icon: Sparkles,
      label: PURPOSE_META.enjoy.label,
      amount: enjoy,
      pct: pct(enjoy),
      target: TARGETS.enjoy,
      note:
        enjoy < (takeHome * TARGETS.enjoy) / 100
          ? `${formatCurrency(round2((takeHome * TARGETS.enjoy) / 100 - enjoy))} redirectable`
          : 'Allowance fully used',
      ceiling: true,
    },
    {
      key: 'build_wealth',
      icon: PiggyBank,
      label: PURPOSE_META.build_wealth.label,
      amount: wealthCombined,
      pct: pct(wealthCombined),
      target: TARGETS.build_wealth,
      note: `Employee ${formatCurrency(payrollWealth)} + employer ${formatCurrency(employerWealth)}`,
      ceiling: false,
    },
    {
      key: 'eliminate_debt',
      icon: TrendingDown,
      label: PURPOSE_META.eliminate_debt.label,
      amount: debtCash,
      pct: pct(debtCash),
      target: TARGETS.eliminate_debt,
      note: 'Observed statement payments',
      ceiling: false,
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Your updated plan</h2>
          <p className="text-sm text-muted-foreground">
            {monthLabel(month)} · take-home {formatCurrency(takeHome)} · 45/10/25/20 targets
          </p>
        </div>
        <Badge variant="outline">Phase 1</Badge>
      </div>

      <Card className="glass-card">
        <CardContent className="space-y-1.5 p-4 text-xs text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">How to read these cards.</span> Each card shows the
            dollars going to that purpose this month and what percent of your{' '}
            {formatCurrency(takeHome)} take-home that is. The big number is the amount funded — not a shortfall.
          </p>
          <p>
            <span className="font-medium text-foreground">Live and Enjoy are ceilings</span> — staying at or below
            target is good. <span className="font-medium text-foreground">Build Wealth and Eliminate Debt are
            floors</span> — anything below target shows the exact dollars still needed to reach it (“gap to close”).
          </p>
          <p>
            <span className="font-medium text-foreground">Buffer</span> is your month-end cash cushion from the
            Buffer tab. It reads critical when the tracked balance is below {formatCurrency(thresholds.tight_min)} —
            including when no buffer balance has been entered yet, so add your real starting balance in the Buffer
            tab to see a true status.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          const met = c.ceiling ? c.pct <= c.target + 1 : c.pct >= c.target - 1;
          return (
            <Card key={c.key} className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm font-medium">
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" /> {c.label}
                  </span>
                  <Badge
                    className={
                      met
                        ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-500'
                        : 'border-amber-500/30 bg-amber-500/15 text-amber-500'
                    }
                  >
                    {met ? 'On target' : c.ceiling ? 'Over cap' : 'Gap to close'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-2xl font-bold">{formatCurrency(c.amount)}</p>
                <Progress value={Math.min(100, (c.pct / Math.max(c.target, 1)) * 100)} />
                <p className="text-xs text-muted-foreground">
                  {c.pct}% of take-home · target {c.target}% ({formatCurrency(round2((takeHome * c.target) / 100))})
                </p>
                <p className="text-xs text-muted-foreground">{c.note}</p>
              </CardContent>
            </Card>
          );
        })}

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Building2 className="h-4 w-4" /> Business
            </CardTitle>
            <CardDescription className="text-xs">Paid from the personal account this month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold">{formatCurrency(businessOut)}</p>
            <p className="text-xs text-muted-foreground">
              {(business.rows || []).length} vendors tracked · excluded from the personal percentages
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Buffer
              </span>
              <Badge
                className={
                  bStatus === 'healthy'
                    ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-500'
                    : bStatus === 'caution'
                      ? 'border-amber-500/30 bg-amber-500/15 text-amber-500'
                      : 'border-destructive/30 bg-destructive/15 text-destructive'
                }
              >
                {BUFFER_STATUS_LABEL[bStatus]}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold">{formatCurrency(bufferEnding)}</p>
            <p className="text-xs text-muted-foreground">
              Healthy at {formatCurrency(thresholds.healthy_min)} · tight below {formatCurrency(thresholds.caution_min)}
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
