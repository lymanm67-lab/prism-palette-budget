import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, ArrowRight, CheckCircle2, Info, ShieldCheck, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import SwingEdgeHeader from '@/components/swingedge/SwingEdgeHeader';
import HowToUse from '@/components/swingedge/HowToUse';
import WatchlistDashboardCard from '@/components/swingedge/WatchlistDashboardCard';
import CollapsibleSection from '@/components/swingedge/CollapsibleSection';

import { useSwingEdgeDashboard, useTradingSettings, useTradingTitle } from '@/hooks/use-swingedge';
import type { MarketCondition, TrendState } from '@/lib/swingedge/types';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

const CONDITION_TONE: Record<MarketCondition, string> = {
  BULLISH: 'border-prism-lime/50 bg-prism-lime/10 text-prism-lime',
  NEUTRAL: 'border-muted-foreground/40 bg-muted/40 text-muted-foreground',
  CAUTIOUS: 'border-prism-amber/50 bg-prism-amber/10 text-prism-amber',
};

const TREND_TONE: Record<TrendState, string> = {
  UP: 'text-prism-lime',
  DOWN: 'text-prism-rose',
  SIDEWAYS: 'text-muted-foreground',
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 18) return 'Good Afternoon';
  return 'Good Evening';
}

export default function SwingEdgeDashboard() {
  useTradingTitle('Trading Command Center');
  const { data, isLoading, mode, cacheState } = useSwingEdgeDashboard();
  const { settings, risk, maxRiskPerTrade } = useTradingSettings();

  return (
    <div className="space-y-4">
      <SwingEdgeHeader
        title={`${greeting()} — Your Trading Command Center`}
        subtitle="SwingEdge Analyzer: find the setup, define the risk, trade the plan."
        mode={mode}
        cacheState={cacheState}
        fetchedAt={data?.fetchedAt ?? null}
        right={
          <Button asChild variant="outline" size="sm">
            <Link to="/swingedge/settings">Market data settings</Link>
          </Button>
        }
      />

      {mode === 'DEMO' ? (
        <Alert className="border-prism-amber/40">
          <Info className="h-4 w-4" />
          <AlertTitle>Demo data</AlertTitle>
          <AlertDescription>
            Everything below runs on clearly labelled sample data so you can learn the workflow before
            connecting live market data. Nothing here is a real market price.
          </AlertDescription>
        </Alert>
      ) : null}

      {data?.notice ? (
        <Alert className="border-prism-sky/40">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Using cached data</AlertTitle>
          <AlertDescription>{data.notice}</AlertDescription>
        </Alert>
      ) : null}

      {/* Market overview */}
      <CollapsibleSection
        id="dash-market-overview"
        title="Market overview"
        description="The indexes that set the tone for every long swing trade."
      >
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-44 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {(data?.readings ?? []).map((r) => (
              <div key={r.symbol} className="overflow-hidden rounded-lg border bg-card/50">
                <div className="flex items-center justify-between px-4 pt-3">
                  <span className="text-lg font-semibold">{r.symbol}</span>
                  <Badge variant="outline" className={cn('font-semibold', TREND_TONE[r.trend])}>
                    {r.trend}
                  </Badge>
                </div>
                <div className="space-y-2 px-4 pb-4 pt-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold tabular-nums">{money(r.price)}</span>
                    <span
                      className={cn(
                        'text-sm font-semibold tabular-nums',
                        r.change >= 0 ? 'text-prism-lime' : 'text-prism-rose',
                      )}
                    >
                      {r.change >= 0 ? '+' : ''}
                      {r.change.toFixed(2)} ({r.changePercent.toFixed(2)}%)
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <dt>20 EMA</dt>
                      <dd className="tabular-nums text-foreground">{r.ema20?.toFixed(2) ?? '—'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>50 SMA</dt>
                      <dd className="tabular-nums text-foreground">{r.sma50?.toFixed(2) ?? '—'}</dd>
                    </div>
                    <div className="col-span-2 flex justify-between">
                      <dt>Volume</dt>
                      <dd className="text-foreground">{r.volume}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Market condition with a Why? */}
      <CollapsibleSection
        id="dash-market-condition"
        title="Market Condition"
        description="What conditions are right now — never a forecast of what the market will do."
        headerRight={
          data ? (
            <Badge variant="outline" className={cn('px-3 py-1 text-sm font-bold', CONDITION_TONE[data.condition.condition])}>
              {data.condition.condition}
            </Badge>
          ) : null
        }
      >
        {isLoading || !data ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <>
            <p className="text-sm">{data.condition.summary}</p>
            <Accordion type="single" collapsible className="mt-2">
              <AccordionItem value="why" className="border-b-0">
                <AccordionTrigger className="py-2 text-sm font-semibold">Why?</AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-1.5">
                    {data.condition.checks.map((c) => (
                      <li key={c.label} className="flex items-start gap-2 text-sm">
                        {c.passed ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-prism-lime" />
                        ) : (
                          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-prism-rose" />
                        )}
                        <span>
                          {c.label}
                          <span className="block text-xs text-muted-foreground">{c.detail}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {data.condition.checks.filter((c) => c.passed).length} of {data.condition.checks.length}{' '}
                    checks pass. Two thirds or more reads bullish, one third or fewer reads cautious.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </>
        )}
      </CollapsibleSection>

      {/* Risk envelope — the trading capital firewall */}
      <CollapsibleSection
        id="dash-risk-envelope"
        title={
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-prism-teal" />
            Your trading risk envelope
          </span>
        }
        description="Separate from your retirement, emergency fund, HSA and long-term investments. Trading capital is money you have already decided to allocate to trading."
      >
        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {[
            { label: 'Trading account', value: money(settings.trading_capital) },
            { label: 'Risk per trade', value: `${settings.risk_per_trade_pct}%` },
            { label: 'Max risk per trade', value: money(maxRiskPerTrade) },
            { label: 'Current open risk', value: money(risk.openRisk) },
            {
              label: 'Risk remaining',
              value: money(risk.riskRemaining),
              tone: risk.overLimit ? 'text-prism-rose' : 'text-prism-lime',
            },
          ].map((t) => (
            <div key={t.label} className="rounded-lg border bg-card/50 p-3">
              <p className="text-xs text-muted-foreground">{t.label}</p>
              <p className={cn('mt-1 text-lg font-bold tabular-nums', t.tone)}>{t.value}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Maximum portfolio risk is {settings.max_portfolio_risk_pct}% of trading capital, or{' '}
          {money(risk.maxPortfolioRisk)}.
        </p>
      </CollapsibleSection>

      {/* Watchlist */}
      <CollapsibleSection
        id="dash-watchlist"
        title="Your watchlist"
        description="Your symbols with live scores and verdicts."
      >
        <WatchlistDashboardCard />
      </CollapsibleSection>

      {/* The loop */}
      <CollapsibleSection
        id="dash-the-loop"
        title="The loop this app teaches"
        description="Every setup must answer two questions: why does it qualify, and what would prove it wrong?"
        defaultOpen={false}
      >
        <div className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm font-semibold">
          {['Find', 'Understand', 'Plan', 'Risk', 'Trade', 'Review', 'Improve'].map((step, i, arr) => (
            <span key={step} className="flex items-center gap-1">
              <span className="rounded-md border bg-muted/40 px-2 py-1">{step}</span>
              {i < arr.length - 1 ? <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /> : null}
            </span>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/swingedge/scanner">Market Scanner</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/swingedge/analyzer">Analyzer</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/swingedge/planner">Trade Planner</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/swingedge/academy">Trading Academy</Link>
          </Button>
        </div>
      </CollapsibleSection>

      <HowToUse
        id="dash-how-to"
        title="How to use SwingEdge, step by step"
        description="This is the routine the whole section is built around. Each screen also has its own instructions."
        steps={[
          'Start here on the dashboard and read the market condition. A weak market means fewer trades, smaller size, or none at all.',
          'Open Watchlists and build a short list of names you actually follow.',
          'Run the Market Scanner against that list. Keep only the QUALIFIES and WATCH rows.',
          'Open the best one or two in the Stock Analyzer and read the trend, setup and the price that would prove the idea wrong.',
          'Use the Trade Planner to set your own entry, stop and target. It works out your share count and dollar risk.',
          'Open the plan in Paper Trading and manage it to the exit — no real money, no orders.',
          'Write up what happened in the Trade Journal, then review the month in Performance Review.',
          'Fill any gaps in your understanding in the Trading Academy, and set your trading capital and risk limits in Trading Settings.',
        ]}
        tips={[
          'Never look at a setup without also looking at its risk. Every screen shows both.',
          'Scanner numbers are estimates. Only the Trade Planner produces numbers you should act on.',
          'Trading capital is kept separate from your retirement, HSA, emergency fund and long-term investments.',
        ]}
      />

      <p className="text-xs text-muted-foreground">
        SwingEdge Analyzer is educational software for planning and paper trading only. It places no orders,
        gives no investment advice, and makes no claim about future results. Long stock and ETF swing trades
        only — no options, short selling, margin or leverage.
      </p>
    </div>
  );
}
