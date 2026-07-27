import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useMoneyBlueprint } from '@/hooks/use-money-blueprint';
import { computeBlueprint } from '@/lib/budgeting/moneyBlueprint';
import { BlueprintBucketBar } from './BlueprintBucketBar';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export function BlueprintSummaryCard({ compact }: { compact?: boolean }) {
  const { data } = useMoneyBlueprint();
  const state = data?.state;
  const result = state ? computeBlueprint(state) : null;
  const configured = !!result && state!.income.netMonthly > 0;

  return (
    <Card className="border-border/60 bg-gradient-to-br from-primary/5 via-card to-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-prism-teal" />
              {state?.name || 'The Montgomery Money Blueprint'}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Conscious spending plan — every dollar of take-home gets a job.
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/legacy/money-blueprint">
              Open <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!configured ? (
          <p className="text-sm text-muted-foreground">
            No plan saved yet. Open the Money Blueprint to pull in your live numbers and set your four buckets.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-border/50 bg-card/60 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Take-home / mo</p>
                <p className="text-lg font-bold tabular-nums">{money(state!.income.netMonthly)}</p>
              </div>
              <div className="rounded-lg border border-border/50 bg-card/60 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Freedom Spending</p>
                <p className="text-lg font-bold tabular-nums text-prism-teal">{money(result!.freedomTotal)}</p>
              </div>
            </div>
            <div className="space-y-2.5">
              {result!.buckets.map((b) => (
                <BlueprintBucketBar key={b.key} bucket={b} compact={compact} />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
