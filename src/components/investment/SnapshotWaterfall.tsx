import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { money } from '@/lib/retirement/investmentTracker';
import type { MonthPoint } from '@/lib/retirement/investmentTracker';
import { buildWaterfall, waterfallChartData } from '@/lib/investment/portfolio';

interface Props {
  monthPoint: MonthPoint | undefined;
  previousBalance: number;
  investmentTotal: number;
  retirementTotal: number;
  selfDirectedTotal: number;
  dividends: number;
  interest: number;
  transfersNet: number;
}

export function SnapshotWaterfall({
  monthPoint, previousBalance, investmentTotal, retirementTotal, selfDirectedTotal,
  dividends, interest, transfersNet,
}: Props) {
  const steps = buildWaterfall(monthPoint, previousBalance);
  const chart = waterfallChartData(steps);
  const label = monthPoint?.label ?? 'Current month';

  const netChange = (monthPoint?.balance ?? previousBalance) - previousBalance;

  const rows: Array<[string, string, string?]> = [
    ['Monthly contributions', money(monthPoint?.employeeContributions ?? 0, 2)],
    ['Employer contributions', money(monthPoint?.employerContributions ?? 0, 2)],
    ['Investment gain / loss', money(monthPoint?.investmentGain ?? 0, 2), (monthPoint?.investmentGain ?? 0) >= 0 ? 'up' : 'down'],
    ['Dividends', money(dividends, 2)],
    ['Interest', money(interest, 2)],
    ['Transfers (not new wealth)', money(transfersNet, 2)],
    ['Withdrawals', money(monthPoint?.withdrawals ?? 0, 2)],
    ['Fees', money(monthPoint?.fees ?? 0, 2)],
    ['Net change', money(netChange, 2), netChange >= 0 ? 'up' : 'down'],
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm uppercase tracking-wider">
            {label.toUpperCase()} investment snapshot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              ['Total investments', investmentTotal],
              ['Retirement', retirementTotal],
              ['Self-directed', selfDirectedTotal],
            ].map(([l, v]) => (
              <div key={l as string} className="rounded-lg border border-border/60 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{l as string}</p>
                <p className="text-xl font-semibold tabular-nums">{money(v as number, 2)}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
              Why did my portfolio change?
            </p>
            <div className="grid gap-1 sm:grid-cols-2 text-xs">
              {rows.map(([l, v, tone]) => (
                <div key={l} className="flex justify-between border-b border-border/40 py-1">
                  <span className="text-muted-foreground">{l}</span>
                  <span className={`tabular-nums font-medium ${tone === 'up' ? 'text-emerald-500' : tone === 'down' ? 'text-destructive' : ''}`}>
                    {v}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Contributions are never counted as investment gain, and transfers between investment accounts
              are never counted as new wealth.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm uppercase tracking-wider">Investment growth waterfall</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 8, right: 8, left: 8, bottom: 40 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => money(v)} />
                <Tooltip
                  formatter={(v: number, name: string) => [money(v, 2), name === 'delta' ? 'Amount' : 'Base']}
                  labelStyle={{ fontSize: 11 }}
                />
                <Bar dataKey="base" stackId="a" fill="transparent" />
                <Bar dataKey="delta" stackId="a" radius={[3, 3, 0, 0]}>
                  {chart.map((c, i) => (
                    <Cell
                      key={i}
                      fill={
                        c.kind === 'start' || c.kind === 'end'
                          ? 'hsl(var(--primary))'
                          : c.kind === 'subtract'
                            ? 'hsl(var(--destructive))'
                            : 'hsl(160 60% 40%)'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Beginning portfolio + employee contributions + employer contributions + investment gains −
            withdrawals − fees = ending portfolio.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
