import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CalendarClock, PiggyBank, TrendingUp } from 'lucide-react';
import {
  buildSettlementPlan,
  januaryTransition,
  SETTLEMENT_FEES,
} from '@/lib/budgeting/settlementStepDown';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

const monthLabel = (m: string) =>
  new Date(`${m}-01T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

interface Props {
  /** YYYY-MM currently selected in the budget page */
  month: string;
}

export default function DebtCashFlowRelease({ month }: Props) {
  const plan = useMemo(() => buildSettlementPlan(month), [month]);
  const jan = januaryTransition();
  const c = plan.current;

  const reservePct = plan.reserveTarget > 0
    ? Math.min(100, Math.round((Math.max(0, c.reserveBalance) / plan.reserveTarget) * 100))
    : 0;

  const stats = [
    { label: 'Original monthly payment', value: money(plan.baseline) },
    { label: 'Current monthly payment', value: money(c.regularPayment) },
    { label: 'Monthly cash flow released', value: money(c.cashFlowReleased), tone: 'text-emerald-500' },
    { label: 'Reserved for future fees', value: money(c.reserveContribution) },
    { label: 'New debt obligations', value: money(c.newObligations), tone: c.newObligations ? 'text-amber-500' : undefined },
    { label: 'Net redirectable cash flow', value: money(c.netRedirectable), tone: 'text-primary' },
  ];

  return (
    <Card className="border-l-4 border-l-amber-500">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-500" />
            Debt Cash-Flow Release
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Badge variant={c.regularPaymentsComplete ? 'default' : 'secondary'} className="text-[10px]">
              Regular payments {c.regularPaymentsComplete ? 'complete' : `end ${monthLabel(plan.regularPaymentsEndMonth)}`}
            </Badge>
            <Badge variant={c.settlementFullyComplete ? 'default' : 'outline'} className="text-[10px]">
              Settlement {c.settlementFullyComplete ? 'fully complete' : `complete ${new Date(plan.finalFeeDate + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`}
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Freed settlement payments are not permanently available until every known fee and new obligation is funded.
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border bg-card/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className={`text-lg font-semibold ${s.tone ?? ''}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Settlement Fee Reserve */}
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-primary" /> Debt Settlement Fee Reserve
            </p>
            <span className="text-xs text-muted-foreground">
              {money(Math.max(0, c.reserveBalance))} of {money(plan.reserveTarget)}
            </span>
          </div>
          <Progress value={reservePct} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Fund about {money(plan.reserveMonthly)}/month for five months (Sep 2026 – Jan 2027) to prefund all known
            fees. This reserve belongs to <span className="font-medium">Eliminate Debt</span> — not Live, not Build Wealth.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {SETTLEMENT_FEES.map((f) => (
              <Badge key={f.date} variant="outline" className="text-[10px]">
                {new Date(f.date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} · {money(f.amount)}
              </Badge>
            ))}
          </div>
          {plan.nextFee && (
            <p className="text-xs flex items-center gap-1 text-amber-500">
              <CalendarClock className="h-3.5 w-3.5" />
              Next fee: {money(plan.nextFee.amount)} due{' '}
              {new Date(plan.nextFee.date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
            </p>
          )}
        </div>

        {/* January 2027 transition */}
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 space-y-1">
          <p className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> January 2027 transition
          </p>
          <div className="text-xs space-y-0.5">
            <p>Debt settlement reduction: <span className="text-emerald-500 font-medium">+{money(jan.reduction)}</span></p>
            <p>New PSLF student loan payment: <span className="text-destructive font-medium">−{money(jan.pslf)}</span></p>
            <p className="font-semibold">Net incremental improvement: {money(jan.net)}/month</p>
            <p className="text-muted-foreground">
              The {money(jan.alreadyReleased)}/month released in Sep–Oct 2026 stays tracked separately under its
              assigned purpose.
            </p>
          </div>
        </div>

        {/* Timeline */}
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Step-down timeline</p>
          <ol className="relative border-l pl-4 space-y-3">
            {plan.timeline.map((t) => (
              <li key={t.month + t.label} className="relative">
                <span
                  className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-background ${
                    t.kind === 'complete'
                      ? 'bg-emerald-500'
                      : t.kind === 'fee'
                        ? 'bg-amber-500'
                        : t.kind === 'obligation'
                          ? 'bg-primary'
                          : t.kind === 'reduction'
                            ? 'bg-emerald-500/70'
                            : 'bg-muted-foreground'
                  }`}
                />
                <p className="text-sm font-medium">
                  {monthLabel(t.month)} — {t.label}
                </p>
                <p className="text-xs text-muted-foreground">{t.detail}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* After completion */}
        <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
          <p className="font-medium text-sm">After April 2027</p>
          <p>Close the fee reserve, redirect any unused balance ({money(plan.leftoverReserve)}) to the highest-priority debt or Build Wealth, and drop settlement fees from forecasts.</p>
          <p className="font-semibold text-emerald-500">
            Permanent monthly cash-flow improvement: {money(plan.permanentImprovement)}
            <span className="font-normal text-muted-foreground"> (after the {money(jan.pslf)} PSLF payment)</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
