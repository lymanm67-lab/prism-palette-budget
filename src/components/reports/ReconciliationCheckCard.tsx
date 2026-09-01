import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck, Wand2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  runReconciliationCheck,
  isAutoFixable,
  isBulkFixable,
  type RecFinding,
  type RecTxn,
} from '@/lib/reconciliationCheck';


/**
 * Pre-export gate: flags income / transfer / spending misclassifications for a
 * date range and applies the specific fix on request. Hidden when printing.
 */
export default function ReconciliationCheckCard({
  start,
  end,
  periodLabel,
}: {
  start: string;
  end: string;
  periodLabel: string;
}) {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reconciliation-check', household?.id, start, end],
    enabled: !!household?.id,
    queryFn: async () => {
      const rows: any[] = [];
      const pageSize = 1000;
      for (let page = 0; ; page++) {
        const { data: page_, error } = await supabase
          .from('transactions')
          .select(
            'id, date, merchant, description, amount, is_transfer, account_id, category_id, categories(name, category_groups(name, budget_type))',
          )
          .eq('household_id', household!.id)
          .is('deleted_at', null)
          .gte('date', start)
          .lte('date', end)
          .order('date')
          .range(page * pageSize, page * pageSize + pageSize - 1);
        if (error) throw error;
        rows.push(...(page_ ?? []));
        if (!page_ || page_.length < pageSize) break;
      }

      const txns: RecTxn[] = rows.map((r) => ({
        id: r.id,
        date: r.date,
        merchant: r.merchant,
        description: r.description,
        amount: Number(r.amount) || 0,
        is_transfer: r.is_transfer,
        account_id: r.account_id,
        category_id: r.category_id,
        categoryName: r.categories?.name ?? null,
        groupName: r.categories?.category_groups?.name ?? null,
        budgetType: r.categories?.category_groups?.budget_type ?? null,
      }));

      return { findings: runReconciliationCheck(txns), scanned: txns.length };
    },
  });

  const incomeCategoryId = useQuery({
    queryKey: ['rec-income-category', household?.id],
    enabled: !!household?.id,
    queryFn: async () => {
      const { data: cats } = await supabase
        .from('categories')
        .select('id, name, category_groups(name)')
        .eq('household_id', household!.id);
      const match = (cats ?? []).find((c: any) =>
        /income|salary|paycheck|revenue/i.test(
          `${c.name} ${c.category_groups?.name ?? ''}`,
        ),
      );
      return (match as any)?.id ?? null;
    },
  });

  const findings = data?.findings ?? [];
  const autoFixable = useMemo(() => findings.filter(isAutoFixable), [findings]);

  const applyFix = async (f: RecFinding) => {
    setBusy(f.id);
    try {
      if (f.fix === 'mark_transfer') {
        const ids = [f.txnId, f.pairedTxnId].filter(Boolean) as string[];
        const { error } = await supabase
          .from('transactions')
          .update({ is_transfer: true })
          .in('id', ids);
        if (error) throw error;
      } else if (f.fix === 'unmark_transfer') {
        const { error } = await supabase
          .from('transactions')
          .update({ is_transfer: false })
          .eq('id', f.txnId);
        if (error) throw error;
      } else if (f.fix === 'recategorize_income') {
        if (!incomeCategoryId.data) {
          toast({
            title: 'No income category found',
            description: 'Create an income category first, then re-run the check.',
            variant: 'destructive',
          });
          return;
        }
        const { error } = await supabase
          .from('transactions')
          .update({ category_id: incomeCategoryId.data })
          .eq('id', f.txnId);
        if (error) throw error;
      }
      toast({ title: 'Fix applied', description: f.suggestion });
      await refetch();
      qc.invalidateQueries({ queryKey: ['budget-bills-report'] });
      qc.invalidateQueries({ queryKey: ['monthly-reports'] });
    } catch (e: any) {
      toast({ title: 'Could not apply fix', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const applyAll = async () => {
    for (const f of autoFixable) await applyFix(f);
  };

  return (
    <Card className="print:hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-prism-teal" />
            Reconciliation check — {periodLabel}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Re-scan
            </Button>
            {autoFixable.length > 0 && (
              <Button size="sm" onClick={applyAll} disabled={!!busy}>
                <Wand2 className="h-4 w-4 mr-1" />
                Fix {autoFixable.length} automatically
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Run this before exporting: it catches income booked as spending, spending booked as
          income, and internal transfers that are being double counted.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Scanning transactions…
          </div>
        ) : findings.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-emerald-500 py-2">
            <CheckCircle2 className="h-4 w-4" />
            {data?.scanned ?? 0} transactions scanned — nothing looks misclassified. Safe to export.
          </div>
        ) : (
          <>
            <div className="text-xs text-muted-foreground">
              {findings.length} item{findings.length === 1 ? '' : 's'} to review out of{' '}
              {data?.scanned ?? 0} scanned.
            </div>
            {findings.map((f) => (
              <div key={f.id} className="rounded-lg border p-3 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <AlertTriangle
                    className={`h-4 w-4 ${f.severity === 'high' ? 'text-destructive' : 'text-prism-amber'}`}
                  />
                  <span className="text-sm font-medium">{f.title}</span>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {f.severity}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">{f.detail}</div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="text-xs">
                    <span className="font-medium">Suggested fix: </span>
                    {f.suggestion}
                  </div>
                  {isAutoFixable(f) ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => applyFix(f)}
                      disabled={busy === f.id}
                    >
                      {busy === f.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                      Apply fix
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      Manual review
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}
