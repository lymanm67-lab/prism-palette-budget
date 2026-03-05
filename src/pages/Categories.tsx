import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  useCategoryGroups, useCategories,
  useCreateCategoryGroup, useUpdateCategoryGroup, useDeleteCategoryGroup,
  useCreateCategory, useUpdateCategory, useDeleteCategory,
} from '@/hooks/use-finance-data';
import { useBusinessProfiles } from '@/hooks/use-business-data';
import { Loader2, Plus, Pencil, Trash2, GripVertical, ChevronDown, ChevronRight, FolderOpen, Building2 } from 'lucide-react';

const PRESET_COLORS = [
  '#7c3aed', '#2563eb', '#0891b2', '#059669', '#65a30d',
  '#ca8a04', '#ea580c', '#dc2626', '#db2777', '#7c5cf5',
  '#0ea5e9', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#6366f1',
];

const ColorPicker = ({ value, onChange }: { value: string; onChange: (c: string) => void }) => (
  <div className="flex flex-wrap gap-2">
    {PRESET_COLORS.map(c => (
      <button
        key={c}
        type="button"
        onClick={() => onChange(c)}
        className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${value === c ? 'border-foreground scale-110' : 'border-transparent'}`}
        style={{ backgroundColor: c }}
      />
    ))}
    <div className="relative">
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="absolute inset-0 h-7 w-7 cursor-pointer opacity-0"
      />
      <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground text-xs text-muted-foreground">
        +
      </div>
    </div>
  </div>
);

const Categories = () => {
  const { data: groups, isLoading: groupsLoading } = useCategoryGroups();
  const { data: categories, isLoading: catsLoading } = useCategories();
  const { data: businessProfiles } = useBusinessProfiles();

  const createGroup = useCreateCategoryGroup();
  const updateGroup = useUpdateCategoryGroup();
  const deleteGroup = useDeleteCategoryGroup();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  // Dialog state
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<{ id: string; name: string; color: string; budget_type?: string; business_profile_id?: string | null } | null>(null);
  const [editingCat, setEditingCat] = useState<{ id: string; name: string; color: string; group_id: string } | null>(null);
  const [groupForm, setGroupForm] = useState({ name: '', color: '#7c3aed', budget_type: 'personal', business_profile_id: '' as string });
  const [catForm, setCatForm] = useState({ name: '', color: '#7c5cf5', group_id: '' });

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'group' | 'category'; id: string; name: string } | null>(null);

  // Collapsed groups
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleCollapse = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Group dialog
  const openCreateGroup = () => {
    setEditingGroup(null);
    setGroupForm({ name: '', color: '#7c3aed', budget_type: 'personal', business_profile_id: '' });
    setGroupDialogOpen(true);
  };
  const openEditGroup = (g: { id: string; name: string; color: string; budget_type?: string; business_profile_id?: string | null }) => {
    setEditingGroup(g);
    setGroupForm({ name: g.name, color: g.color, budget_type: g.budget_type || 'personal', business_profile_id: g.business_profile_id || '' });
    setGroupDialogOpen(true);
  };
  const handleSaveGroup = async () => {
    if (!groupForm.name.trim()) return;
    const bpId = groupForm.budget_type === 'business' && groupForm.business_profile_id ? groupForm.business_profile_id : null;
    if (editingGroup) {
      await updateGroup.mutateAsync({ id: editingGroup.id, name: groupForm.name.trim(), color: groupForm.color, budget_type: groupForm.budget_type, business_profile_id: bpId });
    } else {
      await createGroup.mutateAsync({ name: groupForm.name.trim(), color: groupForm.color, sort_order: (groups?.length || 0), budget_type: groupForm.budget_type, business_profile_id: bpId });
    }
    setGroupDialogOpen(false);
  };

  // Category dialog
  const openCreateCat = (groupId: string) => {
    setEditingCat(null);
    setCatForm({ name: '', color: '#7c5cf5', group_id: groupId });
    setCatDialogOpen(true);
  };
  const openEditCat = (c: { id: string; name: string; color: string; group_id: string }) => {
    setEditingCat(c);
    setCatForm({ name: c.name, color: c.color, group_id: c.group_id });
    setCatDialogOpen(true);
  };
  const handleSaveCat = async () => {
    if (!catForm.name.trim() || !catForm.group_id) return;
    if (editingCat) {
      await updateCategory.mutateAsync({ id: editingCat.id, name: catForm.name.trim(), color: catForm.color, group_id: catForm.group_id });
    } else {
      const groupCats = (categories || []).filter(c => c.group_id === catForm.group_id);
      await createCategory.mutateAsync({ name: catForm.name.trim(), color: catForm.color, group_id: catForm.group_id, sort_order: groupCats.length });
    }
    setCatDialogOpen(false);
  };

  // Delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'group') {
      await deleteGroup.mutateAsync(deleteTarget.id);
    } else {
      await deleteCategory.mutateAsync(deleteTarget.id);
    }
    setDeleteTarget(null);
  };

  // Move group up/down
  const moveGroup = async (idx: number, dir: -1 | 1) => {
    if (!groups) return;
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= groups.length) return;
    await Promise.all([
      updateGroup.mutateAsync({ id: groups[idx].id, sort_order: swapIdx }),
      updateGroup.mutateAsync({ id: groups[swapIdx].id, sort_order: idx }),
    ]);
  };

  // Move category up/down within group
  const moveCat = async (groupCats: typeof categories extends (infer T)[] | undefined ? T[] : never[], idx: number, dir: -1 | 1) => {
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= groupCats.length) return;
    await Promise.all([
      updateCategory.mutateAsync({ id: groupCats[idx].id, sort_order: swapIdx }),
      updateCategory.mutateAsync({ id: groupCats[swapIdx].id, sort_order: idx }),
    ]);
  };

  if (groupsLoading || catsLoading) return <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Categories</h1>
          <p className="text-muted-foreground">Organize your transactions with groups and categories.</p>
        </div>
        <Button className="gap-2" onClick={openCreateGroup}>
          <Plus className="h-4 w-4" /> Add Group
        </Button>
      </div>

      {(!groups || groups.length === 0) && (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          No category groups yet. Create a group to start organizing your categories.
        </CardContent></Card>
      )}

      <div className="space-y-4">
        {(groups || []).map((group, gIdx) => {
          const groupCats = (categories || []).filter(c => c.group_id === group.id).sort((a, b) => a.sort_order - b.sort_order);
          const isCollapsed = collapsed.has(group.id);

          return (
            <motion.div key={group.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <button onClick={() => toggleCollapse(group.id)} className="flex items-center gap-2 text-left">
                      {isCollapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      <span className="h-3.5 w-3.5 rounded-sm" style={{ backgroundColor: group.color }} />
                      <CardTitle className="font-display text-base">{group.name}</CardTitle>
                      <span className="text-xs text-muted-foreground">({groupCats.length})</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{(group as any).budget_type || 'personal'}</Badge>
                      {(group as any).business_profile_id && businessProfiles && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
                          <Building2 className="h-2.5 w-2.5" />
                          {businessProfiles.find(bp => bp.id === (group as any).business_profile_id)?.business_name || 'Linked'}
                        </Badge>
                      )}
                    </button>
                    <div className="flex items-center gap-1">
                      {gIdx > 0 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveGroup(gIdx, -1)}>
                          <GripVertical className="h-3.5 w-3.5 rotate-90" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditGroup(group)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ type: 'group', id: group.id, name: group.name })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <CardContent className="p-4 pt-0">
                        <div className="space-y-1">
                          {groupCats.map((cat, cIdx) => (
                            <div key={cat.id} className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-muted/50 group">
                              <div className="flex items-center gap-3">
                                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                                <span className="text-sm font-medium">{cat.name}</span>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {cIdx > 0 && (
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveCat(groupCats, cIdx, -1)}>
                                    <span className="text-xs">↑</span>
                                  </Button>
                                )}
                                {cIdx < groupCats.length - 1 && (
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveCat(groupCats, cIdx, 1)}>
                                    <span className="text-xs">↓</span>
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditCat({ id: cat.id, name: cat.name, color: cat.color, group_id: cat.group_id })}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ type: 'category', id: cat.id, name: cat.name })}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <Button variant="ghost" size="sm" className="mt-2 gap-1.5 text-muted-foreground" onClick={() => openCreateCat(group.id)}>
                          <Plus className="h-3.5 w-3.5" /> Add Category
                        </Button>
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Group Dialog */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{editingGroup ? 'Edit Group' : 'Create Group'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Group Name</Label>
              <Input value={groupForm.name} onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Housing, Food & Dining" />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <ColorPicker value={groupForm.color} onChange={c => setGroupForm(f => ({ ...f, color: c }))} />
            </div>
            <div className="space-y-2">
              <Label>Budget Type</Label>
              <Select value={groupForm.budget_type} onValueChange={v => setGroupForm(f => ({ ...f, budget_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {groupForm.budget_type === 'business' && businessProfiles && businessProfiles.length > 0 && (
              <div className="space-y-2">
                <Label>Linked Business Profile</Label>
                <Select value={groupForm.business_profile_id} onValueChange={v => setGroupForm(f => ({ ...f, business_profile_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select a business profile" /></SelectTrigger>
                  <SelectContent>
                    {businessProfiles.map(bp => (
                      <SelectItem key={bp.id} value={bp.id}>
                        <span className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5" />
                          {bp.business_name}
                          <span className="text-xs text-muted-foreground capitalize">({bp.entity_type})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Link this group to a business for filtering in reports.</p>
              </div>
            )}
            <Button onClick={handleSaveGroup} disabled={!groupForm.name.trim() || createGroup.isPending || updateGroup.isPending} className="w-full">
              {(createGroup.isPending || updateGroup.isPending) ? 'Saving...' : editingGroup ? 'Update Group' : 'Create Group'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{editingCat ? 'Edit Category' : 'Add Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category Name</Label>
              <Input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Rent, Groceries" />
            </div>
            <div className="space-y-2">
              <Label>Group</Label>
              <Select value={catForm.group_id} onValueChange={v => setCatForm(f => ({ ...f, group_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                <SelectContent>
                  {(groups || []).map(g => (
                    <SelectItem key={g.id} value={g.id}>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: g.color }} />
                        {g.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <ColorPicker value={catForm.color} onChange={c => setCatForm(f => ({ ...f, color: c }))} />
            </div>
            <Button onClick={handleSaveCat} disabled={!catForm.name.trim() || !catForm.group_id || createCategory.isPending || updateCategory.isPending} className="w-full">
              {(createCategory.isPending || updateCategory.isPending) ? 'Saving...' : editingCat ? 'Update Category' : 'Create Category'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === 'group' ? 'group' : 'category'}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"?
              {deleteTarget?.type === 'group' && ' This will also delete all categories in this group.'}
              {' '}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default Categories;
