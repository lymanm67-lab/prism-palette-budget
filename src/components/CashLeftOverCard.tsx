import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wallet, ArrowRight } from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';
import { useRecurringTransactions } from '@/hooks/use-recurring';
import { useSubscriptions } from '@/hooks/use-subscriptions';

const FACTOR: Record<string, number> = {
  weekly: 4.33,
  biweekly: 2.17,
  'bi-weekly': 2.17,
  quarterly: 1 / 3,
  yearly: 1 / 12,
  annual: 1 / 12,
  annually: 1 / 12,
};

const monthlyAmount = (amount: number, frequency?: string | null) =>
  Math.abs(Number(amount) || 0) * (FACTOR[(frequency || 'monthly').toLowerCase()] ?? 1);

/**
 * Cash left over after every recurring bill and subscription leaves net pay.
 * Mirrors the "What comes out of net pay" panel on the Subscriptions page.
 */
export function CashLeftOverCard() {
  const { formatCurrency } = useCurrency();
  const { data: recurring } = useRecurringTransactions();
  const { data: subscriptions } = useSubscriptions();
  const [netPay, setNetPay] = useState<string>(
    () => localStorage.getItem('prism-net-pay-monthly') || '4250.02',
  );

  const bills = useMemo(
    () =>
      (recurring || [])
        .filter((r: any) => r.is_active !== false && Number(r.amount || 0) < 0)
        .reduce((s: number, r: any) => s + monthlyAmount(r.amount, r.frequency), 0),
    [recurring],
  );

  const subs = useMemo(
    () =>
      (subscriptions || [])
        .filter((s: any) => !s.is_cancelled && s.is_active !== false)
        .reduce((sum: number, s: any) => sum + monthlyAmount(s.average_amount, s.frequency), 0),
    [subscriptions],
  );

  const net = Number(netPay) || 0;
  const committed = bills + subs;
  const leftOver = net - committed;
  const usedPct = net > 0 ? Math.min(100, Math.round((committed / net) * 100)) : 0;

  const saveNetPay = (v: string) => {
    setNetPay(v);
    localStorage.setItem('prism-net-pay-monthly', v);
  };

  return (
    <Card className="border-border/50">
      <CardContent className="p-5 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-prism-teal to-prism-lime flex items-center justify-center text-white">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Cash left over</p>
              <p className="text-xs text-muted-foreground">
                Net pay minus every recurring bill and subscription
              </p>
            </div>
          </div>
          <div className="w-28">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Net pay
            </label>
            <Input
              value={netPay}
              onChange={(e) => saveNetPay(e.target.value)}
              inputMode="decimal"
              className="h-8 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Figure label="Recurring bills" value={formatCurrency(bills)} />
          <Figure label="Subscriptions" value={formatCurrency(subs)} />
          <Figure label="Total committed" value={formatCurrency(committed)} />
          <Figure
            label="Left over"
            value={formatCurrency(leftOver)}
            accent={leftOver >= 0 ? 'text-prism-teal' : 'text-destructive'}
          />
        </div>

        <div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-prism-teal"
              style={{ width: `${usedPct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {usedPct}% of {formatCurrency(net)} net pay is already committed. Left over is real cash
            for everyday spending — Safe to Spend is lower because it also holds back savings,
            investing and a safety buffer.
          </p>
        </div>

        <Button asChild variant="outline" size="sm">
          <Link to="/subscriptions">
            See the full breakdown <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function Figure({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-border/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-display text-lg font-bold mt-0.5 ${accent ?? ''}`}>{value}</p>
    </div>
  );
}
