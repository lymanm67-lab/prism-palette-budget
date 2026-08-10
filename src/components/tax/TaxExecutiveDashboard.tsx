import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Landmark, PiggyBank, Wallet, Receipt } from 'lucide-react';
import type { RmdSummary, RmdYear } from '@/lib/tax/rmdEngine';
import type { LadderResult } from '@/lib/tax/rothEngine';

export const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

interface Props {
  buckets: { pretax: number; roth: number; taxable: number; hsa: number; total: number };
  rows: RmdYear[];
  summary: RmdSummary;
  ladder: LadderResult;
  rmdStartAge: number;
}

export function TaxExecutiveDashboard({ buckets, summary, ladder, rmdStartAge }: Props) {
  const pct = (n: number) => (buckets.total > 0 ? (n / buckets.total) * 100 : 0);
  const stats = [
    { label: 'First RMD', value: money(summary.firstRmdAmount), sub: summary.firstRmdYear ? `${summary.firstRmdYear} · age ${rmdStartAge}` : 'Not yet required', icon: Landmark },
    { label: 'Peak RMD', value: money(summary.peakRmd), sub: summary.peakRmdYear ? `Year ${summary.peakRmdYear}` : '—', icon: AlertTriangle },
    { label: 'Lifetime tax (est.)', value: money(summary.lifetimeTax), sub: `Peak bracket ${summary.peakMarginalRate}%`, icon: Receipt },
    { label: 'Roth ladder', value: money(ladder.totalConverted), sub: `${money(ladder.totalTax)} tax to convert`, icon: PiggyBank },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{s.label}</span>
                <s.icon className="h-4 w-4" />
              </div>
              <p className="mt-1 font-display text-xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Tax buckets
            </h3>
            <span className="text-sm text-muted-foreground">{money(buckets.total)} total</span>
          </div>
          {[
            { label: 'Pre-tax (taxed on withdrawal, RMDs apply)', value: buckets.pretax },
            { label: 'Roth (tax-free, no RMDs)', value: buckets.roth },
            { label: 'Taxable / brokerage (capital gains)', value: buckets.taxable },
            { label: 'HSA (triple tax-advantaged)', value: buckets.hsa },
          ].map((b) => (
            <div key={b.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{b.label}</span>
                <span className="font-medium">{money(b.value)} · {pct(b.value).toFixed(1)}%</span>
              </div>
              <Progress value={pct(b.value)} className="h-1.5" />
            </div>
          ))}
          {buckets.pretax / Math.max(1, buckets.total) > 0.8 && (
            <Badge variant="outline" className="gap-1 text-xs">
              <AlertTriangle className="h-3 w-3" /> Concentration risk: most wealth is pre-tax, so future
              withdrawals are fully taxable.
            </Badge>
          )}
          {summary.irmaaYears > 0 && (
            <p className="text-xs text-muted-foreground">
              {summary.irmaaYears} projected year(s) cross a Medicare premium surcharge threshold.
            </p>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Educational estimates using federal brackets inflated forward from the baseline law year. Not tax advice —
        confirm with your CPA before acting.
      </p>
    </div>
  );
}
