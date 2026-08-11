import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Zap, CalendarClock, ExternalLink } from 'lucide-react';
import { useRecurringTransactions } from '@/hooks/use-recurring';

const money2 = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

/** Normalizes any frequency to a monthly-equivalent amount. */
const MONTHLY_FACTOR: Record<string, number> = {
  daily: 30.44,
  weekly: 4.33,
  biweekly: 2.165,
  'bi-weekly': 2.165,
  semimonthly: 2,
  'semi-monthly': 2,
  monthly: 1,
  quarterly: 1 / 3,
  semiannual: 1 / 6,
  'semi-annual': 1 / 6,
  yearly: 1 / 12,
  annual: 1 / 12,
  annually: 1 / 12,
};

const monthlyEquivalent = (amount: number, frequency?: string | null) =>
  Math.abs(Number(amount) || 0) * (MONTHLY_FACTOR[(frequency || 'monthly').toLowerCase()] ?? 1);

const dueLabel = (d?: string | null) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, (m || 1) - 1, day || 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/** Itemized personal bill list feeding the Foundation Costs bucket. */
export function BlueprintMonthlyBills() {
  const { data: recurring, isLoading } = useRecurringTransactions();

  const bills = useMemo(() => {
    return (recurring ?? [])
      .filter((r: any) => {
        if (!r.is_active) return false;
        // Exclude income and business-side recurring entries — this is the household bill list.
        if (Number(r.amount) > 0) return false;
        const budgetType = r.categories?.category_groups?.budget_type;
        if (budgetType === 'income') return false;
        if (r.categories?.category_groups?.business_profile_id) return false;
        return true;
      })
      .map((r: any) => ({
        id: r.id,
        merchant: r.merchant || 'Bill',
        category: r.categories?.name ?? 'Uncategorized',
        frequency: (r.frequency || 'monthly').toLowerCase(),
        monthly: monthlyEquivalent(r.amount, r.frequency),
        dueDate: r.next_due_date as string | null,
        autopay: !!r.autopay_enabled,
        account: r.accounts?.name ?? null,
      }))
      .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
  }, [recurring]);

  const total = bills.reduce((s, b) => s + b.monthly, 0);
  const autopayTotal = bills.filter((b) => b.autopay).reduce((s, b) => s + b.monthly, 0);

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Monthly bills (itemized)</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Every active recurring bill behind your Foundation Costs, with due date and autopay status.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/reports/budgets-bills">
            Full report <ExternalLink className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Total monthly</p>
            <p className="text-2xl font-bold tabular-nums">{money2(total)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">On autopay</p>
            <p className="text-2xl font-bold tabular-nums text-prism-teal">{money2(autopayTotal)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Active bills</p>
            <p className="text-2xl font-bold tabular-nums">{bills.length}</p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading bills…</p>
        ) : bills.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active recurring bills yet. Add them under Recurring transactions to see them here.
          </p>
        ) : (
          <div className="divide-y rounded-lg border">
            {bills.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{b.merchant}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {b.category}
                    {b.account ? ` · ${b.account}` : ''}
                    {b.frequency !== 'monthly' ? ` · ${b.frequency}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarClock className="h-3 w-3" /> {dueLabel(b.dueDate)}
                  </span>
                  {b.autopay && (
                    <Badge variant="secondary" className="gap-1">
                      <Zap className="h-3 w-3" /> Autopay
                    </Badge>
                  )}
                  <span className="font-semibold tabular-nums">{money2(b.monthly)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
