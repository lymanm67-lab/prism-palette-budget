import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Landmark, ShieldCheck } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { runDeferredWithdrawal } from '@/lib/investment/deferredWithdrawal';
import { BRACKETS_MFJ_2025, BRACKETS_SINGLE_2025 } from '@/lib/investment/tax';
import { runProjection, formatCurrencyFull } from '@/lib/investment/projection';
import type { InvestmentPlan } from '@/hooks/use-investment-plan';

function pct(n: number) {
  return `${n.toFixed(1)}%`;
}

export function WithdrawalTaxPlanner({ plan }: { plan: InvestmentPlan | null }) {
  const currentAge = plan?.current_age ?? 59;
  const planReturn = plan?.expected_return_pct ?? 8;
  const horizonAge = plan?.retirement_age ?? 75;

  // Balance at the plan horizon (age 75) — the pot that keeps compounding untouched.
  const projectedAtHorizon = useMemo(() => {
    if (!plan || !plan.current_age) return 0;
    return runProjection({
      currentAge: plan.current_age,
      retirementAge: horizonAge,
      currentBalance: plan.current_balance,
      targetAmount: plan.target_amount,
      monthlyEmployeeContribution: plan.monthly_employee_contribution,
      monthlyEmployerContribution: plan.monthly_employer_contribution,
      employerMatchPct: plan.employer_match_pct ?? undefined,
      expectedReturnPct: planReturn,
      annualRaisePct: plan.annual_raise_pct,
      raiseRedirectPct: plan.raise_redirect_pct,
      currentMonthlyIncome: plan.current_monthly_income ?? undefined,
      debtPaymentAmount: plan.debt_payment_amount ?? undefined,
      debtPayoffDate: plan.debt_payoff_date,
      additionalMonthlyAmount: plan.additional_monthly_amount ?? undefined,
      additionalStartDate: plan.additional_start_date,
      hsaBalance: plan.hsa_balance,
      hsaMonthlyContribution: plan.hsa_monthly_contribution,
      hsaEmployerContribution: plan.hsa_employer_contribution,
      hsaInvested: plan.hsa_invested,
      hsaReturnPct: plan.hsa_return_pct,
      useFutureDollars: true,
      inflationPct: plan.inflation_pct,
    }).projectedBalance;
  }, [plan, horizonAge, planReturn]);

  const [startingBalance, setStartingBalance] = useState<number | null>(null);
  const [deferUntilAge, setDeferUntilAge] = useState(85);
  const [withdrawalStartAge, setWithdrawalStartAge] = useState(86);
  const [ratePct, setRatePct] = useState(2.5);
  const [returnPct, setReturnPct] = useState(planReturn);
  const [pretaxPct, setPretaxPct] = useState(80);
  const [rothPct, setRothPct] = useState(15);
  const [otherIncome, setOtherIncome] = useState(
    Math.round(((plan?.ss_monthly_estimate ?? 3540) * 0.85 + (plan?.spouse_pension_monthly ?? 6559)) * 12),
  );
  const [filing, setFiling] = useState<'single' | 'mfj'>('mfj');
  const [stateRate, setStateRate] = useState(2.75);
  const [enforceRmd, setEnforceRmd] = useState(true);
  const [throughAge, setThroughAge] = useState(95);

  const birthYear = new Date().getFullYear() - currentAge;
  const balance = startingBalance ?? Math.round(projectedAtHorizon);

  const result = useMemo(() => runDeferredWithdrawal({
    startingBalance: balance,
    startAge: horizonAge,
    deferUntilAge,
    withdrawalStartAge,
    withdrawalRatePct: ratePct,
    throughAge,
    expectedReturnPct: returnPct,
    pretaxSharePct: pretaxPct,
    rothSharePct: rothPct,
    otherTaxableIncome: otherIncome,
    brackets: filing === 'mfj' ? BRACKETS_MFJ_2025 : BRACKETS_SINGLE_2025,
    stateTaxRatePct: stateRate,
    birthYear,
    enforceRmd,
  }), [balance, horizonAge, deferUntilAge, withdrawalStartAge, ratePct, throughAge,
       returnPct, pretaxPct, rothPct, otherIncome, filing, stateRate, birthYear, enforceRmd]);

  const first = result.firstWithdrawal;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Landmark className="h-4 w-4 text-primary" />
            Deferred Withdrawal &amp; Tax Estimator
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Portfolio compounds untouched to age {deferUntilAge}, then draws {ratePct}% a year starting at
            age {withdrawalStartAge}. Estimates the federal and state tax owed on every dollar withdrawn.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="wtp-balance">Balance at age {horizonAge}</Label>
              <Input
                id="wtp-balance"
                type="number"
                value={balance}
                onChange={(e) => setStartingBalance(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Plan projection: {formatCurrencyFull(projectedAtHorizon)}</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="wtp-defer">Untouched through age</Label>
              <Input id="wtp-defer" type="number" value={deferUntilAge}
                onChange={(e) => setDeferUntilAge(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wtp-start">First withdrawal at age</Label>
              <Input id="wtp-start" type="number" value={withdrawalStartAge}
                onChange={(e) => setWithdrawalStartAge(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wtp-rate">Withdrawal rate %</Label>
              <Input id="wtp-rate" type="number" step="0.1" value={ratePct}
                onChange={(e) => setRatePct(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wtp-return">Return %</Label>
              <Input id="wtp-return" type="number" step="0.1" value={returnPct}
                onChange={(e) => setReturnPct(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wtp-pretax">Pre-tax share %</Label>
              <Input id="wtp-pretax" type="number" value={pretaxPct}
                onChange={(e) => setPretaxPct(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wtp-roth">Roth share %</Label>
              <Input id="wtp-roth" type="number" value={rothPct}
                onChange={(e) => setRothPct(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wtp-other">Other taxable income / yr</Label>
              <Input id="wtp-other" type="number" value={otherIncome}
                onChange={(e) => setOtherIncome(Number(e.target.value))} />
              <p className="text-xs text-muted-foreground">85% of Social Security + spouse pension</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="wtp-state">State tax %</Label>
              <Input id="wtp-state" type="number" step="0.05" value={stateRate}
                onChange={(e) => setStateRate(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="wtp-through">Model through age</Label>
              <Input id="wtp-through" type="number" value={throughAge}
                onChange={(e) => setThroughAge(Number(e.target.value))} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-2">
              <Label htmlFor="wtp-filing" className="text-xs">Married filing jointly</Label>
              <Switch id="wtp-filing" checked={filing === 'mfj'}
                onCheckedChange={(v) => setFiling(v ? 'mfj' : 'single')} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-2">
              <Label htmlFor="wtp-rmd" className="text-xs">Enforce IRS RMDs</Label>
              <Switch id="wtp-rmd" checked={enforceRmd} onCheckedChange={setEnforceRmd} />
            </div>
          </div>

          {result.rmdConflict && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>RMDs start at age {result.rmdAge} — before your age {withdrawalStartAge} plan</AlertTitle>
              <AlertDescription className="text-sm">
                Pre-tax (403(b)/457(b)/traditional IRA) money can't stay untouched past age {result.rmdAge}.
                The IRS forces a minimum distribution each year, and it's taxed as ordinary income.
                Between ages {result.rmdAge} and {withdrawalStartAge - 1} this plan pays an estimated{' '}
                <strong>{formatCurrencyFull(result.preStrategyRmdTax)}</strong> in forced-withdrawal tax.
                Roth dollars have no RMD — converting pre-tax to Roth before age {result.rmdAge} is the lever
                that actually lets the portfolio compound untouched to {deferUntilAge}.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label={`Balance at age ${deferUntilAge}`} value={formatCurrencyFull(result.balanceAtDeferAge)} />
            <Stat
              label={`First withdrawal (age ${withdrawalStartAge})`}
              value={first ? formatCurrencyFull(first.grossWithdrawal) : '—'}
              sub={first ? `${formatCurrencyFull(first.grossWithdrawal / 12)}/mo gross` : undefined}
            />
            <Stat
              label="Tax on first withdrawal"
              value={first ? formatCurrencyFull(first.totalTax) : '—'}
              sub={first ? `${pct(first.effectiveTaxRatePct)} effective · ${pct(first.marginalRatePct)} marginal` : undefined}
              tone="warn"
            />
            <Stat
              label="Net after tax"
              value={first ? formatCurrencyFull(first.netIncome) : '—'}
              sub={first ? `${formatCurrencyFull(first.netIncome / 12)}/mo net` : undefined}
              tone="good"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label={`Lifetime withdrawals to ${throughAge}`} value={formatCurrencyFull(result.totalGross)} />
            <Stat label="Lifetime tax on withdrawals" value={formatCurrencyFull(result.totalTax)}
              sub={`${pct(result.blendedTaxRatePct)} blended rate`} tone="warn" />
            <Stat label={`Estate left at age ${throughAge}`} value={formatCurrencyFull(result.endingBalance)}
              tone="good" />
          </div>

          <div className="rounded-lg border">
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Age</TableHead>
                    <TableHead className="text-right">Start balance</TableHead>
                    <TableHead className="text-right">Gross draw</TableHead>
                    <TableHead className="text-right">RMD</TableHead>
                    <TableHead className="text-right">Federal</TableHead>
                    <TableHead className="text-right">State</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead className="text-right">End balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.years.map((y) => (
                    <TableRow key={y.age} className={y.rmdForced ? 'bg-destructive/5' : undefined}>
                      <TableCell className="font-medium">
                        {y.age}
                        {y.rmdForced && <Badge variant="destructive" className="ml-2 text-[10px]">RMD</Badge>}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrencyFull(y.startBalance)}</TableCell>
                      <TableCell className="text-right">{formatCurrencyFull(y.grossWithdrawal)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {y.rmdRequired > 0 ? formatCurrencyFull(y.rmdRequired) : '—'}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrencyFull(y.federalTax)}</TableCell>
                      <TableCell className="text-right">{formatCurrencyFull(y.stateTax)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrencyFull(y.netIncome)}</TableCell>
                      <TableCell className="text-right">{formatCurrencyFull(y.endBalance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Estimates use 2025 federal brackets held flat, a flat state rate, and treat 85% of Social Security as
            taxable. Actual tax depends on future law, bracket indexing, IRMAA surcharges, and your filing status.
            Not tax advice.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'warn' }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold ${tone === 'warn' ? 'text-destructive' : tone === 'good' ? 'text-primary' : ''}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
