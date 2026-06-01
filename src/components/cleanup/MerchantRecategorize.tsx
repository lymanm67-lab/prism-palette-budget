import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { MiscategorizedGroup } from '@/hooks/use-cleanup-candidates';
import { Loader2, Sparkles } from 'lucide-react';

interface Props { groups: MiscategorizedGroup[] }

export function MerchantRecategorize({ groups }: Props) {
  if (!groups.length) return <p className="text-sm text-muted-foreground">All known merchants look correctly categorized.</p>;
  return <div className="space-y-3">{groups.map(g => <GroupCard key={g.canonical} group={g} />)}</div>;
}

function GroupCard({ group }: { group: MiscategorizedGroup }) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const applicable = group.transactions.filter(t => !t.hasSplit);
  const skipped = group.transactions.filter(t => t.hasSplit);
  const total = applicable.reduce((s, t) => s + Math.abs(t.amount), 0);

  const apply = async () => {
    setBusy(true);
    try {
      const ids = applicable.map(t => t.id);
      if (ids.length) {
        const { error } = await supabase
          .from('transactions')
          .update({
            category_id: group.targetCategoryId,
            merchant: group.canonical,
            normalized_merchant: group.canonical.toLowerCase(),
          })
          .in('id', ids);
        if (error) throw error;
      }
      toast({ title: 'Re-categorized', description: `${ids.length} "${group.canonical}" transaction(s) fixed.` });
      qc.invalidateQueries({ queryKey: ['cleanup-candidates'] });
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-prism-amber" />
            {group.canonical} → {group.targetCategoryName}
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            {applicable.length} transaction{applicable.length !== 1 ? 's' : ''} (${total.toFixed(2)}) will move into <span className="text-foreground">{group.targetCategoryName}</span> and have the merchant name normalized.
          </p>
        </div>
        <Button size="sm" onClick={apply} disabled={busy || !applicable.length}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Apply
        </Button>
      </div>
      <div className="max-h-48 overflow-auto rounded-md bg-muted/20">
        <table className="w-full text-sm">
          <tbody>
            {applicable.map(t => (
              <tr key={t.id} className="border-t border-border/40">
                <td className="p-1.5 text-muted-foreground w-24">{t.date}</td>
                <td className="p-1.5">{t.merchant}</td>
                <td className="p-1.5 text-xs text-muted-foreground">{t.currentCategoryName || 'Uncategorized'}</td>
                <td className="p-1.5 text-right font-mono">{t.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {skipped.length > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          Skipped {skipped.length} with manual splits — fix those individually on the Transactions page.
        </p>
      )}
    </div>
  );
}
