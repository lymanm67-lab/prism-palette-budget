import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { NeedsReviewItem } from '@/hooks/use-cleanup-candidates';
import { Loader2 } from 'lucide-react';

interface Props { items: NeedsReviewItem[] }

const BUCKET_LABELS: Record<NeedsReviewItem['bucket'], string> = {
  refund_pair: 'Refund pairs',
  system_fee: 'Interest / ACH fees',
  other: 'Other (review manually)',
};

export function NeedsReviewCleanup({ items }: Props) {
  const [busyBucket, setBusyBucket] = useState<string | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  if (!items.length) return <p className="text-sm text-muted-foreground">Nothing flagged for review.</p>;

  const buckets: NeedsReviewItem['bucket'][] = ['refund_pair', 'system_fee', 'other'];

  const clearBucket = async (bucket: NeedsReviewItem['bucket']) => {
    setBusyBucket(bucket);
    try {
      const ids = items.filter(i => i.bucket === bucket).map(i => i.id);
      if (ids.length) {
        const { error } = await supabase.from('transactions').update({ needs_review: false }).in('id', ids);
        if (error) throw error;
      }
      toast({ title: 'Flags cleared', description: `${ids.length} transaction(s) cleared from review.` });
      qc.invalidateQueries({ queryKey: ['cleanup-candidates'] });
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusyBucket(null);
    }
  };

  return (
    <div className="space-y-4">
      {buckets.map(b => {
        const rows = items.filter(i => i.bucket === b);
        if (!rows.length) return null;
        return (
          <div key={b} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">{BUCKET_LABELS[b]} ({rows.length})</h4>
              {b !== 'other' && (
                <Button size="sm" variant="outline" onClick={() => clearBucket(b)} disabled={busyBucket === b}>
                  {busyBucket === b && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                  Approve bucket
                </Button>
              )}
            </div>
            <div className="max-h-48 overflow-auto text-sm">
              <table className="w-full">
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} className="border-t border-border/50">
                      <td className="p-1.5 text-muted-foreground w-24">{r.date}</td>
                      <td className="p-1.5">{r.merchant || '—'}</td>
                      <td className="p-1.5 text-right font-mono">{r.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
