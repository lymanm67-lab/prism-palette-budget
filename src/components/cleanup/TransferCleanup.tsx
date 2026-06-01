import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { TransferCandidate } from '@/hooks/use-cleanup-candidates';
import { Loader2, ArrowLeftRight } from 'lucide-react';

interface Props { items: TransferCandidate[] }

export function TransferCleanup({ items }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(items.map(i => i.id)));
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  if (!items.length) {
    return <p className="text-sm text-muted-foreground">No transfer candidates found.</p>;
  }

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const apply = async () => {
    setBusy(true);
    try {
      const ids = Array.from(selected);
      // First pass: pair updates
      const paired = items.filter(i => selected.has(i.id) && i.pairId && selected.has(i.pairId));
      for (const t of paired) {
        await supabase.from('transactions')
          .update({ is_transfer: true, transfer_pair_id: t.pairId })
          .eq('id', t.id);
      }
      const unpairedIds = ids.filter(id => !paired.some(p => p.id === id));
      if (unpairedIds.length) {
        await supabase.from('transactions').update({ is_transfer: true }).in('id', unpairedIds);
      }
      toast({ title: 'Transfers marked', description: `Updated ${ids.length} transaction(s).` });
      qc.invalidateQueries({ queryKey: ['cleanup-candidates'] });
    } catch (e: any) {
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="max-h-80 overflow-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 sticky top-0">
            <tr className="text-left">
              <th className="p-2 w-10"></th>
              <th className="p-2">Date</th>
              <th className="p-2">Merchant</th>
              <th className="p-2 text-right">Amount</th>
              <th className="p-2">Pair</th>
            </tr>
          </thead>
          <tbody>
            {items.map(t => (
              <tr key={t.id} className="border-t border-border">
                <td className="p-2"><Checkbox checked={selected.has(t.id)} onCheckedChange={() => toggle(t.id)} /></td>
                <td className="p-2 text-muted-foreground">{t.date}</td>
                <td className="p-2">{t.merchant || '—'}</td>
                <td className="p-2 text-right font-mono">{t.amount.toFixed(2)}</td>
                <td className="p-2">{t.pairId ? <span className="inline-flex items-center gap-1 text-xs text-prism-teal"><ArrowLeftRight className="h-3 w-3" />paired</span> : <span className="text-xs text-muted-foreground">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{selected.size} of {items.length} selected</p>
        <Button onClick={apply} disabled={busy || !selected.size}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Mark as transfers
        </Button>
      </div>
    </div>
  );
}
