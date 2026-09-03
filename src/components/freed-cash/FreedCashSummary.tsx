import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { FreedCashTotals } from '@/hooks/use-freed-cash';

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

interface Props {
  totals: FreedCashTotals;
}

export function FreedCashSummary({ totals }: Props) {
  const stats = [
    { label: 'Verified monthly freed cash', value: fmt(totals.monthlyVerified), hint: 'Confirmed on a statement' },
    { label: 'Verified annual impact', value: fmt(totals.annualVerified), hint: 'Monthly × 12' },
    { label: 'In the pipeline', value: fmt(totals.monthlyPipeline), hint: 'Requested or awaiting proof' },
    { label: 'Reversed / reactivated', value: fmt(totals.monthlyReversed), hint: 'Savings that came back as cost' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tracking-tight">{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Capture rate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={Math.min(100, totals.captureRate)} />
          <p className="text-xs text-muted-foreground">
            {totals.captureRate.toFixed(0)}% of claimed savings are verified ({totals.verifiedCount} of{' '}
            {totals.count} sources). Every freed dollar needs a new job — unverified savings are not spendable yet.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
