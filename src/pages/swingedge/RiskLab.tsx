// SwingEdge — Monte Carlo Risk Lab.
//
// Everything on this page is built from the household's own closed practice
// trades. Nothing is simulated from invented results: with no completed trades
// the page says so instead of showing a number.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import SwingEdgeHeader from '@/components/swingedge/SwingEdgeHeader';
import HowToUse from '@/components/swingedge/HowToUse';
import NextStepsCard from '@/components/swingedge/NextStepsCard';
import { useTradingSettings, useTradingTitle } from '@/hooks/use-swingedge';
import { useClosedRTrades } from '@/hooks/use-swingedge-risklab';
import {
  runMonteCarlo,
  riskSizingComparison,
  ruinDefinition,
  RISK_SIZING_LEVELS,
} from '@/lib/swingedge/monteCarlo';
import {
  expectancy,
  expectancyBy,
  expectancyNearVsOutsideEarnings,
} from '@/lib/swingedge/expectancy';
import { outlierDependence } from '@/lib/swingedge/outlierDependence';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const r1 = (n: number) => `${Math.round(n * 10) / 10}`;
const pct = (n: number) => `${Math.round(n * 10) / 10}%`;

export default function RiskLab() {
  useTradingTitle('Monte Carlo Risk Lab');
  const { settings } = useTradingSettings();
  const { trades, isLoading } = useClosedRTrades();

  const [tradesPerRun, setTradesPerRun] = useState(100);
  const [riskPct, setRiskPct] = useState(settings.risk_per_trade_pct ?? 1);
  const [useBlocks, setUseBlocks] = useState(true);

  const rMultiples = useMemo(() => trades.map((t) => t.r), [trades]);
  const hasData = rMultiples.length >= 10;

  const base = useMemo(
    () => ({
      rMultiples,
      startingCapital: settings.trading_capital ?? 10000,
      tradesPerRun,
      runs: 10_000,
      mode: useBlocks ? ('BLOCK_BOOTSTRAP' as const) : ('SIMPLE' as const),
      ruin: ruinDefinition('DECLINE_30'),
      seed: 20260913,
    }),
    [rMultiples, settings.trading_capital, tradesPerRun, useBlocks],
  );

  const sim = useMemo(() => (hasData ? runMonteCarlo({ ...base, riskPerTradePct: riskPct }) : null), [base, hasData, riskPct]);
  const sizing = useMemo(() => (hasData ? riskSizingComparison(base, [...RISK_SIZING_LEVELS]) : null), [base, hasData]);
  const overall = useMemo(() => expectancy(trades), [trades]);
  const outliers = useMemo(() => outlierDependence(trades), [trades]);
  const bySetup = useMemo(() => expectancyBy(trades, 'setupType'), [trades]);
  const byEvent = useMemo(() => expectancyBy(trades, 'eventRiskBand'), [trades]);
  const earningsSplit = useMemo(() => expectancyNearVsOutsideEarnings(trades), [trades]);

  return (
    <div className="space-y-6">
      <SwingEdgeHeader
        title="Monte Carlo Risk Lab"
        subtitle="What your own results imply about drawdowns, losing streaks and position size — before the next trade, not after."
        mode={settings.data_mode}
      />

      <HowToUse
        title="How to use the Risk Lab"
        steps={[
          'The lab replays your closed practice trades in random order 10,000 times.',
          'Read the drawdown and losing-streak numbers first. They are what actually ends accounts.',
          'Change the risk per trade to see how much deeper the hole gets before the balance improves.',
          'Fewer than about 30 closed trades means treat every number here as a rough sketch.',
        ]}
      />

      {isLoading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">Loading your closed trades…</CardContent>
        </Card>
      ) : !hasData ? (
        <Card>
          <CardHeader>
            <CardTitle>Not enough completed trades yet</CardTitle>
            <CardDescription>
              The lab needs at least 10 closed practice trades with a recorded planned risk. You have {rMultiples.length}.
              Nothing is estimated in the meantime.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to="/swingedge/paper-trading">Open Paper Trading</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Simulation settings</CardTitle>
                <CardDescription>
                  Built from {rMultiples.length} closed {rMultiples.length === 1 ? 'trade' : 'trades'} · {sim?.qualityLabel}
                </CardDescription>
              </div>
              <Badge variant="outline">{sim?.modeLabel}</Badge>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Trades per run: {tradesPerRun}</Label>
                <Slider value={[tradesPerRun]} min={20} max={300} step={10} onValueChange={(v) => setTradesPerRun(v[0])} />
              </div>
              <div className="space-y-2">
                <Label>Risk per trade: {pct(riskPct)}</Label>
                <Slider value={[riskPct]} min={0.25} max={3} step={0.25} onValueChange={(v) => setRiskPct(v[0])} />
              </div>
              <div className="flex items-start gap-3">
                <Switch id="blocks" checked={useBlocks} onCheckedChange={setUseBlocks} />
                <div>
                  <Label htmlFor="blocks">Keep win and loss clusters</Label>
                  <p className="text-xs text-muted-foreground">
                    Draws short runs of consecutive results, so real streaks survive the shuffle.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {sim && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Median ending balance', value: money(sim.medianEnding), hint: `10th ${money(sim.p10Ending)} · 90th ${money(sim.p90Ending)}` },
                { label: 'Chance of finishing ahead', value: pct(sim.probabilityOfProfitPct), hint: `Over ${tradesPerRun} trades.` },
                { label: 'Typical worst drawdown', value: pct(sim.medianMaxDrawdownPct), hint: `Worst 5% of runs: ${pct(sim.worst5PctDrawdownPct)}` },
                { label: 'Longest losing streak', value: `${sim.medianLongestLosingStreak} in a row`, hint: `Worst seen: ${sim.longestLosingStreak} in a row.` },
              ].map((t) => (
                <Card key={t.label}>
                  <CardContent className="space-y-1 p-5">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{t.label}</p>
                    <p className="text-2xl font-semibold">{t.value}</p>
                    <p className="text-xs text-muted-foreground">{t.hint}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {sim && (
            <Card>
              <CardHeader>
                <CardTitle>Depth of the hole</CardTitle>
                <CardDescription>{sim.ruinLabel} · {sim.qualityText}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                <div><p className="text-muted-foreground">Down 10% at some point</p><p className="text-lg font-semibold">{pct(sim.probability10PctDrawdown)}</p></div>
                <div><p className="text-muted-foreground">Down 20% at some point</p><p className="text-lg font-semibold">{pct(sim.probability20PctDrawdown)}</p></div>
                <div><p className="text-muted-foreground">Down 30% at some point</p><p className="text-lg font-semibold">{pct(sim.probability30PctDrawdown)}</p></div>
                <div><p className="text-muted-foreground">Risk of ruin</p><p className="text-lg font-semibold">{pct(sim.riskOfRuinPct)}</p></div>
                <ul className="sm:col-span-2 lg:col-span-4 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  {sim.assumptions.map((a) => <li key={a}>{a}</li>)}
                </ul>
              </CardContent>
            </Card>
          )}

          {sizing && (
            <Card>
              <CardHeader>
                <CardTitle>Position size trade-off</CardTitle>
                <CardDescription>{sizing.lesson}</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Risk per trade</TableHead>
                      <TableHead className="text-right">Median balance</TableHead>
                      <TableHead className="text-right">Typical drawdown</TableHead>
                      <TableHead className="text-right">Worst 5% drawdown</TableHead>
                      <TableHead className="text-right">Down 20%</TableHead>
                      <TableHead className="text-right">Losing streak</TableHead>
                      <TableHead className="text-right">Risk of ruin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sizing.rows.map((row) => (
                      <TableRow key={row.riskPerTradePct} className={row.riskPerTradePct === riskPct ? 'bg-muted/50' : undefined}>
                        <TableCell className="font-medium">{pct(row.riskPerTradePct)}</TableCell>
                        <TableCell className="text-right">{money(row.medianEnding)}</TableCell>
                        <TableCell className="text-right">{pct(row.medianMaxDrawdownPct)}</TableCell>
                        <TableCell className="text-right">{pct(row.worst5PctDrawdownPct)}</TableCell>
                        <TableCell className="text-right">{pct(row.probability20PctDrawdown)}</TableCell>
                        <TableCell className="text-right">{row.longestLosingStreak} in a row</TableCell>
                        <TableCell className="text-right">{pct(row.riskOfRuinPct)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>What each trade has been worth</CardTitle>
                <CardDescription>{overall.detail}</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Per trade</p><p className="text-lg font-semibold">{r1(overall.expectancyR)}R</p></div>
                <div><p className="text-muted-foreground">Win rate</p><p className="text-lg font-semibold">{pct(overall.winRatePct)}</p></div>
                <div><p className="text-muted-foreground">Average winner</p><p className="text-lg font-semibold">{r1(overall.averageWinR)}R</p></div>
                <div><p className="text-muted-foreground">Average loser</p><p className="text-lg font-semibold">{r1(overall.averageLossR)}R</p></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Is it a few lucky trades?</CardTitle>
                <CardDescription>{outliers.headline}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {outliers.lines.map((l) => <li key={l}>{l}</li>)}
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Results around events</CardTitle>
              <CardDescription>
                Only trades with a recorded event risk level appear here. Older trades logged before event tracking show as
                unclassified.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">Held through an earnings date</p>
                  <p className="text-2xl font-semibold">{earningsSplit.near.trades ? `${r1(earningsSplit.near.expectancyR)}R` : '—'}</p>
                  <p className="text-xs text-muted-foreground">{earningsSplit.near.detail}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">Clear of earnings</p>
                  <p className="text-2xl font-semibold">{earningsSplit.outside.trades ? `${r1(earningsSplit.outside.expectancyR)}R` : '—'}</p>
                  <p className="text-xs text-muted-foreground">{earningsSplit.outside.detail}</p>
                </div>
              </div>

              {[
                { title: 'By event risk level', rows: byEvent },
                { title: 'By setup', rows: bySetup },
              ].map((group) => (
                <div key={group.title} className="space-y-2">
                  <p className="text-sm font-medium">{group.title}</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{group.title.replace('By ', '')}</TableHead>
                        <TableHead className="text-right">Trades</TableHead>
                        <TableHead className="text-right">Per trade</TableHead>
                        <TableHead className="text-right">Win rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.rows.map((s) => (
                        <TableRow key={s.key}>
                          <TableCell className="font-medium">{s.label}</TableCell>
                          <TableCell className="text-right">{s.result.trades}</TableCell>
                          <TableCell className="text-right">{r1(s.result.expectancyR)}R</TableCell>
                          <TableCell className="text-right">{pct(s.result.winRatePct)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      <p className="text-xs text-muted-foreground">
        The Risk Lab replays results you already produced. It does not predict the future, it is not investment advice, and a
        good simulation is never permission to trade real money.
      </p>

      <NextStepsCard
        summary="You have seen how deep the drawdowns get at this position size. Now decide the size you can actually sit through."
        steps={[
          { label: 'Log more closed practice trades to sharpen every number here', to: '/swingedge/paper-trading', cta: 'Open Paper Trading' },
          { label: 'See what the record says about your process', to: '/swingedge/performance', cta: 'Open Performance' },
        ]}
      />
    </div>
  );
}
