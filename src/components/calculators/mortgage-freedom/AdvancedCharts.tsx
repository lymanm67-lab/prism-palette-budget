import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart as LineChartIcon } from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { cn } from '@/lib/utils';

type Schedule = { month: number; balance: number; interest: number; principal: number }[];

interface AdvancedChartsProps {
  homeValue: number;
  schedule: Schedule;                       // traditional strategy schedule (baseline)
  winnerSchedule: Schedule;                 // recommended strategy schedule
  winnerLabel: string;
  monthlyIncome: number;
}

export default function AdvancedCharts({ homeValue, schedule, winnerSchedule, winnerLabel, monthlyIncome }: AdvancedChartsProps) {
  const [tab, setTab] = useState<'equity' | 'principal-vs-interest' | 'net-worth'>('equity');
  const { formatCurrency } = useCurrency();

  const equityData = useMemo(() => {
    // Sample every 6 months
    const step = 6;
    const out: any[] = [];
    for (let i = 0; i < schedule.length; i += step) {
      const yr = (schedule[i].month / 12).toFixed(1);
      out.push({
        year: yr,
        'Baseline Equity': Math.max(0, homeValue - schedule[i].balance),
        [`${winnerLabel} Equity`]: winnerSchedule[i] ? Math.max(0, homeValue - winnerSchedule[i].balance) : Math.max(0, homeValue - (winnerSchedule[winnerSchedule.length - 1]?.balance ?? 0)),
      });
    }
    return out;
  }, [homeValue, schedule, winnerSchedule, winnerLabel]);

  const pvsiData = useMemo(() => {
    // Yearly aggregation of interest vs principal for baseline
    const out: any[] = [];
    for (let y = 0; y < Math.min(30, Math.ceil(schedule.length / 12)); y++) {
      const chunk = schedule.slice(y * 12, y * 12 + 12);
      const interest = chunk.reduce((s, r) => s + r.interest, 0);
      const principal = chunk.reduce((s, r) => s + r.principal, 0);
      out.push({ year: `Yr ${y + 1}`, Interest: interest, Principal: principal });
    }
    return out;
  }, [schedule]);

  const netWorthData = useMemo(() => {
    // Rough model: net worth over time = equity gained + assumed savings rate compounding
    // Baseline: minimum payments; user redirects nothing extra. Winner: whatever winner does + surplus invested.
    // For clarity, we plot equity + a fixed 10% of income invested at 7% for both, but winner also invests interest saved.
    const step = 12;
    const out: any[] = [];
    const savings = monthlyIncome * 0.10;
    const iR = 0.07 / 12;

    let baselineInvest = 0;
    let winnerInvest = 0;
    let cumInterestSavedProxy = 0;

    for (let i = 0; i < schedule.length; i += step) {
      const yr = Math.floor(schedule[i].month / 12);
      // Compound previous year of savings for both
      for (let m = 0; m < step; m++) {
        baselineInvest = baselineInvest * (1 + iR) + savings;
        winnerInvest = winnerInvest * (1 + iR) + savings;
      }
      // After payoff on winner, redirect the old payment into investing (rough surplus proxy)
      const winnerPaidOff = winnerSchedule[i]?.balance === 0 || (winnerSchedule[winnerSchedule.length - 1] && i >= winnerSchedule.length);
      if (winnerPaidOff) cumInterestSavedProxy += savings * step;

      const baselineEquity = Math.max(0, homeValue - schedule[i].balance);
      const winnerEquity = winnerSchedule[i]
        ? Math.max(0, homeValue - winnerSchedule[i].balance)
        : homeValue;
      out.push({
        year: `Yr ${yr + 1}`,
        Baseline: baselineEquity + baselineInvest,
        [winnerLabel]: winnerEquity + winnerInvest + cumInterestSavedProxy,
      });
    }
    return out;
  }, [schedule, winnerSchedule, homeValue, monthlyIncome, winnerLabel]);

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <LineChartIcon className="h-5 w-5 text-primary" /> Advanced Charts
        </CardTitle>
        <div className="flex flex-wrap gap-1 pt-2">
          <TabBtn active={tab === 'equity'} onClick={() => setTab('equity')}>Equity growth</TabBtn>
          <TabBtn active={tab === 'principal-vs-interest'} onClick={() => setTab('principal-vs-interest')}>Interest vs Principal</TabBtn>
          <TabBtn active={tab === 'net-worth'} onClick={() => setTab('net-worth')}>Net worth trajectory</TabBtn>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {tab === 'equity' ? (
              <AreaChart data={equityData} margin={{ top: 4, right: 12, left: 0, bottom: 8 }}>
                <defs>
                  <linearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="winGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <RTooltip formatter={(v: any) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="Baseline Equity" stroke="hsl(var(--muted-foreground))" strokeWidth={2} fill="url(#baseGrad)" />
                <Area type="monotone" dataKey={`${winnerLabel} Equity`} stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#winGrad)" />
              </AreaChart>
            ) : tab === 'principal-vs-interest' ? (
              <BarChart data={pvsiData} margin={{ top: 4, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <RTooltip formatter={(v: any) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Interest" stackId="a" fill="hsl(0 84% 60%)" />
                <Bar dataKey="Principal" stackId="a" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={netWorthData} margin={{ top: 4, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <RTooltip formatter={(v: any) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Baseline" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey={winnerLabel} stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
        <p className="text-[11px] text-muted-foreground italic mt-2">
          {tab === 'equity' && 'How fast home equity accumulates under each strategy — the winner\'s curve should climb faster after acceleration kicks in.'}
          {tab === 'principal-vs-interest' && 'Every mortgage year: red is interest paid to the bank, blue is principal reducing your balance. Early years favor the bank.'}
          {tab === 'net-worth' && 'Directional net-worth trajectory: home equity + a modeled 10% savings rate at 7% return, plus the interest-savings surplus after payoff.'}
        </p>
      </CardContent>
    </Card>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1 rounded-md text-xs font-medium transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}
