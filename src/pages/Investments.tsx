import { useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAccounts } from '@/hooks/use-finance-data';
import { useInvestmentHoldings, useSnapTradeConnections, useSyncSnapTrade } from '@/hooks/use-investment-data';
import { useCurrency } from '@/hooks/use-currency';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import {
  Loader2, TrendingUp, TrendingDown, Briefcase, PiggyBank, Landmark, BarChart3,
  BookOpen, MoreHorizontal, RefreshCw, ArrowUpDown, ChevronDown, ChevronUp, Shield, Plus, Pencil, Check, X,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import PageOverview from '@/components/PageOverview';
import InvestmentInsights from '@/components/InvestmentInsights';
import SnapTradeConnectButton from '@/components/SnapTradeConnectButton';
import InvestmentConnectionModal from '@/components/InvestmentConnectionModal';
import AddHoldingsDialog from '@/components/AddHoldingsDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#84cc16',
];

type SortKey = 'symbol' | 'name' | 'quantity' | 'price' | 'market_value' | 'cost_basis' | 'gain_loss';
type SortDir = 'asc' | 'desc';
type GroupSort = 'alpha' | 'value';

const Investments = () => {
  const { data: accounts, isLoading: accLoading } = useAccounts();
  const { data: holdings, isLoading: holdingsLoading } = useInvestmentHoldings();
  const { data: connections } = useSnapTradeConnections();
  const syncSnapTrade = useSyncSnapTrade();
  const { formatCurrency: formatAmount } = useCurrency();
  const qc = useQueryClient();
  const [pageGuideOpen, setPageGuideOpen] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [addHoldingsOpen, setAddHoldingsOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('market_value');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [editingCostBasis, setEditingCostBasis] = useState<string | null>(null);
  const [costBasisInput, setCostBasisInput] = useState('');
  const [groupSort, setGroupSort] = useState<GroupSort>('value');
  const [groupSortDir, setGroupSortDir] = useState<SortDir>('desc');
  const [editingHolding, setEditingHolding] = useState<string | null>(null);
  const [holdingEdit, setHoldingEdit] = useState({ quantity: '', price: '', market_value: '' });

  const handleSaveCostBasis = useCallback(async (holdingId: string) => {
    const value = parseFloat(costBasisInput);
    if (isNaN(value) || value < 0) {
      toast.error('Please enter a valid cost basis');
      return;
    }
    const { error } = await supabase.from('investment_holdings').update({ cost_basis: value }).eq('id', holdingId);
    if (error) { toast.error('Failed to save'); return; }
    qc.invalidateQueries({ queryKey: ['investment_holdings'] });
    setEditingCostBasis(null);
    toast.success('Cost basis updated');
  }, [costBasisInput, qc]);

  const handleSaveHolding = useCallback(async (holdingId: string) => {
    const qty = parseFloat(holdingEdit.quantity);
    const price = parseFloat(holdingEdit.price);
    const mv = parseFloat(holdingEdit.market_value);
    if (isNaN(qty) || isNaN(price) || isNaN(mv)) {
      toast.error('Please enter valid numbers');
      return;
    }
    const { error } = await supabase.from('investment_holdings').update({
      quantity: qty,
      price: price,
      market_value: mv,
    }).eq('id', holdingId);
    if (error) { toast.error('Failed to save'); return; }
    qc.invalidateQueries({ queryKey: ['investment_holdings'] });
    setEditingHolding(null);
    toast.success('Holding updated');
  }, [holdingEdit, qc]);

  const startEditHolding = (h: any) => {
    setEditingHolding(h.id);
    setHoldingEdit({
      quantity: String(h.quantity),
      price: String(h.price),
      market_value: String(h.market_value),
    });
  };

  const investmentAccounts = useMemo(() => {
    if (!accounts) return [];
    return accounts.filter(a => a.account_type === 'investment' || a.account_type === 'savings');
  }, [accounts]);

  const totalBalance = investmentAccounts.reduce((s, a) => s + Number(a.balance), 0);

  // Helper to safely extract a string value from potentially JSON-stringified data
  const safeStr = (val: any): string | null => {
    if (val == null) return null;
    if (typeof val === 'string') {
      // Check if it's a JSON object string
      if (val.startsWith('{') || val.startsWith('[')) {
        try {
          const parsed = JSON.parse(val);
          // If it's an object with a 'symbol' key, extract it
          if (parsed?.symbol) return parsed.symbol;
          if (parsed?.name) return parsed.name;
          if (parsed?.code) return parsed.code;
          return String(val).slice(0, 20);
        } catch { /* not JSON, return as-is */ }
      }
      return val;
    }
    if (typeof val === 'object') {
      if (val.symbol) return val.symbol;
      if (val.name) return val.name;
      if (val.code) return val.code;
      return JSON.stringify(val).slice(0, 20);
    }
    return String(val);
  };

  const safeNum = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const n = parseFloat(val);
      return isNaN(n) ? 0 : n;
    }
    return 0;
  };

  // Enrich holdings with gain/loss and normalize potentially malformed data
  const enrichedHoldings = useMemo(() => {
    if (!holdings) return [];
    return holdings.map(h => {
      const symbol = safeStr(h.symbol);
      const name = typeof h.name === 'string' && !h.name.startsWith('{') ? h.name : (safeStr(h.name) || symbol || 'Unknown');
      const quantity = safeNum(h.quantity);
      const price = safeNum(h.price);
      const marketValue = safeNum(h.market_value);
      const costBasis = h.cost_basis != null ? safeNum(h.cost_basis) : null;
      const gainLoss = costBasis != null ? marketValue - costBasis : null;
      const gainLossPct = costBasis != null && costBasis > 0
        ? ((marketValue - costBasis) / costBasis) * 100
        : null;
      return {
        ...h,
        symbol,
        name,
        quantity,
        price,
        market_value: marketValue,
        cost_basis: costBasis,
        gain_loss: gainLoss,
        gain_loss_pct: gainLossPct,
      };
    });
  }, [holdings]);

  // Group holdings by brokerage/account
  const holdingsByAccount = useMemo(() => {
    if (!enrichedHoldings.length) return [];
    const accountMap = new Map<string, { name: string; institution: string | null }>();
    for (const a of accounts || []) {
      accountMap.set(a.id, { name: a.name, institution: a.institution });
    }

    const grouped = new Map<string, { accountName: string; institution: string | null; holdings: typeof enrichedHoldings }>();
    for (const h of enrichedHoldings) {
      const acct = accountMap.get(h.account_id);
      const key = h.account_id;
      if (!grouped.has(key)) {
        grouped.set(key, {
          accountName: acct?.name || 'Unknown Account',
          institution: acct?.institution || null,
          holdings: [],
        });
      }
      grouped.get(key)!.holdings.push(h);
    }

    // Sort holdings within each group
    for (const group of grouped.values()) {
      group.holdings.sort((a, b) => {
        let aVal: number, bVal: number;
        switch (sortKey) {
          case 'symbol': return sortDir === 'asc'
            ? (a.symbol || '').localeCompare(b.symbol || '')
            : (b.symbol || '').localeCompare(a.symbol || '');
          case 'name': return sortDir === 'asc'
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
          case 'quantity': aVal = a.quantity; bVal = b.quantity; break;
          case 'price': aVal = a.price; bVal = b.price; break;
          case 'market_value': aVal = a.market_value; bVal = b.market_value; break;
          case 'cost_basis': aVal = a.cost_basis || 0; bVal = b.cost_basis || 0; break;
          case 'gain_loss': aVal = a.gain_loss || 0; bVal = b.gain_loss || 0; break;
          default: aVal = 0; bVal = 0;
        }
        return sortDir === 'asc' ? aVal! - bVal! : bVal! - aVal!;
      });
    }

    // Sort groups by selected criteria
    return Array.from(grouped.entries())
      .map(([id, data]) => ({ id, ...data, totalValue: data.holdings.reduce((s, h) => s + h.market_value, 0) }))
      .sort((a, b) => {
        if (groupSort === 'alpha') {
          const aName = (a.institution || a.accountName).toLowerCase();
          const bName = (b.institution || b.accountName).toLowerCase();
          return groupSortDir === 'asc' ? aName.localeCompare(bName) : bName.localeCompare(aName);
        }
        return groupSortDir === 'desc' ? b.totalValue - a.totalValue : a.totalValue - b.totalValue;
      });
  }, [enrichedHoldings, accounts, sortKey, sortDir, groupSort, groupSortDir]);

  // Asset allocation by holding type
  const allocationData = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of enrichedHoldings) {
      const type = h.holding_type || 'other';
      map.set(type, (map.get(type) || 0) + h.market_value);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
      .sort((a, b) => b.value - a.value);
  }, [enrichedHoldings]);

  // Account allocation pie
  const accountAllocation = useMemo(() => {
    return investmentAccounts.map(a => ({
      name: a.name,
      value: Math.abs(Number(a.balance)),
    })).filter(d => d.value > 0);
  }, [investmentAccounts]);

  const totalMarketValue = enrichedHoldings.reduce((s, h) => s + h.market_value, 0);
  const totalCostBasis = enrichedHoldings.reduce((s, h) => s + (h.cost_basis || 0), 0);
  const totalGainLoss = totalCostBasis > 0 ? totalMarketValue - totalCostBasis : null;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  const isLoading = accLoading || holdingsLoading;

  if (isLoading) {
    return <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <TooltipProvider delayDuration={300}>
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold truncate">Investments</h1>
          <p className="text-sm text-muted-foreground truncate">Track your portfolio, holdings, and performance.</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 h-8"
            onClick={() => setAddHoldingsOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add</span>
          </Button>
          <Button
            size="sm"
            className="gap-1.5 h-8 prism-gradient text-white border-0 hover:opacity-90"
            onClick={() => setConnectModalOpen(true)}
          >
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Connect</span>
          </Button>
          <UiTooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => syncSnapTrade.mutate()}
                disabled={syncSnapTrade.isPending}
              >
                <RefreshCw className={`h-4 w-4 ${syncSnapTrade.isPending ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{syncSnapTrade.isPending ? 'Syncing...' : 'Refresh'}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sync investment accounts</TooltipContent>
          </UiTooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setPageGuideOpen(true)} className="gap-2">
                <BookOpen className="h-4 w-4" /> Page Guide
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {pageGuideOpen && (
        <PageOverview
          title="Investments & Holdings"
          description="Monitor your investment portfolio, track individual holdings, and review asset allocation and performance."
          icon={TrendingUp}
          iconColor="text-prism-indigo"
          ttsScript="The Investments page gives you a comprehensive view of your portfolio. See total portfolio value, gain/loss, and asset allocation. The holdings table shows every position with sortable columns for symbol, quantity, price, market value, cost basis, and gain/loss. Connect investment accounts via SnapTrade to sync data automatically."
          features={[
            'Total portfolio value and gain/loss',
            'Sortable holdings table',
            'Asset allocation by type',
            'Account allocation pie chart',
            'Connect brokerages via SnapTrade',
          ]}
          demoData={[
            { label: 'AAPL', value: '$15,230', badge: 'Equity', color: '#8b5cf6' },
            { label: 'VTI', value: '$32,100', badge: 'ETF', color: '#3b82f6' },
            { label: 'BND', value: '$8,500', badge: 'Bond', color: '#14b8a6' },
          ]}
        />
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-4">
            <p className="text-[11px] sm:text-xs text-muted-foreground">Portfolio Value</p>
            <p className="text-lg sm:text-2xl font-bold truncate">{formatAmount(totalBalance)}</p>
            <p className="text-[11px] text-muted-foreground">{investmentAccounts.length} account{investmentAccounts.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] sm:text-xs text-muted-foreground">Market Value</p>
            <p className="text-lg sm:text-2xl font-bold truncate">{formatAmount(totalMarketValue)}</p>
            <p className="text-[11px] text-muted-foreground">{enrichedHoldings.length} holding{enrichedHoldings.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] sm:text-xs text-muted-foreground">Cost Basis</p>
            <p className="text-lg sm:text-2xl font-bold truncate">{totalCostBasis > 0 ? formatAmount(totalCostBasis) : '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] sm:text-xs text-muted-foreground">Total Gain/Loss</p>
            {totalGainLoss != null ? (
              <div className="flex items-center gap-1.5">
                {totalGainLoss >= 0 ? <TrendingUp className="h-4 w-4 text-green-500 shrink-0" /> : <TrendingDown className="h-4 w-4 text-red-500 shrink-0" />}
                <p className={`text-lg sm:text-2xl font-bold truncate ${totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {totalGainLoss >= 0 ? '+' : ''}{formatAmount(totalGainLoss)}
                </p>
              </div>
            ) : (
              <p className="text-lg sm:text-2xl font-bold text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Holdings Table — Grouped by Brokerage */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-display text-base sm:text-lg">Holdings</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Positions grouped by brokerage account.</CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={groupSort === 'alpha' ? 'default' : 'outline'}
                className="h-7 gap-1 text-xs px-2.5"
                onClick={() => {
                  if (groupSort === 'alpha') {
                    setGroupSortDir(d => d === 'asc' ? 'desc' : 'asc');
                  } else {
                    setGroupSort('alpha');
                    setGroupSortDir('asc');
                  }
                }}
              >
                A–Z
                {groupSort === 'alpha' && (groupSortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
              </Button>
              <Button
                size="sm"
                variant={groupSort === 'value' ? 'default' : 'outline'}
                className="h-7 gap-1 text-xs px-2.5"
                onClick={() => {
                  if (groupSort === 'value') {
                    setGroupSortDir(d => d === 'asc' ? 'desc' : 'asc');
                  } else {
                    setGroupSort('value');
                    setGroupSortDir('desc');
                  }
                }}
              >
                Amount
                {groupSort === 'value' && (groupSortDir === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />)}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {holdingsByAccount.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Briefcase className="mx-auto h-10 w-10 opacity-30 mb-3" />
              <p className="font-medium">No holdings yet</p>
              <p className="text-xs mt-1">Connect an investment account to see your positions.</p>
              <Button size="sm" className="mt-3 gap-1.5" onClick={() => setConnectModalOpen(true)}>
                <TrendingUp className="h-4 w-4" /> Connect Account
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {holdingsByAccount.map(group => (
                <Collapsible key={group.id} defaultOpen>
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-2 mb-2 px-2 w-full text-left hover:bg-muted/30 rounded-lg py-2 transition-colors">
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform [[data-state=closed]>&]:rotate-[-90deg]" />
                      <Landmark className="h-4 w-4 text-primary shrink-0" />
                      <h3 className="font-display font-semibold text-sm">{group.institution || group.accountName}</h3>
                      {group.institution && group.accountName !== group.institution && (
                        <span className="text-xs text-muted-foreground">— {group.accountName}</span>
                      )}
                      <span className="text-xs text-muted-foreground ml-1">({group.holdings.length})</span>
                      <Badge variant="outline" className="text-[10px] ml-auto">{formatAmount(group.totalValue)}</Badge>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                  <div className="overflow-x-auto -mx-6 px-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="cursor-pointer select-none" onClick={() => handleSort('symbol')}>
                            <span className="flex items-center gap-1">Symbol <SortIcon col="symbol" /></span>
                          </TableHead>
                          <TableHead className="cursor-pointer select-none hidden sm:table-cell" onClick={() => handleSort('name')}>
                            <span className="flex items-center gap-1">Name <SortIcon col="name" /></span>
                          </TableHead>
                          <TableHead className="cursor-pointer select-none text-right" onClick={() => handleSort('quantity')}>
                            <span className="flex items-center gap-1 justify-end">Qty <SortIcon col="quantity" /></span>
                          </TableHead>
                          <TableHead className="cursor-pointer select-none text-right hidden md:table-cell" onClick={() => handleSort('price')}>
                            <span className="flex items-center gap-1 justify-end">Price <SortIcon col="price" /></span>
                          </TableHead>
                          <TableHead className="cursor-pointer select-none text-right" onClick={() => handleSort('market_value')}>
                            <span className="flex items-center gap-1 justify-end">Value <SortIcon col="market_value" /></span>
                          </TableHead>
                          <TableHead className="cursor-pointer select-none text-right hidden lg:table-cell" onClick={() => handleSort('cost_basis')}>
                            <span className="flex items-center gap-1 justify-end">Cost Basis <SortIcon col="cost_basis" /></span>
                          </TableHead>
                          <TableHead className="cursor-pointer select-none text-right" onClick={() => handleSort('gain_loss')}>
                            <span className="flex items-center gap-1 justify-end">Gain/Loss <SortIcon col="gain_loss" /></span>
                          </TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.holdings.map(h => {
                          const isManual = !h.provider_holding_id;
                          const isEditing = editingHolding === h.id;
                          return (
                          <TableRow key={h.id} className="hover:bg-muted/50 group">
                            <TableCell className="font-mono font-semibold text-sm">
                              {h.symbol || '—'}
                              <Badge variant="outline" className="ml-1.5 text-[9px] capitalize hidden sm:inline-flex">{h.holding_type}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground truncate max-w-[200px] hidden sm:table-cell">{h.name}</TableCell>
                            <TableCell className="text-right tabular-nums text-sm">
                              {isEditing ? (
                                <Input type="number" value={holdingEdit.quantity} onChange={e => setHoldingEdit(prev => ({ ...prev, quantity: e.target.value }))}
                                  onKeyDown={e => { if (e.key === 'Enter') handleSaveHolding(h.id); if (e.key === 'Escape') setEditingHolding(null); }}
                                  className="h-7 w-20 text-right text-xs ml-auto" />
                              ) : h.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-sm hidden md:table-cell">
                              {isEditing ? (
                                <Input type="number" value={holdingEdit.price} onChange={e => setHoldingEdit(prev => ({ ...prev, price: e.target.value }))}
                                  onKeyDown={e => { if (e.key === 'Enter') handleSaveHolding(h.id); if (e.key === 'Escape') setEditingHolding(null); }}
                                  className="h-7 w-24 text-right text-xs ml-auto" />
                              ) : formatAmount(h.price)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-sm font-medium">
                              {isEditing ? (
                                <Input type="number" value={holdingEdit.market_value} onChange={e => setHoldingEdit(prev => ({ ...prev, market_value: e.target.value }))}
                                  onKeyDown={e => { if (e.key === 'Enter') handleSaveHolding(h.id); if (e.key === 'Escape') setEditingHolding(null); }}
                                  className="h-7 w-24 text-right text-xs ml-auto" />
                              ) : formatAmount(h.market_value)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-sm text-muted-foreground hidden lg:table-cell">
                              {editingCostBasis === h.id ? (
                                <div className="flex items-center gap-1 justify-end">
                                  <Input
                                    type="number"
                                    value={costBasisInput}
                                    onChange={e => setCostBasisInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSaveCostBasis(h.id); if (e.key === 'Escape') setEditingCostBasis(null); }}
                                    className="h-7 w-24 text-right text-xs"
                                    autoFocus
                                  />
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleSaveCostBasis(h.id)}>
                                    <Check className="h-3 w-3 text-accent" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingCostBasis(null)}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <button
                                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors group"
                                  onClick={() => { setEditingCostBasis(h.id); setCostBasisInput(h.cost_basis != null ? String(h.cost_basis) : ''); }}
                                >
                                  {h.cost_basis != null ? formatAmount(h.cost_basis) : <span className="text-muted-foreground/50 italic">Add</span>}
                                  <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60" />
                                </button>
                              )}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-sm">
                              {h.gain_loss != null ? (
                                <span className={h.gain_loss >= 0 ? 'text-green-500' : 'text-red-500'}>
                                  {h.gain_loss >= 0 ? '+' : ''}{formatAmount(h.gain_loss)}
                                  {h.gain_loss_pct != null && (
                                    <span className="text-[10px] ml-1">({h.gain_loss_pct >= 0 ? '+' : ''}{h.gain_loss_pct.toFixed(1)}%)</span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/50 italic text-xs">Enter cost basis →</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right w-10">
                              {isManual && (
                                isEditing ? (
                                  <div className="flex items-center gap-0.5 justify-end">
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleSaveHolding(h.id)}>
                                      <Check className="h-3.5 w-3.5 text-green-500" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingHolding(null)}>
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                ) : (
                                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:opacity-100" onClick={() => startEditHolding(h)}>
                                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                  </Button>
                                )
                              )}
                            </TableCell>
                          </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Type Allocation */}
        {allocationData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base sm:text-lg">Asset Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={allocationData} cx="50%" cy="45%" innerRadius={50} outerRadius={85} dataKey="value" paddingAngle={2}>
                    {allocationData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatAmount(value)} />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Account Allocation */}
        {accountAllocation.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base sm:text-lg">By Account</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={accountAllocation} cx="50%" cy="45%" innerRadius={50} outerRadius={85} dataKey="value" paddingAngle={2}>
                    {accountAllocation.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatAmount(value)} />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Account List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base sm:text-lg">Investment Accounts</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Your connected investment and savings accounts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 sm:space-y-3">
          {investmentAccounts.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Briefcase className="mx-auto h-10 w-10 opacity-30 mb-3" />
              <p>No investment accounts yet.</p>
              <p className="text-xs mt-1">Connect a brokerage or add an account manually.</p>
            </div>
          ) : (
            investmentAccounts.map(account => {
              const Icon = account.account_type === 'investment' ? TrendingUp : PiggyBank;
              return (
                <div key={account.id} className="flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded-xl border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{account.name}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">{account.account_type}</Badge>
                        {account.provider_type && account.provider_type !== 'manual' && (
                          <Badge variant="outline" className="text-[9px] capitalize">{account.provider_type}</Badge>
                        )}
                        {account.institution && <span className="text-[11px] text-muted-foreground truncate">{account.institution}</span>}
                      </div>
                    </div>
                  </div>
                  <p className="font-semibold text-sm sm:text-base tabular-nums shrink-0">{formatAmount(Number(account.balance))}</p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="border-muted bg-muted/30">
        <CardContent className="p-4 flex items-start gap-3">
          <Shield className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Investment connections are <strong>read-only</strong>. Your brokerage credentials are never stored in this app.</p>
            <p>Bank accounts connect through Plaid. Investment accounts connect through SnapTrade.</p>
          </div>
        </CardContent>
      </Card>

      {/* Key Insights */}
      <InvestmentInsights
        accounts={investmentAccounts.map(a => ({
          id: a.id,
          name: a.name,
          balance: Number(a.balance),
          account_type: a.account_type,
          institution: a.institution,
        }))}
        totalBalance={totalBalance}
      />

      {/* Connection Modal */}
      <InvestmentConnectionModal open={connectModalOpen} onOpenChange={setConnectModalOpen} />
      <AddHoldingsDialog open={addHoldingsOpen} onOpenChange={setAddHoldingsOpen} />
    </motion.div>
    </TooltipProvider>
  );
};

export default Investments;
