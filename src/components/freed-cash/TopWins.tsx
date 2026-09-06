import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  FreedCashRedirect,
  FreedCashSource,
  confidenceLabel,
  destinationLabel,
  durabilityLabel,
} from '@/hooks/use-freed-cash';
import { keepScenarios, winRanking } from '@/lib/freed-cash/wins';
import { formatCurrency } from '@/lib/utils-currency';

interface Props {
  sources: FreedCashSource[];
  redirects: FreedCashRedirect[];
}

const HORIZONS = [
  { key: 'year1' as const, label: '12 months' },
  { key: 'year3' as const, label: '3 years' },
  { key: 'year5' as const, label: '5 years' },
];

export function TopWins({ sources, redirects }: Props) {
  const [showAll, setShowAll] = useState(false);
  const ranking = useMemo(() => winRanking(sources, redirects), [sources, redirects]);
  const scenarios = useMemo(() => keepScenarios(redirects), [redirects]);

  const rows = showAll ? ranking.rows : ranking.rows.slice(0, 10);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Top Freed Cash wins</CardTitle>
          <CardDescription>
            Which cancellations and reductions free up the most money, and how much of your goal each
            one covers every year.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Freed up each month" value={formatCurrency(ranking.totalMonthly)} />
            <Stat label="Freed up each year" value={formatCurrency(ranking.totalAnnual)} />
            <Stat
              label="Top 3 wins are"
              value={`${Math.round(ranking.topThreeShare * 100)}% of it`}
            />
          </div>

          {ranking.unassignedMonthly > 0 && (
            <p className="text-sm text-muted-foreground">
              {formatCurrency(ranking.unassignedMonthly)} a month of this still has no job — give it
              one on the Redirects tab to see it in the scenarios below.
            </p>
          )}

          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active savings yet. Log a cancellation or a lowered bill to start the ranking.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-2">#</th>
                    <th className="py-2 pr-2">What you changed</th>
                    <th className="py-2 pr-2 text-right">Per month</th>
                    <th className="py-2 pr-2 text-right">Per year</th>
                    <th className="py-2 pr-2 text-right">Over 5 years</th>
                    <th className="py-2 pr-2">Where it goes</th>
                    <th className="py-2 pr-2 text-right">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.sourceId} className="border-b last:border-0 align-top">
                      <td className="py-2 pr-2 text-muted-foreground">{r.rank}</td>
                      <td className="py-2 pr-2">
                        <div className="font-medium">{r.name}</div>
                        <div className="flex flex-wrap items-center gap-1 pt-1">
                          {r.vendor && (
                            <span className="text-xs text-muted-foreground">{r.vendor}</span>
                          )}
                          <Badge variant="outline" className="text-[10px]">
                            {confidenceLabel(r.confidence)}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {durabilityLabel(r.durability)}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-2 pr-2 text-right font-medium">
                        {formatCurrency(r.monthly)}
                      </td>
                      <td className="py-2 pr-2 text-right">{formatCurrency(r.annual)}</td>
                      <td className="py-2 pr-2 text-right">{formatCurrency(r.fiveYear)}</td>
                      <td className="py-2 pr-2">
                        {r.destinations.length === 0 ? (
                          <span className="text-xs text-muted-foreground">Not assigned</span>
                        ) : (
                          <div className="space-y-1">
                            {r.destinations.map((d) => (
                              <div key={d} className="text-xs">
                                {destinationLabel(d)}
                              </div>
                            ))}
                            {r.monthsSavedPerYear !== null && (
                              <div className="text-xs text-muted-foreground">
                                covers {r.monthsSavedPerYear.toFixed(1)} months of that goal a year
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-2 pr-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Progress value={r.share * 100} className="h-1.5 w-14" />
                          <span className="text-xs text-muted-foreground">
                            {Math.round(r.share * 100)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {ranking.rows.length > 10 && (
            <Button variant="outline" size="sm" onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Show top 10 only' : `Show all ${ranking.rows.length}`}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What happens if I keep these savings?</CardTitle>
          <CardDescription>
            Each goal you send freed cash to, followed out 12 months, 3 years and 5 years. Investing
            and reserve goals include growth; cash goals are plain contributions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Assigned each month" value={formatCurrency(scenarios.totalMonthly)} />
            {HORIZONS.map((h) => (
              <Stat
                key={h.key}
                label={`In ${h.label}`}
                value={formatCurrency(
                  h.key === 'year1'
                    ? scenarios.totalYear1
                    : h.key === 'year3'
                      ? scenarios.totalYear3
                      : scenarios.totalYear5,
                )}
              />
            ))}
          </div>

          {scenarios.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Assign your freed cash to a goal to see what it becomes over time.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-2">Goal</th>
                      <th className="py-2 pr-2 text-right">Per month</th>
                      <th className="py-2 pr-2 text-right">Growth used</th>
                      <th className="py-2 pr-2 text-right">12 months</th>
                      <th className="py-2 pr-2 text-right">3 years</th>
                      <th className="py-2 pr-2 text-right">5 years</th>
                      <th className="py-2 pr-2 text-right">Growth in 5 yrs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scenarios.rows.map((r) => (
                      <tr key={r.destination} className="border-b last:border-0">
                        <td className="py-2 pr-2 font-medium">{r.label}</td>
                        <td className="py-2 pr-2 text-right">{formatCurrency(r.monthly)}</td>
                        <td className="py-2 pr-2 text-right text-muted-foreground">
                          {(r.growthRate * 100).toFixed(0)}%
                        </td>
                        <td className="py-2 pr-2 text-right">{formatCurrency(r.year1)}</td>
                        <td className="py-2 pr-2 text-right">{formatCurrency(r.year3)}</td>
                        <td className="py-2 pr-2 text-right font-medium">
                          {formatCurrency(r.year5)}
                        </td>
                        <td className="py-2 pr-2 text-right text-muted-foreground">
                          {formatCurrency(r.fiveYearGrowth)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {scenarios.gapYear5 > 0 && (
                <div className="rounded-lg border border-dashed p-3 text-sm">
                  Only {formatCurrency(scenarios.executedMonthly)} a month has actually been moved so
                  far. If that does not change, you end up with{' '}
                  {formatCurrency(scenarios.executedYear5)} in five years instead of{' '}
                  {formatCurrency(scenarios.totalYear5)} — a gap of{' '}
                  <span className="font-medium">{formatCurrency(scenarios.gapYear5)}</span>.
                </div>
              )}
            </>
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
      <p className="pt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
