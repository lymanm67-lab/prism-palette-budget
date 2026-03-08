import React, { useState, useMemo } from 'react';
import { Check, Plus, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useCategories, useCategoryGroups, useCreateCategory } from '@/hooks/use-finance-data';
import { toast } from 'sonner';

interface CategoryComboboxProps {
  value: string;
  onValueChange: (id: string) => void;
  placeholder?: string;
  className?: string;
}

export default function CategoryCombobox({ value, onValueChange, placeholder = 'Select category...', className }: CategoryComboboxProps) {
  const { data: categories } = useCategories();
  const { data: groups } = useCategoryGroups();
  const createCategory = useCreateCategory();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedCat = useMemo(() => categories?.find(c => c.id === value), [categories, value]);

  const filtered = useMemo(() => {
    if (!categories) return [];
    const q = search.toLowerCase();
    return q ? categories.filter(c => c.name.toLowerCase().includes(q)) : categories;
  }, [categories, search]);

  // Group filtered categories by group
  const grouped = useMemo(() => {
    if (!groups) return [{ name: 'Categories', color: '#888', cats: filtered }];
    const map = new Map<string, { name: string; color: string; cats: typeof filtered }>();
    for (const g of groups) {
      map.set(g.id, { name: g.name, color: g.color, cats: [] });
    }
    for (const c of filtered) {
      const group = map.get(c.group_id);
      if (group) group.cats.push(c);
      else {
        if (!map.has('_ungrouped')) map.set('_ungrouped', { name: 'Other', color: '#888', cats: [] });
        map.get('_ungrouped')!.cats.push(c);
      }
    }
    return Array.from(map.values()).filter(g => g.cats.length > 0);
  }, [groups, filtered]);

  const handleAddNew = async () => {
    if (!search.trim() || !groups?.length) return;
    try {
      const result = await createCategory.mutateAsync({
        name: search.trim(),
        color: '#7c5cf5',
        group_id: groups[0].id,
      });
      onValueChange(result.id);
      setSearch('');
      setOpen(false);
      toast.success(`Created category "${result.name}"`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to create category');
    }
  };

  const exactMatch = categories?.some(c => c.name.toLowerCase() === search.toLowerCase().trim());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className={cn('w-full justify-between font-normal', !value && 'text-muted-foreground', className)}>
          <span className="flex items-center gap-2 truncate">
            {selectedCat ? (
              <>
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: selectedCat.color }} />
                {selectedCat.name}
              </>
            ) : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 pl-8 text-sm"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-[250px] overflow-y-auto p-1">
          {/* Clear selection option */}
          {value && (
            <button
              className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
              onClick={() => { onValueChange(''); setOpen(false); setSearch(''); }}
            >
              <span className="h-4 w-4" /> Clear selection
            </button>
          )}
          {grouped.map(group => (
            <div key={group.name}>
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: group.color }} />
                {group.name}
              </div>
              {group.cats.map(c => (
                <button
                  key={c.id}
                  className={cn(
                    'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors',
                    value === c.id && 'bg-muted font-medium'
                  )}
                  onClick={() => { onValueChange(c.id); setOpen(false); setSearch(''); }}
                >
                  <Check className={cn('h-3.5 w-3.5 shrink-0', value === c.id ? 'opacity-100' : 'opacity-0')} />
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && !search.trim() && (
            <p className="px-2 py-3 text-sm text-center text-muted-foreground">No categories yet</p>
          )}
          {/* Add new category option */}
          {search.trim() && !exactMatch && (
            <button
              className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-primary hover:bg-muted transition-colors border-t mt-1 pt-2"
              onClick={handleAddNew}
              disabled={createCategory.isPending}
            >
              <Plus className="h-3.5 w-3.5" />
              {createCategory.isPending ? 'Creating...' : `Add "${search.trim()}"`}
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
