import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, Landmark, PiggyBank, Wallet } from 'lucide-react';
import { money, pct } from '@/lib/retirement/investmentTracker';
import { groupByCustodian, share, type PortfolioAccount } from '@/lib/investment/portfolio';

interface Props {
  investmentTotal: number;
  retirementTotal: number;
  selfDirectedTotal: number;
  accounts: PortfolioAccount[];
  monthlyGain: number | null;
  monthlyContributions: number | null;
  ytdReturnPct: number | null;
  nextMilestoneLabel: string;
  projectedMillionDate: string;
  onSelect: (view: 'retirement' | 'self_directed') => void;
}

export function PortfolioExecutive({
  investmentTotal, retirementTotal, selfDirectedTotal, accounts, monthlyGain,
  monthlyContributions, ytdReturnPct, nextMilestoneLabel, projectedMillionDate, onSelect,
}: Props) {
  const groups = groupByCustodian(accounts);

  const kpis = [
    { label: 'Monthly investment gain', value: monthlyGain == null ? 'NOT AVAILABLE' : money(monthlyGain, 2), tone: monthlyGain == null ? 'muted' : monthlyGain >= 0 ? 'up' : 'down' },
    { label: 'Monthly contributions', value: monthlyContributions == null ? 'NOT AVAILABLE' : money(monthlyContributions, 2), tone: 'navy' },
    { label: 'YTD portfolio return', value: ytdReturnPct == null ? 'NOT AVAILABLE' : pct(ytdReturnPct, 2), tone: ytdReturnPct == null ? 'muted' : ytdReturnPct >= 0 ? 'up' : 'down' },
    { label: 'Next milestone', value: nextMilestoneLabel, tone: 'gold' },
    { label: 'Projected $1M date', value: projectedMillionDate, tone: 'gold' },
  ];

  const toneClass = (tone: string) =>
    tone === 'up' ? 'text-emerald-500'
      : tone === 'down' ? 'text-destructive'
        : tone === 'gold' ? 'text-prism-amber'
          : tone === 'muted' ? 'text-muted-foreground'
            : 'text-foreground';

  return (
    <div className="space-y-3">
      <Card className="border-prism-amber/30 bg-gradient-to-br from-background to-muted/40">
        <CardContent className="p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Montgomery Investment Portfolio
          </p>
          <p className="text-[11px] uppercase tracking-wider text-prism-amber mt-1">Total investments</p>
          <p className="text-4xl font-semibold tabular-nums mt-1">{money(investmentTotal, 2)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Retirement and self-directed money are combined here for total wealth only — never for tax,
            RMD or contribution-limit calculations.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {[
          { key: 'retirement' as const, title: 'Retirement Investments', value: retirementTotal, icon: PiggyBank, note: 'Employer plans — restricted until retirement' },
          { key: 'self_directed' as const, title: 'Self-Directed Investments', value: selfDirectedTotal, icon: Wallet, note: 'Taxable brokerage — accessible before retirement' },
        ].map(({ key, title, value, icon: Icon, note }) => (
          <button key={key} type="button" onClick={() => onSelect(key)} className="text-left">
            <Card className="h-full transition-colors hover:border-prism-amber/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                    <Icon className="h-4 w-4" /> {title}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-semibold tabular-nums mt-2">{money(value, 2)}</p>
                <p className="text-[11px] text-muted-foreground">
                  {pct(share(value, investmentTotal), 2)} of investment portfolio
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">{note}</p>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
            <Landmark className="h-3.5 w-3.5" /> Where it is held
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {groups.map((g) => (
              <div key={g.custodian} className="rounded-lg border border-border/60 p-2.5">
                <p className="text-[11px] text-muted-foreground truncate">{g.custodian}</p>
                <p className="text-base font-semibold tabular-nums">{money(g.total, 2)}</p>
                <p className="text-[10px] text-muted-foreground">
                  {pct(share(g.total, investmentTotal), 1)} of total ·{' '}
                  {g.portfolioClass === 'retirement' ? 'Retirement' : 'Self-directed'}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.label}</p>
              <p className={`text-sm font-semibold tabular-nums mt-1 ${toneClass(k.tone)}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
