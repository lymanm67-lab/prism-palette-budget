import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow, parseISO, differenceInDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useRecurringTransactions } from '@/hooks/use-recurring';
import { PaystubUploader } from '@/components/PaystubUploader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, CreditCard, Receipt, Percent, CalendarClock, ArrowRight, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

interface DebtRow {
  id: string;
  name: string;
  balance: number;
  interest_rate: number;
  minimum_payment: number;
}

export function MoneySnapshotBar() {
  const { household } = useHousehold();
  const [stubOpen, setStubOpen] = useState(false);

  const { data: debts } = useQuery({
    queryKey: ['coach-debt-items', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data: plans } = await supabase
        .from('debt_plans' as any)
        .select('id')
        .eq('household_id', household!.id);
      if (!plans?.length) return [] as DebtRow[];
      const ids = (plans as any[]).map((p) => p.id);
      const { data: items, error } = await supabase
        .from('debt_items' as any)
        .select('id, name, balance, interest_rate, minimum_payment')
        .in('plan_id', ids)
        .order('balance', { ascending: false });
      if (error) throw error;
      return (items || []) as unknown as DebtRow[];
    },
  });

  const { data: recurring } = useRecurringTransactions();

  const upcomingBills = useMemo(() => {
    if (!recurring) return [];
    const now = new Date();
    return recurring
      .filter((r: any) => r.next_due_date && r.amount < 0)
      .map((r: any) => ({
        id: r.id,
        name: r.description || r.categories?.name || 'Bill',
        amount: Math.abs(r.amount),
        date: parseISO(r.next_due_date),
        days: differenceInDays(parseISO(r.next_due_date), now),
      }))
      .filter((b) => b.days >= 0 && b.days <= 30)
      .sort((a, b) => a.days - b.days)
      .slice(0, 5);
  }, [recurring]);

  const totalDebt = useMemo(() => (debts || []).reduce((s, d) => s + Number(d.balance || 0), 0), [debts]);
  const totalMin = useMemo(() => (debts || []).reduce((s, d) => s + Number(d.minimum_payment || 0), 0), [debts]);
  const weightedApr = useMemo(() => {
    if (!debts?.length || totalDebt === 0) return 0;
    return debts.reduce((s, d) => s + Number(d.interest_rate || 0) * Number(d.balance || 0), 0) / totalDebt;
  }, [debts, totalDebt]);

  return (
    <>
      <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-background/60 to-background/30 backdrop-blur-sm overflow-hidden">
        {/* Action strip */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border/30 bg-background/40">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-1">Feed Coach</span>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 bg-prism-teal/10 border-prism-teal/30 hover:bg-prism-teal/20" onClick={() => setStubOpen(true)}>
            <Upload className="h-3.5 w-3.5" />
            <span>Upload Paycheck</span>
          </Button>
          <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 bg-prism-amber/10 border-prism-amber/30 hover:bg-prism-amber/20">
            <Link to="/debts">
              <CreditCard className="h-3.5 w-3.5" />
              <span>Manage Debts</span>
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 bg-prism-orange/10 border-prism-orange/30 hover:bg-prism-orange/20">
            <Link to="/budget">
              <Receipt className="h-3.5 w-3.5" />
              <span>Bills & Recurring</span>
            </Link>
          </Button>
        </div>

        {/* Snapshot grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border/30">
          {/* DEBTS */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-prism-amber" />
                <h3 className="text-sm font-semibold">What you owe</h3>
              </div>
              {debts && debts.length > 0 && (
                <Badge variant="outline" className="text-[10px] bg-prism-amber/10 border-prism-amber/30 text-prism-amber">
                  {debts.length} account{debts.length === 1 ? '' : 's'}
                </Badge>
              )}
            </div>

            {(!debts || debts.length === 0) ? (
              <Link
                to="/debts"
                className="flex items-center justify-center gap-2 py-6 px-4 rounded-lg border border-dashed border-border/50 hover:border-prism-amber/40 hover:bg-prism-amber/5 transition-colors text-sm text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
                Add your debts to track payoff & interest
              </Link>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-background/40 p-2">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Owed</div>
                    <div className="text-sm font-bold text-prism-amber">{fmt(totalDebt)}</div>
                  </div>
                  <div className="rounded-lg bg-background/40 p-2">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg APR</div>
                    <div className="text-sm font-bold">{weightedApr.toFixed(1)}%</div>
                  </div>
                  <div className="rounded-lg bg-background/40 p-2">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Min/mo</div>
                    <div className="text-sm font-bold">{fmt(totalMin)}</div>
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {debts.slice(0, 4).map((d) => (
                    <li key={d.id} className="flex items-center justify-between text-xs gap-2 py-1.5 px-2 rounded hover:bg-background/40">
                      <span className="truncate font-medium">{d.name}</span>
                      <div className="flex items-center gap-2 shrink-0 text-muted-foreground">
                        <span className="inline-flex items-center gap-0.5">
                          <Percent className="h-3 w-3" />
                          {Number(d.interest_rate || 0).toFixed(1)}
                        </span>
                        <span className="font-semibold text-foreground">{fmt(Number(d.balance))}</span>
                      </div>
                    </li>
                  ))}
                </ul>
                {debts.length > 4 && (
                  <Link to="/debts" className="text-xs text-prism-teal hover:underline inline-flex items-center gap-1">
                    View all {debts.length} <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </>
            )}
          </div>

          {/* BILLS */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-prism-orange" />
                <h3 className="text-sm font-semibold">Bills due next 30 days</h3>
              </div>
              {upcomingBills.length > 0 && (
                <Badge variant="outline" className="text-[10px] bg-prism-orange/10 border-prism-orange/30 text-prism-orange">
                  {fmt(upcomingBills.reduce((s, b) => s + b.amount, 0))}
                </Badge>
              )}
            </div>

            {upcomingBills.length === 0 ? (
              <Link
                to="/budget"
                className="flex items-center justify-center gap-2 py-6 px-4 rounded-lg border border-dashed border-border/50 hover:border-prism-orange/40 hover:bg-prism-orange/5 transition-colors text-sm text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
                Add recurring bills to see due dates
              </Link>
            ) : (
              <ul className="space-y-1.5">
                {upcomingBills.map((b) => {
                  const urgent = b.days <= 3;
                  return (
                    <li key={b.id} className="flex items-center justify-between text-xs gap-2 py-1.5 px-2 rounded hover:bg-background/40">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{b.name}</div>
                        <div className={`text-[10px] ${urgent ? 'text-prism-orange font-semibold' : 'text-muted-foreground'}`}>
                          {b.days === 0 ? 'Due today' : b.days === 1 ? 'Due tomorrow' : `in ${b.days} days`}
                        </div>
                      </div>
                      <span className="font-semibold shrink-0">{fmt(b.amount)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      <PaystubUploader open={stubOpen} onOpenChange={setStubOpen} />
    </>
  );
}
