import { useMemo, useState } from 'react';
import { Lock, LockOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useFreedCashSnapshots,
  useFreezeFreedCashMonths,
  useUnfreezeFreedCashMonth,
  type FreedCashRedirect,
  type FreedCashSource,
} from '@/hooks/use-freed-cash';
import {
  availableYears,
  calendarYearRange,
  periodReport,
  rollingRange,
  snapshotPayload,
  type ReportBasis,
} from '@/lib/freed-cash/periods';
import type { EntityScope } from '@/lib/freed-cash/netRecurring';

const currency = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const currency2 = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

interface Props {
  sources: FreedCashSource[];
  redirects: FreedCashRedirect[];
  scope: EntityScope;
}

export function PeriodReports({ sources, redirects, scope }: Props) {
  const [basis, setBasis] = useState<ReportBasis>('calendar');
  const [year, setYear] = useState<number>(new Date().getFullYear());

  const { data: snapshots } = useFreedCashSnapshots();
  const freeze = useFreezeFreedCashMonths();
  const unfreeze = useUnfreezeFreedCashMonth();

  const years = useMemo(() => availableYears(sources), [sources]);

  const scopedSnaps = useMemo(
    () => (snapshots ?? []).filter((s) => s.entity_scope === scope),
    [snapshots, scope],
  );

  const range = useMemo(
    () => (basis === 'calendar' ? calendarYearRange(year) : rollingRange()),
    [basis, year],
  );

  const report = useMemo(
    () => periodReport(sources, redirects, range.fromKey, range.toKey, scopedSnaps),
    [sources, redirects, range, scopedSnaps],
  );

  const snapByMonth = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of scopedSnaps) map.set(s.period_month.slice(0, 7), s.id);
    return map;
  }, [scopedSnaps]);

  const openRows = report.rows.filter((r) => !r.frozen && report.openMonths.includes(r.month));

  function freezeFinished() {
    freeze.mutate(openRows.map((r) => snapshotPayload(r, scope, sources.length)));
  }

  const stats = [
    { label: 'Savings delivered in this period', value: currency2(report.realizedTotal) },
    { label: 'New savings created', value: `${currency2(report.createdTotal)}/mo` },
    { label: 'Run rate at the end', value: `${currency2(report.endingRunRate)}/mo` },
    { label: 'Yearly value at that rate', value: currency(report.avoidedAnnualAtEnd) },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Period report</CardTitle>
          <CardDescription>
            Compare a full calendar year against the last 12 months. Finished months can be locked so their
            numbers never change, even if you edit a savings row later.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={basis === 'calendar' ? 'default' : 'outline'}
              onClick={() => setBasis('calendar')}
            >
              Calendar year
            </Button>
            <Button
              size="sm"
              variant={basis === 'rolling' ? 'default' : 'outline'}
              onClick={() => setBasis('rolling')}
            >
              Last 12 months
            </Button>
            {basis === 'calendar' && (
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="h-9 w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <span className="ml-auto text-xs text-muted-foreground">
              {report.frozenCount} locked · {openRows.length} finished {openRows.length === 1 ? 'month' : 'months'} still open
            </span>
            <Button size="sm" variant="outline" onClick={freezeFinished} disabled={freeze.isPending || openRows.length === 0}>
              <Lock className="mr-1 h-3.5 w-3.5" /> Lock finished months
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
            ))}
          </div>

          {report.bestMonth && report.bestMonth.realizedThisMonth > 0 && (
            <p className="text-xs text-muted-foreground">
              Best month: {report.bestMonth.label} with {currency2(report.bestMonth.realizedThisMonth)} saved.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Month by month</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2">Month</th>
                <th className="py-2 text-right">New savings</th>
                <th className="py-2 text-right">Saved that month</th>
                <th className="py-2 text-right">Run rate at end</th>
                <th className="py-2 text-right">Running total</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((r) => {
                const snapId = snapByMonth.get(r.month);
                return (
                  <tr key={r.month} className="border-b last:border-0">
                    <td className="py-2">{r.label}</td>
                    <td className="py-2 text-right">
                      {r.createdMonthly > 0 ? `${currency2(r.createdMonthly)}/mo` : '—'}
                    </td>
                    <td className="py-2 text-right">{currency2(r.realizedThisMonth)}</td>
                    <td className="py-2 text-right">{currency2(r.runRateAtEnd)}</td>
                    <td className="py-2 text-right">{currency2(r.cumulativeRealized)}</td>
                    <td className="py-2">
                      {r.frozen ? (
                        <span className="inline-flex items-center gap-1">
                          <Badge variant="secondary" className="gap-1">
                            <Lock className="h-3 w-3" /> Locked
                          </Badge>
                          {snapId && (
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label={`Reopen ${r.label}`}
                              onClick={() => unfreeze.mutate(snapId)}
                            >
                              <LockOpen className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Open</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {report.rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    No savings recorded in this period yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
