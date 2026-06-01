import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useCleanupCandidates } from '@/hooks/use-cleanup-candidates';
import { TransferCleanup } from '@/components/cleanup/TransferCleanup';
import { NeedsReviewCleanup } from '@/components/cleanup/NeedsReviewCleanup';
import { DuplicateBudgetMerger } from '@/components/cleanup/DuplicateBudgetMerger';
import { MerchantRecategorize } from '@/components/cleanup/MerchantRecategorize';
import { ChevronDown, Sparkles, ArrowLeftRight, AlertCircle, Layers, Tag, Loader2 } from 'lucide-react';

export default function Cleanup() {
  const { data, isLoading } = useCleanupCandidates();
  const [open, setOpen] = useState<string | null>(null);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sections = [
    { key: 'transfers', icon: ArrowLeftRight, title: 'Mark transfers', desc: 'Bank-to-bank moves polluting your spending totals.', count: data.counts.transfers,
      body: <TransferCleanup items={data.transfers} /> },
    { key: 'needsReview', icon: AlertCircle, title: 'Clear needs-review flags', desc: 'Refund pairs, interest credits, and ACH fees waiting on you.', count: data.counts.needsReview,
      body: <NeedsReviewCleanup items={data.needsReview} /> },
    { key: 'duplicateBudgets', icon: Layers, title: 'Merge duplicate budget categories', desc: 'Same category split into two budget lines.', count: data.counts.duplicateBudgets,
      body: <DuplicateBudgetMerger groups={data.duplicateBudgets} /> },
    { key: 'miscategorized', icon: Tag, title: 'Fix mis-categorized merchants', desc: 'Includes the "Movable Feast → Lovable" bank-feed misread.', count: data.counts.miscategorized,
      body: <MerchantRecategorize groups={data.miscategorized} /> },
  ];

  const total = sections.reduce((s, x) => s + x.count, 0);

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-prism-amber" />
            Data Cleanup
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            One-click fixes for transaction and budget issues. Every action shows a preview before saving.
          </p>
        </div>
        {total > 0 && <Badge variant="secondary" className="text-base">{total} items</Badge>}
      </div>

      {total === 0 && (
        <Card><CardContent className="py-12 text-center">
          <Sparkles className="h-10 w-10 mx-auto text-prism-teal mb-3" />
          <p className="font-medium">Everything looks clean.</p>
          <p className="text-sm text-muted-foreground">No transfers, flags, duplicate budgets, or known merchant mismatches detected.</p>
        </CardContent></Card>
      )}

      {sections.map(s => (
        <Collapsible key={s.key} open={open === s.key} onOpenChange={(v) => setOpen(v ? s.key : null)}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <s.icon className="h-5 w-5 text-prism-teal" />
                    <div>
                      <CardTitle className="text-base">{s.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={s.count ? 'default' : 'secondary'}>{s.count}</Badge>
                    <ChevronDown className={`h-4 w-4 transition-transform ${open === s.key ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>{s.body}</CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}
    </div>
  );
}
