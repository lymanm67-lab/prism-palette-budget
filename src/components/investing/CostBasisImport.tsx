import { useState } from 'react';
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
import { useRolePositions, useSavePosition } from '@/hooks/use-investing';

const sb = supabase as any;

interface ParsedRow {
  ticker: string;
  shares: number | null;
  costBasis: number | null;
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
  const save = useSavePosition();
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState('');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [busy, setBusy] = useState(false);

  const tickers = new Set(positions.map((p) => p.ticker.toUpperCase()));

  const toParsed = (
    list: { ticker: string; shares: number | null; costBasis: number | null }[],
    source: string,
  ): ParsedRow[] => list.map((r) => ({ ...r, matched: tickers.has(r.ticker), source }));

  const handleCsvText = (text: string) => {
    const parsed = parseCostBasisCsv(text);
    if (parsed.length === 0) {
      toast.error('No rows found. Expect columns like Symbol, Shares, Cost Basis.');
      return;
    }
    setRows(toParsed(parsed, 'CSV'));
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    handleCsvText(await file.text());
  };

  const syncBroker = async () => {
    if (!household?.id) return;
    setBusy(true);
    try {
      const { data, error } = await sb
        .from('investment_holdings')
        .select('symbol, quantity, cost_basis')
        .eq('household_id', household.id)
        .not('cost_basis', 'is', null);
      if (error) throw error;
      const list = (data ?? [])
        .filter((h: any) => h.symbol)
        .map((h: any) => ({
          ticker: String(h.symbol).toUpperCase(),
          shares: h.quantity ?? null,
          costBasis: h.cost_basis ?? null,
        }));
      if (list.length === 0) {
        toast.error('No brokerage cost basis found. Sync your brokerage or use CSV instead.');
        return;
      }
      setRows(toParsed(list, 'Brokerage'));
      toast.success(`Found ${list.length} holding(s) with cost basis`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const applicable = rows.filter((r) => r.matched && r.costBasis != null && r.costBasis > 0);

  const apply = async () => {
    setBusy(true);
    try {
      for (const r of applicable) {
        const target = positions.find((p) => p.ticker.toUpperCase() === r.ticker);
        if (!target) continue;
        await save.mutateAsync({
          id: target.id,
          cost_basis: r.costBasis!,
          ...(r.shares != null && r.shares > 0 ? { shares: r.shares } : {}),
        });
      }
      toast.success(`Updated cost basis on ${applicable.length} position(s)`);
      setOpen(false);
      setRows([]);
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import cost basis</DialogTitle>
          <DialogDescription>
            Pull cost basis from your linked brokerage, or paste/upload a broker CSV with Symbol, Shares and Cost Basis columns.
            Nothing is applied until you confirm.
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
            <Label htmlFor="cost-basis-paste">Or paste CSV rows</Label>
            <Textarea
              id="cost-basis-paste"
              rows={4}
              placeholder={'Symbol,Shares,Cost Basis\nDRAM,10,524.00'}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
            />
            <Button size="sm" variant="ghost" onClick={() => handleCsvText(raw)} disabled={!raw.trim()}>
              Parse pasted rows
            </Button>
          </div>

          {rows.length > 0 && (
            <div className="max-h-72 overflow-auto rounded-md border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticker</TableHead>
                    <TableHead className="text-right">Shares</TableHead>
                    <TableHead className="text-right">Cost basis</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Match</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={`${r.ticker}-${i}`}>
                      <TableCell className="font-medium">{r.ticker}</TableCell>
                      <TableCell className="text-right">{r.shares ?? '—'}</TableCell>
                      <TableCell className="text-right">{r.costBasis != null ? money(r.costBasis, 2) : '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.source}</TableCell>
                      <TableCell>
                        {r.matched ? (
                          <Badge variant="secondary">Will update</Badge>
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
            Apply to {applicable.length} position(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
