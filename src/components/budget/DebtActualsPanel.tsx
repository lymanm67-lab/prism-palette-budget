import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Banknote, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';
import { useDebtActuals } from '@/hooks/use-debt-actuals';
import { monthLabel } from '@/lib/budgeting/forecastEngine';

const sb = supabase as any;

export default function DebtActualsPanel() {
  const { formatCurrency } = useCurrency();
  const { actuals, debts, isLoading } = useDebtActuals(4);
  const qc = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);

  const observedTotal = useMemo(
    () => actuals.reduce((s, a) => s + (a.latestMonthly || a.observedMonthly), 0),
    [actuals],
  );
  const storedTotal = useMemo(() => actuals.reduce((s, a) => s + a.storedMonthly, 0), [actuals]);
  const drift = Math.round((observedTotal - storedTotal) * 100) / 100;

  const applyOne = async (debtId: string, amount: number) => {
    const debt = debts.find((d: any) => d.id === debtId);
    const separate = Number(debt?.settlement_separate_payment || 0);
    const minimum = Math.max(0, Math.round((amount - separate) * 100) / 100);
    setSaving(debtId);
    const { error } = await sb.from('debt_items').update({ minimum_payment: minimum }).eq('id', debtId);
    setSaving(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ['household_debt_items'] });
    toast.success('Stored payment updated from the statements');
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Observed monthly debt cash', value: observedTotal, sub: 'Latest month from bank statements' },
          { label: 'Stored plan payments', value: storedTotal, sub: 'Minimum + separately billed legs' },
          {
            label: drift >= 0 ? 'Paying above plan' : 'Paying below plan',
            value: Math.abs(drift),
            sub: drift >= 0 ? 'Extra cash hitting principal' : 'Plan assumes more than the bank shows',
          },
        ].map((k) => (
          <Card key={k.label} className="glass-card">
            <CardContent className="pt-6">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</p>
              <p className="mt-1 text-2xl font-bold">{formatCurrency(k.value)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="h-4 w-4" /> Real payments vs plan
          </CardTitle>
          <CardDescription>
            Matched from the last four months of statements. The forecast and What-If sliders use the observed figure
            whenever “Use real payments” is on.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Debt</TableHead>
                <TableHead className="text-right">Latest month</TableHead>
                <TableHead className="text-right">Typical (median)</TableHead>
                <TableHead className="text-right">Stored plan</TableHead>
                <TableHead>History</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    Reading statements…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                actuals.map((a) => {
                  const observed = a.latestMonthly || a.observedMonthly;
                  const matches = a.matchedCount > 0;
                  const aligned = Math.abs(observed - a.storedMonthly) < 1;
                  return (
                    <TableRow key={a.debtId}>
                      <TableCell className="font-medium">
                        {a.debtName}
                        {!matches && (
                          <Badge variant="outline" className="ml-2 gap-1 text-xs">
                            <AlertTriangle className="h-3 w-3" /> No statement match
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {a.latestMonth ? (
                          <>
                            {formatCurrency(a.latestMonthly)}
                            <span className="ml-1 text-xs text-muted-foreground">{monthLabel(a.latestMonth)}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(a.observedMonthly)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(a.storedMonthly)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {a.months.map((m) => (
                            <Badge key={m.month} variant="secondary" className="text-xs">
                              {monthLabel(m.month)} {formatCurrency(m.total)}
                            </Badge>
                          ))}
                          {!a.months.length && <span className="text-xs text-muted-foreground">no matches</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {aligned ? (
                          <Badge className="gap-1 border-emerald-500/30 bg-emerald-500/15 text-emerald-500">
                            <CheckCircle2 className="h-3 w-3" /> In sync
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!matches || saving === a.debtId}
                            onClick={() => applyOne(a.debtId, observed)}
                          >
                            Apply {formatCurrency(observed)}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
