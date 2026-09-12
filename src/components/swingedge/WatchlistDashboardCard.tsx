import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';
import ScoredSymbolTable from '@/components/swingedge/ScoredSymbolTable';
import CollapsibleSection from '@/components/swingedge/CollapsibleSection';
import { useScoredSymbols, useWatchlists } from '@/hooks/use-swingedge-lists';

/** Your own watchlist, priced and scored, on the trading dashboard. */
export default function WatchlistDashboardCard() {
  const { lists, itemsFor, isLoading } = useWatchlists();
  const [activeId, setActiveId] = useState<string | null>(null);

  const currentId = activeId && lists.some((l) => l.id === activeId) ? activeId : lists[0]?.id ?? null;
  const symbols = useMemo(
    () => (currentId ? itemsFor(currentId).map((i) => i.symbol).slice(0, 12) : []),
    [currentId, itemsFor],
  );
  const { rows, isLoading: scoring, isFetching, refetch } = useScoredSymbols(symbols);

  return (
    <CollapsibleSection
      id="dash-watchlist"
      title="Your watchlist today"
      description="Only QUALIFIES and WATCH rows are worth opening. Everything else is a pass."
      headerRight={
        <span className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching || !symbols.length}>
            <RefreshCw className={isFetching ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
            Refresh
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/swingedge/watchlists">Manage lists</Link>
          </Button>
        </span>
      }
    >
      <div className="space-y-3 pt-1">
        {lists.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            {lists.map((l) => (
              <Button
                key={l.id}
                variant={l.id === currentId ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveId(l.id)}
              >
                {l.name}
                <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-[10px]">
                  {itemsFor(l.id).length}
                </Badge>
              </Button>
            ))}
          </div>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading your lists…</p>
        ) : lists.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No watchlists yet.{' '}
            <Link to="/swingedge/watchlists" className="underline">
              Create one
            </Link>{' '}
            and add a handful of names you follow.
          </p>
        ) : (
          <ScoredSymbolTable
            rows={rows}
            isLoading={scoring}
            emptyMessage="This list has no symbols yet."
          />
        )}
      </div>
    </CollapsibleSection>
  );
}
