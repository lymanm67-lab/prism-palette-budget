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

  // Sort holdings
  const sortedHoldings = useMemo(() => {
    const sorted = [...enrichedHoldings];
    sorted.sort((a, b) => {
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
    return sorted;
  }, [enrichedHoldings, sortKey, sortDir]);

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
                {totalGainLoss >= 0 ? <TrendingUp className="h-4 w-4 text-accent shrink-0" /> : <TrendingDown className="h-4 w-4 text-prism-rose shrink-0" />}
                <p className={`text-lg sm:text-2xl font-bold truncate ${totalGainLoss >= 0 ? 'text-accent' : 'text-prism-rose'}`}>
                  {totalGainLoss >= 0 ? '+' : ''}{formatAmount(totalGainLoss)}
                </p>
              </div>
            ) : (
              <p className="text-lg sm:text-2xl font-bold text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Holdings Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base sm:text-lg">Holdings</CardTitle>
          <CardDescription className="text-xs sm:text-sm">All positions across your investment accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedHoldings.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Briefcase className="mx-auto h-10 w-10 opacity-30 mb-3" />
              <p className="font-medium">No holdings yet</p>
              <p className="text-xs mt-1">Connect an investment account to see your positions.</p>
              <Button size="sm" className="mt-3 gap-1.5" onClick={() => setConnectModalOpen(true)}>
                <TrendingUp className="h-4 w-4" /> Connect Account
              </Button>
            </div>
          ) : (
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedHoldings.map(h => (
                    <TableRow key={h.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono font-semibold text-sm">
                        {h.symbol || '—'}
                        <Badge variant="outline" className="ml-1.5 text-[9px] capitalize hidden sm:inline-flex">{h.holding_type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[200px] hidden sm:table-cell">{h.name}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{h.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm hidden md:table-cell">{formatAmount(h.price)}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-medium">{formatAmount(h.market_value)}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm text-muted-foreground hidden lg:table-cell">
                        {h.cost_basis != null ? formatAmount(h.cost_basis) : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {h.gain_loss != null ? (
                          <span className={h.gain_loss >= 0 ? 'text-accent' : 'text-prism-rose'}>
                            {h.gain_loss >= 0 ? '+' : ''}{formatAmount(h.gain_loss)}
                            {h.gain_loss_pct != null && (
                              <span className="text-[10px] ml-1">({h.gain_loss_pct >= 0 ? '+' : ''}{h.gain_loss_pct.toFixed(1)}%)</span>
                            )}
                          </span>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
