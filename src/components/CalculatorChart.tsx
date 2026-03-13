import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

interface CalculatorChartProps {
  type: 'amortization' | 'growth' | 'payoff';
  data: any[];
}

const COLORS = {
  principal: 'hsl(174, 72%, 40%)',   // prism-teal
  interest: 'hsl(350, 78%, 52%)',    // prism-rose
  balance: 'hsl(220, 70%, 35%)',     // primary
  contributions: 'hsl(152, 68%, 42%)', // prism-lime
  earnings: 'hsl(174, 72%, 40%)',    // prism-teal
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/50 bg-card/95 backdrop-blur-sm p-2.5 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">${Number(entry.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
      ))}
    </div>
  );
};

export default function CalculatorChart({ type, data }: CalculatorChartProps) {
  if (!data || data.length === 0) return null;

  if (type === 'amortization') {
    // Sample every N points for performance
    const sampled = useMemo(() => {
      const step = Math.max(1, Math.floor(data.length / 60));
      return data.filter((_, i) => i % step === 0 || i === data.length - 1).map(d => ({
        label: `Mo ${d.month}`,
        Principal: Math.round(d.principal),
        Interest: Math.round(d.interest),
        Balance: Math.round(d.balance),
      }));
    }, [data]);

    return (
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sampled} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradBalance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.balance} stopOpacity={0.3} />
                <stop offset="100%" stopColor={COLORS.balance} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} className="text-muted-foreground" interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={45} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="Balance" stroke={COLORS.balance} fill="url(#gradBalance)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'growth') {
    const chartData = useMemo(() => data.map(d => ({
      label: `Year ${Math.round(d.month / 12)}`,
      Contributions: Math.round(d.contributions),
      Earnings: Math.round(d.interest),
      Total: Math.round(d.balance),
    })), [data]);

    return (
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradContrib" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.contributions} stopOpacity={0.4} />
                <stop offset="100%" stopColor={COLORS.contributions} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradEarnings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.earnings} stopOpacity={0.4} />
                <stop offset="100%" stopColor={COLORS.earnings} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} className="text-muted-foreground" interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={45} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="Contributions" stackId="1" stroke={COLORS.contributions} fill="url(#gradContrib)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="Earnings" stackId="1" stroke={COLORS.earnings} fill="url(#gradEarnings)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'payoff') {
    // Build payoff timeline data from raw months/interest data
    const chartData = useMemo(() => {
      return data.map(d => ({
        label: d.label,
        Remaining: Math.round(d.balance),
        Paid: Math.round(d.paid),
      }));
    }, [data]);

    return (
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradRemaining" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.interest} stopOpacity={0.3} />
                <stop offset="100%" stopColor={COLORS.interest} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} className="text-muted-foreground" interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={45} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="Remaining" stroke={COLORS.interest} fill="url(#gradRemaining)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
}
