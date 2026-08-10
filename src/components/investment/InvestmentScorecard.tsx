import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { money, pct } from '@/lib/retirement/investmentTracker';
import { NOT_AVAILABLE, deriveHolding, type PortfolioAccount, type PositionRow } from '@/lib/investment/portfolio';

interface Props {
  monthLabel: string;
  investmentTotal: number;
  retirementTotal: number;
  selfDirectedTotal: number;
  monthlyContributions: number;
  employerContributions: number;
  investmentGains: number;
  dividends: number;
  interest: number;
  ytdReturnPct: number | null;
  retirementReturnPct: number | null;
  selfDirectedReturnPct: number | null;
  nextRetirementMilestone: string;
  nextTotalMilestone: string;
  projectedMillion: string;
  projectedFourM: string;
  accounts: PortfolioAccount[];
  positions: PositionRow[];
  accountMonthlyGain: Record<string, number>;
}

export function InvestmentScorecard(p: Props) {
  const bestAccount = Object.entries(p.accountMonthlyGain).sort((a, b) => b[1] - a[1])[0];
  const accountName = (id: string) => p.accounts.find((a) => a.id === id)?.name ?? '—';

  const ranked = p.positions
    .map((pos) => ({ pos, d: deriveHolding(pos) }))
    .filter((r) => r.d.gainPct != null)
    .sort((a, b) => (b.d.gainPct ?? 0) - (a.d.gainPct ?? 0));

  const totalGrowth = p.investmentGains + p.dividends + p.interest;

  const rows: Array<[string, string]> = [
    ['Total investments', money(p.investmentTotal, 2)],
    ['Retirement investments', money(p.retirementTotal, 2)],
    ['Self-directed investments', money(p.selfDirectedTotal, 2)],
    ['Monthly contributions', money(p.monthlyContributions, 2)],
    ['Employer contributions', money(p.employerContributions, 2)],
    ['Investment gains', money(p.investmentGains, 2)],
    ['Dividends', money(p.dividends, 2)],
    ['Interest', money(p.interest, 2)],
    ['Total monthly growth', money(totalGrowth, 2)],
    ['YTD portfolio return', p.ytdReturnPct == null ? NOT_AVAILABLE : pct(p.ytdReturnPct, 2)],
    ['Retirement return', p.retirementReturnPct == null ? NOT_AVAILABLE : pct(p.retirementReturnPct, 2)],
    ['Self-directed return', p.selfDirectedReturnPct == null ? NOT_AVAILABLE : pct(p.selfDirectedReturnPct, 2)],
    ['Best performing account', bestAccount ? `${accountName(bestAccount[0])} · ${money(bestAccount[1], 2)}` : NOT_AVAILABLE],
    ['Best performing investment', ranked[0] ? `${ranked[0].pos.name} · ${pct(ranked[0].d.gainPct, 1)}` : NOT_AVAILABLE],
    ['Worst performing investment', ranked.length > 1 ? `${ranked.at(-1)!.pos.name} · ${pct(ranked.at(-1)!.d.gainPct, 1)}` : NOT_AVAILABLE],
    ['Next retirement milestone', p.nextRetirementMilestone],
    ['Next total investment milestone', p.nextTotalMilestone],
    ['Projected $1M date', p.projectedMillion],
    ['Projected $4M date', p.projectedFourM],
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm uppercase tracking-wider flex items-center justify-between">
          <span>Montgomery monthly investment scorecard</span>
          <Badge variant="outline" className="text-[10px]">{p.monthLabel}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-1 sm:grid-cols-2 text-xs">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between border-b border-border/40 py-1.5">
              <span className="text-muted-foreground">{label}</span>
              <span className={`tabular-nums font-medium ${value === NOT_AVAILABLE ? 'text-muted-foreground' : ''}`}>
                {value}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          Every month is preserved permanently. Missing data is labeled {NOT_AVAILABLE} rather than estimated.
        </p>
      </CardContent>
    </Card>
  );
}
