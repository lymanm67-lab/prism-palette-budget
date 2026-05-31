import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarClock } from 'lucide-react';
import { Area, AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// Cumulative monthly retirement step-ups from the Montgomery plan
const TIMELINE = [
  { date: 'Today', cumulative: 0, note: 'Baseline contributions' },
  { date: 'Jul 2026', cumulative: 100, note: '+$100/mo' },
  { date: 'Jan 2027', cumulative: 533, note: '+$225 + $208 accelerator' },
  { date: 'Sep 2027', cumulative: 1421, note: '+$888 debt redirect' },
  { date: 'Jun 2028', cumulative: 1921, note: '+$500 step-up' },
  { date: 'Jan 2029', cumulative: 2121, note: '+$200' },
  { date: 'Jan 2030', cumulative: 2621, note: '+$500 step-up' },
  { date: 'Jun 2037', cumulative: 6161, note: '+$3,540 SS invested' },
];

export function ContributionTimelineChart() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" />
          Contribution Timeline
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Cumulative monthly retirement contributions on top of today's baseline.
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={TIMELINE}>
              <defs>
                <linearGradient id="contribGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => `$${v.toLocaleString()}`}
              />
              <Tooltip
                formatter={(v: number) => [`$${v.toLocaleString()}/mo`, 'Cumulative']}
                labelFormatter={(label, payload) => {
                  const item = payload?.[0]?.payload;
                  return item ? `${label} — ${item.note}` : label;
                }}
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              />
              <Area
                type="stepAfter"
                dataKey="cumulative"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#contribGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <ul className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 text-xs">
          {TIMELINE.slice(1).map((t) => (
            <li key={t.date} className="rounded-md bg-muted/40 p-2">
              <p className="text-muted-foreground">{t.date}</p>
              <p className="font-medium tabular-nums">${t.cumulative.toLocaleString()}/mo</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t.note}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
