// SwingEdge — "Your history with this". Shows what actually happened the last
// times this symbol and this kind of setup were traded. Recorded data only.

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History } from 'lucide-react';
import type { TrackRecord, TrackRecordSummary, TrackRecordTrade } from '@/lib/swingedge/trackRecord';

const SETUP_LABEL: Record<string, string> = {
  BREAKOUT: 'breakouts',
  PULLBACK: 'pullbacks',
  NONE: 'no clear setup',
};

const money = (n: number) =>
  `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function SummaryLine({ summary }: { summary: TrackRecordSummary }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span>{summary.trades} closed</span>
      <span>
        {summary.wins} up, {summary.losses} down
      </span>
      {summary.winRate !== null && <span>{summary.winRate}% went your way</span>}
      {summary.avgR !== null ? (
        <span>average {summary.avgR}× the risk taken</span>
      ) : (
        <span>risk taken was not recorded, so no average</span>
      )}
      <span className={summary.totalPl >= 0 ? 'text-prism-lime' : 'text-destructive'}>
        {money(summary.totalPl)} total
      </span>
      {summary.rulesBroken > 0 && (
        <span className="text-prism-amber">{summary.rulesBroken} off plan</span>
      )}
    </div>
  );
}

function TradeRow({ trade }: { trade: TrackRecordTrade }) {
  const pl = trade.realizedPl ?? 0;
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">
          {trade.symbol}
          {trade.setup ? ` · ${trade.setup.toLowerCase()}` : ''}
        </span>
        <span className={pl >= 0 ? 'text-sm text-prism-lime' : 'text-sm text-destructive'}>
          {money(pl)}
          {trade.r !== null ? ` (${trade.r}×)` : ''}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Held {trade.entryDate} to {trade.exitDate}
        {trade.exitReason ? ` · exited on ${trade.exitReason.toLowerCase()}` : ''}
        {trade.rulesFollowed === false ? ' · you noted this one went off plan' : ''}
      </p>
      {trade.mistake && <p className="mt-1 text-xs text-prism-amber">Mistake noted: {trade.mistake}</p>}
      {trade.lesson && <p className="mt-1 text-xs text-foreground/80">Lesson: {trade.lesson}</p>}
    </div>
  );
}

interface Props {
  record: TrackRecord;
  className?: string;
}

export default function TrackRecordCard({ record, className }: Props) {
  const setupName = record.setup ? (SETUP_LABEL[record.setup] ?? record.setup.toLowerCase()) : null;

  return (
    <Card className={className ?? 'border-border/60 bg-card/60 backdrop-blur'}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4 text-prism-violet" />
          Your history with this
          {record.hasHistory && (
            <Badge variant="outline" className="ml-1 text-[10px]">
              from your own trades
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          What happened the last times you traded {record.symbol ?? 'this name'}
          {setupName ? ` and this kind of setup (${setupName})` : ''}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!record.hasHistory && (
          <p className="text-sm text-muted-foreground">
            You have no closed practice trades for {record.symbol ?? 'this name'}
            {setupName ? ` or for ${setupName}` : ''} yet. Once you close one, it will show up here
            so you can see how it actually went before you do it again.
          </p>
        )}

        {record.symbolTrades.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              This name
            </p>
            <SummaryLine summary={record.symbolSummary} />
            <div className="space-y-2">
              {record.symbolTrades.map((t) => (
                <TradeRow key={t.id} trade={t} />
              ))}
            </div>
          </div>
        )}

        {record.setupTrades.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              This kind of setup{setupName ? ` — ${setupName}` : ''}
            </p>
            <SummaryLine summary={record.setupSummary} />
            <div className="space-y-2">
              {record.setupTrades.map((t) => (
                <TradeRow key={t.id} trade={t} />
              ))}
            </div>
          </div>
        )}

        {record.mistakes.length > 0 && (
          <div className="rounded-md border border-prism-amber/40 bg-prism-amber/5 p-3">
            <p className="text-xs font-medium">Mistakes you have already written down</p>
            <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
              {record.mistakes.map((m) => (
                <li key={m}>· {m}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
