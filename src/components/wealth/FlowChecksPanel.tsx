import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CheckResult } from '@/lib/wealth/checks';

export function FlowChecksPanel({ checks }: { checks: CheckResult[] }) {
  const errors = checks.filter((c) => c.severity === 'error');
  const warnings = checks.filter((c) => c.severity === 'warning');
  const infos = checks.filter((c) => c.severity === 'info');

  return (
    <Card className={errors.length ? 'border-destructive/40 bg-destructive/5' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {errors.length ? (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          )}
          Flow reconciliation and double-counting checks
        </CardTitle>
        <CardDescription>
          Every month must balance: money in equals money out across the buffer, debts, savings and the
          invested buckets.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {checks.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Every month balances and no double counting was found.
          </p>
        )}
        {[...errors, ...warnings, ...infos].map((c) => (
          <div key={c.id} className="rounded-lg border border-border/60 bg-card/40 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={c.severity === 'error' ? 'destructive' : 'secondary'}
                className="text-[10px]"
              >
                {c.severity === 'error' ? 'Error' : c.severity === 'warning' ? 'Check' : 'Note'}
              </Badge>
              <p className="text-sm font-medium">{c.title}</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{c.detail}</p>
          </div>
        ))}
        {checks.length > 0 && (
          <p className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
            <Info className="h-3.5 w-3.5" /> Errors mean the model is wrong. Checks mean a number needs your
            confirmation.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
