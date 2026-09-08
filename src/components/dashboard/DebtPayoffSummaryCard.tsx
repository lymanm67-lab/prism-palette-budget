import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, ChevronRight } from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';
import { useHouseholdDebts } from '@/hooks/use-household-debts';
import { useDebtPlans } from '@/hooks/use-debt-plans';

export function DebtPayoffSummaryCard() {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const { data: debts, isLoading } = useHouseholdDebts();
  const { data: plans } = useDebtPlans();

  const { top, totalBalance, totalMin, strategy } = useMemo(() => {
    const list = ((debts || []) as any[]).filter(d => Number(d.balance || 0) > 0);
    const totalBalance = list.reduce((s, d) => s + Number(d.balance || 0), 0);
    const totalMin = list.reduce((s, d) => s + Number(d.minimum_payment || 0), 0);
    const strategyRaw = (plans || [])[0]?.strategy || 'snowball';
    const sorted = [...list].sort((a, b) =>
      strategyRaw === 'avalanche'
        ? Number(b.interest_rate || 0) - Number(a.interest_rate || 0)
        : Number(a.balance || 0) - Number(b.balance || 0)
    );
    return { top: sorted.slice(0, 3), totalBalance, totalMin, strategy: strategyRaw };
  }, [debts, plans]);

  if (isLoading) return <div className="h-48 rounded-xl bg-muted animate-pulse" />;
  if (!top.length) return null;

  return (
    <Card className="prism-card-shine border-border/50">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-prism-orange to-prism-rose flex items-center justify-center">
            <CreditCard className="h-3.5 w-3.5 text-white" />
          </div>
          Debt payoff focus
        </CardTitle>
        <button onClick={() => navigate('/debt-payoff')} className="flex items-center gap-1 text-sm text-primary hover:underline">
          Full plan <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          {strategy === 'avalanche' ? 'Avalanche order — highest interest first.' : 'Snowball order — smallest balance first.'}{' '}
          {formatCurrency(totalBalance)} owed, {formatCurrency(totalMin)}/mo in minimums.
        </p>
        <div className="space-y-2">
          {top.map((d, i) => {
            const balance = Number(d.balance || 0);
            const share = totalBalance > 0 ? (balance / totalBalance) * 100 : 0;
            return (
              <div key={d.id} className="rounded-xl border border-border/30 px-3.5 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-5 w-5 shrink-0 rounded-md bg-primary/10 text-[11px] font-bold text-primary flex items-center justify-center">{i + 1}</span>
                    <p className="text-sm font-medium truncate">{d.name}</p>
                  </div>
                  <span className="font-display text-sm font-semibold text-prism-rose shrink-0">{formatCurrency(balance)}</span>
                </div>
                <div className="mt-1.5 h-1 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-prism-rose" style={{ width: `${share}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {Number(d.interest_rate || 0)}% APR · {formatCurrency(Number(d.minimum_payment || 0))}/mo minimum
                  {Number(d.extra_payment || 0) > 0 ? ` + ${formatCurrency(Number(d.extra_payment))} extra` : ''}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default DebtPayoffSummaryCard;
