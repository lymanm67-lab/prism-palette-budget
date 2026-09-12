import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Pause, Radio, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
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
import HowToUse from '@/components/swingedge/HowToUse';
import { cn } from '@/lib/utils';
import { useCuratedUniverse, useTradingSettings, useTradingTitle } from '@/hooks/use-swingedge';
import { useWatchlists } from '@/hooks/use-swingedge-lists';
import {
  LIVE_INTERVALS,
  useLiveQuotes,
  useMarketStatus,
  type LiveInterval,
  type LiveRow,
} from '@/hooks/use-swingedge-live';

const money = (n: number | null | undefined) =>
  n === null || n === undefined || !Number.isFinite(n)
    ? '—'
    : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const pct = (n: number | null | undefined) =>
  n === null || n === undefined || !Number.isFinite(n) ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;

const volume = (n: number | null | undefined) =>
  n === null || n === undefined || !Number.isFinite(n)
    ? '—'
    : n.toLocaleString('en-US', { maximumFractionDigits: 0 });

const timeLabel = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
      })
    : '—';

const tone = (change: number | null | undefined) =>
  change === null || change === undefined || change === 0
    ? 'text-muted-foreground'
    : change > 0
      ? 'text-prism-lime'
      : 'text-prism-orange';

function TickerStrip({ rows }: { rows: LiveRow[] }) {
  if (!rows.length) return null;
  // The list is rendered twice so the scroll loops without a visible seam.
  const doubled = [...rows, ...rows];
  return (
    <div
      className="overflow-hidden rounded-xl border bg-card py-2"
      role="marquee"
      aria-label="Live price ticker"
    >
      <div className="flex w-max animate-ticker-scroll gap-8 pr-8 motion-reduce:animate-none">
        {doubled.map((r, i) => (
          <span key={`${r.symbol}-${i}`} className="flex items-center gap-2 text-sm whitespace-nowrap">
            <span className="font-semibold">{r.symbol}</span>
            <span>{money(r.price)}</span>
            <span className={cn('font-medium', tone(r.change))}>
              {r.change > 0 ? '▲' : r.change < 0 ? '▼' : '•'} {pct(r.changePercent)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function LiveData() {
  useTradingTitle('Live Data');
  const qc = useQueryClient();
  const { settings } = useTradingSettings();
  const { data: universe = [] } = useCuratedUniverse();
  const { lists, itemsFor } = useWatchlists();
  const { data: status } = useMarketStatus();

  const [source, setSource] = useState<string>('CURATED');
  const [interval, setInterval] = useState<LiveInterval>(60_000);

  const symbols = useMemo(() => {
    if (source === 'CURATED') return universe.map((u) => u.symbol);
    return itemsFor(source).map((i) => i.symbol);
  }, [source, universe, itemsFor]);

  const marketOpen = status?.isOpen ?? false;
  const live = useLiveQuotes(symbols, interval, marketOpen);

  const sorted = useMemo(
    () => [...live.rows].sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0)),
    [live.rows],
  );

  const movers = sorted.filter((r) => Math.abs(r.changePercent ?? 0) >= 1);

  const refreshScanner = () => {
    qc.invalidateQueries({ queryKey: ['se-scored-symbols'] });
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">Live Data</h1>
          <Badge
            variant="outline"
            className={cn(
              'gap-1 font-semibold',
              marketOpen ? 'border-prism-lime/50 text-prism-lime' : 'text-muted-foreground',
            )}
          >
            {marketOpen ? <Radio className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            {marketOpen ? 'Market open' : 'Market closed'}
          </Badge>
          <Badge variant="outline" className="font-semibold">
            {settings.data_mode === 'LIVE' ? 'LIVE DATA' : 'SAMPLE DATA'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Current prices for the list you are watching, so your scan results never sit behind the
          market. Prices are information, not a signal to act.
        </p>
        <p className="text-xs text-muted-foreground">
          Last update: <span className="font-medium">{timeLabel(live.fetchedAt)}</span>
          {' · '}
          {live.polling
            ? `updating ${LIVE_INTERVALS.find((i) => i.value === interval)?.label.toLowerCase()}`
            : marketOpen
              ? 'automatic updates off'
              : 'paused while the market is closed'}
        </p>
      </header>

      <HowToUse
        title="How to use Live Data"
        steps={[
          'Pick the list you are watching today: the built-in liquid names or one of your watchlists.',
          'Choose how often prices refresh. Slower is usually enough for swing trading.',
          'Watch for names moving 1% or more — those are the ones whose scan result may be out of date.',
          'Refresh the scanner, then re-check any name that moved in the Stock Analyzer before acting.',
        ]}
        tips={[
          `Each refresh reads up to ${live.maxSymbols} symbols in one call, which is your per-minute data allowance.`,
          'Updates stop when the market is closed or this tab is in the background, so nothing is spent needlessly.',
        ]}
      />

      <TickerStrip rows={sorted} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">What to watch and how often</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="w-72" aria-label="List to watch">
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

            <Select
              value={String(interval)}
              onValueChange={(v) => setInterval(Number(v) as LiveInterval)}
            >
              <SelectTrigger className="w-56" aria-label="Refresh frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIVE_INTERVALS.map((i) => (
                  <SelectItem key={i.value} value={String(i.value)}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={live.refresh} disabled={live.isFetching}>
              <RefreshCw className={cn('mr-2 h-4 w-4', live.isFetching && 'animate-spin')} />
              Refresh now
            </Button>
          </div>

          {live.skipped > 0 ? (
            <p className="text-xs text-muted-foreground">
              Watching the first {live.watched.length} names. {live.skipped} more are left out to stay
              inside your per-minute data allowance — use a shorter watchlist to follow a different
              set.
            </p>
          ) : null}
          {live.notice ? <p className="text-xs text-prism-amber">{live.notice}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Prices ({sorted.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No prices yet. Choose a list and press Refresh now.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead className="text-right">Day %</TableHead>
                  <TableHead className="text-right">Previous close</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-right">Analyze</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((r) => (
                  <TableRow
                    key={r.symbol}
                    className={cn(
                      'transition-colors',
                      r.tick === 'up' && 'bg-prism-lime/5',
                      r.tick === 'down' && 'bg-prism-orange/5',
                    )}
                  >
                    <TableCell className="font-semibold">
                      <span className="flex items-center gap-1">
                        {r.tick === 'up' ? (
                          <TrendingUp className="h-3 w-3 text-prism-lime" />
                        ) : r.tick === 'down' ? (
                          <TrendingDown className="h-3 w-3 text-prism-orange" />
                        ) : null}
                        {r.symbol}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{money(r.price)}</TableCell>
                    <TableCell className={cn('text-right', tone(r.change))}>
                      {money(r.change)}
                    </TableCell>
                    <TableCell className={cn('text-right font-medium', tone(r.change))}>
                      {pct(r.changePercent)}
                    </TableCell>
                    <TableCell className="text-right">{money(r.previousClose)}</TableCell>
                    <TableCell className="text-right">{volume(r.volume)}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="ghost">
                        <Link to={`/swingedge/analyzer?symbol=${r.symbol}`}>Analyze</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">What to do next</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            {movers.length
              ? `${movers.length} of the names you are watching have moved 1% or more today (${movers
                  .slice(0, 4)
                  .map((m) => m.symbol)
                  .join(', ')}). Any earlier scan result for those is probably out of date.`
              : 'Nothing you are watching has moved much today, so earlier scan results are still usable.'}
          </p>
          <ol className="space-y-3">
            <li className="flex flex-wrap items-center gap-3">
              <span className="font-medium">1. Clear the old scan prices</span>
              <Button size="sm" variant="outline" onClick={refreshScanner}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh scanner data
              </Button>
            </li>
            <li className="flex flex-wrap items-center gap-3">
              <span className="font-medium">2. Run the scan again</span>
              <Button asChild size="sm" variant="outline">
                <Link to="/swingedge/scanner">
                  Open Market Scanner
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </li>
            <li className="flex flex-wrap items-center gap-3">
              <span className="font-medium">3. Study the best one or two names</span>
              <Button asChild size="sm" variant="outline">
                <Link
                  to={
                    movers.length
                      ? `/swingedge/analyzer?symbol=${movers[0].symbol}`
                      : '/swingedge/analyzer'
                  }
                >
                  Open Stock Analyzer
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </li>
          </ol>
          <p className="text-xs text-muted-foreground">
            A fast-moving price is a reason to re-check a setup, never a reason to chase it.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
