import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';
import SwingEdgeHeader from '@/components/swingedge/SwingEdgeHeader';
import HowToUse from '@/components/swingedge/HowToUse';
import { useTradingSettings, useTradingTitle } from '@/hooks/use-swingedge';
import { useTradeJournal } from '@/hooks/use-swingedge-lists';
import { rMultiple } from '@/lib/swingedge/performance';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

export default function Performance() {
  useTradingTitle('Performance Review');
  const { settings } = useTradingSettings();
  const { stats, closedTrades, mistakes, entries, isLoading } = useTradeJournal();

  const tiles = [
    {
      label: 'Closed trades',
      value: String(stats.trades),
      hint: 'Simulated trades with a recorded exit.',
      tone: 'text-foreground',
    },
    {
      label: 'Plan discipline',
      value: stats.disciplinePct === null ? '—' : `${stats.disciplinePct}%`,
      hint:
        stats.disciplinePct === null
          ? 'Answer the discipline question in your journal to score this.'
          : `Based on ${stats.disciplineAnswered} answered ${stats.disciplineAnswered === 1 ? 'trade' : 'trades'}.`,
      tone:
        stats.disciplinePct === null
          ? 'text-muted-foreground'
          : stats.disciplinePct >= 80
            ? 'text-prism-lime'
            : 'text-prism-amber',
    },
    {
      label: 'Average result per trade',
      value: money(stats.expectancy),
      hint: 'Total result divided by number of trades.',
      tone: stats.expectancy >= 0 ? 'text-prism-lime' : 'text-prism-rose',
    },
    {
      label: 'Average reward to risk',
      value: `${stats.averageR > 0 ? '+' : ''}${stats.averageR}R`,
      hint: 'Result measured against the risk you accepted at entry.',
      tone: stats.averageR >= 0 ? 'text-prism-lime' : 'text-prism-rose',
    },
    {
      label: 'Win rate',
      value: `${stats.winRatePct}%`,
      hint: `${stats.wins} winners, ${stats.losses} losers.`,
      tone: 'text-foreground',
    },
    {
      label: 'Total result',
      value: money(stats.totalPl),
      hint: 'Simulated only. No real money moved.',
      tone: stats.totalPl >= 0 ? 'text-prism-lime' : 'text-prism-rose',
    },
    {
      label: 'Worst drawdown',
      value: money(stats.maxDrawdown),
      hint: 'Largest drop from a high point in your simulated results.',
      tone: 'text-prism-rose',
    },
    {
      label: 'Average hold',
      value: `${stats.averageHoldDays} days`,
      hint: 'Entry to exit, across closed trades.',
      tone: 'text-foreground',
    },
  ];

  return (
    <div className="space-y-6">
      <SwingEdgeHeader
        title="Performance Review"
        subtitle="Judge the process first. Profit is the by-product."
        mode={settings.data_mode}
        right={
          <Button asChild variant="outline" size="sm">
            <Link to="/swingedge/journal">Trade Journal</Link>
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading your results…</p>
      ) : stats.trades === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nothing to review yet</CardTitle>
            <CardDescription>
              Close a paper trade and write it up in the journal. Once a few trades are recorded, this page
              shows your discipline score, reward to risk, drawdown and most common mistakes.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/swingedge/paper">Paper Trading</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/swingedge/journal">Trade Journal</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {tiles.map((t) => (
              <div key={t.label} className="rounded-xl border bg-card/50 p-4">
                <p className="text-xs text-muted-foreground">{t.label}</p>
                <p className={cn('mt-1 text-2xl font-bold tabular-nums', t.tone)}>{t.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t.hint}</p>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Plan discipline</CardTitle>
              <CardDescription>
                How often you honoured your own stop and target. This is the part you control.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={stats.disciplinePct ?? 0} className="h-3" />
              <p className="mt-2 text-sm text-muted-foreground">
                {stats.disciplinePct === null
                  ? 'No trades have the discipline question answered yet.'
                  : `${stats.disciplinePct}% of answered trades followed the plan. Good discipline in a losing month is a better sign than a lucky month with broken rules.`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Running result</CardTitle>
              <CardDescription>Cumulative simulated result, trade by trade.</CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.equityCurve}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                  <ChartTooltip formatter={(v: number) => money(v)} />
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Most common mistakes</CardTitle>
              <CardDescription>
                Taken from your journal tags. Pick exactly one to work on next month.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mistakes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No mistakes tagged yet across {entries.length}{' '}
                  {entries.length === 1 ? 'entry' : 'entries'}.
                </p>
              ) : (
                <ul className="space-y-2">
                  {mistakes.map((m) => (
                    <li key={m.tag} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                      <span>{m.tag}</span>
                      <Badge variant="secondary">
                        {m.count} {m.count === 1 ? 'time' : 'times'}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">The trades behind these numbers</CardTitle>
              <CardDescription>Every figure above traces back to these closed trades.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Entry</TableHead>
                    <TableHead>Exit</TableHead>
                    <TableHead className="text-right">Shares</TableHead>
                    <TableHead className="text-right">Result</TableHead>
                    <TableHead className="text-right">R</TableHead>
                    <TableHead>Plan followed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {closedTrades
                    .slice()
                    .reverse()
                    .map((t, i) => {
                      const r = rMultiple(t);
                      return (
                        <TableRow key={`${t.symbol}-${t.exitDate}-${i}`}>
                          <TableCell className="font-semibold">{t.symbol}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {t.entryDate} @ {money(t.entryPrice)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {t.exitDate} @ {money(t.exitPrice)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{t.shares}</TableCell>
                          <TableCell
                            className={cn(
                              'text-right font-semibold tabular-nums',
                              t.realizedPl >= 0 ? 'text-prism-lime' : 'text-prism-rose',
                            )}
                          >
                            {money(t.realizedPl)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {r === null ? '—' : `${r > 0 ? '+' : ''}${r}R`}
                          </TableCell>
                          <TableCell>
                            {t.rulesFollowed === null ? (
                              <span className="text-xs text-muted-foreground">Not answered</span>
                            ) : (
                              <Badge
                                variant="outline"
                                className={cn(
                                  'font-semibold',
                                  t.rulesFollowed
                                    ? 'border-prism-lime/50 text-prism-lime'
                                    : 'border-prism-rose/50 text-prism-rose',
                                )}
                              >
                                {t.rulesFollowed ? 'Yes' : 'No'}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <HowToUse
        steps={[
          'Review this once a month, not every day. Short stretches are mostly noise.',
          'Read the plan discipline score first: how often you honoured your own stop and target.',
          'Then read average reward to risk. Small losses and larger wins matter more than win rate.',
          'Open the mistake list and pick exactly one thing to work on next month.',
          'Use the trade table at the bottom to check any number that looks wrong.',
        ]}
        tips={[
          'Good discipline with a losing month beats a lucky month with broken rules.',
          'Every figure here comes from simulated trades only.',
        ]}
      />
    </div>
  );
}
