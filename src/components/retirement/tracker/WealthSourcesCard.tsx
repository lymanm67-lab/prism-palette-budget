import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sparkles } from 'lucide-react';
import { money, type WealthSources } from '@/lib/retirement/investmentTracker';

export function WealthSourcesCard({ sources }: { sources: WealthSources }) {
  const rows = [
    { label: 'Starting principal', value: sources.startingPrincipal, color: 'bg-primary' },
    { label: 'My contributions', value: sources.employeeContributions, color: 'bg-emerald-600' },
    { label: 'Employer contributions', value: sources.employerContributions, color: 'bg-teal-700' },
    { label: 'Investment growth', value: sources.investmentGrowth, color: 'bg-prism-amber' },
    { label: 'Other deposits / transfers', value: sources.otherDeposits, color: 'bg-slate-500' },
    { label: 'Withdrawals', value: -Math.abs(sources.withdrawals), color: 'bg-destructive' },
  ];
  const denom = rows.reduce((s, r) => s + Math.max(0, r.value), 0) || 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Where my wealth came from</CardTitle>
        <p className="text-xs text-muted-foreground">
          Portfolio value {money(sources.portfolioValue, 2)} — split into what I put in versus what the market
          produced.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex h-3 w-full overflow-hidden rounded-full border border-border">
          {rows
            .filter((r) => r.value > 0)
            .map((r) => (
              <div key={r.label} className={r.color} style={{ width: `${(r.value / denom) * 100}%` }} />
            ))}
        </div>

        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className={`h-2.5 w-2.5 rounded-full ${r.color}`} />
                {r.label}
              </span>
              <span className="tabular-nums font-medium">
                {money(r.value, 2)}
                <span className="text-muted-foreground ml-2">
                  {((Math.max(0, r.value) / denom) * 100).toFixed(1)}%
                </span>
              </span>
            </div>
          ))}
        </div>

        <div
          className={`rounded-lg border p-3 ${
            sources.crossoverMonth
              ? 'border-prism-amber/40 bg-prism-amber/10'
              : 'border-border bg-muted/30'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-prism-amber" />
            <p className="text-xs font-semibold text-foreground">Compounding crossover</p>
            {sources.crossoverMonth && (
              <Badge className="bg-prism-amber text-background text-[10px]">Reached</Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {sources.crossoverMonth
              ? `Trailing 12-month investment growth first exceeded your own contributions in ${sources.crossoverMonth}. Compounding is now the bigger engine.`
              : 'Not reached yet — your contributions are still the bigger engine. This card lights up when trailing 12-month investment growth passes your personal contributions.'}
          </p>
          <Progress
            className="mt-2 h-1.5"
            value={
              sources.employeeContributions > 0
                ? Math.min(100, (sources.investmentGrowth / sources.employeeContributions) * 100)
                : 0
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
