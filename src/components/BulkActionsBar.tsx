import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { 
  Tags, Trash2, FolderInput, Download, X, Check, 
  CheckCircle2, Loader2, Tag, PenLine 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { exportTransactionsToCsv } from '@/lib/export-transactions';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Account {
  id: string;
  name: string;
}

interface Transaction {
  id: string;
  date: string;
  merchant: string | null;
  amount: number;
  account_id: string;
  category_id: string | null;
  notes: string | null;
  tags: string[] | null;
  accounts?: { name: string } | null;
  categories?: { name: string; color: string } | null;
}

interface BulkActionsBarProps {
  selected: Set<string>;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  onClearSelection: () => void;
  existingTags: string[];
}

export default function BulkActionsBar({
  selected,
  transactions,
  categories,
  accounts,
  onClearSelection,
  existingTags,
}: BulkActionsBarProps) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [merchantOpen, setMerchantOpen] = useState(false);
  const [newMerchant, setNewMerchant] = useState('');

  const selectedCount = selected.size;
  const selectedTransactions = transactions.filter(t => selected.has(t.id));

  if (selectedCount === 0) return null;

  const handleBulkCategorize = async (categoryId: string) => {
    setLoading(true);
    try {
      const ids = Array.from(selected);
      for (const id of ids) {
        await supabase.from('transactions').update({ category_id: categoryId }).eq('id', id);
      }
      qc.invalidateQueries({ queryKey: ['transactions'] });
      toast.success(`Categorized ${selectedCount} transactions`);
      onClearSelection();
    } catch (e: any) {
      toast.error('Failed to categorize transactions');
    } finally {
      setLoading(false);
      setCategoryOpen(false);
    }
  };

  const handleBulkMove = async (accountId: string) => {
    setLoading(true);
    try {
      const ids = Array.from(selected);
      for (const id of ids) {
        await supabase.from('transactions').update({ account_id: accountId }).eq('id', id);
      }
      qc.invalidateQueries({ queryKey: ['transactions'] });
      toast.success(`Moved ${selectedCount} transactions`);
      onClearSelection();
    } catch (e: any) {
      toast.error('Failed to move transactions');
    } finally {
      setLoading(false);
      setAccountOpen(false);
    }
  };

  const handleBulkTag = async (tag: string) => {
    setLoading(true);
    try {
      const ids = Array.from(selected);
      for (const id of ids) {
        const txn = transactions.find(t => t.id === id);
        const currentTags = txn?.tags || [];
        if (!currentTags.includes(tag)) {
          await supabase.from('transactions').update({ 
            tags: [...currentTags, tag] 
          }).eq('id', id);
        }
      }
      qc.invalidateQueries({ queryKey: ['transactions'] });
      toast.success(`Tagged ${selectedCount} transactions`);
      onClearSelection();
    } catch (e: any) {
      toast.error('Failed to tag transactions');
    } finally {
      setLoading(false);
      setTagOpen(false);
      setTagSearch('');
    }
  };

  const handleBulkRenameMerchant = async () => {
    const trimmed = newMerchant.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const ids = Array.from(selected);
      for (const id of ids) {
        await supabase.from('transactions').update({ merchant: trimmed }).eq('id', id);
      }
      qc.invalidateQueries({ queryKey: ['transactions'] });
      toast.success(`Renamed merchant to "${trimmed}" for ${selectedCount} transactions`);
      onClearSelection();
    } catch (e: any) {
      toast.error('Failed to rename merchant');
    } finally {
      setLoading(false);
      setMerchantOpen(false);
      setNewMerchant('');
    }
  };
  const handleBulkDelete = async () => {
    setLoading(true);
    try {
      const ids = Array.from(selected);
      const now = new Date().toISOString();
      for (const id of ids) {
        await supabase.from('transactions').update({ deleted_at: now }).eq('id', id);
      }
      qc.invalidateQueries({ queryKey: ['transactions'] });
      toast.success(`Moved ${selectedCount} transactions to trash`);
      onClearSelection();
    } catch (e: any) {
      toast.error('Failed to delete transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkApprove = async () => {
    setLoading(true);
    try {
      const ids = Array.from(selected);
      for (const id of ids) {
        await supabase.from('transactions').update({ needs_review: false }).eq('id', id);
      }
      qc.invalidateQueries({ queryKey: ['transactions'] });
      toast.success(`Approved ${selectedCount} transactions`);
      onClearSelection();
    } catch (e: any) {
      toast.error('Failed to approve transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    exportTransactionsToCsv(selectedTransactions, `selected-transactions-${selectedCount}.csv`);
    toast.success(`Exported ${selectedCount} transactions`);
  };

  const filteredTags = existingTags.filter(t => 
    t.toLowerCase().includes(tagSearch.toLowerCase())
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
      >
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-background/95 backdrop-blur-xl shadow-2xl px-4 py-3">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          
          <Badge variant="secondary" className="font-semibold">
            {selectedCount} selected
          </Badge>

          <div className="h-6 w-px bg-border mx-1" />

          {/* Categorize */}
          <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5" disabled={loading}>
                <Tags className="h-4 w-4" />
                <span className="hidden sm:inline">Categorize</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="center">
              <Command>
                <CommandInput placeholder="Search categories..." />
                <CommandList>
                  <CommandEmpty>No category found.</CommandEmpty>
                  <CommandGroup>
                    {categories.map(cat => (
                      <CommandItem
                        key={cat.id}
                        onSelect={() => handleBulkCategorize(cat.id)}
                        className="flex items-center gap-2"
                      >
                        <div 
                          className="h-3 w-3 rounded-full" 
                          style={{ backgroundColor: cat.color }} 
                        />
                        {cat.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Move to Account */}
          <Popover open={accountOpen} onOpenChange={setAccountOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5" disabled={loading}>
                <FolderInput className="h-4 w-4" />
                <span className="hidden sm:inline">Move</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="center">
              <Command>
                <CommandInput placeholder="Search accounts..." />
                <CommandList>
                  <CommandEmpty>No account found.</CommandEmpty>
                  <CommandGroup>
                    {accounts.map(acc => (
                      <CommandItem
                        key={acc.id}
                        onSelect={() => handleBulkMove(acc.id)}
                      >
                        {acc.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Add Tag */}
          <Popover open={tagOpen} onOpenChange={setTagOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5" disabled={loading}>
                <Tag className="h-4 w-4" />
                <span className="hidden sm:inline">Tag</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="center">
              <Command>
                <CommandInput 
                  placeholder="Search or add tag..." 
                  value={tagSearch}
                  onValueChange={setTagSearch}
                />
                <CommandList>
                  <CommandEmpty>
                    {tagSearch && (
                      <button
                        onClick={() => handleBulkTag(tagSearch)}
                        className="w-full px-2 py-1.5 text-sm text-left hover:bg-accent rounded"
                      >
                        Create "{tagSearch}"
                      </button>
                    )}
                  </CommandEmpty>
                  <CommandGroup>
                    {filteredTags.map(tag => (
                      <CommandItem
                        key={tag}
                        onSelect={() => handleBulkTag(tag)}
                      >
                        {tag}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Approve */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1.5" 
            disabled={loading}
            onClick={handleBulkApprove}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span className="hidden sm:inline">Approve</span>
          </Button>

          {/* Export */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1.5" 
            disabled={loading}
            onClick={handleExport}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>

          <div className="h-6 w-px bg-border mx-1" />

          {/* Delete */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10" 
            disabled={loading}
            onClick={handleBulkDelete}
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Delete</span>
          </Button>

          {/* Clear Selection */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 ml-1" 
            onClick={onClearSelection}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
