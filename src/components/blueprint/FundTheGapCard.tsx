import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wand2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrency } from '@/hooks/use-currency';
import { useBudgets, useCategories, useUpsertBudget } from '@/hooks/use-finance-data';
import { usePurposeResolution, type MoneyPurposeSnapshot } from '@/hooks/use-money-purpose';
import { PURPOSE_META } from '@/lib/budgeting/moneyPurpose';
import type { CoreKey } from '@/lib/budgeting/blueprint5010';

const nextMonthOf = (month: string) => {
  const [y, m] = month.slice(0, 7).split('-').map(Number);
  const d = new Date(Date.UTC(y, m, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
};

interface Gap {
  key: CoreKey;
  label: string;
  amount: number;
  rationale: string;
}

/**
 * One-click "Fund the gap": turns a drift recommendation into a real planned
 * budget entry for next month, in an invest or debt-payment category.
 */
export default function FundTheGapCard({ snap, month }: { snap: MoneyPurposeSnapshot; month: string }) {
  const { formatCurrency } = useCurrency();
  const resolution = usePurposeResolution();
  const { data: categories } = useCategories();
  const target = nextMonthOf(month);
  const { data: nextBudgets } = useBudgets(target);
  const upsert = useUpsertBudget();

  const gaps: Gap[] = useMemo(() => {
    const out: Gap[] = [];
    const wealth = snap.blueprint.cards.find((c) => c.key === 'build_wealth');
    const debt = snap.blueprint.cards.find((c) => c.key === 'eliminate_debt');
    const unusedEnjoy = snap.blueprint.enjoy.unused;

    if (wealth && (wealth.remainingToTarget || 0) > 0) {
      out.push({
        key: 'build_wealth',
        label: 'Invest It',
        amount: wealth.remainingToTarget || 0,
        rationale: `Payroll already funds ${formatCurrency(wealth.fundedByPayroll || 0)}. This closes the rest of the ${wealth.targetPct}% target from take-home.`,
      });
    }
    if (debt && snap.blueprint.phase !== 3 && debt.variance < 0) {
      out.push({
        key: 'eliminate_debt',
        label: 'Apply to Debt',
        amount: Math.abs(debt.variance),
        rationale: `Brings debt elimination up to the ${debt.targetPct}% target for the month.`,
      });
    }
    if (unusedEnjoy > 0) {
      out.push({
        key: snap.blueprint.enjoy.suggestion === 'wealth' ? 'build_wealth' : 'eliminate_debt',
        label: snap.blueprint.enjoy.suggestion === 'wealth' ? 'Save It / Invest It' : 'Redirect Unused Enjoy',
        amount: unusedEnjoy,
        rationale: `You kept ${formatCurrency(unusedEnjoy)} of the Enjoy ceiling — put it to work instead of letting lifestyle absorb it.`,
      });
    }
    return out;
  }, [snap, formatCurrency]);

  const options = useMemo(() => {
    return ((categories as any[]) || [])
      .filter((c) => {
        const p = resolution.byCategory.get(c.id);
        return (p === 'build_wealth' || p === 'eliminate_debt') && !resolution.payrollCategoryIds.has(c.id);
      })
      .map((c) => ({ id: c.id, name: c.name, purpose: resolution.byCategory.get(c.id) as CoreKey }));
  }, [categories, resolution]);

  const [picked, setPicked] = useState<Record<string, string>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [done, setDone] = useState<Record<string, boolean>>({});

  const fund = async (gap: Gap, idx: number) => {
    const key = `${gap.key}-${idx}`;
    const categoryId = picked[key] || options.find((o) => o.purpose === gap.key)?.id;
    if (!categoryId) {
      toast.error(`No ${PURPOSE_META[gap.key].short} category available — create one first.`);
      return;
    }
    const amount = Number(amounts[key] ?? gap.amount) || 0;
    if (amount <= 0) return;
    const existing = ((nextBudgets as any[]) || []).find((b) => b.category_id === categoryId);
    const planned = Math.round(((Number(existing?.planned_amount) || 0) + amount) * 100) / 100;
    try {
      await upsert.mutateAsync({
        category_id: categoryId,
        month: target,
        planned_amount: planned,
        rollover: existing?.rollover ?? false,
      } as any);
      setDone((d) => ({ ...d, [key]: true }));
      toast.success(`Funded ${formatCurrency(amount)} into next month's plan (${target.slice(0, 7)}).`);
    } catch (e: any) {
      toast.error(e?.message || 'Could not save the budget entry.');
    }
  };

  if (gaps.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="font-display flex items-center gap-2 text-sm">
          <Wand2 className="h-4 w-4 text-primary" />
          Fund the Gap
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Creates suggested planned entries for {target.slice(0, 7)} — nothing is spent, only planned.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {gaps.map((gap, idx) => {
          const key = `${gap.key}-${idx}`;
          const meta = PURPOSE_META[gap.key];
          const bucketOptions = options.filter((o) => o.purpose === gap.key);
          return (
            <div key={key} className="rounded-lg border border-border/60 p-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <Badge variant="outline" className="text-[9px] uppercase" style={{ color: meta.color, borderColor: `${meta.color}66` }}>
                    {meta.short}
                  </Badge>
                  <p className="mt-1 text-xs font-semibold">
                    {gap.label} · {formatCurrency(gap.amount)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{gap.rationale}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    className="h-8 w-24 text-xs"
                    inputMode="decimal"
                    value={amounts[key] ?? gap.amount.toFixed(2)}
                    onChange={(e) => setAmounts((a) => ({ ...a, [key]: e.target.value }))}
                  />
                  <Select value={picked[key] || bucketOptions[0]?.id || ''} onValueChange={(v) => setPicked((p) => ({ ...p, [key]: v }))}>
                    <SelectTrigger className="h-8 w-44 text-xs">
                      <SelectValue placeholder="Choose category" />
                    </SelectTrigger>
                    <SelectContent>
                      {bucketOptions.map((o) => (
                        <SelectItem key={o.id} value={o.id} className="text-xs">
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="h-8 gap-1 text-[11px]"
                    disabled={upsert.isPending || done[key]}
                    onClick={() => fund(gap, idx)}
                  >
                    {done[key] ? <Check className="h-3 w-3" /> : <Wand2 className="h-3 w-3" />}
                    {done[key] ? 'Funded' : 'Fund the gap'}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
