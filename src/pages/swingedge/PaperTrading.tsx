import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, ArrowRight, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import SwingEdgeHeader from '@/components/swingedge/SwingEdgeHeader';
import HowToUse from '@/components/swingedge/HowToUse';
import CollapsibleSection from '@/components/swingedge/CollapsibleSection';
import { GapRiskCard, StopRuleCard } from '@/components/swingedge/RiskFirstCard';
import { useTradingSettings, useTradingTitle } from '@/hooks/use-swingedge';
import {
  EXIT_REASONS,
  usePaperTradeManagement,
  type ManagedTrade,
} from '@/hooks/use-swingedge-stops';
import {
  BREAKEVEN_TRIGGERS,
  EARNINGS_UNKNOWN_TEXT,
  STOP_MOVE_REASONS,
  assessStopChange,
  checkPortfolioRisk,
  rFromRisk,
  trailingSuggestions,
} from '@/lib/swingedge/stops';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

const signed = (n: number) => `${n > 0 ? '+' : ''}${money(n)}`;

function Cell({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('text-sm font-semibold tabular-nums', tone)}>{value}</p>
    </div>
  );
}

function TradeRow({
  trade,
  price,
  ema20,
  atrValue,
  swingLow,
}: {
  trade: ManagedTrade;
  price: number | null;
  ema20: number | null;
  atrValue: number | null;
  swingLow: number | null;
}) {
  const { moveStop, closeTrade, modifications, isSaving } = usePaperTradeManagement();
  const [newStop, setNewStop] = useState('');
  const [reason, setReason] = useState<string>(STOP_MOVE_REASONS[0]);
  const [trigger, setTrigger] = useState<string>(BREAKEVEN_TRIGGERS[0]);
  const [exitPrice, setExitPrice] = useState('');
  const [exitReason, setExitReason] = useState<string>(EXIT_REASONS[0]);

  const originalRisk = trade.original_risk ?? trade.initial_dollar_risk ?? null;
  const currentRisk = Math.max(0, trade.entry_price - trade.stop_price) * trade.shares;
  const unrealized = price === null ? null : (price - trade.entry_price) * trade.shares;
  const currentR = unrealized === null ? null : rFromRisk(originalRisk, unrealized);
  const daysHeld = Math.max(
    0,
    Math.round((Date.now() - new Date(trade.entry_date).getTime()) / 86_400_000),
  );

  const proposed = Number(newStop) || 0;
  const change = proposed > 0 ? assessStopChange({
    entry: trade.entry_price,
    oldStop: trade.stop_price,
    newStop: proposed,
    shares: trade.shares,
    originalRisk,
  }) : null;

  const trails = useMemo(
    () =>
      price === null
        ? []
        : trailingSuggestions({
            currentPrice: price,
            currentStop: trade.stop_price,
            swingLow,
            ema20,
            atrValue,
          }),
    [price, trade.stop_price, swingLow, ema20, atrValue],
  );

  const history = modifications.filter((m) => m.paper_trade_id === trade.id);

  const applyStop = async () => {
    if (!change || proposed <= 0) {
      toast.error('Enter a new stop first');
      return;
    }
    if (proposed >= trade.entry_price && exitReason !== 'x') {
      // A stop above entry is allowed (locked-in profit), only warn about nonsense.
      if (price !== null && proposed >= price) {
        toast.error('That stop is at or above the current price, so the trade would exit immediately');
        return;
      }
    }
    try {
      await moveStop({
        trade,
        newStop: proposed,
        reason,
        riskBefore: change.riskBefore,
        riskAfter: change.riskAfter,
        widened: change.widened,
        breakevenTrigger: proposed === trade.entry_price ? trigger : null,
      });
      toast.success(change.widened ? 'Stop widened and logged' : 'Stop moved up and logged');
      setNewStop('');
    } catch {
      toast.error('Could not update that stop');
    }
  };

  const close = async () => {
    const p = Number(exitPrice);
    if (!(p > 0)) {
      toast.error('Enter the exit price');
      return;
    }
    try {
      await closeTrade({ trade, exitPrice: p, reason: exitReason });
      toast.success('Trade closed — write the journal entry next');
    } catch {
      toast.error('Could not close that trade');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          {trade.symbol}
          <Badge variant="secondary" className="text-[10px]">
            {trade.setup_type ?? 'SWING'}
          </Badge>
          {trade.stop_strategy ? (
            <Badge variant="outline" className="text-[10px]">
              {trade.stop_strategy} stop
            </Badge>
          ) : null}
          <span className="text-xs font-normal text-muted-foreground">{daysHeld} days held</span>
        </CardTitle>
        {trade.invalidation ? (
          <CardDescription>Invalidation thesis: {trade.invalidation}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <Cell label="Current price" value={price === null ? '—' : money(price)} />
          <Cell label="Entry" value={money(trade.entry_price)} />
          <Cell
            label="Original stop"
            value={trade.original_stop === null ? money(trade.stop_price) : money(trade.original_stop)}
          />
          <Cell label="Current stop" value={money(trade.stop_price)} />
          <Cell label="Target" value={money(trade.target_price)} />
          <Cell label="Shares" value={String(trade.shares)} />
          <Cell
            label="Unrealised P/L"
            value={unrealized === null ? '—' : signed(unrealized)}
            tone={unrealized === null ? undefined : unrealized >= 0 ? 'text-prism-lime' : 'text-destructive'}
          />
          <Cell
            label="Current R"
            value={currentR === null ? '—' : `${currentR > 0 ? '+' : ''}${currentR}R`}
            tone={currentR === null ? undefined : currentR >= 0 ? 'text-prism-lime' : 'text-destructive'}
          />
          <Cell label="Original risk" value={originalRisk === null ? '—' : money(originalRisk)} />
          <Cell label="Current risk" value={money(Math.round(currentRisk * 100) / 100)} />
          <Cell
            label="Distance to stop"
            value={price === null ? '—' : money(Math.round((price - trade.stop_price) * 100) / 100)}
          />
          <Cell
            label="Distance to target"
            value={price === null ? '—' : money(Math.round((trade.target_price - price) * 100) / 100)}
          />
        </div>

        <div className="rounded-lg border p-3">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Lock className="h-3.5 w-3.5" /> Locked plan values
          </p>
          <p className="text-xs text-muted-foreground">
            Original stop {trade.original_stop === null ? '—' : money(trade.original_stop)} · original target{' '}
            {trade.original_target === null ? '—' : money(trade.original_target)} · original shares{' '}
            {trade.original_shares ?? trade.shares} · original risk {originalRisk === null ? '—' : money(originalRisk)}
          </p>
        </div>

        <CollapsibleSection id={`stop-mgmt-${trade.id}`} title="Manage the stop" defaultOpen={false}>
          <div className="space-y-3">
            {trails.length ? (
              <div className="flex flex-wrap gap-2">
                {trails.map((t) => (
                  <Button key={t.method} variant="outline" size="sm" onClick={() => setNewStop(t.stop.toFixed(2))}>
                    {t.label} → {money(t.stop)}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No trailing stop is available yet — a trailing stop can only move the stop upward.
              </p>
            )}
            {trails.length ? (
              <p className="text-xs text-muted-foreground">{trails[0].explanation}</p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor={`stop-${trade.id}`}>New stop</Label>
                <Input
                  id={`stop-${trade.id}`}
                  value={newStop}
                  onChange={(e) => setNewStop(e.target.value)}
                  inputMode="decimal"
                />
              </div>
              <div>
                <Label>Reason</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STOP_MOVE_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Breakeven trigger (if moving to entry)</Label>
                <Select value={trigger} onValueChange={setTrigger}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BREAKEVEN_TRIGGERS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setNewStop(trade.entry_price.toFixed(2))}>
                Move stop to breakeven
              </Button>
              <Button size="sm" onClick={applyStop} disabled={isSaving}>
                Apply stop change
              </Button>
            </div>

            {change && change.direction !== 'NONE' ? (
              <Alert
                className={change.widened ? undefined : 'border-prism-lime/40'}
                variant={change.widened ? 'destructive' : 'default'}
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>
                  {change.widened ? 'STOP-WIDENING WARNING' : 'Risk reduced'}
                </AlertTitle>
                <AlertDescription>
                  Original risk {money(change.riskBefore)} → new risk {money(change.riskAfter)} (
                  {change.riskChange > 0 ? '+' : ''}
                  {money(change.riskChange)}, {change.riskChangePct}%
                  {change.rImpact === null ? '' : `, ${change.rImpact > 0 ? '+' : ''}${change.rImpact}R impact`}).
                  {change.widened ? ` ${change.warning} A strategy reason is required and is stored in the journal.` : ''}
                </AlertDescription>
              </Alert>
            ) : null}

            {history.length ? (
              <div className="space-y-1">
                <p className="text-sm font-semibold">STOP MANAGEMENT HISTORY</p>
                {history.map((m) => (
                  <p key={m.id} className="text-xs text-muted-foreground">
                    {new Date(m.created_at).toLocaleString()} · {money(m.old_stop)} → {money(m.new_stop)} ·{' '}
                    {m.widened ? 'widened' : 'tightened'} · risk {money(m.risk_before ?? 0)} →{' '}
                    {money(m.risk_after ?? 0)} · {m.reason}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        </CollapsibleSection>

        <CollapsibleSection id={`exit-${trade.id}`} title="Close this trade" defaultOpen={false}>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor={`exit-price-${trade.id}`}>Exit price</Label>
              <Input
                id={`exit-price-${trade.id}`}
                value={exitPrice}
                onChange={(e) => setExitPrice(e.target.value)}
                inputMode="decimal"
              />
            </div>
            <div>
              <Label>Reason</Label>
              <Select value={exitReason} onValueChange={setExitReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXIT_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={close} disabled={isSaving}>
                Close trade
              </Button>
            </div>
          </div>
        </CollapsibleSection>
      </CardContent>
    </Card>
  );
}

export default function PaperTrading() {
  useTradingTitle('Paper Trading');
  const { settings } = useTradingSettings();
  const { openTrades, closedTrades, prices, openRisk, unrealized, realized, isLoading } =
    usePaperTradeManagement();

  const portfolio = checkPortfolioRisk({
    tradingCapital: settings.trading_capital,
    maxPortfolioRiskPct: settings.max_portfolio_risk_pct,
    openRisk,
    newTradeRisk: 0,
  });

  return (
    <div className="space-y-6">
      <SwingEdgeHeader
        title="Paper Trading"
        subtitle="Practice with no real money and no orders sent anywhere. Nothing here places a real trade."
        mode={settings.data_mode}
        right={
          <Button asChild variant="outline" size="sm">
            <Link to="/swingedge/planner">
              Plan a trade
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Risk dashboard</CardTitle>
          <CardDescription>
            Account {money(settings.trading_capital)} · risk per trade {settings.risk_per_trade_pct}% · maximum
            portfolio risk {settings.max_portfolio_risk_pct}%
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <Cell label="Open positions" value={String(openTrades.length)} />
          <Cell label="Total open risk" value={money(openRisk)} />
          <Cell
            label="Risk remaining"
            value={money(Math.round((portfolio.maxTotalOpenRisk - openRisk) * 100) / 100)}
            tone={openRisk > portfolio.maxTotalOpenRisk ? 'text-destructive' : undefined}
          />
          <Cell label="Maximum total open risk" value={money(portfolio.maxTotalOpenRisk)} />
          <Cell
            label="Unrealised P/L"
            value={signed(unrealized)}
            tone={unrealized >= 0 ? 'text-prism-lime' : 'text-destructive'}
          />
          <Cell
            label="Realised P/L"
            value={signed(realized)}
            tone={realized >= 0 ? 'text-prism-lime' : 'text-destructive'}
          />
        </CardContent>
      </Card>

      <StopRuleCard />
      <GapRiskCard earningsNote={EARNINGS_UNKNOWN_TEXT} />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading your paper trades…</p>
      ) : openTrades.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No open paper trades. Save a plan in the Trade Planner, then open it here — the planned entry, stop,
            target, shares and risk are locked in when you do.
          </CardContent>
        </Card>
      ) : (
        openTrades.map((t) => (
          <TradeRow
            key={t.id}
            trade={t}
            price={prices[t.symbol]?.price ?? null}
            ema20={prices[t.symbol]?.ema20 ?? null}
            atrValue={prices[t.symbol]?.atr ?? null}
            swingLow={prices[t.symbol]?.swingLow ?? null}
          />
        ))
      )}

      {closedTrades.length ? (
        <CollapsibleSection id="paper-closed" title={`Closed trades (${closedTrades.length})`} defaultOpen={false}>
          <div className="space-y-2">
            {closedTrades.slice(0, 20).map((t) => {
              const r = rFromRisk(t.original_risk ?? t.initial_dollar_risk, t.realized_pl ?? 0);
              return (
                <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2 text-sm">
                  <span className="font-semibold">{t.symbol}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.entry_date} → {t.exit_date} · {t.exit_reason ?? 'no reason recorded'}
                  </span>
                  <span
                    className={cn(
                      'font-semibold tabular-nums',
                      (t.realized_pl ?? 0) >= 0 ? 'text-prism-lime' : 'text-destructive',
                    )}
                  >
                    {signed(t.realized_pl ?? 0)}
                    {r === null ? '' : ` · ${r > 0 ? '+' : ''}${r}R`}
                  </span>
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/swingedge/journal">Journal it</Link>
                  </Button>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      ) : null}

      <HowToUse
        id="paper-how-to"
        steps={[
          'Open a simulated position from a saved plan rather than typing a new idea here.',
          'Check the open risk total after opening it. That is what you would lose if every stop were hit.',
          'Each day, look at distance to stop and distance to target instead of the profit figure alone.',
          'Move a stop up only when structure allows it. Widening a stop is logged and warned about every time.',
          'When you exit, record the reason, then write the journal entry.',
        ]}
        tips={[
          'Nothing here places, routes or transmits a real order.',
          'Moving a stop further away is the most common way practice accounts lose money. It is logged permanently.',
        ]}
      />
    </div>
  );
}
