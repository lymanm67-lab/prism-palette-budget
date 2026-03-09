import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useCashFlowForecast } from '@/hooks/use-financial-intelligence';
import { useCurrency } from '@/hooks/use-currency';
import {
  Loader2, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Sparkles, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import PageOverview from '@/components/PageOverview';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '12px',
  boxShadow: '0 8px 32px -8px rgba(0,0,0,0.15)',
};

const Forecast = () => {
  const forecast = useCashFlowForecast();
  const { formatCurrency } = useCurrency();

  const [forecastDays, setForecastDays] = useState(90);
  const [spendingReduction, setSpendingReduction] = useState(0);
  const [additionalSavings, setAdditionalSavings] = useState(0);
  const [cancelAmount, setCancelAmount] = useState(0);
  const [data, setData] = useState<any>(null);

  const handleForecast = async () => {
    try {
      const result = await forecast.mutateAsync({
        forecast_days: forecastDays,
        adjustments: {
          spending_reduction_pct: spendingReduction,
          additional_savings: additionalSavings,
          cancel_subscriptions_amount: cancelAmount,
        },
      });
      setData(result);
    } catch {
      toast.error('Failed to generate forecast');
    }
  };

  const chartData = (data?.forecast || []).map((f: any) => ({
    ...f,
    date: format(parseISO(f.date), 'MMM d'),
    rawDate: f.date,
  }));

  const lowestPoint = chartData.reduce((min: any, d: any) => (!min || d.projected_balance < min.projected_balance) ? d : min, null);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            <span className="prism-gradient-text">Cash Flow Forecast</span>
          </h1>
          <p className="text-muted-foreground mt-1">Predict your financial future with AI-powered projections.</p>
        </div>
        <PageOverview
          title="Cash Flow Forecast"
          description="AI-powered predictive cash flow analysis with what-if simulation. Project your balance 30-90 days ahead."
          icon={TrendingUp}
          iconColor="text-prism-teal"
          ttsScript="Welcome to Cash Flow Forecast. This tool analyzes your transaction patterns to predict your future balance. You can simulate spending reductions, additional savings, and subscription cancellations to see their impact. The forecast shows a 30 or 90 day projection with insights about potential low balance warnings."
          features={['30 & 90 day balance projections', 'Spending reduction simulation', 'Subscription cancellation impact', 'Low balance warnings']}
        />
        <Button onClick={handleForecast} disabled={forecast.isPending}>
          {forecast.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Generate Forecast
        </Button>
      </motion.div>

      {/* Simulation Controls */}
      <motion.div variants={item}>
        <Card className="prism-card-shine border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-prism-violet" />
              What-If Simulation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label className="text-xs">Forecast Period</Label>
                <div className="flex items-center gap-2">
                  <Button variant={forecastDays === 30 ? 'default' : 'outline'} size="sm" onClick={() => setForecastDays(30)}>
                    30 days
                  </Button>
                  <Button variant={forecastDays === 90 ? 'default' : 'outline'} size="sm" onClick={() => setForecastDays(90)}>
                    90 days
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Reduce Spending: {spendingReduction}%</Label>
                <Slider value={[spendingReduction]} onValueChange={([v]) => setSpendingReduction(v)} max={50} step={5} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Additional Monthly Savings: ${additionalSavings}</Label>
                <Slider value={[additionalSavings]} onValueChange={([v]) => setAdditionalSavings(v)} max={1000} step={50} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Cancel Subscriptions: ${cancelAmount}/mo</Label>
                <Slider value={[cancelAmount]} onValueChange={([v]) => setCancelAmount(v)} max={500} step={10} />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <motion.div variants={item}>
              <Card className="prism-card-shine border-border/50">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-prism-navy to-prism-teal flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Current Balance</p>
                    <p className="font-display text-xl font-bold">{formatCurrency(data.current_balance)}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={item}>
              <Card className="prism-card-shine border-border/50">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-prism-teal to-prism-lime flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">30-Day Projection</p>
                    <p className={`font-display text-xl font-bold ${data.thirty_day_balance >= data.current_balance ? 'text-prism-teal' : 'text-prism-rose'}`}>
                      {formatCurrency(data.thirty_day_balance)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={item}>
              <Card className="prism-card-shine border-border/50">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-prism-sky to-prism-indigo flex items-center justify-center">
                    <TrendingDown className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Projected Savings</p>
                    <p className={`font-display text-xl font-bold ${data.projected_monthly_savings >= 0 ? 'text-prism-teal' : 'text-prism-rose'}`}>
                      {formatCurrency(data.projected_monthly_savings)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={item}>
              <Card className="prism-card-shine border-border/50">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-prism-orange to-prism-rose flex items-center justify-center">
                    {data.ninety_day_balance >= data.current_balance ? (
                      <TrendingUp className="h-6 w-6 text-white" />
                    ) : (
                      <TrendingDown className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">90-Day Projection</p>
                    <p className={`font-display text-xl font-bold ${data.ninety_day_balance >= data.current_balance ? 'text-prism-teal' : 'text-prism-rose'}`}>
                      {formatCurrency(data.ninety_day_balance)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Forecast Chart */}
          {chartData.length > 0 && (
            <motion.div variants={item}>
              <Card className="prism-card-shine border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-lg">Balance Projection</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(174, 72%, 40%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(174, 72%, 40%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} interval="preserveStartEnd" />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(v: number) => formatCurrency(v)}
                        contentStyle={tooltipStyle}
                        labelFormatter={(l) => l}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <ReferenceLine y={500} stroke="hsl(350, 78%, 52%)" strokeDasharray="5 5" label={{ value: "$500 threshold", fill: "hsl(350, 78%, 52%)", fontSize: 11 }} />
                      <ReferenceLine y={data.current_balance} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                      <Area
                        type="monotone"
                        dataKey="projected_balance"
                        stroke="hsl(174, 72%, 40%)"
                        fill="url(#balanceGradient)"
                        strokeWidth={2}
                        name="Projected Balance"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Insights */}
          {data.insights?.length > 0 && (
            <motion.div variants={item}>
              <Card className="border-prism-teal/20 bg-gradient-to-r from-prism-teal/5 to-transparent">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-prism-teal" />
                    Forecast Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.insights.map((insight: string, i: number) => (
                      <div key={i} className="flex items-start gap-3 text-sm">
                        {insight.includes('fall below') || insight.includes('spend') ? (
                          <AlertTriangle className="h-4 w-4 mt-0.5 text-prism-orange shrink-0" />
                        ) : (
                          <TrendingUp className="h-4 w-4 mt-0.5 text-prism-teal shrink-0" />
                        )}
                        <span>{insight}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </>
      )}

      {!data && !forecast.isPending && (
        <motion.div variants={item}>
          <Card className="prism-card-shine border-border/50">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="h-16 w-16 rounded-2xl prism-gradient prism-glow flex items-center justify-center mb-4">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-display text-lg font-bold mb-1">Generate Your Cash Flow Forecast</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                Click "Generate Forecast" to analyze your transaction patterns and project your balance forward.
                Use the simulation controls to see the impact of spending changes.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Forecast;
