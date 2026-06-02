import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Layers, Loader2 } from 'lucide-react';
import { useAppDevPool } from '@/hooks/use-app-dev-pool';
import { cn } from '@/lib/utils';

const fmtUsd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

function statusColor(pct: number) {
  if (pct >= 100) return 'bg-prism-orange';
  if (pct >= 70) return 'bg-prism-amber';
  return 'bg-prism-teal';
}

function statusText(s: 'ok' | 'warn' | 'over') {
  if (s === 'over') return { label: 'Over pool limit', cls: 'text-prism-orange border-prism-orange/40' };
  if (s === 'warn') return { label: 'Near pool limit', cls: 'text-prism-amber border-prism-amber/40' };
  return { label: 'On track', cls: 'text-prism-teal border-prism-teal/40' };
}

export default function AppDevPoolCard() {
  const pool = useAppDevPool();
  const badge = statusText(pool.status);

  return (
    <Card className="border-prism-teal/30 bg-card/60 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-5 w-5 text-prism-teal" />
              Shared App-Dev Pool
              <Badge variant="outline" className={cn('ml-1', badge.cls)}>{badge.label}</Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Combined Lovable spend across all founder apps · {pool.periodLabel}
            </p>
          </div>
          {pool.isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Spend bar */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Pool spend</span>
            <span className="font-medium">
              {fmtUsd(pool.totalUsd)} / {fmtUsd(pool.spendLimit)}
            </span>
          </div>
          <Progress
            value={Math.min(100, pool.spendPct)}
            className="h-2"
            indicatorClassName={statusColor(pool.spendPct)}
          />
        </div>

        {/* Credits bar */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Pool credits</span>
            <span className="font-medium">
              {Math.round(pool.totalCredits).toLocaleString()} / {pool.creditLimit.toLocaleString()}
            </span>
          </div>
          <Progress
            value={Math.min(100, pool.creditPct)}
            className="h-2"
            indicatorClassName={statusColor(pool.creditPct)}
          />
        </div>

        {/* Per-app breakdown */}
        <div className="pt-2 border-t border-border/40">
          <p className="text-xs text-muted-foreground mb-2">Per-app this period</p>
          {pool.byApp.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No charges reported yet. Other apps will post here automatically once the drop-in kit is installed.
            </p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {pool.byApp.map((a) => {
                const pct = pool.spendLimit > 0 ? (a.amount_usd / pool.spendLimit) * 100 : 0;
                return (
                  <li key={a.app_name} className="flex items-center gap-2">
                    <span className="flex-1 truncate">{a.app_name}</span>
                    <span className="tabular-nums text-muted-foreground text-xs">
                      {Math.round(a.credits_used).toLocaleString()} cr
                    </span>
                    <span className="tabular-nums font-medium w-16 text-right">{fmtUsd(a.amount_usd)}</span>
                    <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
                      {Math.round(pct)}%
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
