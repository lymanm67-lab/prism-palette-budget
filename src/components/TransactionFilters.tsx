import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SlidersHorizontal, X } from 'lucide-react';

export interface TransactionFiltersState {
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
  accountId: string;
  categoryId: string;
}

const EMPTY_FILTERS: TransactionFiltersState = {
  dateFrom: '', dateTo: '', amountMin: '', amountMax: '', accountId: '', categoryId: '',
};

interface Props {
  filters: TransactionFiltersState;
  onChange: (f: TransactionFiltersState) => void;
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}

export const emptyFilters = EMPTY_FILTERS;

const TransactionFilters = ({ filters, onChange, accounts, categories }: Props) => {
  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 hover-border-glow relative" aria-label="Filter transactions">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-4" align="end">
        <div className="flex items-center justify-between">
          <h4 className="font-display font-semibold text-sm">Filters</h4>
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_FILTERS)} className="h-7 text-xs gap-1">
              <X className="h-3 w-3" /> Clear
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="date" value={filters.dateFrom} onChange={e => onChange({ ...filters, dateFrom: e.target.value })} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="date" value={filters.dateTo} onChange={e => onChange({ ...filters, dateTo: e.target.value })} className="h-8 text-xs" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Min Amount</Label>
            <Input type="number" step="0.01" value={filters.amountMin} onChange={e => onChange({ ...filters, amountMin: e.target.value })} placeholder="0" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Max Amount</Label>
            <Input type="number" step="0.01" value={filters.amountMax} onChange={e => onChange({ ...filters, amountMax: e.target.value })} placeholder="∞" className="h-8 text-xs" />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Account</Label>
          <Select value={filters.accountId} onValueChange={v => onChange({ ...filters, accountId: v === '_all' ? '' : v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All accounts" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All accounts</SelectItem>
              {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Category</Label>
          <Select value={filters.categoryId} onValueChange={v => onChange({ ...filters, categoryId: v === '_all' ? '' : v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All categories</SelectItem>
              {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default TransactionFilters;
