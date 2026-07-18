import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, CheckCircle2, AlertTriangle, Zap } from 'lucide-react';
import { CreditAccount } from '@/hooks/use-credit-accounts';

const TARGET_UTIL = 7; // 7% per-card target (industry "high-end" utilization threshold)

interface Props {
  accounts: CreditAccount[];
}

export default function UtilizationGuardian({ accounts }: Props) {
  const revolving = useMemo(
    () => accounts.filter(a => a.account_type === 'Revolving' && Number(a.credit_limit || 0) > 0),
    [accounts]
  );

  // Dedupe by name+last4 across bureaus, keeping the highest balance
  const uniqueCards = useMemo(() => {
    const map = new Map<string, CreditAccount>();
    for (const a of revolving) {
      const key = `${(a.account_name || '').toLowerCase().trim()}::${a.account_number || ''}`;
      const existing = map.get(key);
      if (!existing || Number(a.balance) > Number(existing.balance)) {
        map.set(key, a);
      }
    }
    return Array.from(map.values());
  }, [revolving]);

  const rows = uniqueCards.map(a => {
    const balance = Number(a.balance);
    const limit = Number(a.credit_limit || 0);
    const util = limit > 0 ? (balance / limit) * 100 : 0;
    const target$ = limit * (TARGET_UTIL / 100);
    const overBy = Math.max(0, balance - target$);
    return { a, balance, limit, util, target$, overBy };
  }).sort((x, y) => y.util - x.util);

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  const totalPayDown = rows.reduce((s, r) => s + r.overBy, 0);
  const overCount = rows.filter(r => r.util > TARGET_UTIL).length;

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Utilization Guardian
          </CardTitle>
          <CardDescription>Add revolving accounts with credit limits to activate per-card monitoring.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-primary" />
          Utilization Guardian
        </CardTitle>
        <CardDescription>
          Per-card watchdog — target ≤ {TARGET_UTIL}% on every card. {overCount > 0
            ? <>You&apos;re over on <strong className="text-destructive">{overCount}</strong> card{overCount !== 1 ? 's' : ''}. Pay down <strong className="text-destructive">{fmt(totalPayDown)}</strong> total to hit target.</>
            : <span className="text-emerald-600 font-medium">✓ All cards under {TARGET_UTIL}%. Score-optimal.</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map(({ a, balance, limit, util, target$, overBy }) => {
          const status =
            util === 0 ? 'ideal' :
            util <= TARGET_UTIL ? 'ok' :
            util <= 30 ? 'warn' : 'danger';
          const color =
            status === 'ideal' ? 'text-muted-foreground' :
            status === 'ok' ? 'text-emerald-600' :
            status === 'warn' ? 'text-amber-600' : 'text-destructive';
          const barColor =
            status === 'ideal' ? 'bg-muted-foreground/40' :
            status === 'ok' ? 'bg-emerald-500' :
            status === 'warn' ? 'bg-amber-500' : 'bg-destructive';
          const Icon = status === 'danger' ? AlertTriangle : status === 'warn' ? Zap : CheckCircle2;

          return (
            <div key={a.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                  <span className="font-medium text-sm truncate">{a.account_name || 'Card'}</span>
                  {a.account_number && (
                    <span className="text-xs text-muted-foreground">••{a.account_number}</span>
                  )}
                </div>
                <Badge variant={status === 'danger' ? 'destructive' : status === 'warn' ? 'secondary' : 'default'} className="text-[10px]">
                  {util.toFixed(1)}% util
                </Badge>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden relative">
                <div className={`h-full ${barColor} transition-all`} style={{ width: `${Math.min(100, util)}%` }} />
                <div className="absolute top-0 h-full border-l-2 border-primary/60" style={{ left: `${TARGET_UTIL}%` }} title={`${TARGET_UTIL}% target`} />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-1">
                <span>{fmt(balance)} of {fmt(limit)}</span>
                {overBy > 0 ? (
                  <span className="text-destructive font-medium">
                    Pay down <strong>{fmt(overBy)}</strong> to reach {TARGET_UTIL}% ({fmt(target$)})
                  </span>
                ) : (
                  <span className="text-emerald-600">✓ Under target</span>
                )}
              </div>
            </div>
          );
        })}
        <p className="text-[11px] text-muted-foreground pt-2">
          <strong>Why 7%?</strong> FICO models reward ultra-low utilization on individual cards. Keeping every card under 7% (not just overall) is a known score-optimization tactic used by premium credit repair services.
        </p>
      </CardContent>
    </Card>
  );
}
