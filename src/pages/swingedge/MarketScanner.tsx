import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, Play, RefreshCw, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import HowToUse from '@/components/swingedge/HowToUse';
import AiLevelsAssistant from '@/components/swingedge/AiLevelsAssistant';
import TradeGeometryPanel from '@/components/swingedge/TradeGeometryPanel';
import { useTradingSettings, useTradingTitle, useCuratedUniverse } from '@/hooks/use-swingedge';
import { useScoredSymbols, useWatchlists, type ScoredSymbol } from '@/hooks/use-swingedge-lists';
import { useEarningsCalendar, useMacroWindow } from '@/hooks/use-swingedge-events';
import { assessEventRisk, type EventRiskResult } from '@/lib/swingedge/eventRisk';
import { assessStop } from '@/lib/swingedge/stops';
import {
  computeGeometry,
  targetCellText,
  REWARD_MULTIPLES,
  TARGET_PATH_LABEL,
  TARGET_QUALITY_LABEL,
  TARGET_QUALITY_RANK,
  type GeometryResult,
  type TargetPath,
} from '@/lib/swingedge/tradeGeometry';
import { VERDICT_MEANING, VERDICT_TONE } from '@/lib/swingedge/score';
import { VERDICT_LABEL, type Verdict } from '@/lib/swingedge/types';


const money = (n: number | null | undefined) =>
  n === null || n === undefined
    ? '—'
    : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

type Filter = 'ALL' | Verdict;

/** Saved combinations of filters, so a routine scan is one click. */
type Preset = 'NONE' | 'LOW_EVENT_PULLBACKS';

const PRESET_LABEL: Record<Preset, string> = {
  NONE: 'No preset — show everything',
  LOW_EVENT_PULLBACKS: 'Low event risk pullbacks',
};

const BIAS_TONE: Record<string, string> = {
  UP: 'text-emerald-500',
  DOWN: 'text-destructive',
  SIDEWAYS: 'text-muted-foreground',
};

const EVENT_TONE: Record<string, string> = {
  LOW: 'text-emerald-500',
  MODERATE: 'text-amber-500',
  HIGH: 'text-orange-500',
  SEVERE: 'text-destructive',
};

const VERDICT_RANK: Record<Verdict, number> = {
  QUALIFIES: 0,
  WATCH: 1,
  NOT_READY: 2,
  DOES_NOT_QUALIFY: 3,
};

export default function MarketScanner() {
  useTradingTitle('Market Scanner');
  const { settings } = useTradingSettings();
  const { data: universe = [] } = useCuratedUniverse();
  const { lists, itemsFor } = useWatchlists();

  const [source, setSource] = useState<string>('CURATED');
  const [running, setRunning] = useState<string[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [preset, setPreset] = useState<Preset>('NONE');

  const selected = useMemo(() => {
    if (source === 'CURATED') return universe.map((u) => u.symbol);
    return itemsFor(source).map((i) => i.symbol);
  }, [source, universe, itemsFor]);

  const { rows, notice, isFetching, refetch, fetchedAt } = useScoredSymbols(running, 4);

  // Event risk for the scanned names. One calendar call covers the whole list.
  const earnings = useEarningsCalendar(running);
  const macroEvents = useMacroWindow(30);

  const eventBySymbol = useMemo(() => {
    const out: Record<string, EventRiskResult> = {};
    for (const r of rows) {
      out[r.symbol] = assessEventRisk({
        symbol: r.symbol,
        sector: null,
        holdingDays: 10,
        earnings: earnings.bySymbol[r.symbol] ?? null,
        events: macroEvents,
        mode: settings.advanced_mode ? 'ADVANCED' : 'BEGINNER',
      });
    }
    return out;
  }, [rows, earnings.bySymbol, macroEvents, settings.advanced_mode]);

  const shown = useMemo(() => {
    let list = filter === 'ALL' ? rows : rows.filter((r) => r.verdict === filter);
    if (preset === 'LOW_EVENT_PULLBACKS') {
      list = list.filter((r) => {
        const ev = eventBySymbol[r.symbol];
        const lowEvent = !ev || ev.band === 'LOW';
        const pullback = r.setup === 'PULLBACK';
        const upBias = !r.bias || r.bias.direction === 'UP';
        const worthStudying = r.verdict === 'QUALIFIES' || r.verdict === 'WATCH';
        return lowEvent && pullback && upBias && worthStudying;
      });
    }
    return [...list].sort(
      (a, b) => VERDICT_RANK[a.verdict] - VERDICT_RANK[b.verdict] || b.score - a.score,
    );
  }, [rows, filter, preset, eventBySymbol]);

  const counts = useMemo(() => {
    const base: Record<Verdict, number> = {
      QUALIFIES: 0,
      WATCH: 0,
      NOT_READY: 0,
      DOES_NOT_QUALIFY: 0,
    };
    rows.forEach((r) => {
      base[r.verdict] += 1;
    });
    return base;
  }, [rows]);

  const batches = Math.max(1, Math.ceil(selected.length / 4));

  const nextCandidate =
    shown.find((r) => r.verdict === 'QUALIFIES') ?? shown.find((r) => r.verdict === 'WATCH');

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Market Scanner</h1>
        <p className="text-sm text-muted-foreground">
          Narrow a small, deliberate list of liquid names down to the few worth studying today. This
          is never a whole-market sweep, and nothing here is a decision.
        </p>
      </header>

      <HowToUse
        title="How to use the Market Scanner"
        steps={[
          'Check the Trading Dashboard first. If the market is weak, expect fewer names to qualify and take fewer of them.',
          'Choose which list to scan: the built-in list of liquid names, or one of your own watchlists.',
          'Run the scan once, then study the results instead of re-running it.',
          'Start with QUALIFIES rows. WATCH means the setup is forming, not ready.',
          'Treat the entry, stop, target and reward-to-risk as rough estimates, then open the two or three best names in the Stock Analyzer.',
        ]}
        tips={[
          'A scan uses part of your per-minute data allowance, so it runs in small batches.',
          'Stored prices are reused whenever they are still fresh.',
        ]}
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Choose a list and run the scan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="w-72" aria-label="List to scan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CURATED">
                  Built-in liquid list ({universe.length} names)
                </SelectItem>
                {lists.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name} ({itemsFor(l.id).length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setRunning(selected)} disabled={!selected.length || isFetching}>
              <Play className="mr-2 h-4 w-4" /> Run scan
            </Button>
            {running.length > 0 && (
              <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className="mr-2 h-4 w-4" /> Re-run
              </Button>
            )}
            {isFetching && (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Reading prices…
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={preset} onValueChange={(v) => setPreset(v as Preset)}>
              <SelectTrigger className="w-72" aria-label="Result preset">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">{PRESET_LABEL.NONE}</SelectItem>
                <SelectItem value="LOW_EVENT_PULLBACKS">{PRESET_LABEL.LOW_EVENT_PULLBACKS}</SelectItem>
              </SelectContent>
            </Select>
            {preset === 'LOW_EVENT_PULLBACKS' && (
              <span className="text-xs text-muted-foreground">
                Pullbacks that qualify or are forming, with an upward tendency and a clear calendar.
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {selected.length} symbols · read {4} at a time in {batches} batch
            {batches === 1 ? '' : 'es'} · your allowance is {settings.api_minute_limit} calls a
            minute · data mode {settings.data_mode.toLowerCase()}
            {fetchedAt ? ` · prices from ${new Date(fetchedAt).toLocaleString()}` : ''}
          </p>
          {notice && <p className="text-xs text-amber-500">{notice}</p>}
        </CardContent>
      </Card>

      {running.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Pick a list above and press Run scan. Nothing is fetched until you do.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="gap-3 pb-3">
            <CardTitle className="text-base">
              Results {rows.length > 0 && <span className="text-muted-foreground">({rows.length})</span>}
            </CardTitle>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <TabsList className="flex-wrap">
                <TabsTrigger value="ALL">All</TabsTrigger>
                <TabsTrigger value="QUALIFIES">Qualifies ({counts.QUALIFIES})</TabsTrigger>
                <TabsTrigger value="WATCH">Watch ({counts.WATCH})</TabsTrigger>
                <TabsTrigger value="NOT_READY">Not ready ({counts.NOT_READY})</TabsTrigger>
                <TabsTrigger value="DOES_NOT_QUALIFY">
                  Doesn't qualify ({counts.DOES_NOT_QUALIFY})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Day</TableHead>
                    <TableHead>Setup</TableHead>
                    <TableHead>Bias</TableHead>
                    <TableHead>Event risk</TableHead>
                    <TableHead className="text-right">Est. entry</TableHead>
                    <TableHead className="text-right">Est. stop</TableHead>
                    <TableHead className="text-right">Est. target</TableHead>
                    <TableHead className="text-right">Est. risk / share</TableHead>
                    <TableHead className="text-right">Est. R:R</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={14} className="py-8 text-center text-sm text-muted-foreground">
                        {isFetching
                          ? 'Scanning…'
                          : preset === 'LOW_EVENT_PULLBACKS'
                            ? 'No names match this preset. That is a valid result.'
                            : 'No rows with this status.'}
                      </TableCell>
                    </TableRow>
                  )}
                  {shown.map((r) => {
                    const risk = r.levels
                      ? Math.round((r.levels.estimatedEntry - r.levels.estimatedStop) * 100) / 100
                      : null;
                    const ev = eventBySymbol[r.symbol] ?? null;
                    const days = ev?.earnings.daysUntil ?? null;
                    return (
                      <TableRow key={r.symbol}>
                        <TableCell className="font-medium">{r.symbol}</TableCell>
                        <TableCell>
                          <Badge className={VERDICT_TONE[r.verdict]} title={VERDICT_MEANING[r.verdict]}>
                            {VERDICT_LABEL[r.verdict]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{r.insufficientData ? '—' : r.score}</TableCell>
                        <TableCell className="text-right">{money(r.price)}</TableCell>
                        <TableCell
                          className={`text-right ${
                            (r.changePercent ?? 0) < 0 ? 'text-destructive' : 'text-emerald-500'
                          }`}
                        >
                          {r.changePercent === null ? '—' : `${r.changePercent.toFixed(2)}%`}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.setup === 'NONE' ? 'No setup' : r.setup} · {r.trend.toLowerCase()}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.bias && r.bias.confidence !== 'INSUFFICIENT_DATA' ? (
                            <span
                              className={BIAS_TONE[r.bias.direction]}
                              title={`${r.bias.leadingPct}% of ${r.bias.independentEpisodes} similar past episodes, ${r.bias.confidence.toLowerCase()} confidence`}
                            >
                              {r.bias.direction === 'UP'
                                ? 'Up'
                                : r.bias.direction === 'DOWN'
                                  ? 'Down'
                                  : 'Sideways'}{' '}
                              {r.bias.leadingPct}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Not enough history</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {ev ? (
                            <span
                              className={EVENT_TONE[ev.band]}
                              title={ev.lines[0] ?? 'Event risk read from the calendar.'}
                            >
                              {ev.band === 'LOW'
                                ? 'Low'
                                : ev.band === 'MODERATE'
                                  ? 'Moderate'
                                  : ev.band === 'HIGH'
                                    ? 'High'
                                    : 'Severe'}
                              {days !== null ? ` · earnings in ${days}d` : ''}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right italic text-muted-foreground">
                          {money(r.levels?.estimatedEntry)}
                        </TableCell>
                        <TableCell className="text-right italic text-muted-foreground">
                          {money(r.levels?.estimatedStop)}
                        </TableCell>
                        <TableCell className="text-right italic text-muted-foreground">
                          {money(r.levels?.estimatedTarget)}
                        </TableCell>
                        <TableCell className="text-right italic text-muted-foreground">
                          {money(risk)}
                        </TableCell>
                        <TableCell className="text-right italic text-muted-foreground">
                          {r.levels ? `${r.levels.projectedRewardRisk.toFixed(1)} : 1` : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="ghost">
                            <Link to={`/swingedge/analyzer?symbol=${r.symbol}`}>
                              <Search className="mr-1 h-3.5 w-3.5" /> Analyze
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs italic text-muted-foreground">
        Every entry, stop, target and reward-to-risk shown here is an estimate from the chart, shown
        in italics. Planned numbers are the ones you set yourself in the Trade Planner.
      </p>

      {running.length > 0 && rows.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">What to do next</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {counts.QUALIFIES > 0 ? (
              <p className="text-muted-foreground">
                {counts.QUALIFIES} name{counts.QUALIFIES === 1 ? '' : 's'} qualif
                {counts.QUALIFIES === 1 ? 'ies' : 'y'} right now. Open the best one or two in the
                Stock Analyzer to confirm the setup yourself, then write your own entry, stop and
                target in the Trade Planner. Never take the scan's numbers as-is.
              </p>
            ) : counts.WATCH > 0 ? (
              <p className="text-muted-foreground">
                Nothing qualifies yet, but {counts.WATCH} setup
                {counts.WATCH === 1 ? ' is' : 's are'} forming. Open them in the Stock Analyzer to
                see what needs to happen, then re-scan tomorrow instead of forcing a trade today.
              </p>
            ) : (
              <p className="text-muted-foreground">
                Nothing qualified in this list. That is a valid result — a good day to study the
                Academy or review past trades rather than hunt for a weaker setup.
              </p>
            )}
            <ol className="space-y-2">
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  1
                </span>
                <span className="flex-1 text-muted-foreground">
                  Confirm the setup and trend yourself
                </span>
                <Button asChild size="sm" variant="outline">
                  <Link
                    to={
                      nextCandidate
                        ? `/swingedge/analyzer?symbol=${nextCandidate.symbol}`
                        : '/swingedge/analyzer'
                    }
                  >
                    Open Analyzer <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  2
                </span>
                <span className="flex-1 text-muted-foreground">
                  Write your own entry, stop and target — this gives you share size and dollar risk
                </span>
                <Button asChild size="sm" variant="outline">
                  <Link to="/swingedge/planner">
                    Open Trade Planner <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  3
                </span>
                <span className="flex-1 text-muted-foreground">
                  Take it on paper, then journal what happened
                </span>
                <Button asChild size="sm" variant="outline">
                  <Link to="/swingedge/journal">
                    Open Journal <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </li>
            </ol>
          </CardContent>
        </Card>
      )}

      <AiLevelsAssistant
        page="Market Scanner"
        symbol={nextCandidate?.symbol ?? null}
        price={nextCandidate?.price ?? null}
        rules={
          nextCandidate?.levels
            ? {
                entry: nextCandidate.levels.estimatedEntry,
                stop: nextCandidate.levels.estimatedStop,
                target: nextCandidate.levels.estimatedTarget,
                rewardRisk: nextCandidate.levels.projectedRewardRisk,
              }
            : null
        }
        context={
          nextCandidate
            ? {
                verdict: nextCandidate.verdict,
                score: nextCandidate.score,
                setup: nextCandidate.setup,
                changePercent: nextCandidate.changePercent,
                trend: nextCandidate.trend,
                rsi: nextCandidate.rsi,
                atr: nextCandidate.atr,
                support: nextCandidate.support,
                resistance: nextCandidate.resistance,
                relativeVolume: nextCandidate.relativeVolume,
                reasons: nextCandidate.reasons,
                risks: nextCandidate.risks,
                levelsAreEstimates: true,
              }
            : null
        }
      />
    </div>
  );
}
