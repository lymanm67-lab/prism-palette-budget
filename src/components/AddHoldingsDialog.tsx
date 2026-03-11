import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useAccounts } from '@/hooks/use-finance-data';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface AddHoldingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface HoldingEntry {
  symbol: string;
  name: string;
  quantity: number;
  price: number;
  cost_basis: number | null;
  holding_type: string;
}

const HOLDING_TYPES = ['equity', 'etf', 'mutual_fund', 'bond', 'crypto', 'option', 'other'];

export default function AddHoldingsDialog({ open, onOpenChange }: AddHoldingsDialogProps) {
  const { household } = useHousehold();
  const { data: accounts } = useAccounts();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('single');

  // Single entry state
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [costBasis, setCostBasis] = useState('');
  const [holdingType, setHoldingType] = useState('equity');
  const [accountId, setAccountId] = useState('');

  // Batch entry state
  const [batchText, setBatchText] = useState('');
  const [batchAccountId, setBatchAccountId] = useState('');

  const investmentAccounts = useMemo(() => {
    if (!accounts) return [];
    return accounts.filter(a => a.account_type === 'investment');
  }, [accounts]);

  const resetForm = () => {
    setSymbol(''); setName(''); setQuantity(''); setPrice(''); setCostBasis('');
    setHoldingType('equity'); setAccountId(''); setBatchText(''); setBatchAccountId('');
  };

  const parseBatchEntries = (): HoldingEntry[] => {
    const lines = batchText.split('\n').map(l => l.trim()).filter(Boolean);
    const entries: HoldingEntry[] = [];
    for (const line of lines) {
      // Support formats: "AAPL" or "AAPL, Apple Inc" or "AAPL, Apple Inc, 10, 150.00" or "AAPL, 10, 150"
      const parts = line.split(/[,\t]/).map(p => p.trim());
      const sym = parts[0]?.toUpperCase();
      if (!sym) continue;

      let entryName = sym;
      let qty = 0;
      let prc = 0;
      let cb: number | null = null;

      if (parts.length === 2) {
        // Could be "AAPL, Apple Inc" or "AAPL, 10"
        const maybeNum = parseFloat(parts[1]);
        if (!isNaN(maybeNum)) { qty = maybeNum; } else { entryName = parts[1]; }
      } else if (parts.length >= 3) {
        // "AAPL, Apple Inc, 10" or "AAPL, Apple Inc, 10, 150"
        const secondIsNum = !isNaN(parseFloat(parts[1]));
        if (secondIsNum) {
          qty = parseFloat(parts[1]) || 0;
          prc = parseFloat(parts[2]) || 0;
          cb = parts[3] ? parseFloat(parts[3]) || null : null;
        } else {
          entryName = parts[1];
          qty = parseFloat(parts[2]) || 0;
          prc = parts[3] ? parseFloat(parts[3]) || 0 : 0;
          cb = parts[4] ? parseFloat(parts[4]) || null : null;
        }
      }

      entries.push({ symbol: sym, name: entryName, quantity: qty, price: prc, cost_basis: cb, holding_type: 'equity' });
    }
    return entries;
  };

  const batchEntries = useMemo(() => {
    if (tab !== 'batch') return [];
    return parseBatchEntries();
  }, [batchText, tab]);

  const handleSaveSingle = async () => {
    if (!household || !accountId || !symbol.trim()) {
      toast.error('Please fill in symbol and select an account');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('investment_holdings').insert({
        household_id: household.id,
        account_id: accountId,
        symbol: symbol.toUpperCase().trim(),
        name: name.trim() || symbol.toUpperCase().trim(),
        quantity: parseFloat(quantity) || 0,
        price: parseFloat(price) || 0,
        market_value: (parseFloat(quantity) || 0) * (parseFloat(price) || 0),
        cost_basis: costBasis ? parseFloat(costBasis) : null,
        holding_type: holdingType,
      });
      if (error) throw error;
      toast.success(`Added ${symbol.toUpperCase()}`);
      qc.invalidateQueries({ queryKey: ['investment_holdings'] });
      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add holding');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBatch = async () => {
    if (!household || !batchAccountId || batchEntries.length === 0) {
      toast.error('Please add symbols and select an account');
      return;
    }
    setSaving(true);
    try {
      const rows = batchEntries.map(e => ({
        household_id: household!.id,
        account_id: batchAccountId,
        symbol: e.symbol,
        name: e.name,
        quantity: e.quantity,
        price: e.price,
        market_value: e.quantity * e.price,
        cost_basis: e.cost_basis,
        holding_type: e.holding_type,
      }));
      const { error } = await supabase.from('investment_holdings').insert(rows);
      if (error) throw error;
      toast.success(`Added ${rows.length} holding${rows.length !== 1 ? 's' : ''}`);
      qc.invalidateQueries({ queryKey: ['investment_holdings'] });
      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add holdings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Add Investment Holdings</DialogTitle>
          <DialogDescription>Add symbols manually — single entry or batch upload.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Single</TabsTrigger>
            <TabsTrigger value="batch" className="gap-1.5"><Upload className="h-3.5 w-3.5" /> Batch</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Account *</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Select investment account" /></SelectTrigger>
                <SelectContent>
                  {investmentAccounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Symbol *</Label>
                <Input value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="AAPL" className="uppercase" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={holdingType} onValueChange={setHoldingType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HOLDING_TYPES.map(t => (
                      <SelectItem key={t} value={t} className="capitalize">{t.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Apple Inc. (optional)" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Price</Label>
                <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Cost Basis</Label>
                <Input type="number" value={costBasis} onChange={e => setCostBasis(e.target.value)} placeholder="Optional" />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSaveSingle} disabled={saving || !symbol.trim() || !accountId}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Add Holding
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="batch" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Account *</Label>
              <Select value={batchAccountId} onValueChange={setBatchAccountId}>
                <SelectTrigger><SelectValue placeholder="Select investment account" /></SelectTrigger>
                <SelectContent>
                  {investmentAccounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Symbols (one per line)</Label>
              <Textarea
                value={batchText}
                onChange={e => setBatchText(e.target.value)}
                placeholder={`AAPL\nGOOG, Alphabet Inc\nMSFT, Microsoft, 50, 420.00\nVTI, Vanguard Total Stock, 100, 250, 22000`}
                rows={6}
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Formats: <code>SYMBOL</code> · <code>SYMBOL, Name</code> · <code>SYMBOL, Name, Qty, Price</code> · <code>SYMBOL, Name, Qty, Price, CostBasis</code>
              </p>
            </div>

            {batchEntries.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Preview ({batchEntries.length} symbols)</Label>
                <div className="flex flex-wrap gap-1.5">
                  {batchEntries.map((e, i) => (
                    <Badge key={i} variant="secondary" className="text-xs font-mono">
                      {e.symbol}
                      {e.quantity > 0 && <span className="text-muted-foreground ml-1">×{e.quantity}</span>}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSaveBatch} disabled={saving || batchEntries.length === 0 || !batchAccountId}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Add {batchEntries.length} Holding{batchEntries.length !== 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
