import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Crown } from 'lucide-react';
import { money, SectionNote, ConfidenceBadge } from './shared';
import { legacyWindow, rmdSchedule, type AssumptionState } from '@/lib/blueprint/model';

export function LegacyWindowPanel({ state }: { state: AssumptionState }) {
  const rows = useMemo(() => legacyWindow(state), [state]);
  const chart = rows.map((r) => ({
    age: r.age,
    'Household income': Math.round(r.householdIncomeMonthly),
    Investing: Math.round(r.totalMonthly),
  }));

  return (
    <div className="space-y-4">
      <Card className="wos-page">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Crown className="h-4 w-4 text-prism-amber" /> Age {state.legacyWindowStartAge}–{state.retirementAge} Legacy Accumulation Window
          </CardTitle>
          <SectionNote>
            Keep working. Lifestyle runs on salary, pension and Social Security. The portfolio keeps compounding —
            planned withdrawals for ordinary living expenses are {money(state.plannedWithdrawalForLiving)}/mo.
          </SectionNote>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="age" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => money(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Household income" fill="hsl(var(--primary))" />
                <Bar dataKey="Investing" fill="hsl(var(--prism-teal))" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground sticky top-0 bg-card">
                <tr className="border-b">
                  <th className="text-left py-1.5">Age</th><th className="text-right">Salary / mo</th>
                  <th className="text-right">Pension</th><th className="text-right">Social Security</th>
                  <th className="text-right">Other</th><th className="text-right">Household / mo</th>
                  <th className="text-right">Investing / mo</th><th className="text-right">Investing / yr</th>
                  <th className="text-right">% invested</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {rows.map((r) => (
                  <tr key={r.year} className="border-b border-border/40">
                    <td className="py-1.5">{r.age}</td>
                    <td className="text-right">{money(r.salary / 12)}</td>
                    <td className="text-right">{money(r.pensionMonthly)}</td>
                    <td className="text-right">{money(r.socialSecurityMonthly)}</td>
                    <td className="text-right">{money(r.otherIncomeMonthly)}</td>
                    <td className="text-right font-semibold">{money(r.householdIncomeMonthly)}</td>
                    <td className="text-right text-prism-teal">{money(r.totalMonthly)}</td>
                    <td className="text-right text-prism-teal">{money(r.totalAnnual)}</td>
                    <td className="text-right">{r.pctOfIncomeInvested.toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-lg bg-primary/5 p-3 text-sm">
            Planned Portfolio Withdrawal for Normal Living Expenses: <strong>{money(state.plannedWithdrawalForLiving)}</strong>
          </div>
        </CardContent>
      </Card>

      <Card className="wos-page">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Social Security & Pension</CardTitle>
          <SectionNote>
            Income streams only. Neither is ever added to assets or net worth. Edit the figures in the Assumption Center.
          </SectionNote>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border/60 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Social Security</p>
              <ConfidenceBadge level="projected" />
            </div>
            <p className="text-lg font-bold tabular-nums">{money(state.socialSecurityMonthly)}/mo</p>
            <SectionNote>
              Starts age {state.socialSecurityStartAge} · {money(state.socialSecurityMonthly * 12)}/yr ·
              {' '}{state.socialSecurityCola}% COLA assumption
            </SectionNote>
          </div>
          <div className="rounded-lg border border-border/60 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Spouse pension</p>
              <ConfidenceBadge level="estimated" />
            </div>
            <p className="text-lg font-bold tabular-nums">{money(state.spousePensionMonthly)}/mo</p>
            <SectionNote>
              Starts age {state.spousePensionStartAge} · {money(state.spousePensionMonthly * 12)}/yr ·
              {' '}{state.spousePensionCola}% COLA · {state.spousePensionSurvivorPct}% survivor option
            </SectionNote>
          </div>
          <div className="sm:col-span-2">
            <Badge variant="outline" className="text-[10px]">Excluded from net worth by design</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function RmdRothPanel({ state }: { state: AssumptionState; }) {
  const rows = useMemo(() => rmdSchedule(state, state.portfolioBalance), [state]);
  return (
    <Card className="wos-page">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">RMD & Roth Conversion Planner</CardTitle>
        <SectionNote>
          An RMD moved into a brokerage account is not new wealth — it is the same money, taxed and relocated.
          RMD age ({state.rmdAge}) and the {state.effectiveTaxRatePct}% effective rate are editable assumptions.
        </SectionNote>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-border/60 p-3 text-xs space-y-1">
            <p className="font-semibold">Required distribution path</p>
            <p>TRADITIONAL RETIREMENT → REQUIRED DISTRIBUTION → TAXES → UNUSED PROCEEDS → TAXABLE BROKERAGE</p>
          </div>
          <div className="rounded-lg border border-border/60 p-3 text-xs space-y-1">
            <p className="font-semibold">Strategic conversion path</p>
            <p>PRETAX RETIREMENT → STRATEGIC ROTH CONVERSION → TAXES → ROTH ACCOUNT</p>
            <p className="text-muted-foreground">Planned conversion: {money(state.rothConversionAnnual)}/yr</p>
          </div>
        </div>
        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground sticky top-0 bg-card">
              <tr className="border-b">
                <th className="text-left py-1.5">Age</th><th className="text-right">Pretax balance</th>
                <th className="text-right">RMD</th><th className="text-right">Taxes</th>
                <th className="text-right">Relocated to brokerage</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {rows.map((r) => (
                <tr key={r.age} className="border-b border-border/40">
                  <td className="py-1.5">{r.age}</td>
                  <td className="text-right">{money(r.balance)}</td>
                  <td className="text-right">{money(r.rmd)}</td>
                  <td className="text-right text-destructive">{money(r.taxes)}</td>
                  <td className="text-right">{money(r.netToBrokerage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ConfidenceBadge level="projected" />
      </CardContent>
    </Card>
  );
}
