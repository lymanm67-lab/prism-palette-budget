import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { durabilityLabel, type FreedCashSource } from '@/hooks/use-freed-cash';
import { cohortReport, durabilityMix } from '@/lib/freed-cash/cohorts';

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmt2 = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

interface Props {
  sources: FreedCashSource[];
}

export function CohortReport({ sources }: Props) {
  const cohorts = useMemo(() => cohortReport(sources), [sources]);
  const mix = useMemo(() => durabilityMix(sources), [sources]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">How much of your work is still paying off</CardTitle>
          <CardDescription className="text-xs">
            Savings grouped by the month they took effect. Survival shows how much of that month's
            work is still lowering your bills today.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Logged, all months" value={`${fmt2(cohorts.totalStartedMonthly)}/mo`} />
            <Stat label="Still in effect today" value={`${fmt2(cohorts.totalSurvivingMonthly)}/mo`} />
            <Stat label="Delivered so far" value={fmt2(cohorts.totalCumulative)} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Survival rate</span>
              <span>{cohorts.overallSurvivalRate.toFixed(0)}%</span>
            </div>
            <Progress value={Math.min(100, cohorts.overallSurvivalRate)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Month by month</CardTitle>
        </CardHeader>
        <CardContent>
          {cohorts.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing to group yet — log a saving with an effective date first.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Started</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Logged</TableHead>
                    <TableHead className="text-right">Still active</TableHead>
                    <TableHead className="text-right">Survival</TableHead>
                    <TableHead className="text-right">Delivered</TableHead>
                    <TableHead className="text-right">Age</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cohorts.rows.map((r) => (
                    <TableRow key={r.key}>
                      <TableCell className="whitespace-nowrap font-medium">
                        {r.label}
                        {cohorts.bestKey === r.key && (
                          <Badge variant="secondary" className="ml-2 text-[10px]">
                            Best
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{r.count}</TableCell>
                      <TableCell className="text-right">{fmt2(r.startedMonthly)}/mo</TableCell>
                      <TableCell className="text-right">
                        {fmt2(r.survivingMonthly)}/mo
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({r.survivingCount})
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{r.survivalRate.toFixed(0)}%</TableCell>
                      <TableCell className="text-right">{fmt2(r.cumulativeRealized)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {r.ageMonths} mo
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">How dependable your savings are</CardTitle>
          <CardDescription className="text-xs">
            Of the {fmt2(mix.runRate)}/mo you are saving now, {fmt(mix.durableMonthly)} looks
            permanent and {fmt(mix.fragileMonthly)} could come back.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Dependable share</span>
              <span>{mix.durableShare.toFixed(0)}%</span>
            </div>
            <Progress value={Math.min(100, mix.durableShare)} />
          </div>

          {mix.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No confirmed savings in effect yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Monthly</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                  <TableHead className="text-right">With end date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mix.rows.map((r) => (
                  <TableRow key={r.value}>
                    <TableCell className="font-medium">{durabilityLabel(r.value)}</TableCell>
                    <TableCell className="text-right">{r.count}</TableCell>
                    <TableCell className="text-right">{fmt2(r.monthly)}/mo</TableCell>
                    <TableCell className="text-right">{r.share.toFixed(0)}%</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {r.withEndDate}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold tracking-tight">{value}</p>
    </div>
  );
}
