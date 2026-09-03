import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { money } from '@/lib/investing/roles';
import { useRolePositions, useSavePosition, useSaveLots, usePositionLots } from '@/hooks/use-investing';
import { parseLotCsv, rollupLots, groupLotsByTicker, lotHoldingPeriod, type ParsedLot } from '@/lib/investing/lots';

const sb = supabase as any;

interface PreviewLot extends ParsedLot {
  matched: boolean;
  source: string;
}

function num(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[$,"\s]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function findIdx(header: string[], candidates: string[]): number {
  return header.findIndex((h) => candidates.some((c) => h.includes(c)));
}

/** Legacy blended parser, kept for simple "Symbol, Shares, Cost Basis" exports. */
export function parseCostBasisCsv(text: string): { ticker: string; shares: number | null; costBasis: number | null }[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const split = (line: string) => line.split(/[,\t;]/).map((c) => c.trim().replace(/^"|"$/g, ''));

  const header = split(lines[0]).map((h) => h.toLowerCase());
  const tickerIdx = findIdx(header, ['symbol', 'ticker', 'security']);
  const sharesIdx = findIdx(header, ['shares', 'quantity', 'units', 'qty']);
  let basisIdx = findIdx(header, ['cost basis total', 'total cost', 'cost basis', 'basis', 'cost']);
  const avgIdx = findIdx(header, ['average cost', 'avg cost', 'average price', 'avg price', 'purchase price']);
  const hasHeader = tickerIdx >= 0;

  const rows: { ticker: string; shares: number | null; costBasis: number | null }[] = [];
  const body = hasHeader ? lines.slice(1) : lines;
  for (const line of body) {
    const cells = split(line);
    const ticker = (hasHeader ? cells[tickerIdx] : cells[0])?.toUpperCase();
    if (!ticker || /^total/i.test(ticker)) continue;
    const shares = num(hasHeader ? (sharesIdx >= 0 ? cells[sharesIdx] : undefined) : cells[1]);
    if (!hasHeader) basisIdx = 2;
    let costBasis = num(hasHeader ? (basisIdx >= 0 ? cells[basisIdx] : undefined) : cells[2]);
    if (costBasis == null && avgIdx >= 0 && shares != null) {
      const avg = num(cells[avgIdx]);
      if (avg != null) costBasis = avg * shares;
    }
    if (shares == null && costBasis == null) continue;
    rows.push({ ticker, shares, costBasis });
  }
  return rows;
}

export function CostBasisImport() {
  const { household } = useHousehold();
  const { data: positions = [] } = useRolePositions();
  const { data: existingLots = [] } = usePositionLots();
  const save = useSavePosition();
  const saveLots = useSaveLots();
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState('');
  const [lots, setLots] = useState<PreviewLot[]>([]);
  const [busy, setBusy] = useState(false);

  const tickers = useMemo(() => new Set(positions.map((p) => p.ticker.toUpperCase())), [positions]);

  const toPreview = (list: ParsedLot[], source: string): PreviewLot[] =>
    list.map((l) => ({ ...l, matched: tickers.has(l.ticker.toUpperCase()), source }));

  const handleCsvText = (text: string) => {
    const { lots: parsed, skipped } = parseLotCsv(text);
    if (parsed.length === 0) {
      toast.error('No lots found. Expect columns like Symbol, Date acquired, Quantity, Price and Cost basis.');
      return;
    }
    setLots(toPreview(parsed, 'CSV'));
    toast.success(`Detected ${parsed.length} lot(s)${skipped > 0 ? `, skipped ${skipped} row(s)` : ''}`);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    handleCsvText(await file.text());
  };

  /** Pull fresh holdings from SnapTrade (Schwab) before reading the table. */
  const refreshFromSnapTrade = async () => {
    if (!household?.id) return;
    const { data: conns } = await sb
      .from('snaptrade_connections')
      .select('id, status')
      .eq('household_id', household.id)
      .order('created_at', { ascending: false })
      .limit(1);
    const connectionId = (conns as any[])?.[0]?.id;
    if (!connectionId) {
      toast.info('No linked brokerage found — connect Charles Schwab on Accounts, or import a CSV.');
      return;
    }
    const { data, error } = await supabase.functions.invoke('snaptrade/sync-accounts', {
      body: { household_id: household.id, connection_id: connectionId },
    });
    if (error) {
      toast.error(`Brokerage refresh failed: ${error.message}. Using last synced holdings.`);
      return;
    }
    const synced = (data as any)?.holdings_synced;
    if (typeof synced === 'number') toast.success(`Refreshed ${synced} holding(s) from your brokerage`);
  };

  const syncBroker = async () => {
    if (!household?.id) return;
    setBusy(true);
    try {
      await refreshFromSnapTrade();
      const { data, error } = await sb
        .from('investment_holdings')
        .select('symbol, quantity, cost_basis, updated_at')
        .eq('household_id', household.id)
        .not('cost_basis', 'is', null);
      if (error) throw error;
      const list: ParsedLot[] = (data ?? [])
        .filter((h: any) => h.symbol && Number(h.cost_basis) > 0)
        .map((h: any) => {
          const shares = Number(h.quantity ?? 0);
          const total = Number(h.cost_basis ?? 0);
          return {
            ticker: String(h.symbol).toUpperCase(),
            trade_date: (h.updated_at ?? new Date().toISOString()).slice(0, 10),
            shares,
            price_per_share: shares > 0 ? total / shares : 0,
            fees: 0,
            total_cost: total,
          };
        });
      if (list.length === 0) {
        toast.error('No brokerage cost basis found. Connect Charles Schwab on Accounts, or use a CSV instead.');
        return;
      }
      setLots(toPreview(list, 'Brokerage'));
      toast.success(`Found ${list.length} holding(s) with cost basis`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const applicable = lots.filter((l) => l.matched);
  const grouped = useMemo(() => groupLotsByTicker(applicable), [applicable]);

  const apply = async () => {
    setBusy(true);
    try {
      let lotCount = 0;
      for (const [ticker, group] of grouped.entries()) {
        const target = positions.find((p) => p.ticker.toUpperCase() === ticker);
        if (!target) continue;

        const keptExisting = existingLots.filter(
          (l) => l.ticker.toUpperCase() === ticker && l.source !== group[0].source.toLowerCase(),
        );

        await saveLots.mutateAsync(
          group.map((l) => ({
            position_id: target.id,
            ticker,
            trade_date: l.trade_date,
            shares: l.shares,
            price_per_share: l.price_per_share,
            fees: l.fees,
            total_cost: l.total_cost,
            account_type: target.account_type,
            source: l.source.toLowerCase() === 'csv' ? 'csv' : 'brokerage',
          })),
        );
        lotCount += group.length;

        const roll = rollupLots([...group, ...keptExisting.map((l) => ({
          ticker: l.ticker,
          trade_date: l.trade_date,
          shares: Number(l.shares),
          price_per_share: Number(l.price_per_share),
          fees: Number(l.fees),
          total_cost: Number(l.total_cost),
        }))]);

        await save.mutateAsync({
          id: target.id,
          cost_basis: roll.costBasis,
          ...(roll.shares > 0 ? { shares: roll.shares } : {}),
          ...(roll.avgPrice != null ? { avg_price: roll.avgPrice } : {}),
          ...(roll.earliestTradeDate ? { entry_date: roll.earliestTradeDate } : {}),
        });
      }
      toast.success(`Saved ${lotCount} lot(s) across ${grouped.size} position(s)`);
      setOpen(false);
      setLots([]);
      setRaw('');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" /> Import cost basis
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import cost basis (lot level)</DialogTitle>
          <DialogDescription>
            Paste or upload a broker lot export (Schwab, Fidelity, SoFi or generic) with symbol, date acquired, quantity and price, or
            pull cost basis from a linked brokerage. Each lot is saved separately and your position shares, total cost basis and average
            price are recalculated from the lots. Nothing is applied until you confirm.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={syncBroker} disabled={busy}>
              <RefreshCw className={`mr-2 h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> Sync from brokerage
            </Button>
            <input
              id="cost-basis-file"
              type="file"
              accept=".csv,.tsv,.txt"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <Button variant="outline" asChild>
              <label htmlFor="cost-basis-file" className="cursor-pointer">Upload CSV</label>
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cost-basis-paste">Or paste lot rows</Label>
            <Textarea
              id="cost-basis-paste"
              rows={4}
              placeholder={'Symbol,Date acquired,Quantity,Price per share,Fees\nDRAM,06/14/2026,10,52.40,0'}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
            />
            <Button size="sm" variant="ghost" onClick={() => handleCsvText(raw)} disabled={!raw.trim()}>
              Parse pasted rows
            </Button>
          </div>

          {lots.length > 0 && (
            <div className="max-h-72 overflow-auto rounded-md border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticker</TableHead>
                    <TableHead>Acquired</TableHead>
                    <TableHead className="text-right">Shares</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total cost</TableHead>
                    <TableHead>Holding</TableHead>
                    <TableHead>Match</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lots.map((l, i) => (
                    <TableRow key={`${l.ticker}-${l.trade_date}-${i}`}>
                      <TableCell className="font-medium">{l.ticker}</TableCell>
                      <TableCell>{l.trade_date}</TableCell>
                      <TableCell className="text-right">{l.shares}</TableCell>
                      <TableCell className="text-right">{money(l.price_per_share, 2)}</TableCell>
                      <TableCell className="text-right">{money(l.total_cost, 2)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{lotHoldingPeriod(l.trade_date).label}</TableCell>
                      <TableCell>
                        {l.matched ? (
                          <Badge variant="secondary">Will import</Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-500/40 text-amber-400">No position</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={apply} disabled={busy || applicable.length === 0}>
            Import {applicable.length} lot(s) into {grouped.size} position(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
