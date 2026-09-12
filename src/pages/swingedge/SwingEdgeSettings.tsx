import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, CheckCircle2, FlaskConical, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { lastUpdatedLabel } from '@/lib/swingedge/cache';
import { useConnectionTest, useTradingSettings, useTradingTitle } from '@/hooks/use-swingedge';
import type { ConnectionStatus, DataMode } from '@/lib/swingedge/types';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

const STATUS_TONE: Record<ConnectionStatus, string> = {
  CONNECTED: 'border-prism-lime/50 text-prism-lime',
  NOT_CONNECTED: 'border-muted-foreground/40 text-muted-foreground',
  RATE_LIMITED: 'border-prism-amber/50 text-prism-amber',
  ERROR: 'border-prism-rose/50 text-prism-rose',
  DEMO_MODE: 'border-prism-amber/50 text-prism-amber',
};

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  CONNECTED: 'CONNECTED',
  NOT_CONNECTED: 'NOT CONNECTED',
  RATE_LIMITED: 'RATE LIMITED',
  ERROR: 'ERROR',
  DEMO_MODE: 'DEMO MODE',
};

export default function SwingEdgeSettings() {
  useTradingTitle('Market data & risk settings');
  const { settings, status, risk, maxRiskPerTrade, save, isSaving, refetchStatus } = useTradingSettings();
  const { testing, run } = useConnectionTest();

  const [capital, setCapital] = useState(String(settings.trading_capital));
  const [riskPct, setRiskPct] = useState(String(settings.risk_per_trade_pct));
  const [portfolioPct, setPortfolioPct] = useState(String(settings.max_portfolio_risk_pct));
  const [sectorCapital, setSectorCapital] = useState(
    String(settings.max_sector_capital_exposure_pct),
  );
  const [sectorHeat, setSectorHeat] = useState(String(settings.max_sector_heat_pct));
  const [correlatedRisk, setCorrelatedRisk] = useState(String(settings.max_correlated_risk_pct));
  const [lookback, setLookback] = useState(String(settings.correlation_lookback_days));
  const [minuteLimit, setMinuteLimit] = useState(String(settings.api_minute_limit));
  const [dailyLimit, setDailyLimit] = useState(String(settings.api_daily_limit));

  useEffect(() => {
    setCapital(String(settings.trading_capital));
    setRiskPct(String(settings.risk_per_trade_pct));
    setPortfolioPct(String(settings.max_portfolio_risk_pct));
    setSectorCapital(String(settings.max_sector_capital_exposure_pct));
    setSectorHeat(String(settings.max_sector_heat_pct));
    setCorrelatedRisk(String(settings.max_correlated_risk_pct));
    setLookback(String(settings.correlation_lookback_days));
    setMinuteLimit(String(settings.api_minute_limit));
    setDailyLimit(String(settings.api_daily_limit));
  }, [
    settings.trading_capital,
    settings.risk_per_trade_pct,
    settings.max_portfolio_risk_pct,
    settings.max_sector_capital_exposure_pct,
    settings.max_sector_heat_pct,
    settings.max_correlated_risk_pct,
    settings.correlation_lookback_days,
    settings.api_minute_limit,
    settings.api_daily_limit,
  ]);

  const connection: ConnectionStatus =
    settings.data_mode === 'DEMO'
      ? 'DEMO_MODE'
      : ((status?.connection_status as ConnectionStatus) ?? 'NOT_CONNECTED');

  const minuteUsed = status?.minute_requests ?? 0;
  const dayUsed = status?.day_requests ?? 0;

  const setMode = async (mode: DataMode) => {
    await save({ data_mode: mode });
    toast.success(
      mode === 'DEMO'
        ? 'Now using demo data.'
        : mode === 'CACHED'
          ? 'Now using cached data only — no new market data requests.'
          : 'Now using live market data.',
    );
  };

  const saveRisk = async () => {
    const c = Number(capital);
    const r = Number(riskPct);
    const p = Number(portfolioPct);
    if (!(c > 0) || !(r > 0) || !(p > 0)) {
      toast.error('Trading capital and both risk percentages must be greater than zero.');
      return;
    }
    await save({ trading_capital: c, risk_per_trade_pct: r, max_portfolio_risk_pct: p });
    toast.success('Risk settings saved.');
  };

  const saveLimits = async () => {
    const m = Number(minuteLimit);
    const d = Number(dailyLimit);
    if (!(m > 0) || !(d > 0)) {
      toast.error('Both limits must be greater than zero.');
      return;
    }
    await save({ api_minute_limit: m, api_daily_limit: d });
    toast.success('Data allowance saved.');
  };

  const testConnection = async () => {
    const outcome = await run();
    if (outcome.ok) toast.success(outcome.message || 'Connected.');
    else toast.error(outcome.message || 'Could not connect.');
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Market data &amp; risk settings</h1>
        <p className="text-sm text-muted-foreground">
          How SwingEdge gets prices, and the limits it holds you to.
        </p>
      </div>

      {/* Market data connection */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Market data</CardTitle>
              <CardDescription>Provider: Twelve Data</CardDescription>
            </div>
            <Badge variant="outline" className={cn('font-semibold', STATUS_TONE[connection])}>
              {STATUS_LABEL[connection]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-card/50 p-3">
              <dt className="text-xs text-muted-foreground">API key</dt>
              <dd className="mt-1 font-mono text-sm">************</dd>
            </div>
            <div className="rounded-lg border bg-card/50 p-3">
              <dt className="text-xs text-muted-foreground">Last successful connection</dt>
              <dd className="mt-1 text-sm">{lastUpdatedLabel(status?.last_success_at ?? null)}</dd>
            </div>
            <div className="rounded-lg border bg-card/50 p-3">
              <dt className="text-xs text-muted-foreground">Requests today</dt>
              <dd className="mt-1 text-sm tabular-nums">
                {dayUsed} / {settings.api_daily_limit}
              </dd>
            </div>
            <div className="rounded-lg border bg-card/50 p-3">
              <dt className="text-xs text-muted-foreground">Credits left (reported)</dt>
              <dd className="mt-1 text-sm tabular-nums">
                {status?.credits_left_reported ?? '—'}
              </dd>
            </div>
          </dl>

          <div className="space-y-3">
            <div>
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>This minute</span>
                <span className="tabular-nums">
                  {minuteUsed} / {settings.api_minute_limit} credits
                </span>
              </div>
              <Progress value={Math.min(100, (minuteUsed / Math.max(1, settings.api_minute_limit)) * 100)} />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Today</span>
                <span className="tabular-nums">
                  {dayUsed} / {settings.api_daily_limit} credits
                </span>
              </div>
              <Progress value={Math.min(100, (dayUsed / Math.max(1, settings.api_daily_limit)) * 100)} />
            </div>
          </div>

          {status?.last_error ? (
            <Alert className="border-prism-rose/40">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Last problem</AlertTitle>
              <AlertDescription>{status.last_error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label>Data mode</Label>
            <Select value={settings.data_mode} onValueChange={(v) => setMode(v as DataMode)}>
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DEMO">Demo — clearly labelled sample data</SelectItem>
                <SelectItem value="LIVE">Live — fetch fresh prices when needed</SelectItem>
                <SelectItem value="CACHED">Cached only — never spend new credits</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={testConnection} disabled={testing} size="sm">
              {testing ? 'Testing…' : 'Test connection'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchStatus();
                toast.success('Connection details refreshed.');
              }}
            >
              <RefreshCw className="mr-1 h-4 w-4" />
              Refresh connection
            </Button>
            <Button variant="outline" size="sm" onClick={() => setMode('DEMO')} disabled={isSaving}>
              <FlaskConical className="mr-1 h-4 w-4" />
              Use demo mode
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Your key is stored securely on the server and is never shown again or sent to your browser. Every
            price request goes through a secure server function.
          </p>
        </CardContent>
      </Card>

      {/* Trading capital firewall */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-prism-teal" />
            Trading capital &amp; risk
          </CardTitle>
          <CardDescription>
            This amount is kept completely separate from your retirement, emergency fund, HSA and long-term
            investments. PrismBudget decides what you can allocate to trading; SwingEdge decides how much of
            that you may risk.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="capital">Trading account</Label>
              <Input id="capital" type="number" min="0" step="100" value={capital} onChange={(e) => setCapital(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="riskpct">Risk per trade (%)</Label>
              <Input id="riskpct" type="number" min="0.1" step="0.1" value={riskPct} onChange={(e) => setRiskPct(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="portpct">Max portfolio risk (%)</Label>
              <Input id="portpct" type="number" min="0.5" step="0.5" value={portfolioPct} onChange={(e) => setPortfolioPct(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="sectorcap">Max sector money exposure (%)</Label>
              <Input
                id="sectorcap"
                type="number"
                min="1"
                step="1"
                value={sectorCapital}
                onChange={(e) => setSectorCapital(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sectorheat">Max sector risk (%)</Label>
              <Input
                id="sectorheat"
                type="number"
                min="0.1"
                step="0.1"
                value={sectorHeat}
                onChange={(e) => setSectorHeat(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="corrrisk">Max correlated group risk (%)</Label>
              <Input
                id="corrrisk"
                type="number"
                min="0.1"
                step="0.1"
                value={correlatedRisk}
                onChange={(e) => setCorrelatedRisk(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="corrlookback">Correlation lookback (days)</Label>
              <Input
                id="corrlookback"
                type="number"
                min="20"
                step="5"
                value={lookback}
                onChange={(e) => setLookback(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Money exposure is how much of the account sits in one sector. Sector risk is how much of
            the account could be lost there. These are separate on purpose, and none of these numbers
            is right for everyone.
          </p>


          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Max risk per trade', value: money(maxRiskPerTrade) },
              { label: 'Max portfolio risk', value: money(risk.maxPortfolioRisk) },
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

          <Button onClick={saveRisk} disabled={isSaving} size="sm">
            {isSaving ? 'Saving…' : 'Save risk settings'}
          </Button>
        </CardContent>
      </Card>

      {/* Data allowance + advanced */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Data allowance</CardTitle>
          <CardDescription>
            Kept as editable settings, not fixed rules, because provider plans change.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="minlimit">Credits per minute</Label>
              <Input id="minlimit" type="number" min="1" value={minuteLimit} onChange={(e) => setMinuteLimit(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="daylimit">Credits per day</Label>
              <Input id="daylimit" type="number" min="1" value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} />
            </div>
          </div>
          <Button onClick={saveLimits} disabled={isSaving} size="sm" variant="outline">
            Save allowance
          </Button>

          <div className="flex items-center justify-between rounded-lg border bg-card/50 p-3">
            <div>
              <p className="text-sm font-medium">Show advanced usage details</p>
              <p className="text-xs text-muted-foreground">
                Adds cache hits, misses, failures and rate-limit events to this page.
              </p>
            </div>
            <Switch
              checked={settings.advanced_mode}
              onCheckedChange={(v) => save({ advanced_mode: v })}
            />
          </div>

          {settings.advanced_mode ? (
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Cache hits', value: status?.cache_hits ?? 0 },
                { label: 'Cache misses', value: status?.cache_misses ?? 0 },
                { label: 'Failed requests', value: status?.failed_requests ?? 0 },
                { label: 'Rate-limit events', value: status?.rate_limit_events ?? 0 },
              ].map((t) => (
                <div key={t.label} className="rounded-lg border bg-card/50 p-3">
                  <dt className="text-xs text-muted-foreground">{t.label}</dt>
                  <dd className="mt-1 text-lg font-bold tabular-nums">{t.value}</dd>
                </div>
              ))}
              <div className="rounded-lg border bg-card/50 p-3 sm:col-span-2 lg:col-span-4">
                <dt className="text-xs text-muted-foreground">Earnings data on this plan</dt>
                <dd className="mt-1 flex items-center gap-2 text-sm">
                  {status?.supports_earnings ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-prism-lime" /> Available
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-prism-amber" /> Earnings data unavailable — this
                      is optional and does not affect scanning or analysis.
                    </>
                  )}
                </dd>
              </div>
            </dl>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
