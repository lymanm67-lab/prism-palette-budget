import { useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import PageOverview from '@/components/PageOverview';

const PayrollRunway = () => {
  const [cashReserves, setCashReserves] = useState('');
  const [biweeklyPayroll, setBiweeklyPayroll] = useState('');
  const [monthlyExpenses, setMonthlyExpenses] = useState('');
  const [runwayDays, setRunwayDays] = useState<number | null>(null);

  const calculate = () => {
    const cash = parseFloat(cashReserves) || 0;
    const payroll = parseFloat(biweeklyPayroll) || 0;
    const expenses = parseFloat(monthlyExpenses) || 0;
    const dailyBurn = (payroll / 14) + (expenses / 30);
    if (dailyBurn > 0) {
      setRunwayDays(Math.floor(cash / dailyBurn));
    }
  };

  const getRunwayColor = (days: number) => {
    if (days >= 60) return 'text-prism-teal';
    if (days >= 30) return 'text-prism-amber';
    return 'text-destructive';
  };

  const getRunwayStatus = (days: number) => {
    if (days >= 60) return { label: 'Healthy', bg: 'bg-prism-teal/10 border-prism-teal/30' };
    if (days >= 30) return { label: 'Caution', bg: 'bg-prism-amber/10 border-prism-amber/30' };
    return { label: 'Critical', bg: 'bg-destructive/10 border-destructive/30' };
  };

  return (
    <div className="space-y-6 pb-8">
      <PageOverview title="Payroll Runway Calculator" description="Calculate days of payroll coverage and monitor cash reserves" icon={Clock} ttsScript="Calculate days of payroll coverage and monitor cash reserves." features={['Cash reserve analysis', 'Color-coded indicators', 'Risk alerts']} />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Input */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Enter Financial Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Current Cash Reserves ($)</Label>
              <Input type="number" placeholder="50000" value={cashReserves} onChange={e => setCashReserves(e.target.value)} />
            </div>
            <div>
              <Label>Biweekly Payroll Obligations ($)</Label>
              <Input type="number" placeholder="15000" value={biweeklyPayroll} onChange={e => setBiweeklyPayroll(e.target.value)} />
            </div>
            <div>
              <Label>Monthly Operating Expenses ($)</Label>
              <Input type="number" placeholder="8000" value={monthlyExpenses} onChange={e => setMonthlyExpenses(e.target.value)} />
            </div>
            <Button onClick={calculate} className="w-full">Calculate Runway</Button>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payroll Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            {runwayDays === null ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground">Enter your financial data to see your runway</p>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className={cn('inline-flex h-32 w-32 items-center justify-center rounded-full border-4', getRunwayStatus(runwayDays).bg)}>
                  <div>
                    <p className={cn('text-4xl font-bold', getRunwayColor(runwayDays))}>{runwayDays}</p>
                    <p className="text-xs text-muted-foreground">days</p>
                  </div>
                </div>
                <p className={cn('text-sm font-semibold', getRunwayColor(runwayDays))}>
                  {getRunwayStatus(runwayDays).label}
                </p>
                {runwayDays < 30 && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Payroll runway is critically low. Consider accelerating receivables or securing bridge financing.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PayrollRunway;
