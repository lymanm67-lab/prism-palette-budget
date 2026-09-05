import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { FreedCashRedirect, FreedCashSource, GateRequest } from '@/hooks/use-freed-cash';
import {
  netRecurringSummary,
  scopeSplit,
  type EntityScope,
} from '@/lib/freed-cash/netRecurring';

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

interface Props {
  /** Already filtered to the active scope. */
  sources: FreedCashSource[];
  redirects: FreedCashRedirect[];
  gateRequests: GateRequest[];
  /** Unfiltered lists, used for the personal vs business comparison. */
  allSources: FreedCashSource[];
  allRedirects: FreedCashRedirect[];
  allGateRequests: GateRequest[];
  scope: EntityScope;
}

export function NetRecurringPanel({
  sources,
  redirects,
  gateRequests,
  allSources,
  allRedirects,
  allGateRequests,
  scope,
}: Props) {
  const s = useMemo(
    () => netRecurringSummary(sources, redirects, gateRequests),
    [sources, redirects, gateRequests],
  );
  const split = useMemo(
    () => scopeSplit(allSources, allRedirects, allGateRequests),
    [allSources, allRedirects, allGateRequests],
  );

  return (
    <TooltipProvider delayDuration={0}>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Net recurring spending</CardTitle>
          <CardDescription className="text-xs">
            Savings only count once new recurring costs are subtracted.
            {scope === 'personal' && ' Household money only — business savings are excluded.'}
            {scope === 'business' && ' Business money only — household savings are excluded.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Savings run rate"
              value={`${fmt(s.savingsRunRate)}/mo`}
              hint={`${fmt(s.durableMonthly)}/mo looks permanent`}
              tip="How much lower your confirmed recurring expenses are right now."
            />
            <Stat
              label="New subscriptions added"
              value={`${fmt(s.addedRecurring)}/mo`}
              hint={`${s.addedCount} approved${s.pendingCount ? `, ${s.pendingCount} awaiting a decision (${fmt(s.pendingRecurring)}/mo)` : ''}`}
              tip="Recurring cost of subscriptions you approved through the Subscription Gate. These push spending back up."
            />
            <Stat
              label="Net improvement"
              value={`${fmt(s.netImprovement)}/mo`}
              hint={`${s.netRetention.toFixed(0)}% of savings survived`}
              tip="Savings run rate minus the recurring cost of new subscriptions. This is the real change in your monthly spending."
            />
            <Stat
              label="Unallocated freed cash"
              value={`${fmt(s.unallocatedMonthly)}/mo`}
              hint={`${fmt(s.executionGap)}/mo assigned but not moved`}
              tip="Confirmed savings with no job yet. Unallocated money quietly drifts back into everyday spending."
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Savings kept after new spending</span>
              <span>{Math.max(0, s.netRetention).toFixed(0)}%</span>
            </div>
            <Progress value={Math.max(0, Math.min(100, s.netRetention))} />
            {s.atRiskMonthly > 0 && (
              <p className="text-xs text-muted-foreground">
                {fmt(s.atRiskMonthly)}/mo has no job or has not actually moved yet.
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Personal and business kept separate
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Side</TableHead>
                  <TableHead className="text-right">Savings</TableHead>
                  <TableHead className="text-right">New recurring</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead className="text-right">Unallocated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {split.map((r) => (
                  <TableRow key={r.scope}>
                    <TableCell className="font-medium">{r.label}</TableCell>
                    <TableCell className="text-right">{fmt(r.savingsRunRate)}/mo</TableCell>
                    <TableCell className="text-right">{fmt(r.addedRecurring)}/mo</TableCell>
                    <TableCell className="text-right">{fmt(r.netImprovement)}/mo</TableCell>
                    <TableCell className="text-right">{fmt(r.unallocatedMonthly)}/mo</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

function Stat({
  label,
  value,
  hint,
  tip,
}: {
  label: string;
  value: string;
  hint: string;
  tip: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="flex items-start gap-1 text-xs text-muted-foreground">
        {label}
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-help">
              <Info className="h-3 w-3" />
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">{tip}</TooltipContent>
        </Tooltip>
      </p>
      <p className="mt-1 text-xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
