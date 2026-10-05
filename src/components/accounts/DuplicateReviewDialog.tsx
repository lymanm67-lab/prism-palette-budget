import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { softDeleteDuplicates } from '@/lib/duplicate-detector';
import { markGroupNotDuplicate, type RefreshDupeGroup } from '@/lib/refresh-dupe-guard';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  groups: RefreshDupeGroup[];
  householdId: string;
  accountNames: Record<string, string>;
  onResolved: (key: string) => void;
}

const fmt = (n: number) => Math.abs(n).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default function DuplicateReviewDialog({ open, onOpenChange, groups, householdId, accountNames, onResolved }: Props) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['transactions'] });
    qc.invalidateQueries({ queryKey: ['accounts'] });
    qc.invalidateQueries({ queryKey: ['categorization-audit'] });
  };

  const removeExtras = async (g: RefreshDupeGroup) => {
    setBusy(g.key);
    const extras = g.txns.slice(1);
    const res = await softDeleteDuplicates({
      householdId,
      txns: extras,
      ruleKey: 'refresh-dupe-guard',
      ruleName: 'Refresh duplicate review',
    });
    setBusy(null);
    if (res.error) return toast.error(res.error);
    toast.success(`Removed ${res.deleted} duplicate${res.deleted === 1 ? '' : 's'} — undo anytime from the Categorization Audit`);
    onResolved(g.key);
    refresh();
  };

  const keepBoth = async (g: RefreshDupeGroup) => {
    setBusy(g.key);
    try {
      await markGroupNotDuplicate(g);
      toast.success('Kept all — these won’t be flagged again');
      onResolved(g.key);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Possible duplicates ({groups.length})</DialogTitle>
          <DialogDescription>
            Same account and same amount within 3 days. The first (oldest) row is kept. Choose “Duplicate” to remove the extra copies, or “Extra payment” if they were real separate charges.
          </DialogDescription>
        </DialogHeader>
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No possible duplicates left to review.</p>
        ) : (
          <div className="space-y-3">
            {groups.map((g) => (
              <div key={g.key} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">{fmt(g.amount)} · {g.txns.length} copies</div>
                  <span className="text-xs text-muted-foreground">{accountNames[g.account_id || ''] || 'Unknown account'}</span>
                </div>
                <ul className="space-y-1 text-sm">
                  {g.txns.map((t, i) => (
                    <li key={t.id} className="flex items-start justify-between gap-2 rounded bg-muted/40 px-2 py-1">
                      <div className="min-w-0">
                        <div className="truncate">{t.merchant || '(no description)'}</div>
                        <div className="text-xs text-muted-foreground">
                          Posted {t.date} · imported {new Date(t.created_at).toLocaleString()}
                        </div>
                      </div>
                      {i === 0 ? <Badge variant="secondary">Keep</Badge> : <Badge variant="outline">Extra copy?</Badge>}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button size="sm" variant="outline" disabled={busy === g.key} onClick={() => keepBoth(g)}>
                    Extra payment (keep all)
                  </Button>
                  <Button size="sm" variant="destructive" disabled={busy === g.key} onClick={() => removeExtras(g)}>
                    {busy === g.key && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}Duplicate (remove extras)
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
