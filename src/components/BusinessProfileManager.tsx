import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBusinessProfiles, useCreateBusinessProfile, useUpdateBusinessProfile, useDeleteBusinessProfile } from '@/hooks/use-business-data';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';

const ENTITY_TYPES = [
  { value: 'llc', label: 'LLC' },
  { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
  { value: 's_corp', label: 'S-Corp' },
  { value: 'c_corp', label: 'C-Corp' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'other', label: 'Other' },
];

type FormState = {
  business_name: string;
  entity_type: string;
  ein: string;
  industry: string;
};

const emptyForm: FormState = { business_name: '', entity_type: 'llc', ein: '', industry: '' };

export default function BusinessProfileManager({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: profiles } = useBusinessProfiles();
  const createProfile = useCreateBusinessProfile();
  const updateProfile = useUpdateBusinessProfile();
  const deleteProfile = useDeleteBusinessProfile();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (bp: any) => {
    setEditingId(bp.id);
    setForm({
      business_name: bp.business_name,
      entity_type: bp.entity_type || 'llc',
      ein: bp.ein || '',
      industry: bp.industry || '',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.business_name.trim()) return;
    const payload = {
      business_name: form.business_name.trim(),
      entity_type: form.entity_type,
      ein: form.ein.trim() || null,
      industry: form.industry.trim() || null,
    };
    if (editingId) {
      await updateProfile.mutateAsync({ id: editingId, ...payload });
    } else {
      await createProfile.mutateAsync(payload);
    }
    setFormOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteProfile.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const isSaving = createProfile.isPending || updateProfile.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-prism-teal to-prism-sky flex items-center justify-center">
                <Building2 className="h-3.5 w-3.5 text-white" />
              </div>
              Manage Businesses
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 max-h-[340px] overflow-y-auto">
            {(!profiles || profiles.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-6">No businesses yet. Add one to get started.</p>
            )}
            {(profiles || []).map(bp => (
              <div key={bp.id} className="flex items-center justify-between rounded-xl border border-border/50 p-3 interactive-row hover-border-glow group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-prism-teal to-prism-lime flex items-center justify-center shrink-0">
                    <Building2 className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{bp.business_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{bp.entity_type?.replace('_', ' ')}{bp.industry ? ` · ${bp.industry}` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(bp)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ id: bp.id, name: bp.business_name })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button onClick={openCreate} className="w-full gap-2 prism-gradient text-primary-foreground hover:opacity-90">
            <Plus className="h-4 w-4" /> Add Business
          </Button>
        </DialogContent>
      </Dialog>

      {/* Create/Edit form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{editingId ? 'Edit Business' : 'Add Business'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Business Name</Label>
              <Input value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} placeholder="e.g. Acme Corp" />
            </div>
            <div className="space-y-2">
              <Label>Entity Type</Label>
              <Select value={form.entity_type} onValueChange={v => setForm(f => ({ ...f, entity_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map(et => (
                    <SelectItem key={et.value} value={et.value}>{et.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>EIN (optional)</Label>
                <Input value={form.ein} onChange={e => setForm(f => ({ ...f, ein: e.target.value }))} placeholder="XX-XXXXXXX" />
              </div>
              <div className="space-y-2">
                <Label>Industry (optional)</Label>
                <Input value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} placeholder="e.g. Technology" />
              </div>
            </div>
            <Button onClick={handleSave} disabled={!form.business_name.trim() || isSaving} className="w-full">
              {isSaving ? 'Saving...' : editingId ? 'Update Business' : 'Create Business'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete business?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This won't delete linked categories or transactions, but they will no longer be associated with this business.
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
    </>
  );
}
