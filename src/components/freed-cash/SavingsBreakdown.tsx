import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { FreedCashSource } from '@/hooks/use-freed-cash';
import { monthEnd, monthLabel, monthRange, netMonthly, realizedInMonth, savingsEndDate, savingsStartDate } from '@/lib/freed-cash/timing';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

/** Friendly buckets so a single big number becomes an understandable list. */
export function savingsBucket(s: FreedCashSource): string {
  const cat = (s.category ?? '').toLowerCase();
  const type = (s.source_type ?? '').toLowerCase();

  if (type === 'debt_reduced' || cat.includes('debt') || cat.includes('settlement')) return 'Debt payment reductions';
  if (cat.includes('insurance')) return 'Insurance';
  if (cat.includes('utility') || cat.includes('electric') || cat.includes('energy') || cat.includes('internet') || cat.includes('phone'))
    return 'Utilities & bills';
  if (cat.includes('grocer') || cat.includes('shopping') || cat.includes('food')) return 'Groceries & shopping';
  if (cat.includes('ai') || cat.includes('software') || cat.includes('hosting') || cat.includes('accounting'))
    return 'Business & AI tools';
  if (cat.includes('media') || cat.includes('membership') || cat.includes('subscription') || cat.includes('credit monitoring'))
    return 'Media & memberships';
  return 'Other subscriptions';
}

const BUCKET_ORDER = [
  'Debt payment reductions',
  'Utilities & bills',
  'Insurance',
  'Business & AI tools',
  'Media & memberships',
  'Groceries & shopping',
  'Other subscriptions',
];

interface Props {
  sources: FreedCashSource[];
  fromKey: string;
  toKey: string;
}

interface Row {
  source: FreedCashSource;
  monthly: number;
  realized: number;
  active: boolean;
}

export function SavingsBreakdown({ sources, fromKey, toKey }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    const months = monthRange(fromKey, toKey);
    const end = monthEnd(toKey);
    const map = new Map<string, Row[]>();

    sources.forEach((s) => {
      const start = savingsStartDate(s);
      if (!start) return;
      const monthly = netMonthly(s);
      if (monthly <= 0) return;
      const realized = months.reduce((sum, m) => sum + realizedInMonth(s, m), 0);
      const stop = savingsEndDate(s);
      const active = start <= end && (!stop || stop >= end);
      if (realized <= 0 && !active) return;
      const bucket = savingsBucket(s);
      const rows = map.get(bucket) ?? [];
      rows.push({ source: s, monthly, realized, active });
      map.set(bucket, rows);
    });

    return [...map.entries()]
      .map(([bucket, rows]) => ({
        bucket,
        rows: rows.sort((a, b) => b.monthly - a.monthly),
        runRate: rows.filter((r) => r.active).reduce((sum, r) => sum + r.monthly, 0),
        realized: rows.reduce((sum, r) => sum + r.realized, 0),
        count: rows.length,
      }))
      .sort((a, b) => {
        const ai = BUCKET_ORDER.indexOf(a.bucket);
        const bi = BUCKET_ORDER.indexOf(b.bucket);
        if (ai !== bi) return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
        return b.runRate - a.runRate;
      });
  }, [sources, fromKey, toKey]);

  const totalRunRate = groups.reduce((sum, g) => sum + g.runRate, 0);
  const totalRealized = groups.reduce((sum, g) => sum + g.realized, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Savings by category</CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          The same savings, broken into the kinds of money you freed up — {monthLabel(fromKey)} – {monthLabel(toKey)}.
          Tap a category to see each item.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {groups.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">No savings recorded in this period yet.</p>
        )}

        {groups.map((g) => {
          const isOpen = !!open[g.bucket];
          const share = totalRunRate > 0 ? Math.round((g.runRate / totalRunRate) * 100) : 0;
          return (
            <div key={g.bucket} className="rounded-lg border border-border/60 bg-card/40">
              <button
                type="button"
                onClick={() => setOpen((o) => ({ ...o, [g.bucket]: !o[g.bucket] }))}
                className="flex w-full items-center justify-between gap-3 p-3 text-left"
              >
                <span className="flex items-center gap-2">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="text-sm font-medium">{g.bucket}</span>
                  <Badge variant="secondary" className="text-xs">
                    {g.count} {g.count === 1 ? 'item' : 'items'}
                  </Badge>
                  {share > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {share}% of run rate
                    </Badge>
                  )}
                </span>
                <span className="text-right">
                  <span className="block text-sm font-semibold">{money(g.runRate)}/mo</span>
                  <span className="block text-xs text-muted-foreground">{money(g.realized)} saved so far</span>
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-border/50 px-3 pb-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-3">Item</th>
                        <th className="py-2 pr-3">Started</th>
                        <th className="py-2 pr-3 text-right">Monthly saved</th>
                        <th className="py-2 text-right">Saved in period</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.rows.map((r) => (
                        <tr key={r.source.id} className="border-t border-border/40">
                          <td className="py-2 pr-3">
                            {r.source.name}
                            {!r.active && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                ended
                              </Badge>
                            )}
                          </td>
                          <td className="py-2 pr-3 text-muted-foreground">{r.source.effective_date ?? '—'}</td>
                          <td className="py-2 pr-3 text-right">{money(r.monthly)}</td>
                          <td className="py-2 text-right">{money(r.realized)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

        {groups.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            <span className="font-medium">All categories</span>
            <span className="text-right">
              <span className="block font-semibold">{money(totalRunRate)}/mo run rate</span>
              <span className="block text-xs text-muted-foreground">{money(totalRealized)} realized in period</span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
