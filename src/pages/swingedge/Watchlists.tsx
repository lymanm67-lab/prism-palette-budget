import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Info, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import SwingEdgeHeader from '@/components/swingedge/SwingEdgeHeader';
import HowToUse from '@/components/swingedge/HowToUse';
import AiLevelsAssistant from '@/components/swingedge/AiLevelsAssistant';
import ScoredSymbolTable from '@/components/swingedge/ScoredSymbolTable';
import { useTradingTitle } from '@/hooks/use-swingedge';
import { useScoredSymbols, useWatchlists } from '@/hooks/use-swingedge-lists';
import { cacheStatus } from '@/lib/swingedge/cache';
import { useSymbolRoles } from '@/hooks/use-swingedge-roles';
import { RoleBadge, StatusBadge } from '@/components/swingedge/SymbolRoleControls';
import { PORTFOLIO_ROLES, TRADING_STATUSES, statusMeta } from '@/lib/swingedge/roles';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function Watchlists() {
  useTradingTitle('Watchlists');
  const {
    lists,
    itemsFor,
    isLoading,
    createList,
    deleteList,
    addSymbol,
    removeSymbol,
    isWorking,
  } = useWatchlists();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const { roles, roleFor, history } = useSymbolRoles();

  const currentId = activeId && lists.some((l) => l.id === activeId) ? activeId : lists[0]?.id ?? null;
  const currentList = lists.find((l) => l.id === currentId) ?? null;
  const items = useMemo(() => (currentId ? itemsFor(currentId) : []), [currentId, itemsFor]);
  const symbols = useMemo(() => items.map((i) => i.symbol), [items]);

  const { rows, notice, isLoading: scoring, isFetching, refetch, mode, fetchedAt } =
    useScoredSymbols(symbols);

  const filteredRows = useMemo(
    () =>
      rows.filter((r) => {
        const meta = roleFor(r.symbol);
        const role = meta?.portfolio_role ?? 'UNASSIGNED';
        const status = meta?.trading_status ?? 'SCAN_UNIVERSE';
        if (roleFilter !== 'ALL' && role !== roleFilter) return false;
        if (statusFilter !== 'ALL' && status !== statusFilter) return false;
        return true;
      }),
    [rows, roleFilter, statusFilter, roles],
  );

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    try {
      await createList({ name: newListName });
      setNewListName('');
      toast.success('List created');
    } catch {
      toast.error('Could not create that list');
    }
  };

  const handleAddSymbol = async () => {
    const symbol = newSymbol.trim().toUpperCase();
    if (!symbol || !currentId) return;
    if (symbols.includes(symbol)) {
      toast.info(`${symbol} is already on this list`);
      return;
    }
    try {
      await addSymbol({ watchlistId: currentId, symbol });
      setNewSymbol('');
      toast.success(`${symbol} added`);
    } catch {
      toast.error('Could not add that symbol');
    }
  };

  const handleRemoveSymbol = async (symbol: string) => {
    const item = items.find((i) => i.symbol === symbol);
    if (!item) return;
    try {
      await removeSymbol(item.id);
      toast.success(`${symbol} removed`);
    } catch {
      toast.error('Could not remove that symbol');
    }
  };

  return (
    <div className="space-y-6">
      <SwingEdgeHeader
        title="Watchlists"
        subtitle="A short list of names you actually follow, priced and scored."
        mode={mode}
        cacheState={cacheStatus(fetchedAt, '1day')}
        fetchedAt={fetchedAt}
        right={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
            Refresh
          </Button>
        }
      />

      {mode === 'DEMO' ? (
        <Alert className="border-prism-amber/40">
          <Info className="h-4 w-4" />
          <AlertTitle>Demo data</AlertTitle>
          <AlertDescription>
            Prices and scores below come from clearly labelled sample data. Connect live market data in
            Trading Settings when you are ready.
          </AlertDescription>
        </Alert>
      ) : null}

      {notice ? (
        <Alert className="border-prism-sky/40">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Using cached data</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Your lists</CardTitle>
          <CardDescription>
            Give each list a purpose — for example "Core ETFs", "Earnings watch" or "Broke out this week".
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Input
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="New list name"
              className="max-w-xs"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
            />
            <Button onClick={handleCreateList} disabled={isWorking || !newListName.trim()}>
              <Plus className="mr-2 h-4 w-4" />
              Create list
            </Button>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading your lists…</p>
          ) : lists.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No lists yet. Create one above, then add a handful of symbols you follow.
            </p>
          ) : (
            <Tabs value={currentId ?? undefined} onValueChange={setActiveId}>
              <TabsList className="flex h-auto flex-wrap justify-start">
                {lists.map((l) => (
                  <TabsTrigger key={l.id} value={l.id} className="gap-2">
                    {l.name}
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                      {itemsFor(l.id).length}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>

              {lists.map((l) => (
                <TabsContent key={l.id} value={l.id} className="mt-4 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={newSymbol}
                      onChange={(e) => setNewSymbol(e.target.value)}
                      placeholder="Add symbol, e.g. AAPL"
                      className="max-w-[200px] uppercase"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSymbol()}
                    />
                    <Button
                      variant="outline"
                      onClick={handleAddSymbol}
                      disabled={isWorking || !newSymbol.trim()}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add
                    </Button>
                    <Button asChild variant="outline">
                      <Link to="/swingedge/scanner">Scan this list</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-muted-foreground"
                      disabled={isWorking}
                      onClick={async () => {
                        try {
                          await deleteList(l.id);
                          toast.success('List deleted');
                        } catch {
                          toast.error('Could not delete that list');
                        }
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete list
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="h-8 w-[170px] text-xs" aria-label="Filter by portfolio role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL" className="text-xs">All portfolio roles</SelectItem>
                        {PORTFOLIO_ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value} className="text-xs">
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-8 w-[180px] text-xs" aria-label="Filter by trading status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL" className="text-xs">All trading statuses</SelectItem>
                        {TRADING_STATUSES.map((st) => (
                          <SelectItem key={st.value} value={st.value} className="text-xs">
                            {st.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {roleFilter !== 'ALL' || statusFilter !== 'ALL' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setRoleFilter('ALL');
                          setStatusFilter('ALL');
                        }}
                      >
                        Clear filters
                      </Button>
                    ) : null}
                  </div>

                  <ScoredSymbolTable
                    dual
                    rows={filteredRows}
                    isLoading={scoring}
                    onRemove={handleRemoveSymbol}
                    emptyMessage="No symbols on this list yet. Add a few above."
                  />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>

      {currentList && symbols.length > 12 ? (
        <Alert className="border-prism-amber/40">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Long list</AlertTitle>
          <AlertDescription>
            {currentList.name} has {symbols.length} symbols. Longer lists use more of your market data
            allowance each time they refresh, and are harder to follow properly. Around 10 to 25 names
            works well.
          </AlertDescription>
        </Alert>
      ) : null}

      {history.length ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent status moves</CardTitle>
            <CardDescription>
              A name's portfolio role stays put. Its trading status moves as the setup develops.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.slice(0, 12).map((h) => (
              <div key={h.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold">{h.symbol}</span>
                <RoleBadge role={roleFor(h.symbol)?.portfolio_role ?? 'UNASSIGNED'} />
                <span className="text-muted-foreground">
                  {h.from_status ? statusMeta(h.from_status).label : 'New'} →
                </span>
                <StatusBadge status={h.to_status} />
                <span className="text-xs text-muted-foreground">
                  {new Date(h.created_at).toLocaleDateString()}
                  {h.reason ? ` · ${h.reason}` : ''}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <HowToUse
        steps={[
          'Create a list with a clear purpose rather than one long catch-all list.',
          'Add symbols you would genuinely be willing to trade — around 10 to 25 per list.',
          'Read the score and verdict columns: QUALIFIES and WATCH are the only rows worth opening.',
          'Click a symbol to open it in the Stock Analyzer for the full read.',
          'Give each name a portfolio role — the job it plays — then let its trading status move as the setup develops.',
          'Remove names you have stopped following. A stale list wastes your market data allowance.',
        ]}
        tips={[
          'The estimated entry, stop and target are for comparison only. Your real numbers come from the Trade Planner.',
          'Hover a score to see exactly which parts of the checklist earned the points.',
          'Lists are private to your household.',
        ]}
      />
    <AiLevelsAssistant page="Watchlists" />
    </div>
  );
}
