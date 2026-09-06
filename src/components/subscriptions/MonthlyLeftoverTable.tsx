import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '@/hooks/use-currency';
import { CalendarRange } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CommitmentItem = {
  id: string;
  name: string;
  monthly: number;
  kind: 'bill' | 'subscription';
  scope: 'personal' | 'business' | 'split';
  start: Date | null;
  end: Date | null;
  pauseMonths: string[];
};

interface Props {
  items: CommitmentItem[];
  netPay: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function MonthlyLeftoverTable({ items, netPay }: Props) {
  const { formatCurrency } = useCurrency();
  const baseYear = 2026;
  const years = Array.from({ length: 5 }, (_, i) => baseYear + i);
  const [year, setYear] = useState<string>(String(Math.max(baseYear, new Date().getFullYear())));

  const rows = useMemo(() => {
    const y = Number(year);
    return MONTHS.map((label, i) => {
      const monthStart = new Date(y, i, 1);
      const monthEnd = new Date(y, i + 1, 0);
      const key = `${y}-${String(i + 1).padStart(2, '0')}`;
      const active = items.filter(it => {
        if (it.pauseMonths.includes(key)) return false;
        if (it.start && it.start > monthEnd) return false;
        if (it.end && it.end < monthStart) return false;
        return true;
      });
      const sum = (f: (it: CommitmentItem) => boolean) =>
        active.filter(f).reduce((s, it) => s + it.monthly, 0);
      const bills = sum(it => it.kind === 'bill');
      const subs = sum(it => it.kind === 'subscription');
      const business = sum(it => it.scope === 'business');
      const personal = sum(it => it.scope !== 'business');
      const total = bills + subs;
      const ends = items
        .filter(it => it.end && it.end >= monthStart && it.end <= monthEnd)
        .map(it => `${it.name} (${formatCurrency(it.monthly)})`);
      return { label, key, bills, subs, personal, business, total, leftover: netPay - total, ends };
    });
  }, [items, netPay, year, formatCurrency]);

  const nowKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const avgLeftover = rows.reduce((s, r) => s + r.leftover, 0) / 12;

  return (
    <Card className="glass-card border-white/10">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarRange className="h-4 w-4 text-prism-teal" />
          Month-by-month leftover after bills and subscriptions
        </CardTitle>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 text-left font-medium">Month</th>
                <th className="py-2 text-right font-medium">Recurring bills</th>
                <th className="py-2 text-right font-medium">Subscriptions</th>
                <th className="py-2 text-right font-medium">Personal</th>
                <th className="py-2 text-right font-medium">Business</th>
                <th className="py-2 text-right font-medium">Total committed</th>
                <th className="py-2 text-right font-medium">Left over</th>
                <th className="py-2 text-left font-medium">What ends</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr
                  key={r.key}
                  className={cn('border-b border-white/5', r.key === nowKey && 'bg-white/5')}
                >
                  <td className="py-2 font-medium">
                    {r.label} {String(year).slice(2)}
                    {r.key === nowKey && <Badge variant="outline" className="ml-2 text-[10px]">now</Badge>}
                  </td>
                  <td className="py-2 text-right tabular-nums">{formatCurrency(r.bills)}</td>
                  <td className="py-2 text-right tabular-nums">{formatCurrency(r.subs)}</td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">{formatCurrency(r.personal)}</td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">{formatCurrency(r.business)}</td>
                  <td className="py-2 text-right font-semibold tabular-nums text-prism-orange">{formatCurrency(r.total)}</td>
                  <td className={cn('py-2 text-right font-semibold tabular-nums', r.leftover < 0 ? 'text-destructive' : 'text-prism-teal')}>
                    {formatCurrency(r.leftover)}
                  </td>
                  <td className="py-2 text-left text-xs text-muted-foreground">{r.ends.join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Left over = net pay of {formatCurrency(netPay)} minus every active recurring bill and subscription that month
          (personal and business — business items are paid from net pay first, then reimbursed quarterly from consulting fees).
          Average left over in {year}: <span className="font-semibold text-foreground">{formatCurrency(avgLeftover)}</span>.
          Groceries and medical are excluded, since groceries are reimbursed and medical is paid from the HSA.
        </p>
      </CardContent>
    </Card>
  );
}
