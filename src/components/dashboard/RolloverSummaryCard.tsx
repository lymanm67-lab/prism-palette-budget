import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, PiggyBank } from 'lucide-react';
import { useMonthEndClose, monthStart } from '@/hooks/use-month-end-close';

const money = (n: number) =>
  (n ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export function RolloverSummaryCard() {
  const currentMonth = monthStart(new Date());
  const { closeSummary, closedRecord, isLoading } = useMonthEndClose(currentMonth);

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <PiggyBank className="h-4 w-4 text-prism-teal" />
          Leftover cash this month
        </CardTitle>
        {closedRecord ? <Badge variant="secondary">Closed</Badge> : <Badge variant="outline">Open</Badge>}
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-2xl font-semibold text-prism-teal">
          {isLoading ? '—' : money(closeSummary?.leftoverCash ?? 0)}
        </p>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Carries forward</p>
            <p className="font-medium">{money(closeSummary?.totalRolledForward ?? 0)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">To goals</p>
            <p className="font-medium">{money(closeSummary?.totalSwept ?? 0)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Unassigned</p>
            <p className="font-medium">{money(closeSummary?.unassignedCash ?? 0)}</p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link to="/budgets/month-end">
            Review month-end <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
