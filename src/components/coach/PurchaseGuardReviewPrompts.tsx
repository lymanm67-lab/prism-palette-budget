import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ThumbsUp, ThumbsDown, Clock } from 'lucide-react';
import { usePurchaseGuardChecks, useUpdatePurchaseGuardCheck } from '@/hooks/use-purchase-guard';

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export function PurchaseGuardReviewPrompts() {
  const { data: checks } = usePurchaseGuardChecks(50);
  const update = useUpdatePurchaseGuardCheck();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const due = (checks || []).filter((c: any) =>
    c.post_review_due_at &&
    !c.post_review_completed_at &&
    new Date(c.post_review_due_at).getTime() <= Date.now(),
  );

  if (due.length === 0) return null;

  const respond = (id: string, worth: boolean) => {
    update.mutate({
      id,
      post_review_completed_at: new Date().toISOString(),
      post_review_worth_it: worth,
      post_review_notes: notes[id] || null,
    });
  };

  return (
    <div className="rounded-xl border border-prism-amber/30 bg-prism-amber/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-prism-amber" />
        <span className="text-xs font-bold uppercase tracking-wider text-prism-amber">
          {due.length} purchase{due.length === 1 ? '' : 's'} ready for review
        </span>
      </div>
      <div className="space-y-3">
        {due.slice(0, 3).map((c: any) => (
          <div key={c.id} className="rounded-lg bg-background/40 border border-border/40 p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="min-w-0">
                <div className="font-semibold truncate">{c.merchant || c.purpose?.slice(0, 40) || 'Purchase'}</div>
                <div className="text-[11px] text-muted-foreground">
                  {fmt(c.amount)} · Fit {c.fit_score}
                  {c.decision === 'overridden' && <Badge variant="outline" className="ml-1 text-[9px]">override</Badge>}
                </div>
              </div>
            </div>
            <Textarea rows={2} placeholder="One line on how it went (optional)" className="text-xs"
              value={notes[c.id] || ''} onChange={e => setNotes(n => ({ ...n, [c.id]: e.target.value }))} />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 h-7 text-xs"
                onClick={() => respond(c.id, true)}>
                <ThumbsUp className="h-3 w-3 mr-1" /> Worth it
              </Button>
              <Button size="sm" variant="outline" className="flex-1 h-7 text-xs"
                onClick={() => respond(c.id, false)}>
                <ThumbsDown className="h-3 w-3 mr-1" /> Regret
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
