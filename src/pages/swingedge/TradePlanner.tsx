import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, ArrowRight, CheckCircle2, HelpCircle, Save, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import SwingEdgeHeader from '@/components/swingedge/SwingEdgeHeader';
import HowToUse from '@/components/swingedge/HowToUse';
import CollapsibleSection from '@/components/swingedge/CollapsibleSection';
import RiskFirstCard, { GapRiskCard, StopRuleCard } from '@/components/swingedge/RiskFirstCard';
import { useTradingSettings, useTradingTitle } from '@/hooks/use-swingedge';
import { usePaperTradeManagement, useSymbolLevels, useTradePlans } from '@/hooks/use-swingedge-stops';
import { usePortfolioHeat } from '@/hooks/use-swingedge-heat';
import { VERDICT_LABEL, type Verdict } from '@/lib/swingedge/types';
import type { SetupState } from '@/lib/swingedge/indicators';
import {
  ATR_MULTIPLES,
  BUFFER_CHOICES,
  CORE_EXAMPLE,
  EARNINGS_UNKNOWN_TEXT,
  PERCENT_STOPS,
  RISK_PCT_CHOICES,
  STOP_METHODS,
  TIGHTENING_CONFIRM_LABEL,
  TIGHTENING_CONFIRM_TEXT,
  assessStop,
  atrStop,
  checkPortfolioRisk,
  compareStops,
  hybridStop,
  percentStop,
  qualifyTrade,
  STOP_OVERRIDE_BEGINNER_TEXT,
  STOP_OVERRIDE_MIN_CHARS,
  runRiskSequence,
  structureStop,
  targetOptions,
  whyStopHere,
  type StopMethod,
  type TargetMethod,
} from '@/lib/swingedge/stops';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

const VERDICT_TONE: Record<Verdict, string> = {
  QUALIFIES: 'bg-prism-lime/15 text-prism-lime border-prism-lime/40',
  WATCH: 'bg-prism-amber/15 text-prism-amber border-prism-amber/40',
  NOT_READY: 'bg-muted text-muted-foreground border-border',
  DOES_NOT_QUALIFY: 'bg-destructive/10 text-destructive border-destructive/40',
};

function Step({
  n,
  title,
  hint,
  children,
}: {
  n: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
            {n}
          </span>
          {title}
        </CardTitle>
        {hint ? <CardDescription>{hint}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

export default function TradePlanner() {
  useTradingTitle('Trade Planner');
  const [params] = useSearchParams();
  const { settings, save: saveSettings } = useTradingSettings();
  const { plans, savePlan, deletePlan, openPaperTrade, isSaving } = useTradePlans();
  const { openRisk } = usePaperTradeManagement();

  const [symbol, setSymbol] = useState((params.get('symbol') ?? '').toUpperCase());
  const levels = useSymbolLevels(symbol);
  const L = levels.data;

  const [setup, setSetup] = useState<SetupState>('PULLBACK');
  const [entry, setEntry] = useState('');
  const [invalidation, setInvalidation] = useState('');
  const [method, setMethod] = useState<StopMethod>('STRUCTURE');
  const [bufferPct, setBufferPct] = useState(0.25);
  const [atrMultiple, setAtrMultiple] = useState(1.5);
  const [pctStop, setPctStop] = useState(3);
  const [stopInput, setStopInput] = useState('');
  const [tightenConfirmed, setTightenConfirmed] = useState(false);
  const [sharesInput, setSharesInput] = useState('');
  const [target, setTarget] = useState('');
  const [targetMethod, setTargetMethod] = useState<TargetMethod>('REWARD_RISK');
  const [minRR, setMinRR] = useState(2);
  const [entryConfirmed, setEntryConfirmed] = useState(false);
  const [earningsChecked, setEarningsChecked] = useState(false);
  const [override, setOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [stopOverride, setStopOverride] = useState(false);
  const [stopJustification, setStopJustification] = useState('');

  // Suggested setup and entry follow the loaded chart until the user types.
  useEffect(() => {
    if (!L) return;
    if (L.setup !== 'NONE') setSetup(L.setup);
    if (!entry && L.snapshot) setEntry(L.snapshot.price.toFixed(2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L?.setup, L?.snapshot?.price]);

  const entryNum = Number(entry) || 0;
  const atrValue = L?.snapshot?.atr14 ?? null;

  const structure = useMemo(
    () =>
      structureStop({
        entry: entryNum,
        setup,
        swingLow: L?.swingLow ?? null,
        pullbackLow: L?.pullbackLow ?? null,
        support: L?.snapshot?.support ?? null,
        movingAverage: L?.snapshot?.ema20 ?? null,
        breakoutLevel: L?.breakoutLevel ?? null,
        retestLow: L?.retestLow ?? null,
        bufferPct,
      }),
    [entryNum, setup, L, bufferPct],
  );

  const atrBased = atrStop(entryNum, atrValue, atrMultiple);
  const percentBased = percentStop(entryNum, pctStop);
  const hybrid = useMemo(
    () =>
      hybridStop({
        entry: entryNum,
        structureLevel: structure.invalidationLevel,
        atrValue,
        multiple: atrMultiple,
        bufferPct,
      }),
    [entryNum, structure.invalidationLevel, atrValue, atrMultiple, bufferPct],
  );

  const suggestedStop = useMemo(() => {
    if (method === 'STRUCTURE') return structure.stop;
    if (method === 'ATR') return atrBased;
    if (method === 'PERCENT') return percentBased;
    if (method === 'HYBRID') return hybrid.stop;
    return structure.stop;
  }, [method, structure.stop, atrBased, percentBased, hybrid.stop]);

  const stopNum = stopInput === '' ? (suggestedStop ?? 0) : Number(stopInput) || 0;
  const targetNum = Number(target) || 0;

  const risk = useMemo(
    () =>
      runRiskSequence({
        tradingCapital: settings.trading_capital,
        riskPerTradePct: settings.risk_per_trade_pct,
        entry: entryNum,
        stop: stopNum,
        target: targetNum,
        plannedShares: sharesInput === '' ? null : Number(sharesInput),
        minRewardRisk: minRR,
      }),
    [settings.trading_capital, settings.risk_per_trade_pct, entryNum, stopNum, targetNum, sharesInput, minRR],
  );

  const quality = useMemo(
    () =>
      assessStop({
        entry: entryNum,
        stop: stopNum,
        atrValue,
        structureLevel: structure.invalidationLevel,
        rewardRisk: risk.rewardRisk,
        setup,
      }),
    [entryNum, stopNum, atrValue, structure.invalidationLevel, risk.rewardRisk, setup],
  );

  const portfolio = useMemo(
    () =>
      checkPortfolioRisk({
        tradingCapital: settings.trading_capital,
        maxPortfolioRiskPct: settings.max_portfolio_risk_pct,
        openRisk,
        newTradeRisk: risk.plannedLoss,
      }),
    [settings.trading_capital, settings.max_portfolio_risk_pct, openRisk, risk.plannedLoss],
  );

  // Portfolio heat, sector exposure and sector heat gates.
  const { summary: heat, checkTrade } = usePortfolioHeat();
  const heatGate = useMemo(
    () =>
      checkTrade({
        symbol: symbol.toUpperCase(),
        sector: null,
        shares: risk.shares,
        entry: entryNum,
        stop: stopNum,
      }),
    [checkTrade, symbol, risk.shares, entryNum, stopNum],
  );



  const qualification = useMemo(
    () =>
      qualifyTrade({
        setup,
        entryDefined: entryNum > 0,
        invalidation,
        stopDefined: stopNum > 0,
        stopQuality: quality.quality,
        risk,
        portfolio,
        targetDefined: targetNum > entryNum,
        minRewardRisk: minRR,
        earningsReviewed: earningsChecked,
        earningsAvailable: false,
        entryConfirmed,
        overrideRewardRisk: override,
        advancedMode: settings.advanced_mode,
        stopFailureReasons: quality.failureReasons,
        overrideStopQuality: stopOverride,
        stopOverrideJustification: stopJustification,
      }),
    [setup, entryNum, invalidation, stopNum, quality.quality, quality.failureReasons, risk, portfolio, targetNum, minRR, earningsChecked, entryConfirmed, override, settings.advanced_mode, stopOverride, stopJustification],
  );

  const targets = useMemo(
    () =>
      targetOptions({
        entry: entryNum,
        stop: stopNum,
        priorHigh: L?.priorHigh ?? null,
        resistance: L?.snapshot?.resistance ?? null,
        atrValue,
        rangeHeight: L?.rangeHeight ?? null,
      }),
    [entryNum, stopNum, L, atrValue],
  );

  const tighteningStop = suggestedStop !== null && stopNum > suggestedStop;
  const [showWhy, setShowWhy] = useState(false);

  const suggestInvalidation = () => {
    if (structure.invalidationLevel === null) {
      toast.error('No structural level found yet — load a symbol first.');
      return;
    }
    setInvalidation(
      setup === 'BREAKOUT'
        ? `A move back below the breakout level at ${money(structure.invalidationLevel)} with continued weakness would invalidate the breakout thesis.`
        : `A close below the recent swing low at ${money(structure.invalidationLevel)} would break the current higher-low structure.`,
    );
  };

  const canSave = symbol.length >= 1 && entryNum > 0 && stopNum > 0 && targetNum > entryNum && !risk.invalidStop;

  const handleSave = async () => {
    if (!canSave) {
      toast.error('Finish the entry, stop and target first');
      return;
    }
    if (tighteningStop && !tightenConfirmed) {
      toast.error('Confirm the tightened stop is still a valid invalidation level');
      return;
    }
    if (risk.rewardRiskStatus === 'BELOW_RULE' && !(override && settings.advanced_mode)) {
      toast.error('Reward-to-risk is below your rule, so this plan does not qualify');
      return;
    }
    if (quality.quality === 'INVALID' && !qualification.stopOverrideApplied) {
      toast.error('This stop is not a valid invalidation level. Revise the stop before saving.');
      return;
    }
    if (qualification.stopOverrideRefusal) {
      toast.error(qualification.stopOverrideRefusal);
      return;
    }
    if (!heatGate.allowed) {
      toast.error(heatGate.reasons[0]);
      return;
    }
    try {
      await savePlan({
        symbol: symbol.toUpperCase(),
        status: 'PLANNED',
        setup_type: setup,
        planned_entry: entryNum,
        planned_stop: stopNum,
        planned_target: targetNum,
        shares: risk.shares,
        risk_per_share: risk.riskPerShare,
        dollar_risk: risk.plannedLoss,
        position_value: risk.positionValue,
        potential_gain: risk.rewardPerShare === null ? null : risk.rewardPerShare * risk.shares,
        reward_risk: risk.rewardRisk,
        verdict: qualification.verdict,
        invalidation,
        why_qualifies: qualification.headline,
        stop_strategy: method,
        structure_level: structure.invalidationLevel,
        atr_value: atrValue,
        atr_multiple: atrMultiple,
        stop_buffer_pct: bufferPct,
        stop_quality: quality.quality,
        why_stop_here: whyStopHere({
          stop: stopNum,
          structureLevel: structure.invalidationLevel,
          setup,
          method,
          atrDistance: quality.atrDistance,
        }),
        target_method: targetMethod,
        earnings_reviewed: earningsChecked,
        override_reason: qualification.stopOverrideApplied
          ? `Stop override (${quality.quality}): ${stopJustification}${override ? ` · Reward-to-risk override: ${overrideReason}` : ''}`
          : override
            ? overrideReason || 'Advanced Mode override'
            : null,
      });
      toast.success('Plan saved');
    } catch {
      toast.error('Could not save that plan');
    }
  };

  return (
    <div className="space-y-6">
      <SwingEdgeHeader
        title="Trade Planner"
        subtitle="The stop decides the share count. The share count never decides the stop."
        mode={settings.data_mode}
        right={
          <Badge variant="outline" className={cn('text-xs', VERDICT_TONE[qualification.verdict])}>
            {VERDICT_LABEL[qualification.verdict]}
          </Badge>
        }
      />

      <StopRuleCard />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Step n={1} title="Select the setup" hint="Pullback and breakout use different structural levels.">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="planner-symbol">Symbol</Label>
                <Input
                  id="planner-symbol"
                  value={symbol}
                  placeholder="AAPL"
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <Label>Setup</Label>
                <Select value={setup} onValueChange={(v) => setSetup(v as SetupState)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PULLBACK">Pullback</SelectItem>
                    <SelectItem value="BREAKOUT">Breakout</SelectItem>
                    <SelectItem value="NONE">No clear setup</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {L?.notice ? <p className="text-xs text-muted-foreground">{L.notice}</p> : null}
            {L?.snapshot ? (
              <p className="text-xs text-muted-foreground">
                Last price {money(L.snapshot.price)} · ATR(14){' '}
                {atrValue ? money(atrValue) : 'unavailable'} · swing low{' '}
                {L.swingLow ? money(L.swingLow) : '—'} · support{' '}
                {L.snapshot.support ? money(L.snapshot.support) : '—'} · resistance{' '}
                {L.snapshot.resistance ? money(L.snapshot.resistance) : '—'}
              </p>
            ) : null}
          </Step>

          <Step n={2} title="Define the entry" hint="The price you would genuinely pay, not a wish.">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="planner-entry">Planned entry</Label>
                <Input id="planner-entry" value={entry} onChange={(e) => setEntry(e.target.value)} inputMode="decimal" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={entryConfirmed} onCheckedChange={(v) => setEntryConfirmed(!!v)} />
                  Entry trigger has already confirmed
                </label>
              </div>
            </div>
          </Step>

          <Step
            n={3}
            title="Identify the invalidation"
            hint="What would prove this trade wrong? Required before a trade can qualify."
          >
            <Textarea
              value={invalidation}
              onChange={(e) => setInvalidation(e.target.value)}
              rows={3}
              placeholder="A close below the recent swing low would break the current higher-low structure."
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={suggestInvalidation}>
                Suggest a sentence
              </Button>
              <span className="text-xs text-muted-foreground">
                Review the suggestion in your own words before you accept it.
              </span>
            </div>
            {structure.invalidationLevel !== null ? (
              <p className="text-xs text-muted-foreground">{structure.explanation}</p>
            ) : null}
          </Step>

          <Step n={4} title="Set the stop from the invalidation" hint="Choose a method, then check it against the chart.">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label>Stop method</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as StopMethod)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STOP_METHODS.filter((m) => m.value !== 'TRAILING').map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  {STOP_METHODS.find((m) => m.value === method)?.blurb}
                </p>
              </div>
              <div>
                <Label>Structure buffer</Label>
                <Select value={String(bufferPct)} onValueChange={(v) => setBufferPct(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUFFER_CHOICES.map((b) => (
                      <SelectItem key={b} value={String(b)}>
                        {b === 0 ? 'No buffer' : `${b}% below structure`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  A stop placed exactly at obvious support is vulnerable to normal market movement.
                </p>
              </div>
              {method === 'ATR' || method === 'HYBRID' ? (
                <div>
                  <Label>ATR multiple</Label>
                  <Select value={String(atrMultiple)} onValueChange={(v) => setAtrMultiple(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ATR_MULTIPLES.map((m) => (
                        <SelectItem key={m} value={String(m)}>
                          {m} ATR
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {method === 'PERCENT' ? (
                <div>
                  <Label>Stop percentage</Label>
                  <Select value={String(pctStop)} onValueChange={(v) => setPctStop(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERCENT_STOPS.map((p) => (
                        <SelectItem key={p} value={String(p)}>
                          {p}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>

            <div className="rounded-lg bg-muted/40 p-3 text-sm">
              <div className="grid gap-1 sm:grid-cols-3">
                <span>
                  Structure stop:{' '}
                  <strong>{structure.stop === null ? '—' : money(structure.stop)}</strong>
                </span>
                <span>
                  {atrMultiple} ATR stop: <strong>{atrBased === null ? '—' : money(atrBased)}</strong>
                </span>
                <span>
                  {pctStop}% stop: <strong>{percentBased === null ? '—' : money(percentBased)}</strong>
                </span>
              </div>
              {structure.stop !== null && atrBased !== null ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Difference {money(Math.abs(structure.stop - atrBased))}. {compareStops(structure.stop, atrBased)}
                </p>
              ) : null}
              {method === 'HYBRID' ? <p className="mt-2 text-xs">{hybrid.reason}</p> : null}
              {method === 'PERCENT' ? (
                <p className="mt-2 text-xs text-prism-amber">
                  Percentage stops do not account for technical structure or stock volatility.
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="planner-stop">SUGGESTED STOP (edit if your chart says otherwise)</Label>
                <Input
                  id="planner-stop"
                  value={stopInput === '' ? (suggestedStop === null ? '' : suggestedStop.toFixed(2)) : stopInput}
                  onChange={(e) => {
                    setStopInput(e.target.value);
                    setTightenConfirmed(false);
                  }}
                  inputMode="decimal"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowWhy((s) => !s)}>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  WHY IS THE STOP HERE?
                </Button>
                <Badge
                  variant="outline"
                  className={cn(
                    quality.quality === 'STRONG' && 'border-prism-lime/40 text-prism-lime',
                    quality.quality === 'QUESTIONABLE' && 'border-prism-amber/40 text-prism-amber',
                    quality.quality === 'INVALID' && 'border-destructive/40 text-destructive',
                  )}
                >
                  Stop quality: {quality.quality}
                </Badge>
              </div>
            </div>

            {showWhy ? (
              <Alert>
                <AlertTitle>Why the stop is here</AlertTitle>
                <AlertDescription>
                  {whyStopHere({
                    stop: stopNum,
                    structureLevel: structure.invalidationLevel,
                    setup,
                    method,
                    atrDistance: quality.atrDistance,
                  })}
                </AlertDescription>
              </Alert>
            ) : null}

            {quality.warnings.map((w) => (
              <Alert key={w} className="border-prism-amber/40">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{w}</AlertDescription>
              </Alert>
            ))}

            {!quality.justified ? (
              <Alert variant={quality.quality === 'INVALID' ? 'destructive' : undefined} className={quality.quality === 'INVALID' ? undefined : 'border-prism-amber/40'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>
                  {quality.quality === 'INVALID'
                    ? 'DOES NOT QUALIFY — the stop has no technical basis'
                    : 'NOT READY — review or revise this stop'}
                </AlertTitle>
                <AlertDescription className="space-y-2">
                  <ul className="list-disc space-y-1 pl-4">
                    {quality.failureReasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                  <p>
                    Your stop does not have to match the suggestion. It does have to read as a genuine invalidation
                    level for this setup, given support, swing structure and volatility.
                  </p>
                  {settings.advanced_mode ? (
                    <>
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <Checkbox checked={stopOverride} onCheckedChange={(v) => setStopOverride(!!v)} />
                        Override this stop assessment (Advanced Mode)
                      </label>
                      {stopOverride ? (
                        <>
                          <Textarea
                            value={stopJustification}
                            rows={3}
                            placeholder="Explain why this stop is still a valid invalidation level for this setup."
                            onChange={(e) => setStopJustification(e.target.value)}
                          />
                          <p className="text-xs">
                            {stopJustification.trim().length}/{STOP_OVERRIDE_MIN_CHARS} characters.{' '}
                            {qualification.stopOverrideApplied
                              ? `Override accepted — risk recalculated to ${money(risk.plannedLoss)} on ${risk.shares} shares, and it is logged with the plan, the journal and your Rule Following Score.`
                              : (qualification.stopOverrideRefusal ?? '')}
                          </p>
                        </>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-xs font-medium">{STOP_OVERRIDE_BEGINNER_TEXT}</p>
                  )}
                </AlertDescription>
              </Alert>
            ) : null}

            {tighteningStop ? (
              <Alert className="border-prism-amber/40">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Confirm the tighter stop</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>{TIGHTENING_CONFIRM_TEXT}</p>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Checkbox checked={tightenConfirmed} onCheckedChange={(v) => setTightenConfirmed(!!v)} />
                    {TIGHTENING_CONFIRM_LABEL}
                  </label>
                </AlertDescription>
              </Alert>
            ) : null}
          </Step>

          <Step n={5} title="Risk per share" hint="Entry minus stop. Everything else is built on this number.">
            <p className="text-2xl font-bold tabular-nums">
              {risk.riskPerShare === null ? (
                <span className="text-destructive">INVALID STOP</span>
              ) : (
                money(risk.riskPerShare)
              )}
            </p>
            {risk.invalidStop ? (
              <p className="text-sm text-destructive">
                For a long trade the stop must sit below the entry. No further calculation is possible.
              </p>
            ) : null}
          </Step>

          <Step n={6} title="Apply your account risk limit" hint="Your rule decides the dollars, not the trade.">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label>Trading account</Label>
                <p className="text-lg font-semibold">{money(settings.trading_capital)}</p>
              </div>
              <div>
                <Label>Risk rule</Label>
                <Select
                  value={String(settings.risk_per_trade_pct)}
                  onValueChange={(v) => saveSettings({ risk_per_trade_pct: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RISK_PCT_CHOICES.map((p) => (
                      <SelectItem key={p} value={String(p)}>
                        {p}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Maximum planned loss</Label>
                <p className="text-lg font-semibold">{money(risk.maxDollarRisk)}</p>
              </div>
            </div>
          </Step>

          <Step n={7} title="Calculate the position size" hint="Shares are always rounded down.">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label>Shares from your rule</Label>
                <p className="text-lg font-semibold">{risk.suggestedShares}</p>
              </div>
              <div>
                <Label htmlFor="planner-shares">Shares you plan to buy</Label>
                <Input
                  id="planner-shares"
                  value={sharesInput}
                  placeholder={String(risk.suggestedShares)}
                  onChange={(e) => setSharesInput(e.target.value)}
                  inputMode="numeric"
                />
              </div>
              <div>
                <Label>Position value</Label>
                <p className="text-lg font-semibold">{money(risk.positionValue)}</p>
              </div>
            </div>
            {risk.riskLimitExceeded ? (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>RISK LIMIT EXCEEDED</AlertTitle>
                <AlertDescription className="space-y-1">
                  <p>
                    You planned to risk {money(risk.plannedLoss)}, but your current rule allows{' '}
                    {money(risk.maxDollarRisk)}.
                  </p>
                  <p className="font-semibold">MAXIMUM ALLOWED SHARES: {risk.maxAllowedShares}</p>
                  <Button variant="outline" size="sm" onClick={() => setSharesInput(String(risk.maxAllowedShares))}>
                    Use {risk.maxAllowedShares} shares
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
          </Step>

          <Step n={8} title="Determine the target" hint="Pick from structure, or type your own.">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="planner-target">Planned target</Label>
                <Input id="planner-target" value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" />
              </div>
              <div>
                <Label>Target method</Label>
                <Select value={targetMethod} onValueChange={(v) => setTargetMethod(v as TargetMethod)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRIOR_HIGH">Prior high</SelectItem>
                    <SelectItem value="RESISTANCE">Resistance</SelectItem>
                    <SelectItem value="MEASURED_MOVE">Measured move</SelectItem>
                    <SelectItem value="REWARD_RISK">Reward-to-risk</SelectItem>
                    <SelectItem value="ATR">ATR</SelectItem>
                    <SelectItem value="MANUAL">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {targets.map((t, i) => (
                <Button
                  key={t.method}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTarget(t.price.toFixed(2));
                    setTargetMethod(t.method);
                  }}
                >
                  Target {i + 1}: {t.label} {money(t.price)} · {t.rewardRisk}:1
                </Button>
              ))}
              {!targets.length ? (
                <p className="text-xs text-muted-foreground">Set a valid entry and stop to see target options.</p>
              ) : null}
            </div>
          </Step>

          <Step n={9} title="Check reward-to-risk" hint="Your minimum rule decides whether this is worth taking.">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label>Reward per share</Label>
                <p className="text-lg font-semibold">
                  {risk.rewardPerShare === null ? '—' : money(risk.rewardPerShare)}
                </p>
              </div>
              <div>
                <Label>Reward-to-risk</Label>
                <p className="text-lg font-semibold">{risk.rewardRisk === null ? '—' : `${risk.rewardRisk}:1`}</p>
              </div>
              <div>
                <Label>Minimum rule</Label>
                <Select value={String(minRR)} onValueChange={(v) => setMinRR(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1.5, 2, 2.5, 3].map((r) => (
                      <SelectItem key={r} value={String(r)}>
                        {r}:1
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {risk.rewardRiskStatus === 'BELOW_RULE' ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Below your rule</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>
                    Reward-to-risk of {risk.rewardRisk}:1 is below your {minRR}:1 minimum, so this trade does not
                    qualify. Skipping it is a valid outcome.
                  </p>
                  {settings.advanced_mode ? (
                    <>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox checked={override} onCheckedChange={(v) => setOverride(!!v)} />
                        Override this rule (Advanced Mode — logged with the plan)
                      </label>
                      {override ? (
                        <Input
                          value={overrideReason}
                          placeholder="Why are you overriding your own rule?"
                          onChange={(e) => setOverrideReason(e.target.value)}
                        />
                      ) : null}
                    </>
                  ) : (
                    <p className="text-xs">Overrides are only possible with Advanced Mode switched on in settings.</p>
                  )}
                </AlertDescription>
              </Alert>
            ) : null}
          </Step>

          <Step n={10} title="Qualify the trade" hint="Every element has to be in place.">
            <div className={cn('rounded-lg border p-3', VERDICT_TONE[qualification.verdict])}>
              <p className="text-sm font-bold">{VERDICT_LABEL[qualification.verdict]}</p>
              <p className="text-sm">{qualification.headline}</p>
            </div>
            <ul className="space-y-1.5">
              {qualification.checks.map((c) => (
                <li key={c.key} className="flex gap-2 text-sm">
                  {c.ok ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-prism-lime" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  )}
                  <span>
                    <span className="font-medium">{c.label}</span>
                    <span className="text-muted-foreground"> — {c.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
            {qualification.skipTradeReason ? (
              <Alert variant="destructive">
                <AlertTitle>SKIP TRADE</AlertTitle>
                <AlertDescription>{qualification.skipTradeReason}</AlertDescription>
              </Alert>
            ) : null}
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={earningsChecked} onCheckedChange={(v) => setEarningsChecked(!!v)} />
              I checked earnings timing for this holding period
            </label>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSave} disabled={isSaving || !canSave}>
                <Save className="mr-2 h-4 w-4" />
                Save this plan
              </Button>
              <Button asChild variant="outline">
                <Link to="/swingedge/paper">
                  Go to Paper Trading
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Step>
        </div>

        <div className="space-y-4">
          <RiskFirstCard
            entry={entryNum}
            invalidation={structure.invalidationLevel}
            stop={stopNum}
            riskPerShare={risk.riskPerShare}
            shares={risk.shares}
            plannedLoss={risk.plannedLoss}
            percentOfAccount={risk.percentOfAccount}
            target={targetNum}
            rewardRisk={risk.rewardRisk}
            rewardRiskStatus={risk.rewardRiskStatus}
          />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Portfolio risk</CardTitle>
              <CardDescription>
                Open risk {money(portfolio.openRisk)} of an allowed {money(portfolio.maxTotalOpenRisk)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                This trade adds {money(portfolio.newTradeRisk)} for a total of {money(portfolio.projectedTotal)}.
              </p>
              {portfolio.message ? <p className="font-semibold text-destructive">{portfolio.message}</p> : null}
            </CardContent>
          </Card>

          <Card className={cn(!heatGate.allowed && 'border-destructive')}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Portfolio heat and sector limits</CardTitle>
              <CardDescription>
                {money(heat.openRisk)} at risk now of {money(heat.maxHeatDollars)} allowed —{' '}
                {money(heat.riskAvailable)} still available
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                This trade adds {money(heatGate.addedRisk)} of risk and ties up{' '}
                {money(heatGate.addedCapital)}, taking heat to {heatGate.projectedHeatPct.toFixed(2)}%
                of your account.
              </p>
              {heatGate.reasons.map((r) => (
                <p
                  key={r}
                  className={cn(!heatGate.allowed && 'font-semibold text-destructive')}
                >
                  {r}
                </p>
              ))}
              <p className="text-xs text-muted-foreground">
                Heat counts money at risk, not money invested. Sector money exposure and sector risk
                are checked separately.
              </p>
            </CardContent>
          </Card>



          <GapRiskCard earningsNote={EARNINGS_UNKNOWN_TEXT} />

          <CollapsibleSection id="planner-example" title="The worked example" defaultOpen={false}>
            <div className="space-y-1 text-sm">
              <p>Account {money(CORE_EXAMPLE.account)} · risk rule {CORE_EXAMPLE.riskRulePct}% · maximum loss {money(CORE_EXAMPLE.maxLoss)}</p>
              <p>
                Entry {money(CORE_EXAMPLE.entry)} · invalidation {money(CORE_EXAMPLE.invalidation)} · risk per share{' '}
                {money(CORE_EXAMPLE.riskPerShare)}
              </p>
              <p>
                Position {CORE_EXAMPLE.shares} shares · target {money(CORE_EXAMPLE.target)} · reward-to-risk{' '}
                {CORE_EXAMPLE.rewardRisk}:1
              </p>
              {CORE_EXAMPLE.explanation.map((line) => (
                <p key={line} className="text-muted-foreground">
                  {line}
                </p>
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection id="planner-saved" title={`Saved plans (${plans.length})`} defaultOpen={false}>
            <div className="space-y-2">
              {plans.length === 0 ? (
                <p className="text-sm text-muted-foreground">No plans saved yet.</p>
              ) : (
                plans.slice(0, 8).map((p) => (
                  <div key={p.id} className="rounded-lg border p-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{p.symbol}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {p.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p.shares ?? 0} shares · entry {money(p.planned_entry)} · stop {money(p.planned_stop)} · target{' '}
                      {money(p.planned_target)} · {p.reward_risk ?? '—'}:1
                    </p>
                    <div className="mt-1 flex gap-2">
                      {p.status === 'PLANNED' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isSaving}
                          onClick={async () => {
                            try {
                              await openPaperTrade(p);
                              toast.success('Paper trade opened with the plan locked in');
                            } catch {
                              toast.error('Could not open that paper trade');
                            }
                          }}
                        >
                          Open paper trade
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await deletePlan(p.id);
                          toast.success('Plan removed');
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CollapsibleSection>
        </div>
      </div>

      <HowToUse
        id="planner-how-to"
        steps={[
          'Confirm your trading capital and risk per trade on the trading settings page before you plan anything.',
          'Work down the ten steps in order. The stop comes from the invalidation level, never from the share count you want.',
          'Compare the structure stop with the ATR stop. If they disagree, understand why before choosing.',
          'Check the share count and the dollar risk. That dollar figure is what you are truly risking.',
          'Save the plan, then open it in Paper Trading to practise it.',
        ]}
        tips={[
          'If a plan would push your total open risk past your portfolio limit, it is blocked on purpose.',
          'Planned numbers are yours; scanner numbers are estimates. Never mix the two.',
        ]}
      />
    </div>
  );
}
