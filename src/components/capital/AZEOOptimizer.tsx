import { useMemo } from 'react';
import { Target, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCreditAccounts } from '@/hooks/use-credit-accounts';

/**
 * AZEO — "All Zero Except One" — a FICO score optimization technique.
 * You pay all revolving cards to $0 EXCEPT one, which reports a small balance
 * (1-9% of its limit, ideal ~3-7%). This produces the highest score bump for
 * FICO models that penalize the number of accounts with balances.
 */

interface Card {
  id: string;
  name: string;
  balance: number;
  limit: number;
  util: number;
}

function pickAnchor(cards: Card[]): Card | null {
  const eligible = cards.filter(c => c.limit > 0);
  if (!eligible.length) return null;
  // Prefer the card with the LOWEST utilization (already close to ideal) and highest limit.
  return [...eligible].sort((a, b) => a.util - b.util || b.limit - a.limit)[0];
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export default function AZEOOptimizer() {
  const { accounts } = useCreditAccounts();

  const cards = useMemo<Card[]>(() => {
    return accounts
      .filter(a => a.account_type?.toLowerCase().includes('revolv') || a.account_type?.toLowerCase().includes('credit card'))
      .filter(a => a.account_status !== 'closed')
      .map(a => ({
        id: a.id,
        name: a.account_name,
        balance: Number(a.balance || 0),
        limit: Number(a.credit_limit || 0),
        util: a.credit_limit ? Number(a.balance || 0) / Number(a.credit_limit) : 0,
      }));
  }, [accounts]);

  const anchor = useMemo(() => pickAnchor(cards), [cards]);
  const totalLimit = cards.reduce((s, c) => s + c.limit, 0);
  const totalBalance = cards.reduce((s, c) => s + c.balance, 0);
  const aggUtil = totalLimit > 0 ? totalBalance / totalLimit : 0;

  const anchorTarget = anchor ? Math.max(5, Math.round(anchor.limit * 0.05)) : 0; // ~5%

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          AZEO Score Optimizer
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          "All Zero Except One": for the biggest FICO bump, pay all revolving cards to $0 except one anchor card
          that reports a small balance (~5% of its limit). Best used ~2 weeks before your score is pulled.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {cards.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No revolving accounts loaded. Import a credit report or add cards to see your AZEO plan.
          </p>
        )}
        {cards.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded border p-2">
                <div className="text-muted-foreground">Total Limit</div>
                <div className="font-semibold">{fmt(totalLimit)}</div>
              </div>
              <div className="rounded border p-2">
                <div className="text-muted-foreground">Total Balance</div>
                <div className="font-semibold">{fmt(totalBalance)}</div>
              </div>
              <div className="rounded border p-2">
                <div className="text-muted-foreground">Aggregate Util</div>
                <div className={`font-semibold ${aggUtil > 0.3 ? 'text-destructive' : aggUtil > 0.09 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {(aggUtil * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {anchor && (
              <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-primary">RECOMMENDED ANCHOR CARD</span>
                </div>
                <div className="font-medium">{anchor.name}</div>
                <div className="text-xs text-muted-foreground">
                  Limit {fmt(anchor.limit)} · Currently {fmt(anchor.balance)} ({(anchor.util * 100).toFixed(1)}%)
                </div>
                <div className="text-sm">
                  Target balance to report: <strong>{fmt(anchorTarget)}</strong> (~5% util)
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Pay these cards to $0 before statement close:</div>
              {cards.filter(c => c.id !== anchor?.id).map(c => (
                <div key={c.id} className="flex items-center justify-between rounded border p-2 text-sm">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {fmt(c.balance)} / {fmt(c.limit)} ({(c.util * 100).toFixed(0)}%)
                    </div>
                  </div>
                  <Badge className={c.balance === 0 ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'}>
                    {c.balance === 0 ? 'Ready' : `Pay ${fmt(c.balance)}`}
                  </Badge>
                </div>
              ))}
            </div>

            <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
              <strong>Timing:</strong> Payments must clear before the <em>statement closing date</em> (not the due date).
              Balances that report to the bureaus are the ones on the statement date. Aim to pay 3-5 days before close.
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
