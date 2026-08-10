import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  RANGE_OPTIONS,
  compactMoney,
  filterTimeline,
  money,
  type MonthPoint,
  type RangeKey,
  type RetirementAccountRow,
} from '@/lib/retirement/investmentTracker';

const PIE_COLORS = ['hsl(var(--primary))', '#0f766e', '#f59e0b', '#64748b', '#10b981'];

export function PerformanceCharts({
  timeline,
  accounts,
}: {
  timeline: MonthPoint[];
  accounts: RetirementAccountRow[];
}) {
  const [range, setRange] = useState<RangeKey>('all');
  const data = filterTimeline(timeline, range);

  const allocation = accounts.map((a) => ({
    name: a.name,
    value: Number(a.current_balance),
  }));

  const tip = {
    contentStyle: {
      background: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderRadius: 8,
      fontSize: 12,
    },
    formatter: (v: number | string) => money(Number(v), 2),
  } as const;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base">Performance history</CardTitle>
            <p className="text-xs text-muted-foreground">
              Balance, contributions and investment growth over time.
            </p>
          </div>
          <div className="flex gap-1 flex-wrap">
            {RANGE_OPTIONS.map((o) => (
              <button
                key={o.key}
                onClick={() => setRange(o.key)}
                className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                  range === o.key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'text-muted-foreground border-border hover:bg-muted'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No statements in this range yet — save a month above to start the history.
          </p>
        ) : (
          <>
            <ChartBlock title="Portfolio balance over time">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={compactMoney} tick={{ fontSize: 11 }} width={70} />
                  <Tooltip {...tip} />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    name="Portfolio"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.18}
                    dot={{ r: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartBlock>

            <ChartBlock title="Monthly investment gain / loss">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={compactMoney} tick={{ fontSize: 11 }} width={70} />
                  <Tooltip {...tip} />
                  <Bar dataKey="investmentGain" name="Estimated gain">
                    {data.map((d, i) => (
                      <Cell key={i} fill={d.investmentGain >= 0 ? '#10b981' : 'hsl(var(--destructive))'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartBlock>

            <ChartBlock title="Monthly contributions">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={compactMoney} tick={{ fontSize: 11 }} width={70} />
                  <Tooltip {...tip} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="employeeContributions" name="Employee" stackId="c" fill="hsl(var(--primary))" />
                  <Bar dataKey="employerContributions" name="Employer" stackId="c" fill="#0f766e" />
                </BarChart>
              </ResponsiveContainer>
            </ChartBlock>

            <ChartBlock title="Investment growth vs contributions (cumulative)">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={compactMoney} tick={{ fontSize: 11 }} width={70} />
                  <Tooltip {...tip} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area
                    type="monotone"
                    dataKey="cumulativeContributions"
                    name="Cumulative employee"
                    stackId="1"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.25}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulativeEmployer"
                    name="Cumulative employer"
                    stackId="1"
                    stroke="#0f766e"
                    fill="#0f766e"
                    fillOpacity={0.25}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulativeGain"
                    name="Cumulative investment growth"
                    stackId="1"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartBlock>

            <ChartBlock title="Portfolio allocation by account">
              <div className="grid gap-6 md:grid-cols-2 items-center">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={allocation} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85}>
                      {allocation.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...tip} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {allocation.map((a, i) => (
                    <div key={a.name} className="flex items-center justify-between gap-3 text-xs">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        {a.name}
                      </span>
                      <span className="tabular-nums font-medium">{money(a.value, 2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ChartBlock>

            <ChartBlock title="Account balance by account">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={compactMoney} tick={{ fontSize: 11 }} width={70} />
                  <Tooltip {...tip} />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    name="Total across accounts"
                    stroke="hsl(var(--primary))"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartBlock>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ChartBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-foreground mb-2">{title}</p>
      {children}
    </div>
  );
}
