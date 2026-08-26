import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Loader2, Play, ShieldCheck } from 'lucide-react';
import { useApplyChanges, useRulePlan, useRules } from '@/hooks/use-rules-manager';
import { AUTO_APPLY_THRESHOLD, groupPlan, type ProposedChange } from '@/lib/rules-engine';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

export function RuleRunner() {
  const { data: plan, isLoading, refetch } = useRulePlan();
  const { data: rules } = useRules();
  const apply = useApplyChanges();
  const { toast } = useToast();
  const [picked, setPicked] = useState<Record<string, boolean>>({});

  const catName = (id: string | null) => rules?.categories.find((c) => c.id === id)?.name || 'Uncategorized';

  const { confident, uncertain } = useMemo(() => {
    const all = plan?.plan || [];
    return {
      confident: groupPlan(all.filter((c) => c.confidence >= AUTO_APPLY_THRESHOLD)),
      uncertain: groupPlan(all.filter((c) => c.confidence < AUTO_APPLY_THRESHOLD)),
    };
  }, [plan]);

  const confidentCount = confident.reduce((s, g) => s + g.changes.length, 0);
  const uncertainCount = uncertain.reduce((s, g) => s + g.changes.length, 0);

  const runApply = async (changes: ProposedChange[], label: string) => {
    if (!changes.length) return;
    try {
      const n = await apply.mutateAsync(changes);
      toast({ title: label, description: `${n} transaction change(s) applied. Budgets and reports refreshed.` });
      setPicked({});
      refetch();
    } catch (e) {
      toast({ title: 'Failed', description: (e as Error).message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Scanning transactions against your rules…</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-prism-teal" />
            Confident matches
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Scanned {plan?.scanned ?? 0} transactions from the last 12 months. These match a rule exactly or on a whole word, so they are safe to apply in one click.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {confidentCount === 0 && <p className="text-sm text-muted-foreground">Nothing to change — every transaction already matches your rules.</p>}
          {confident.map((g) => (
            <div key={g.ruleKey} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{g.ruleName}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{g.changes.length}</Badge>
                  <Badge variant="outline">{Math.round(g.confidence * 100)}%</Badge>
                </div>
              </div>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {g.changes.slice(0, 4).map((c) => (
                  <li key={`${c.txnId}-${c.ruleKey}`} className="flex justify-between gap-2">
                    <span className="truncate">
                      {c.date} · {c.beforeMerchant || '—'}
                      {c.afterMerchant && c.afterMerchant !== c.beforeMerchant ? ` → ${c.afterMerchant}` : ''}
                      {c.afterCategoryId !== c.beforeCategoryId ? ` · ${catName(c.beforeCategoryId)} → ${catName(c.afterCategoryId)}` : ''}
                    </span>
                    <span>{fmt(c.amount)}</span>
                  </li>
                ))}
                {g.changes.length > 4 && <li>+{g.changes.length - 4} more</li>}
              </ul>
            </div>
          ))}
          <Button disabled={!confidentCount || apply.isPending} onClick={() => runApply(confident.flatMap((g) => g.changes), 'Rules re-run')}>
            {apply.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Re-run rules on {confidentCount} transaction{confidentCount === 1 ? '' : 's'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-prism-amber" />
            Needs your confirmation
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Partial or fuzzy merchant matches below {Math.round(AUTO_APPLY_THRESHOLD * 100)}% confidence. Nothing here is applied until you tick it.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {uncertainCount === 0 && <p className="text-sm text-muted-foreground">No uncertain matches.</p>}
          {uncertain.map((g) => (
            <div key={g.ruleKey} className="rounded-lg border border-prism-amber/40 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{g.ruleName}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{g.matchKind} match</Badge>
                  <Badge variant="secondary">{Math.round(g.confidence * 100)}%</Badge>
                </div>
              </div>
              <Progress value={g.confidence * 100} className="h-1.5" />
              <div className="space-y-1">
                {g.changes.map((c) => {
                  const key = `${c.txnId}-${c.ruleKey}`;
                  return (
                    <label key={key} className="flex items-center gap-2 text-xs cursor-pointer">
                      <Checkbox checked={!!picked[key]} onCheckedChange={(v) => setPicked((p) => ({ ...p, [key]: !!v }))} />
                      <span className="flex-1 truncate">
                        {c.date} · {c.beforeMerchant || '—'}
                        {c.afterMerchant && c.afterMerchant !== c.beforeMerchant ? ` → ${c.afterMerchant}` : ''}
                        {c.afterCategoryId !== c.beforeCategoryId ? ` · ${catName(c.beforeCategoryId)} → ${catName(c.afterCategoryId)}` : ''}
                      </span>
                      <span className="text-muted-foreground">{fmt(c.amount)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
          {uncertainCount > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={apply.isPending}
                onClick={() =>
                  runApply(
                    uncertain.flatMap((g) => g.changes).filter((c) => picked[`${c.txnId}-${c.ruleKey}`]),
                    'Confirmed changes applied'
                  )
                }
              >
                Apply confirmed
              </Button>
              <Button variant="ghost" onClick={() => setPicked({})}>Clear selection</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
