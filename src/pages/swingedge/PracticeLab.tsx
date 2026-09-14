// SwingEdge + Thinkorswim Lab — the practice workflow.
//
// SwingEdge is the brain and the coach. Thinkorswim paperMoney is the cockpit and
// the simulator. This page walks the two of them in order and never pretends a
// planned price was a fill.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  Monitor,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import SwingEdgeHeader from '@/components/swingedge/SwingEdgeHeader';
import HowToUse from '@/components/swingedge/HowToUse';
import CollapsibleSection from '@/components/swingedge/CollapsibleSection';
import NextStepsCard from '@/components/swingedge/NextStepsCard';
import PortfolioHeatCard from '@/components/swingedge/PortfolioHeatCard';
import CircuitBreakerCard from '@/components/swingedge/CircuitBreakerCard';
import { useSwingEdgeDashboard, useTradingSettings, useTradingTitle } from '@/hooks/use-swingedge';
import {
  checklistComplete,
  useExecutionTickets,
  usePracticeSessions,
  type ExecutionTicket,
} from '@/hooks/use-swingedge-practice';
import { useClosedRTrades } from '@/hooks/use-swingedge-risklab';
import {
  BEST_SKIP_EXAMPLES,
  BEST_SKIP_PRINCIPLE,
  BUYING_POWER_WARNING,
  EXECUTION_COMPONENTS,
  FULL_WORKFLOW,
  HANDOFF_CHECKLIST,
  HANDOFF_READY_LABEL,
  IMPROVEMENT_LOOP,
  MANAGEMENT_RULES,
  MANUAL_EXECUTION_STEPS,
  MARKET_READS,
  MARKET_READ_QUESTION,
  PRACTICE_PRINCIPLES,
  PRACTICE_STEPS,
  TARGET_CHANGE_RULE,
  TRAINING_CHECKLIST,
  checkShareCount,
  classifyResult,
  executionVariance,
  scoreExecution,
  sizePosition,
  trainingAccount,
  type MarketRead,
  type ScoreState,
} from '@/lib/swingedge/practice';
import { TIMEFRAME_ROLE } from '@/lib/swingedge/multiTimeframe';

const money = (n: number | null) =>
  n === null
    ? 'not recorded'
    : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

const numOrNull = (v: string): number | null => {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

const TF_OPTIONS: Record<string, string[]> = {
  weekly: ['Bullish', 'Neutral', 'Bearish', 'Transition'],
  daily: ['Valid setup', 'Developing', 'No setup', 'Invalidated'],
  h4: ['Confirms', 'Mixed', 'Weakening', 'Contradicts'],
  h1: ['Entry confirmed', 'Waiting', 'Early', 'Failed'],
  m15: ['Confirms', 'Not used'],
};

const EVENT_BANDS = ['LOW', 'MODERATE', 'HIGH', 'SEVERE'] as const;

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/40 py-1.5">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------- roles banner */

function RolesBanner() {
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr]">
      <Card className="border-prism-teal/40 bg-prism-teal/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4 text-prism-teal" />
            SwingEdge — brain and coach
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Find, analyse, validate, size, plan, qualify, journal, review, teach.
        </CardContent>
      </Card>
      <div className="flex items-center justify-center">
        <ArrowRight className="h-6 w-6 text-muted-foreground" />
      </div>
      <Card className="border-prism-violet/40 bg-prism-violet/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Monitor className="h-4 w-4 text-prism-violet" />
            Thinkorswim paperMoney — cockpit
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Order entry, stops, targets, fills, position management, platform practice.
        </CardContent>
      </Card>
    </div>
  );
}

/* --------------------------------------------------------------- step 1 & co */

function PrepareTab() {
  const { data } = useSwingEdgeDashboard();
  const { today, save } = usePracticeSessions();
  const [read, setRead] = useState<MarketRead | ''>((today?.market_read as MarketRead) ?? '');
  const [candidates, setCandidates] = useState(String(today?.candidates_reviewed ?? ''));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Step 1 — Start with the dashboard</CardTitle>
          <CardDescription>{MARKET_READ_QUESTION}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {(data?.readings ?? []).map((r) => (
              <div key={r.symbol} className="rounded-lg border border-border/60 p-3">
                <p className="text-sm font-semibold">{r.symbol}</p>
                <p className="text-xs text-muted-foreground">{r.trend}</p>
              </div>
            ))}
            {(data?.readings ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Market readings are not loaded yet. Open the trading dashboard first.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label>Today's market read</Label>
              <Select value={read} onValueChange={(v) => setRead(v as MarketRead)}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Choose one" />
                </SelectTrigger>
                <SelectContent>
                  {MARKET_READS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Candidates reviewed</Label>
              <Input
                className="w-32"
                inputMode="numeric"
                value={candidates}
                onChange={(e) => setCandidates(e.target.value)}
                placeholder="3"
              />
            </div>
            <Button
              onClick={() => {
                save.mutate(
                  {
                    market_read: read || null,
                    candidates_reviewed: Number(candidates || 0),
                  },
                  { onSuccess: () => toast.success("Saved to today's practice session") },
                );
              }}
              disabled={save.isPending}
            >
              Save today's read
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Three to five candidates is a full day's work. More than that is browsing, not practice.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <PortfolioHeatCard />
        <CircuitBreakerCard />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Step 2 — Review the timeframes</CardTitle>
          <CardDescription>
            Daily creates the trade. 4-hour confirms the story. 1-hour times the entry. 15-minute
            fine-tunes execution. Weekly gives context.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(['WEEKLY', 'DAILY', 'H4', 'H1', 'M15'] as const).map((k) => (
            <div key={k} className="flex items-baseline justify-between gap-3 border-b border-border/40 py-1.5">
              <span className="text-sm font-semibold">{k}</span>
              <span className="text-xs text-muted-foreground">{TIMEFRAME_ROLE[k].role}</span>
            </div>
          ))}
          <p className="pt-2 text-xs text-muted-foreground">
            A lower timeframe never overrides a failed higher timeframe. Read the per-timeframe panels
            in the Analyzer, then record them on the ticket.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild size="sm" variant="outline">
              <Link to="/swingedge/analyzer">Open the Analyzer</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/swingedge/scanner">Open the Scanner</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/swingedge/watchlists">Open Watchlists</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Steps 3 to 5 — Scan, analyse, check events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-semibold">Scan for candidates</p>
            <p className="text-muted-foreground">
              Prioritise a valid daily structure, an acceptable market regime, sector alignment,
              tradability, no severe event risk, adequate bias confidence and a reward-to-risk worth
              the risk. Pick three to five.
            </p>
          </div>
          <div>
            <p className="font-semibold">Analyse each one</p>
            <p className="text-muted-foreground">
              Trend, 20 EMA, 50 SMA, RSI 14, ATR 14, volume, support, resistance, candle confirmation,
              relative strength, bias, pullback or breakout, regime, sector and timeframe alignment.
              Then answer both questions: why this trade, and what would prove it wrong.
            </p>
          </div>
          <div>
            <p className="font-semibold">Check event risk</p>
            <p className="text-muted-foreground">
              Earnings and how many days away, confirmed or estimated, before or after the bell when
              known, plus FOMC, CPI, PPI, employment, GDP, retail sales, sector, global, geopolitical,
              commodity and regulatory events. High event risk means review. Severe event risk blocks
              a go in Beginner mode.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/swingedge/analyzer">Analyzer cards</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/swingedge/rulebook">My Rulebook</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------ ticket builder */

function TicketTab() {
  const { settings } = useTradingSettings();
  const { tickets, create, update } = useExecutionTickets();
  const account = trainingAccount(settings.trading_capital, settings.risk_per_trade_pct);

  const [symbol, setSymbol] = useState('');
  const [setup, setSetup] = useState('Pullback');
  const [zoneLow, setZoneLow] = useState('');
  const [zoneHigh, setZoneHigh] = useState('');
  const [entry, setEntry] = useState('');
  const [stop, setStop] = useState('');
  const [target, setTarget] = useState('');
  const [invalidation, setInvalidation] = useState('');
  const [hold, setHold] = useState('');
  const [readiness, setReadiness] = useState('');
  const [signal, setSignal] = useState('GO');
  const [bias, setBias] = useState('UP');
  const [biasConf, setBiasConf] = useState('MODERATE');
  const [biasProb, setBiasProb] = useState('');
  const [eventBand, setEventBand] = useState<string>('LOW');
  const [earningsNote, setEarningsNote] = useState('');
  const [tf, setTf] = useState<Record<string, string>>({});
  const [enteredShares, setEnteredShares] = useState('');

  const sizing = sizePosition({
    capital: account.capital,
    riskPct: account.riskPct,
    entry: numOrNull(entry),
    stop: numOrNull(stop),
  });
  const shareCheck = checkShareCount(numOrNull(enteredShares), sizing.maxShares);
  const targetValue = numOrNull(target);
  const entryValue = numOrNull(entry);
  const reward =
    targetValue !== null && entryValue !== null && sizing.maxShares !== null
      ? Math.round((targetValue - entryValue) * sizing.maxShares * 100) / 100
      : null;
  const rewardRisk =
    targetValue !== null && entryValue !== null && sizing.riskPerShare
      ? Math.round(((targetValue - entryValue) / sizing.riskPerShare) * 100) / 100
      : null;
  const blockers: string[] = [];
  if (!symbol.trim()) blockers.push('Symbol not recorded');
  if (sizing.maxShares === null) blockers.push('Entry and stop not recorded');
  if (!invalidation.trim()) blockers.push('Invalidation not written down');
  if (eventBand === 'SEVERE' && !settings.advanced_mode)
    blockers.push('Severe event risk blocks a go in Beginner mode');
  if (rewardRisk !== null && rewardRisk < account.minRewardRisk)
    blockers.push(`Reward-to-risk below ${account.minRewardRisk}:1`);

  const draftTickets = tickets.filter((t) => t.status === 'DRAFT' || t.status === 'READY');

  return (
    <div className="space-y-4">
      <Card className="border-prism-amber/40 bg-prism-amber/5">
        <CardContent className="flex flex-wrap items-center gap-4 py-4 text-sm">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Training capital</p>
            <p className="text-lg font-bold tabular-nums">{money(account.capital)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Risk per trade</p>
            <p className="text-lg font-bold tabular-nums">
              {account.riskPct}% — {money(account.oneR)} = 1R
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Daily / weekly limit</p>
            <p className="text-lg font-bold tabular-nums">
              {account.dailyLossLimitR}R / {account.weeklyLossLimitR}R
            </p>
          </div>
          <div className="flex-1 min-w-[16rem] text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">SwingEdge risk limits apply.</p>
            <p>{BUYING_POWER_WARNING}</p>
          </div>
          <Button asChild size="sm" variant="ghost">
            <Link to="/swingedge/settings">Change limits</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Step 6 — Build the trade plan</CardTitle>
          <CardDescription>Every field here is written before a single click in paperMoney.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label>Symbol</Label>
              <Input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="XYZ" />
            </div>
            <div className="space-y-1">
              <Label>Setup type</Label>
              <Select value={setup} onValueChange={setSetup}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pullback">Pullback</SelectItem>
                  <SelectItem value="Breakout">Breakout</SelectItem>
                  <SelectItem value="Breakout retest">Breakout retest</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Entry zone low</Label>
              <Input value={zoneLow} onChange={(e) => setZoneLow(e.target.value)} inputMode="decimal" />
            </div>
            <div className="space-y-1">
              <Label>Entry zone high</Label>
              <Input value={zoneHigh} onChange={(e) => setZoneHigh(e.target.value)} inputMode="decimal" />
            </div>
            <div className="space-y-1">
              <Label>Planned entry</Label>
              <Input value={entry} onChange={(e) => setEntry(e.target.value)} inputMode="decimal" />
            </div>
            <div className="space-y-1">
              <Label>Stop</Label>
              <Input value={stop} onChange={(e) => setStop(e.target.value)} inputMode="decimal" />
            </div>
            <div className="space-y-1">
              <Label>Target</Label>
              <Input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" />
            </div>
            <div className="space-y-1">
              <Label>Expected holding period</Label>
              <Input value={hold} onChange={(e) => setHold(e.target.value)} placeholder="5 to 15 days" />
            </div>
            <div className="space-y-1">
              <Label>Trade readiness</Label>
              <Input value={readiness} onChange={(e) => setReadiness(e.target.value)} inputMode="numeric" placeholder="91" />
            </div>
            <div className="space-y-1">
              <Label>Signal</Label>
              <Select value={signal} onValueChange={setSignal}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['GO', 'REVIEW', 'WAIT', 'STOP'].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Directional bias</Label>
              <Select value={bias} onValueChange={setBias}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['UP', 'SIDEWAYS', 'DOWN'].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Bias probability %</Label>
              <Input value={biasProb} onChange={(e) => setBiasProb(e.target.value)} inputMode="numeric" placeholder="63" />
            </div>
            <div className="space-y-1">
              <Label>Bias confidence</Label>
              <Select value={biasConf} onValueChange={setBiasConf}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['HIGH', 'MODERATE', 'LOW'].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Event risk</Label>
              <Select value={eventBand} onValueChange={setEventBand}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_BANDS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Earnings exposure</Label>
              <Input
                value={earningsNote}
                onChange={(e) => setEarningsNote(e.target.value)}
                placeholder="Earnings in 24 days, estimated"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Object.entries(TF_OPTIONS).map(([key, options]) => (
              <div key={key} className="space-y-1">
                <Label className="uppercase">{key === 'h4' ? '4-hour' : key === 'h1' ? '1-hour' : key === 'm15' ? '15-minute' : key}</Label>
                <Select value={tf[key] ?? ''} onValueChange={(v) => setTf((p) => ({ ...p, [key]: v }))}>
                  <SelectTrigger><SelectValue placeholder="Not recorded" /></SelectTrigger>
                  <SelectContent>
                    {options.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <Label>Invalidation — what proves this trade wrong</Label>
            <Textarea
              value={invalidation}
              onChange={(e) => setInvalidation(e.target.value)}
              placeholder="A daily close below the pullback low at 48.00 ends the thesis."
              rows={2}
            />
          </div>

          <Card className="border-prism-lime/40 bg-prism-lime/5">
            <CardContent className="grid gap-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Risk per share</p>
                <p className="text-lg font-bold tabular-nums">{money(sizing.riskPerShare)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Maximum dollar risk</p>
                <p className="text-lg font-bold tabular-nums">{money(sizing.maxDollarRisk)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Maximum approved shares</p>
                <p className="text-2xl font-bold tabular-nums text-prism-lime">
                  {sizing.maxShares ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Reward-to-risk</p>
                <p className="text-lg font-bold tabular-nums">
                  {rewardRisk === null ? 'not recorded' : `${rewardRisk.toFixed(2)} : 1`}
                </p>
              </div>
              <p className="sm:col-span-2 lg:col-span-4 text-xs text-muted-foreground">{sizing.note}</p>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label>Shares you plan to type into Thinkorswim</Label>
              <Input
                className="w-40"
                value={enteredShares}
                onChange={(e) => setEnteredShares(e.target.value)}
                inputMode="numeric"
              />
            </div>
            {shareCheck.label ? (
              <Badge variant="outline" className="border-prism-rose/60 bg-prism-rose/10 text-prism-rose">
                {shareCheck.label} — {shareCheck.excess} shares over the approved size
              </Badge>
            ) : null}
          </div>

          {blockers.length > 0 ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Not ready for a ticket</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {blockers.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}

          <Button
            disabled={blockers.length > 0 || create.isPending}
            onClick={() =>
              create.mutate(
                {
                  symbol: symbol.trim(),
                  setup_type: setup,
                  status: 'DRAFT',
                  entry_zone_low: numOrNull(zoneLow),
                  entry_zone_high: numOrNull(zoneHigh),
                  planned_entry: entryValue!,
                  planned_stop: numOrNull(stop)!,
                  planned_target: targetValue,
                  risk_per_share: sizing.riskPerShare,
                  max_dollar_risk: sizing.maxDollarRisk,
                  approved_shares: sizing.maxShares,
                  position_value: sizing.positionValue,
                  potential_reward: reward,
                  reward_risk: rewardRisk,
                  training_capital: account.capital,
                  risk_pct: account.riskPct,
                  expected_hold: hold || null,
                  readiness_score: numOrNull(readiness),
                  signal,
                  bias_direction: bias,
                  bias_confidence: biasConf,
                  bias_probability: numOrNull(biasProb),
                  event_risk_band: eventBand,
                  earnings_note: earningsNote || null,
                  timeframe_weekly: tf.weekly ?? null,
                  timeframe_daily: tf.daily ?? null,
                  timeframe_h4: tf.h4 ?? null,
                  timeframe_h1: tf.h1 ?? null,
                  timeframe_m15: tf.m15 ?? null,
                  notes: invalidation || null,
                },
                { onSuccess: () => toast.success('Execution ticket created') },
              )
            }
          >
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Create Thinkorswim execution ticket
          </Button>
        </CardContent>
      </Card>

      {draftTickets.length === 0 ? (
        <p className="text-sm text-muted-foreground">No open tickets yet.</p>
      ) : (
        draftTickets.map((t) => <TicketCard key={t.id} ticket={t} onUpdate={update.mutate} />)
      )}
    </div>
  );
}

/* -------------------------------------------------------------- ticket card */

function TicketCard({
  ticket,
  onUpdate,
}: {
  ticket: ExecutionTicket;
  onUpdate: (patch: { id: string } & Record<string, unknown>) => void;
}) {
  const ticks = ticket.handoff_checklist ?? {};
  const ready = checklistComplete(ticks, HANDOFF_CHECKLIST);
  const trainingTicks = ticket.training_checklist ?? {};

  return (
    <Card className={cn(ready && 'border-prism-lime/50')}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">
            {ticket.symbol} — Thinkorswim execution plan
          </CardTitle>
          <Badge variant="outline">{ticket.status}</Badge>
        </div>
        <CardDescription>Execute this plan in Thinkorswim paperMoney.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-x-6 sm:grid-cols-2">
          <Field label="Setup" value={ticket.setup_type ?? 'not recorded'} />
          <Field
            label="Entry zone"
            value={
              ticket.entry_zone_low !== null && ticket.entry_zone_high !== null
                ? `${money(ticket.entry_zone_low)} – ${money(ticket.entry_zone_high)}`
                : 'not recorded'
            }
          />
          <Field label="Planned entry" value={money(ticket.planned_entry)} />
          <Field label="Stop" value={money(ticket.planned_stop)} />
          <Field label="Target" value={money(ticket.planned_target)} />
          <Field label="Risk per share" value={money(ticket.risk_per_share)} />
          <Field label="Maximum risk" value={money(ticket.max_dollar_risk)} />
          <Field label="Maximum shares" value={ticket.approved_shares === null ? 'not recorded' : String(ticket.approved_shares)} />
          <Field label="Potential reward" value={money(ticket.potential_reward)} />
          <Field
            label="Reward-to-risk"
            value={ticket.reward_risk === null ? 'not recorded' : `${ticket.reward_risk.toFixed(2)} : 1`}
          />
          <Field label="Daily setup" value={ticket.timeframe_daily ?? 'not recorded'} />
          <Field label="4-hour" value={ticket.timeframe_h4 ?? 'not recorded'} />
          <Field label="1-hour" value={ticket.timeframe_h1 ?? 'not recorded'} />
          <Field label="Weekly" value={ticket.timeframe_weekly ?? 'not recorded'} />
          <Field
            label="Directional bias"
            value={
              ticket.bias_direction
                ? `${ticket.bias_direction}${ticket.bias_probability !== null ? ` ${ticket.bias_probability}%` : ''} (${ticket.bias_confidence ?? 'confidence not recorded'})`
                : 'not recorded'
            }
          />
          <Field label="Event risk" value={ticket.event_risk_band ?? 'not recorded'} />
          <Field
            label="Trade readiness"
            value={ticket.readiness_score === null ? 'not recorded' : `${ticket.readiness_score} / 100`}
          />
          <Field label="Signal" value={ticket.signal ?? 'not recorded'} />
        </div>

        <CollapsibleSection
          id={`training-checklist-${ticket.id}`}
          title="Training mode checklist"
          description="Fifteen things to be true before a simulated trade."
        >
          <div className="space-y-2 pt-2">
            {TRAINING_CHECKLIST.map((item) => (
              <label key={item} className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={trainingTicks[item] === true}
                  onCheckedChange={(v) =>
                    onUpdate({
                      id: ticket.id,
                      training_checklist: { ...trainingTicks, [item]: v === true },
                    })
                  }
                />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </CollapsibleSection>

        <div className="space-y-2 rounded-lg border border-border/60 p-3">
          <p className="text-sm font-semibold">Step 11 — Thinkorswim handoff</p>
          {HANDOFF_CHECKLIST.map((item) => (
            <label key={item} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={ticks[item] === true}
                onCheckedChange={(v) =>
                  onUpdate({
                    id: ticket.id,
                    handoff_checklist: { ...ticks, [item]: v === true },
                    status: 'DRAFT',
                  })
                }
              />
              <span>{item}</span>
            </label>
          ))}
          {ready ? (
            <Alert className="border-prism-lime/50 bg-prism-lime/10">
              <CheckCircle2 className="h-4 w-4 text-prism-lime" />
              <AlertTitle>{HANDOFF_READY_LABEL}</AlertTitle>
              <AlertDescription>{BUYING_POWER_WARNING}</AlertDescription>
            </Alert>
          ) : (
            <p className="text-xs text-muted-foreground">
              Tick all nine before you leave SwingEdge.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-prism-violet/40 bg-prism-violet/5 p-3">
          <p className="mb-2 text-sm font-semibold">Step 12 — Manual execution in paperMoney</p>
          <ol className="ml-4 list-decimal space-y-1 text-sm text-muted-foreground">
            {MANUAL_EXECUTION_STEPS.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------- record a fill */

function RecordTab() {
  const { tickets, update } = useExecutionTickets();
  const open = tickets.filter((t) => t.status !== 'CLOSED');
  const [id, setId] = useState<string>('');
  const ticket = open.find((t) => t.id === id) ?? null;

  const [actualEntry, setActualEntry] = useState('');
  const [actualShares, setActualShares] = useState('');
  const [actualStop, setActualStop] = useState('');
  const [actualTarget, setActualTarget] = useState('');
  const [orderType, setOrderType] = useState('Limit');
  const [execTime, setExecTime] = useState('');

  const variance = useMemo(
    () =>
      ticket
        ? executionVariance({
            plannedEntry: ticket.planned_entry,
            actualEntry: numOrNull(actualEntry),
            plannedStop: ticket.planned_stop,
            actualStop: numOrNull(actualStop) ?? ticket.planned_stop,
            plannedShares: ticket.approved_shares,
            actualShares: numOrNull(actualShares),
            plannedTarget: ticket.planned_target,
            actualTarget: numOrNull(actualTarget) ?? ticket.planned_target,
          })
        : null,
    [ticket, actualEntry, actualShares, actualStop, actualTarget],
  );

  const shareCheck = checkShareCount(numOrNull(actualShares), ticket?.approved_shares ?? null);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Step 14 — Record the actual fill</CardTitle>
          <CardDescription>
            The fill in paperMoney is the number SwingEdge uses from here on. The planned price is not
            the fill.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Ticket</Label>
            <Select value={id} onValueChange={setId}>
              <SelectTrigger className="w-full sm:w-80">
                <SelectValue placeholder={open.length ? 'Choose a ticket' : 'No tickets yet'} />
              </SelectTrigger>
              <SelectContent>
                {open.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.symbol} — planned {money(t.planned_entry)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {ticket ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <Label>Actual entry price</Label>
                  <Input value={actualEntry} onChange={(e) => setActualEntry(e.target.value)} inputMode="decimal" />
                </div>
                <div className="space-y-1">
                  <Label>Actual shares</Label>
                  <Input value={actualShares} onChange={(e) => setActualShares(e.target.value)} inputMode="numeric" />
                </div>
                <div className="space-y-1">
                  <Label>Execution time</Label>
                  <Input value={execTime} onChange={(e) => setExecTime(e.target.value)} placeholder="10:42 ET" />
                </div>
                <div className="space-y-1">
                  <Label>Order type</Label>
                  <Select value={orderType} onValueChange={setOrderType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['Market', 'Limit', 'Stop', 'Stop limit'].map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Actual stop</Label>
                  <Input value={actualStop} onChange={(e) => setActualStop(e.target.value)} inputMode="decimal" />
                </div>
                <div className="space-y-1">
                  <Label>Actual target</Label>
                  <Input value={actualTarget} onChange={(e) => setActualTarget(e.target.value)} inputMode="decimal" />
                </div>
              </div>

              {shareCheck.label ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>POSITION SIZE VIOLATION</AlertTitle>
                  <AlertDescription>
                    {shareCheck.excess} shares more than SwingEdge approved. This lowers the execution
                    score and can turn a profitable trade into a bad win.
                  </AlertDescription>
                </Alert>
              ) : null}

              {variance ? (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Step 15 — Execution variance</CardTitle>
                      <Badge
                        variant="outline"
                        className={cn(
                          variance.band === 'LOW' && 'border-prism-lime/50 text-prism-lime',
                          variance.band === 'MODERATE' && 'border-prism-amber/50 text-prism-amber',
                          variance.band === 'HIGH' && 'border-prism-rose/60 text-prism-rose',
                        )}
                      >
                        {variance.band ?? 'NOT RECORDED'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {variance.rows.map((r) => (
                      <div key={r.label} className="grid grid-cols-4 gap-2 border-b border-border/40 py-1 text-sm">
                        <span className="text-muted-foreground">{r.label}</span>
                        <span className="tabular-nums">{r.planned ?? '—'}</span>
                        <span className="tabular-nums">{r.actual ?? '—'}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {r.difference === null ? '—' : r.difference > 0 ? `+${r.difference}` : r.difference}
                        </span>
                      </div>
                    ))}
                    {variance.notes.map((n) => (
                      <p key={n} className="text-xs text-muted-foreground">{n}</p>
                    ))}
                  </CardContent>
                </Card>
              ) : null}

              <Button
                disabled={numOrNull(actualEntry) === null || update.isPending}
                onClick={() =>
                  update.mutate(
                    {
                      id: ticket.id,
                      status: 'EXECUTED',
                      actual_entry: numOrNull(actualEntry),
                      actual_shares: numOrNull(actualShares),
                      actual_stop: numOrNull(actualStop),
                      actual_target: numOrNull(actualTarget),
                      order_type: orderType,
                      execution_time: execTime || null,
                      slippage: variance?.slippagePerShare ?? null,
                      variance_band: variance?.band ?? null,
                    },
                    { onSuccess: () => toast.success('Fill recorded against the ticket') },
                  )
                }
              >
                Save the actual fill
              </Button>
              <p className="text-xs text-muted-foreground">
                Then open the trade on the Paper Trading screen using this fill so heat, stops and the
                journal all follow the real numbers.
              </p>
              <Button asChild size="sm" variant="outline">
                <Link to="/swingedge/paper-trading">Open Paper Trading</Link>
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Steps 16 to 19 — Managing the open trade</CardTitle>
          <CardDescription>Manage on the daily and 4-hour. Never on one 15-minute candle.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ul className="ml-4 list-disc space-y-1 text-muted-foreground">
            {MANAGEMENT_RULES.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="text-muted-foreground">
            Track current price, stop, target, current R, best and worst excursion, portfolio heat,
            event changes and signal revalidation on the Paper Trading screen — every stop move is
            logged there with its reason, and a stop widened without a structural reason is recorded as
            a stop discipline violation.
          </p>
          <p className="text-muted-foreground">{TARGET_CHANGE_RULE}</p>
          <Button asChild size="sm" variant="outline">
            <Link to="/swingedge/paper-trading">Manage open trades</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------ review + session */

function ReviewTab() {
  const { trades } = useClosedRTrades();
  const { today, sessions, save } = usePracticeSessions();
  const [states, setStates] = useState<Record<string, ScoreState>>({});
  const [violations, setViolations] = useState('');
  const [pl, setPl] = useState('');

  const scored = scoreExecution(states);
  const classification = classifyResult(
    numOrNull(pl),
    violations
      .split('\n')
      .map((v) => v.trim())
      .filter(Boolean),
  );

  const [bestSkip, setBestSkip] = useState(today?.best_skip_symbol ?? '');
  const [bestSkipReason, setBestSkipReason] = useState(today?.best_skip_reason ?? '');
  const [lessons, setLessons] = useState(today?.lessons_learned ?? '');
  const [qualified, setQualified] = useState(String(today?.trades_qualified ?? ''));
  const [rejected, setRejected] = useState(String(today?.trades_rejected ?? ''));
  const [executed, setExecuted] = useState(String(today?.trades_executed ?? ''));
  const [ruleViolations, setRuleViolations] = useState(today?.rule_violations ?? '');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Steps 21 to 23 — Review and classify</CardTitle>
          <CardDescription>
            Profit and loss never decides whether the execution was good.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Dollar profit or loss</Label>
              <Input value={pl} onChange={(e) => setPl(e.target.value)} inputMode="decimal" placeholder="-50" />
            </div>
            <div className="space-y-1">
              <Label>Rule violations — one per line, blank if none</Label>
              <Textarea value={violations} onChange={(e) => setViolations(e.target.value)} rows={2} />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Execution score</p>
            {EXECUTION_COMPONENTS.map((c) => (
              <div key={c.key} className="flex items-center justify-between gap-3 border-b border-border/40 py-1.5">
                <span className="text-sm">
                  {c.label} <span className="text-muted-foreground">({c.points})</span>
                </span>
                <Select
                  value={states[c.key] ?? 'NOT_RECORDED'}
                  onValueChange={(v) => setStates((p) => ({ ...p, [c.key]: v as ScoreState }))}
                >
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PASS">Followed</SelectItem>
                    <SelectItem value="FAIL">Broken</SelectItem>
                    <SelectItem value="NOT_RECORDED">Not recorded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="border-prism-teal/40 bg-prism-teal/5">
              <CardContent className="py-4">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Execution score</p>
                <p className="text-3xl font-bold tabular-nums">
                  {scored.score === null ? 'not scored' : `${scored.score} / 100`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {scored.scored === 0
                    ? 'Nothing recorded yet.'
                    : `Judged on ${scored.scored} of 100 points.`}
                  {scored.notRecorded.length
                    ? ` Not recorded: ${scored.notRecorded.join(', ')}.`
                    : ''}
                </p>
              </CardContent>
            </Card>
            <Card
              className={cn(
                classification.rulesFollowed
                  ? 'border-prism-lime/40 bg-prism-lime/5'
                  : 'border-prism-rose/50 bg-prism-rose/5',
              )}
            >
              <CardContent className="py-4">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Classification</p>
                <p className="text-2xl font-bold">{classification.result}</p>
                <p className="text-xs text-muted-foreground">{classification.explanation}</p>
              </CardContent>
            </Card>
          </div>

          <p className="text-xs text-muted-foreground">
            {trades.length} closed practice trade{trades.length === 1 ? '' : 's'} feed expectancy and
            the Monte Carlo run.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/swingedge/journal">Trade Journal</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/swingedge/performance">Performance Review</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/swingedge/risk-lab">Risk Lab</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Steps 26 and 27 — Practice session log and best skip</CardTitle>
          <CardDescription>{BEST_SKIP_PRINCIPLE}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Trades qualified</Label>
              <Input value={qualified} onChange={(e) => setQualified(e.target.value)} inputMode="numeric" />
            </div>
            <div className="space-y-1">
              <Label>Trades rejected</Label>
              <Input value={rejected} onChange={(e) => setRejected(e.target.value)} inputMode="numeric" />
            </div>
            <div className="space-y-1">
              <Label>Trades executed</Label>
              <Input value={executed} onChange={(e) => setExecuted(e.target.value)} inputMode="numeric" />
            </div>
            <div className="space-y-1">
              <Label>Best skip — symbol</Label>
              <Input value={bestSkip} onChange={(e) => setBestSkip(e.target.value.toUpperCase())} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Best skip — why not trading was right</Label>
              <Select value={bestSkipReason} onValueChange={setBestSkipReason}>
                <SelectTrigger><SelectValue placeholder="Choose or type below" /></SelectTrigger>
                <SelectContent>
                  {BEST_SKIP_EXAMPLES.map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Rule violations today</Label>
              <Textarea value={ruleViolations} onChange={(e) => setRuleViolations(e.target.value)} rows={3} />
            </div>
            <div className="space-y-1">
              <Label>Lessons learned</Label>
              <Textarea value={lessons} onChange={(e) => setLessons(e.target.value)} rows={3} />
            </div>
          </div>
          <Button
            disabled={save.isPending}
            onClick={() =>
              save.mutate(
                {
                  trades_qualified: Number(qualified || 0),
                  trades_rejected: Number(rejected || 0),
                  trades_executed: Number(executed || 0),
                  best_skip_symbol: bestSkip || null,
                  best_skip_reason: bestSkipReason || null,
                  rule_violations: ruleViolations || null,
                  lessons_learned: lessons || null,
                },
                { onSuccess: () => toast.success('Practice session saved') },
              )
            }
          >
            Save practice session
          </Button>

          {sessions.length > 0 ? (
            <div className="space-y-2 pt-2">
              <p className="text-sm font-semibold">Recent sessions</p>
              {sessions.slice(0, 8).map((s) => (
                <div key={s.id} className="rounded-lg border border-border/60 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{s.session_date}</span>
                    <Badge variant="outline">{s.market_read ?? 'market read not recorded'}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {s.candidates_reviewed} reviewed · {s.trades_qualified} qualified ·{' '}
                    {s.trades_rejected} rejected · {s.trades_executed} executed
                    {s.best_skip_symbol ? ` · best skip ${s.best_skip_symbol}` : ''}
                  </p>
                  {s.lessons_learned ? <p className="mt-1 text-xs">{s.lessons_learned}</p> : null}
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-prism-sky/40 bg-prism-sky/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="h-4 w-4 text-prism-sky" />
            Step 24 — The improvement loop
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            {IMPROVEMENT_LOOP.map((s, i) => (
              <span key={s} className="flex items-center gap-2">
                <Badge variant="outline">{s}</Badge>
                {i < IMPROVEMENT_LOOP.length - 1 ? <ArrowRight className="h-3 w-3" /> : null}
              </span>
            ))}
          </div>
          <p className="text-muted-foreground">
            The point of paper trading is not fake profit. It is decision quality, risk discipline,
            execution skill, pattern recognition and consistency.
          </p>
          <ul className="ml-4 list-disc text-muted-foreground">
            {PRACTICE_PRINCIPLES.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------- page */

export default function PracticeLab() {
  useTradingTitle('SwingEdge + Thinkorswim Lab');
  const { settings } = useTradingSettings();
  const { cacheState, data } = useSwingEdgeDashboard();

  return (
    <div className="space-y-4">
      <SwingEdgeHeader
        title="SwingEdge + Thinkorswim Lab"
        subtitle="SwingEdge makes the decision. Thinkorswim paperMoney is where you practise the execution."
        mode={settings.data_mode}
        cacheState={cacheState}
        fetchedAt={data?.fetchedAt ?? null}
      />

      <HowToUse
        defaultOpen
        steps={[
          'Read the market first on the Prepare tab, then record what kind of market today is.',
          'Review the timeframes, scan for three to five candidates and study each one.',
          'Check event risk, then build the plan and let SwingEdge approve the share count.',
          'Tick the handoff checklist, then place that exact plan in Thinkorswim paperMoney.',
          'Come back and record the real fill, the real stop and the real exit.',
          'Score the decision and the execution separately from the money, then write one lesson.',
        ]}
        tips={[
          'Ignore the buying power paperMoney shows. Size from the training account only.',
          'A qualified trade that loses is a good trade. A rule-breaking win is not.',
        ]}
      />

      <RolesBanner />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">The workflow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {PRACTICE_STEPS.map((s) => (
              <Badge
                key={s.key}
                variant="outline"
                className={cn(
                  s.owner === 'THINKORSWIM'
                    ? 'border-prism-violet/50 text-prism-violet'
                    : 'border-prism-teal/50 text-prism-teal',
                )}
                title={s.what}
              >
                {s.title}
              </Badge>
            ))}
          </div>
          <CollapsibleSection id="practice-full-workflow" title="The full sequence, start to finish">
            <ol className="ml-4 list-decimal space-y-1 pt-2 text-sm text-muted-foreground">
              {FULL_WORKFLOW.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </CollapsibleSection>
        </CardContent>
      </Card>

      <Tabs defaultValue="prepare">
        <TabsList className="flex-wrap">
          <TabsTrigger value="prepare">1. Prepare</TabsTrigger>
          <TabsTrigger value="ticket">2. Plan &amp; ticket</TabsTrigger>
          <TabsTrigger value="record">3. Execute &amp; record</TabsTrigger>
          <TabsTrigger value="review">4. Review &amp; session</TabsTrigger>
        </TabsList>
        <TabsContent value="prepare" className="pt-4">
          <PrepareTab />
        </TabsContent>
        <TabsContent value="ticket" className="pt-4">
          <TicketTab />
        </TabsContent>
        <TabsContent value="record" className="pt-4">
          <RecordTab />
        </TabsContent>
        <TabsContent value="review" className="pt-4">
          <ReviewTab />
        </TabsContent>
      </Tabs>

      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>What this lab does not do</AlertTitle>
        <AlertDescription>
          SwingEdge does not place orders in Thinkorswim and does not try to be a trading platform.
          Every order is yours to place in paperMoney; SwingEdge grades the decision and the execution
          afterwards.
        </AlertDescription>
      </Alert>

      <NextStepsCard
        summary="One loop of the lab is one practice session."
        steps={[
          { label: 'Work the six-week course alongside the lab', to: '/swingedge/training', cta: 'Open Six-Week Training' },
          { label: 'Manage anything already open', to: '/swingedge/paper-trading', cta: 'Open Paper Trading' },
          { label: 'Check expectancy once trades are closed', to: '/swingedge/risk-lab', cta: 'Open Risk Lab' },
        ]}
      />
    </div>
  );
}
