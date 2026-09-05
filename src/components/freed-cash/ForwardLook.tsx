import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, TrendingDown } from 'lucide-react';
import type { FreedCashRedirect, FreedCashSource } from '@/hooks/use-freed-cash';
import { forwardLook, leakageReport, type LeakSeverity } from '@/lib/freed-cash/leakage';

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

const SEVERITY_STYLE: Record<LeakSeverity, string> = {
  high: 'bg-destructive/15 text-destructive border-destructive/30',
  medium: 'bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400',
  low: 'bg-muted text-muted-foreground',
};

const SEVERITY_LABEL: Record<LeakSeverity, string> = {
  high: 'Act now',
  medium: 'Watch',
  low: 'Housekeeping',
};

interface Props {
  sources: FreedCashSource[];
  redirects: FreedCashRedirect[];
}

export function ForwardLook({ sources, redirects }: Props) {
  const [severity, setSeverity] = useState<'all' | LeakSeverity>('all');

  const look = useMemo(() => forwardLook(sources, redirects), [sources, redirects]);
  const leaks = useMemo(() => leakageReport(sources, redirects), [sources, redirects]);

  const rows = severity === 'all' ? leaks.rows : leaks.rows.filter((r) => r.severity === severity);
  const keepRate = look.runRate > 0 ? (look.runRateInTwelveMonths / look.runRate) * 100 : 0;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Run rate today"
            value={`${fmt(look.runRate)}/mo`}
            hint="Verified savings currently in effect"
            tip="How much lower your recurring expenses are right now. A current expense level, not one month of new savings."
          />
          <Stat
            label="Run rate in 12 months"
            value={`${fmt(look.runRateInTwelveMonths)}/mo`}
            hint={`${keepRate.toFixed(0)}% of today's run rate survives`}
            tip="Today's run rate minus savings already known to end (an expiration date or a scheduled resume). An estimate."
          />
          <Stat
            label="Projected next 12 months"
            value={fmt(look.projectedTwelveMonth)}
            hint={`vs ${fmt(look.naiveTwelveMonth)} if nothing ended`}
            tip="Month-by-month projection of the run rate over the next 12 months. Forward-looking only — never added to realized savings."
          />
          <Stat
            label="Leaking back"
            value={`${fmt(leaks.driftMonthly)}/mo`}
            hint="Unassigned plus assigned-but-not-moved"
            tip="Freed money with no job, or a job that was never carried out. By default this quietly returns to spending."
          />
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Net recurring spending improvement</CardTitle>
            <CardDescription className="text-xs">
              Durable savings that are actually being moved — the part of the run rate you can count on.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold tracking-tight">{fmt(look.netRecurringImprovement)}/mo</p>
            <Progress value={look.runRate > 0 ? Math.min(100, (look.netRecurringImprovement / look.runRate) * 100) : 0} />
            <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
              <p>Not assigned to anything: {fmt(look.unallocatedMonthly)}/mo</p>
              <p>Assigned but not moved: {fmt(look.executionGap)}/mo</p>
              <p>Lost to known endings over 12 months: {fmt(look.expiringImpact)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Next 12 months, month by month</CardTitle>
            <CardDescription className="text-xs">
              Where savings drop off because an end date or a scheduled restart is already known.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Run rate</TableHead>
                  <TableHead className="text-right">Ending that month</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {look.months.map((m) => (
                  <TableRow key={m.key}>
                    <TableCell className="whitespace-nowrap">{m.label}</TableCell>
                    <TableCell className="text-right">{fmt(m.runRate)}</TableCell>
                    <TableCell className="text-right">
                      {m.endingThisMonth > 0 ? (
                        <span className="text-destructive">−{fmt(m.endingThisMonth)}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Leak detection
            </CardTitle>
            <CardDescription className="text-xs">
              {leaks.highCount} urgent {leaks.highCount === 1 ? 'issue' : 'issues'} covering{' '}
              {fmt(leaks.atRiskMonthly)}/mo of savings that could slip away.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(['all', 'high', 'medium', 'low'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverity(s)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    severity === s ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground'
                  }`}
                >
                  {s === 'all' ? `All (${leaks.rows.length})` : SEVERITY_LABEL[s]}
                </button>
              ))}
            </div>

            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing is leaking here — every verified saving has a job, the money is moving, and no end dates
                are close.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>What</TableHead>
                      <TableHead className="text-right">Monthly</TableHead>
                      <TableHead>Issue</TableHead>
                      <TableHead>What to do</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium">{r.name}</div>
                          {r.vendor && <div className="text-xs text-muted-foreground">{r.vendor}</div>}
                        </TableCell>
                        <TableCell className="text-right">{fmt(r.monthly)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className={SEVERITY_STYLE[r.severity]}>
                              {SEVERITY_LABEL[r.severity]}
                            </Badge>
                            <span className="text-xs">{r.reason}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.action}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

function Stat({ label, value, hint, tip }: { label: string; value: string; hint: string; tip: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-start gap-1 text-xs font-medium text-muted-foreground">
          {label}
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help">
                <Info className="h-3 w-3" />
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">{tip}</TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
