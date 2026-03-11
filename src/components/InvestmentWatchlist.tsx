import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useWatchlist, useAddWatchlistItem, useUpdateWatchlistItem, useDeleteWatchlistItem, useRefreshWatchlistPrices, WatchlistItem } from '@/hooks/use-watchlist';
import { useCurrency } from '@/hooks/use-currency';
import { Plus, Pencil, Trash2, Eye, Star, Loader2, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const InvestmentWatchlist = () => {
  const { data: items, isLoading } = useWatchlist();
  const addItem = useAddWatchlistItem();
  const updateItem = useUpdateWatchlistItem();
  const deleteItem = useDeleteWatchlistItem();
  const refreshPrices = useRefreshWatchlistPrices();
  const { formatCurrency } = useCurrency();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WatchlistItem | null>(null);
  const [form, setForm] = useState({ symbol: '', name: '', notes: '', target_price: '' });

  const openAdd = () => {
    setEditingItem(null);
    setForm({ symbol: '', name: '', notes: '', target_price: '' });
    setDialogOpen(true);
  };

  const openEdit = (item: WatchlistItem) => {
    setEditingItem(item);
    setForm({
      symbol: item.symbol,
      name: item.name || '',
      notes: item.notes || '',
      target_price: item.target_price != null ? String(item.target_price) : '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.symbol.trim()) {
      toast.error('Symbol is required');
      return;
    }
    const payload = {
      symbol: form.symbol.trim(),
      name: form.name.trim() || undefined,
      notes: form.notes.trim() || undefined,
      target_price: form.target_price ? parseFloat(form.target_price) : undefined,
    };

    if (editingItem) {
      await updateItem.mutateAsync({ id: editingItem.id, ...payload });
    } else {
      await addItem.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteItem.mutateAsync(id);
  };

  const isSaving = addItem.isPending || updateItem.isPending;

  const getPriceDiff = (item: WatchlistItem) => {
    if (item.current_price == null || item.target_price == null) return null;
    return item.current_price - item.target_price;
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-chart-4" />
              <div>
                <CardTitle className="font-display text-base sm:text-lg">Watchlist</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Investments you're interested in tracking.</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {items && items.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5"
                      onClick={() => refreshPrices.mutate()}
                      disabled={refreshPrices.isPending}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${refreshPrices.isPending ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">{refreshPrices.isPending ? 'Updating...' : 'Refresh'}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Fetch live prices from Yahoo Finance</TooltipContent>
                </Tooltip>
              )}
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={openAdd}>
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !items?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Eye className="mx-auto h-8 w-8 opacity-30 mb-2" />
              <p className="text-sm font-medium">No watchlist items yet</p>
              <p className="text-xs mt-1">Add ticker symbols you want to keep an eye on.</p>
              <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={openAdd}>
                <Plus className="h-4 w-4" /> Add Symbol
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="hidden sm:table-cell">Name</TableHead>
                    <TableHead className="text-right">Current Price</TableHead>
                    <TableHead className="text-right hidden md:table-cell">Target Price</TableHead>
                    <TableHead className="text-right hidden md:table-cell">vs Target</TableHead>
                    <TableHead className="hidden lg:table-cell">Notes</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(item => {
                    const diff = getPriceDiff(item);
                    const atOrBelow = diff != null && diff <= 0;
                    return (
                      <TableRow key={item.id} className="hover:bg-muted/50 group">
                        <TableCell className="font-mono font-semibold text-sm">
                          {item.symbol}
                          {atOrBelow && (
                            <Badge className="ml-1.5 text-[9px] bg-green-500/15 text-green-600 border-green-500/30">
                              Buy Zone
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[200px] hidden sm:table-cell">
                          {item.name || '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm font-medium">
                          {item.current_price != null ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>{formatCurrency(item.current_price)}</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {item.price_updated_at
                                  ? `Updated ${formatDistanceToNow(new Date(item.price_updated_at), { addSuffix: true })}`
                                  : 'No update time'}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground/50 italic text-xs">Click refresh</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm hidden md:table-cell">
                          {item.target_price != null ? formatCurrency(item.target_price) : '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm hidden md:table-cell">
                          {diff != null ? (
                            <span className={`inline-flex items-center gap-0.5 ${diff <= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {diff <= 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                              {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[200px] hidden lg:table-cell">
                          {item.notes || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleDelete(item.id)}
                              disabled={deleteItem.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Watchlist Item' : 'Add to Watchlist'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="wl-symbol">Ticker Symbol *</Label>
              <Input
                id="wl-symbol"
                placeholder="e.g. AAPL, VTI, SCHD"
                value={form.symbol}
                onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))}
                className="uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wl-name">Name</Label>
              <Input
                id="wl-name"
                placeholder="e.g. Apple Inc."
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wl-target">Target Price</Label>
              <Input
                id="wl-target"
                type="number"
                placeholder="Optional buy target"
                value={form.target_price}
                onChange={e => setForm(f => ({ ...f, target_price: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wl-notes">Notes</Label>
              <Textarea
                id="wl-notes"
                placeholder="Why you're watching this..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              {editingItem ? 'Save Changes' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InvestmentWatchlist;
