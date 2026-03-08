import React, { useState, useMemo } from 'react';
import { Check, Plus, Search, ChevronLeft } from 'lucide-react';
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
  const [pendingName, setPendingName] = useState('');
  const [pickingGroup, setPickingGroup] = useState(false);

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

  const startAddNew = () => {
    setPendingName(search.trim());
    setPickingGroup(true);
  };

  const handlePickGroup = async (groupId: string) => {
    if (!pendingName) return;
    try {
      const result = await createCategory.mutateAsync({
        name: pendingName,
        color: '#7c5cf5',
        group_id: groupId,
      });
      onValueChange(result.id);
      setSearch('');
      setPendingName('');
      setPickingGroup(false);
      setOpen(false);
      const groupName = groups?.find(g => g.id === groupId)?.name || 'group';
      toast.success(`Created "${result.name}" in ${groupName}`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to create category');
    }
  };

  const cancelGroupPick = () => {
    setPickingGroup(false);
    setPendingName('');
  };

  const exactMatch = categories?.some(c => c.name.toLowerCase() === search.toLowerCase().trim());

  // Personal groups first for the picker
  const personalGroups = useMemo(() => {
    if (!groups) return [];
    return [...groups].sort((a, b) => {
      const aPersonal = (a as any).budget_type === 'personal' ? 0 : 1;
      const bPersonal = (b as any).budget_type === 'personal' ? 0 : 1;
      if (aPersonal !== bPersonal) return aPersonal - bPersonal;
      return a.name.localeCompare(b.name);
    });
  }, [groups]);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setPickingGroup(false); setPendingName(''); } }}>
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
        {pickingGroup ? (
          <>
            <div className="p-2 border-b flex items-center gap-2">
              <button onClick={cancelGroupPick} className="p-1 rounded hover:bg-muted transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium truncate">
                Add "<span className="text-primary">{pendingName}</span>" to group:
              </span>
            </div>
            <div className="max-h-[280px] overflow-y-auto p-1">
              {personalGroups.map(g => (
                <button
                  key={g.id}
                  className="w-full flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted transition-colors"
                  onClick={() => handlePickGroup(g.id)}
                  disabled={createCategory.isPending}
                >
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                  <span className="truncate">{g.name}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground capitalize">
                    {(g as any).budget_type}
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
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
              {/* Add new category option — now asks for group first */}
              {search.trim() && !exactMatch && (
                <button
                  className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-primary hover:bg-muted transition-colors border-t mt-1 pt-2"
                  onClick={startAddNew}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add "{search.trim()}" — pick group…
                </button>
              )}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
