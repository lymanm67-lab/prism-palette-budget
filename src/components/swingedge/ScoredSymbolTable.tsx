import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VERDICT_MEANING, VERDICT_TONE, scoreTone } from '@/lib/swingedge/score';
import { VERDICT_LABEL, type TrendState } from '@/lib/swingedge/types';
import type { ScoredSymbol } from '@/hooks/use-swingedge-lists';

const TREND_TONE: Record<TrendState, string> = {
  UP: 'text-prism-lime',
  DOWN: 'text-prism-rose',
  SIDEWAYS: 'text-muted-foreground',
};

const price = (n: number | null) => (n === null ? '—' : `$${n.toFixed(2)}`);

interface Props {
  rows: ScoredSymbol[];
  isLoading?: boolean;
  /** Called with the row's item id when a remove control should be shown. */
  onRemove?: (symbol: string) => void;
  removingSymbol?: string | null;
  emptyMessage?: string;
  showEstimates?: boolean;
}

export default function ScoredSymbolTable({
  rows,
  isLoading,
  onRemove,
  removingSymbol,
  emptyMessage = 'No symbols yet.',
  showEstimates = true,
}: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const sorted = rows.slice().sort((a, b) => b.score - a.score);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Symbol</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Day</TableHead>
            <TableHead className="text-right">Score</TableHead>
            <TableHead>Verdict</TableHead>
            <TableHead>Trend</TableHead>
            <TableHead>Setup</TableHead>
            {showEstimates ? <TableHead className="text-right">Est. entry / stop / target</TableHead> : null}
            <TableHead className="w-16" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((r) => (
            <TableRow key={r.symbol}>
              <TableCell className="font-semibold">
                <Link to={`/swingedge/analyzer?symbol=${r.symbol}`} className="hover:underline">
                  {r.symbol}
                </Link>
              </TableCell>
              <TableCell className="text-right tabular-nums">{price(r.price)}</TableCell>
              <TableCell
                className={cn(
                  'text-right tabular-nums',
                  (r.changePercent ?? 0) > 0
                    ? 'text-prism-lime'
                    : (r.changePercent ?? 0) < 0
                      ? 'text-prism-rose'
                      : 'text-muted-foreground',
                )}
              >
                {r.changePercent === null ? '—' : `${r.changePercent > 0 ? '+' : ''}${r.changePercent.toFixed(2)}%`}
              </TableCell>
              <TableCell className="text-right">
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <span className={cn('font-bold tabular-nums', scoreTone(r.score))}>
                      {r.insufficientData ? '—' : r.score}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="mb-1 font-semibold">How this score is built</p>
                    {r.components.length ? (
                      <ul className="space-y-0.5 text-xs">
                        {r.components.map((c) => (
                          <li key={c.key}>
                            {c.label}: {c.points}/{c.max}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs">Not enough price history yet.</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TableCell>
              <TableCell>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className={cn('font-semibold', VERDICT_TONE[r.verdict])}>
                      {VERDICT_LABEL[r.verdict]}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    {VERDICT_MEANING[r.verdict]}
                  </TooltipContent>
                </Tooltip>
              </TableCell>
              <TableCell className={cn('font-medium', TREND_TONE[r.trend])}>{r.trend}</TableCell>
              <TableCell className="text-muted-foreground">
                {r.setup === 'NONE' ? 'None' : r.setup === 'BREAKOUT' ? 'Breakout' : 'Pullback'}
              </TableCell>
              {showEstimates ? (
                <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                  {r.levels
                    ? `${price(r.levels.estimatedEntry)} / ${price(r.levels.estimatedStop)} / ${price(r.levels.estimatedTarget)}`
                    : '—'}
                </TableCell>
              ) : null}
              <TableCell className="text-right">
                {onRemove ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${r.symbol}`}
                    disabled={removingSymbol === r.symbol}
                    onClick={() => onRemove(r.symbol)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {showEstimates ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Entry, stop and target here are estimates for comparison only. Your real numbers come from the
          Trade Planner, where your own capital and risk settings are applied.
        </p>
      ) : null}
    </div>
  );
}
