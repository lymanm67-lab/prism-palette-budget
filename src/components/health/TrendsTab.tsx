import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { useHealthLogs, useHealthProfile } from '@/hooks/use-health';
import { annualTrend, monthlyTrend, weeklyTrend } from '@/lib/health/healthEngine';

const axis = { fontSize: 11 };

export default function TrendsTab() {
  const { data: profile } = useHealthProfile();
  const { data: logs = [] } = useHealthLogs();
  const [range, setRange] = useState('weekly');
  const goal = profile?.daily_miles_goal ?? 3.5;

  const data =
    range === 'weekly'
      ? weeklyTrend(logs, goal)
      : range === 'monthly'
        ? monthlyTrend(logs, goal)
        : annualTrend(logs, goal);

  const empty = data.length === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-prism-teal" /> Progress trends
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={range} onValueChange={setRange}>
          <TabsList>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="annual">Annual</TabsTrigger>
          </TabsList>
          <TabsContent value={range} className="mt-4 space-y-8">
            {empty ? (
              <p className="text-sm text-muted-foreground">
                Log daily walks and weigh-ins to build the trend charts.
              </p>
            ) : (
              <>
                <div>
                  <p className="mb-2 text-sm font-medium">Weight trajectory</p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="label" tick={axis} />
                        <YAxis tick={axis} domain={['auto', 'auto']} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="weight"
                          name="Weight (lb)"
                          stroke="hsl(var(--prism-amber))"
                          strokeWidth={2}
                          connectNulls
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium">Miles walked</p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="label" tick={axis} />
                        <YAxis tick={axis} />
                        <Tooltip />
                        <Bar dataKey="miles" name="Miles" fill="hsl(var(--prism-teal))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium">Nutrition consistency</p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="label" tick={axis} />
                        <YAxis tick={axis} />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="protein"
                          name="Avg protein (g)"
                          stroke="hsl(var(--prism-orange))"
                          strokeWidth={2}
                          connectNulls
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="water"
                          name="Avg water (oz)"
                          stroke="hsl(var(--prism-sky))"
                          strokeWidth={2}
                          connectNulls
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium">Energy &amp; focus ratings</p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="label" tick={axis} />
                        <YAxis tick={axis} domain={[1, 5]} />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="energy"
                          name="Energy"
                          stroke="hsl(var(--prism-lime))"
                          strokeWidth={2}
                          connectNulls
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="focus"
                          name="Focus"
                          stroke="hsl(var(--prism-violet))"
                          strokeWidth={2}
                          connectNulls
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
