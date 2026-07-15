import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeftRight, TrendingUp, TrendingDown, Minus, Loader2, Plane, Building2, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { cn } from '@/lib/utils';
import CalculatorGuide from '@/components/CalculatorGuide';
import CalculatorScenariosAndPitfalls from '@/components/CalculatorScenariosAndPitfalls';

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'BRL', name: 'Brazilian Real', flag: '🇧🇷' },
  { code: 'MXN', name: 'Mexican Peso', flag: '🇲🇽' },
  { code: 'KRW', name: 'South Korean Won', flag: '🇰🇷' },
  { code: 'SGD', name: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'HKD', name: 'Hong Kong Dollar', flag: '🇭🇰' },
  { code: 'NOK', name: 'Norwegian Krone', flag: '🇳🇴' },
  { code: 'SEK', name: 'Swedish Krona', flag: '🇸🇪' },
  { code: 'DKK', name: 'Danish Krone', flag: '🇩🇰' },
  { code: 'NZD', name: 'New Zealand Dollar', flag: '🇳🇿' },
  { code: 'ZAR', name: 'South African Rand', flag: '🇿🇦' },
  { code: 'THB', name: 'Thai Baht', flag: '🇹🇭' },
  { code: 'PHP', name: 'Philippine Peso', flag: '🇵🇭' },
  { code: 'PLN', name: 'Polish Złoty', flag: '🇵🇱' },
  { code: 'CZK', name: 'Czech Koruna', flag: '🇨🇿' },
  { code: 'HUF', name: 'Hungarian Forint', flag: '🇭🇺' },
  { code: 'TRY', name: 'Turkish Lira', flag: '🇹🇷' },
  { code: 'IDR', name: 'Indonesian Rupiah', flag: '🇮🇩' },
  { code: 'MYR', name: 'Malaysian Ringgit', flag: '🇲🇾' },
  { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'TWD', name: 'Taiwan Dollar', flag: '🇹🇼' },
  { code: 'ILS', name: 'Israeli Shekel', flag: '🇮🇱' },
  { code: 'COP', name: 'Colombian Peso', flag: '🇨🇴' },
  { code: 'ARS', name: 'Argentine Peso', flag: '🇦🇷' },
  { code: 'CLP', name: 'Chilean Peso', flag: '🇨🇱' },
];

const BANK_MARKUP = 0.03; // 3% typical bank/card markup

export default function CurrencyExchangeCalculator() {
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [amount, setAmount] = useState('1000');
  const [travelBudget, setTravelBudget] = useState('');
  const [historyRange, setHistoryRange] = useState<'30D' | '90D' | '1Y'>('30D');
  const rangeDays = historyRange === '30D' ? 30 : historyRange === '90D' ? 90 : 365;

  // Fetch live rate
  const { data: rateData, isLoading: rateLoading, error: rateError } = useQuery({
    queryKey: ['exchange-rate', fromCurrency, toCurrency],
    queryFn: async () => {
      const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=${fromCurrency}&symbols=${toCurrency}`);
      if (!res.ok) throw new Error('Failed to fetch rate');
      const data = await res.json();
      return { rate: data.rates[toCurrency] as number, date: data.date as string };
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // Fetch history for the selected range
  const { data: historyData } = useQuery({
    queryKey: ['exchange-history', fromCurrency, toCurrency, rangeDays],
    queryFn: async () => {
      const end = new Date().toISOString().split('T')[0];
      const start = new Date(Date.now() - rangeDays * 86400000).toISOString().split('T')[0];
      const res = await fetch(`https://api.frankfurter.dev/v1/${start}..${end}?base=${fromCurrency}&symbols=${toCurrency}`);
      if (!res.ok) throw new Error('Failed to fetch history');
      const data = await res.json();
      return Object.entries(data.rates).map(([date, rates]: any) => ({
        date,
        rate: rates[toCurrency],
      }));
    },
    staleTime: 30 * 60 * 1000,
  });

  const swap = useCallback(() => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  }, [fromCurrency, toCurrency]);

  const midRate = rateData?.rate ?? 0;
  const bankRate = midRate * (1 - BANK_MARKUP);
  const parsedAmount = parseFloat(amount) || 0;
  const convertedMid = parsedAmount * midRate;
  const convertedBank = parsedAmount * bankRate;
  const savings = convertedMid - convertedBank;

  const parsedBudget = parseFloat(travelBudget) || 0;
  const budgetConverted = parsedBudget * midRate;

  // Trend indicator
  const trend = useMemo(() => {
    if (!historyData || historyData.length < 2) return null;
    const first = historyData[0].rate;
    const last = historyData[historyData.length - 1].rate;
    const change = ((last - first) / first) * 100;
    return { change, direction: change > 0.1 ? 'up' : change < -0.1 ? 'down' : 'flat' };
  }, [historyData]);

  const fromCur = CURRENCIES.find(c => c.code === fromCurrency);
  const toCur = CURRENCIES.find(c => c.code === toCurrency);

  const formatTo = (n: number) => {
    const decimals = ['JPY', 'KRW', 'HUF', 'CLP', 'IDR'].includes(toCurrency) ? 0 : 2;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: toCurrency, minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
  };

  const formatFrom = (n: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: fromCurrency, minimumFractionDigits: 2 }).format(n);
  };

  return (
    <div className="mt-6">
      <CalculatorGuide
        title="Currency Exchange Calculator"
        icon={ArrowLeftRight}
        iconColor="text-prism-sky"
        ttsScript="The Currency Exchange Calculator shows live mid-market rates for over 30 currencies. Enter the amount you want to convert, choose your source and target currencies, and instantly see the conversion. It also shows what a typical bank charges versus the mid-market rate, so you can see your potential savings. A 30-day trend chart helps you decide if now is a good time to exchange."
        instructions={[
          'Select your source currency (the currency you have)',
          'Select your target currency (the currency you need)',
          'Enter the amount to convert',
          'Compare mid-market rate vs bank rate to see potential savings',
          'Check the 30-day trend to time your exchange',
          'Optionally enter a travel budget to see your spending power abroad',
        ]}
      />
      <CalculatorScenariosAndPitfalls
        scenarios={[
          { title: 'Vacation Planning', description: 'Enter your total trip budget to see exactly how much spending money you\'ll have in local currency.' },
          { title: 'Sending Money Home', description: 'Compare the mid-market rate here with your remittance service to see how much you\'re really paying in fees.' },
          { title: 'Business Invoicing', description: 'Check if the rate is favorable before invoicing international clients in their local currency.' },
        ]}
        pitfalls={[
          { title: 'Airport Exchange', description: 'Airport kiosks typically charge 8-12% markup. Use a multi-currency card like Revolut or Wise instead.' },
          { title: 'Dynamic Currency Conversion', description: 'When paying abroad, always choose to pay in local currency — never let the merchant convert for you.' },
          { title: 'ATM Withdrawals', description: 'Some ATMs add their own markup on top of your bank\'s fees. Use ATMs from major banks.' },
        ]}
        tips={[
          { title: 'Watch the Trend', description: 'If the 30-day chart shows the rate trending in your favor, wait a few days before exchanging large amounts.' },
          { title: 'Use Multi-Currency Cards', description: 'Cards like Revolut, Wise, or Schwab offer near mid-market rates with minimal fees for travelers.' },
          { title: 'Lock Rates', description: 'Some services let you lock in a rate for future travel — useful if rates are currently favorable.' },
        ]}
      />

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        {/* Converter */}
        <Card className="prism-card-shine border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-prism-sky" />
              Convert Currency
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* From */}
            <div className="space-y-1.5">
              <Label className="text-xs">From</Label>
              <div className="flex gap-2">
                <Select value={fromCurrency} onValueChange={setFromCurrency}>
                  <SelectTrigger className="w-[180px] h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {CURRENCIES.map(c => (
                      <SelectItem key={c.code} value={c.code} disabled={c.code === toCurrency}>
                        {c.flag} {c.code} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="h-9 text-sm flex-1"
                  placeholder="Amount"
                />
              </div>
            </div>

            {/* Swap */}
            <div className="flex justify-center">
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={swap}>
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
            </div>

            {/* To */}
            <div className="space-y-1.5">
              <Label className="text-xs">To</Label>
              <Select value={toCurrency} onValueChange={setToCurrency}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {CURRENCIES.map(c => (
                    <SelectItem key={c.code} value={c.code} disabled={c.code === fromCurrency}>
                      {c.flag} {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Result */}
            {rateLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : rateError ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Failed to fetch rates. Try again shortly.
              </div>
            ) : (
              <div className="space-y-3">
                {/* Mid-market conversion */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Mid-Market Rate</p>
                  <p className="font-display text-3xl font-bold text-primary">{formatTo(convertedMid)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    1 {fromCurrency} = {midRate.toFixed(4)} {toCurrency}
                  </p>
                </div>

                {/* Bank comparison */}
                <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Typical bank/card rate (~3% markup)</p>
                      <p className="font-display text-lg font-bold">{formatTo(convertedBank)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">You'd lose</p>
                      <p className="text-sm font-bold text-prism-rose">{formatTo(savings)}</p>
                    </div>
                  </div>
                </div>

                {/* Trend */}
                {trend && (
                  <div className="flex items-center gap-2 text-sm">
                    {trend.direction === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-prism-teal" />
                    ) : trend.direction === 'down' ? (
                      <TrendingDown className="h-4 w-4 text-prism-rose" />
                    ) : (
                      <Minus className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={cn(
                      'font-medium',
                      trend.direction === 'up' ? 'text-prism-teal' : trend.direction === 'down' ? 'text-prism-rose' : 'text-muted-foreground'
                    )}>
                      {Math.abs(trend.change).toFixed(2)}% {trend.direction === 'up' ? 'stronger' : trend.direction === 'down' ? 'weaker' : 'stable'}
                    </span>
                    <span className="text-xs text-muted-foreground">over 30 days</span>
                  </div>
                )}
              </div>
            )}

            {/* Travel Budget */}
            <div className="pt-2 border-t border-border/40 space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5">
                <Plane className="h-3.5 w-3.5" /> Travel Budget (optional)
              </Label>
              <Input
                type="number"
                step="any"
                value={travelBudget}
                onChange={e => setTravelBudget(e.target.value)}
                placeholder={`Enter ${fromCurrency} budget`}
                className="h-9 text-sm"
              />
              {parsedBudget > 0 && midRate > 0 && (
                <p className="text-sm">
                  Your <span className="font-semibold">{formatFrom(parsedBudget)}</span> budget ={' '}
                  <span className="font-semibold text-primary">{formatTo(budgetConverted)}</span> spending power
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Rate trend chart */}
        <Card className="prism-card-shine border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-prism-lime" />
                Rate Trend
              </CardTitle>
              <div className="flex gap-1 rounded-lg border border-border/40 p-0.5 bg-muted/30">
                {(['30D', '90D', '1Y'] as const).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setHistoryRange(r)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors',
                      historyRange === r ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/60',
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{fromCur?.flag} {fromCurrency} → {toCur?.flag} {toCurrency}</p>
          </CardHeader>
          <CardContent>
            {historyData && historyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={historyData}>
                  <defs>
                    <linearGradient id="rateGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v: number) => v.toFixed(2)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                    }}
                    labelFormatter={(d: string) => new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    formatter={(v: number) => [v.toFixed(4), `${fromCurrency}/${toCurrency}`]}
                  />
                  <Area type="monotone" dataKey="rate" stroke="hsl(var(--primary))" fill="url(#rateGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px]">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Quick reference rates */}
            {midRate > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-4">
                {[100, 500, 1000].map(amt => (
                  <div key={amt} className="p-2 rounded-lg bg-muted/40 border border-border/40 text-center">
                    <p className="text-[10px] text-muted-foreground">{formatFrom(amt)}</p>
                    <p className="text-sm font-bold">{formatTo(amt * midRate)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
