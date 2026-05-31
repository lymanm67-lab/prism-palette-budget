import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Heart, AlertTriangle, ShieldCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { InvestmentPlan } from '@/hooks/use-investment-plan';
import { runProjection, formatCurrencyFull } from '@/lib/investment/projection';

type Method = 'total' | 'surplus' | 'percent';

interface Props { plan: InvestmentPlan | null }

const LEGACY_AGE = 85;
const PCT_PRESETS = [10, 25, 50, 75, 100];

function projectToAge(plan: InvestmentPlan, returnPct: number, toAge: number): number {
  const projection = runProjection({
    currentAge: plan.current_age!,
    retirementAge: plan.retirement_age!,
    currentBalance: plan.current_balance,
    targetAmount: plan.target_amount,
    monthlyEmployeeContribution: plan.monthly_employee_contribution,
    monthlyEmployerContribution: plan.monthly_employer_contribution,
    expectedReturnPct: returnPct,
    employerMatchPct: plan.employer_match_pct ?? undefined,
    annualRaisePct: plan.annual_raise_pct,
    raiseRedirectPct: plan.raise_redirect_pct,
    currentMonthlyIncome: plan.current_monthly_income ?? undefined,
    debtPaymentAmount: plan.debt_payment_amount ?? undefined,
    debtPayoffDate: plan.debt_payoff_date,
    additionalMonthlyAmount: plan.additional_monthly_amount ?? undefined,
    additionalStartDate: plan.additional_start_date,
    ssMonthlyEstimate: plan.ss_monthly_estimate ?? undefined,
    ssClaimingAge: plan.ss_claiming_age ?? undefined,
    ssInvestWhileWorking: plan.ss_invest_while_working,
    ssInvestPct: plan.ss_invest_pct,
    hsaBalance: plan.hsa_balance,
    hsaMonthlyContribution: plan.hsa_monthly_contribution,
    hsaEmployerContribution: plan.hsa_employer_contribution,
    hsaInvested: plan.hsa_invested,
    hsaReturnPct: plan.hsa_return_pct,
    useFutureDollars: true, // legacy always in future dollars
    inflationPct: plan.inflation_pct,
  });

  // Grow projected balance from retirement age to legacy age (no further contributions).
  const extraYears = Math.max(0, toAge - (plan.retirement_age || 0));
  const grown = projection.projectedBalance * Math.pow(1 + returnPct / 100, extraYears);
  return grown;
}

export function LegacyProtectionCard({ plan }: Props) {
  const planId = plan?.id ?? 'no-plan';
  const storageKey = `legacy_protection_${planId}`;

  const [method, setMethod] = useState<Method>('total');
  const [percent, setPercent] = useState<number>(25);
  const [customPct, setCustomPct] = useState<string>('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.method) setMethod(parsed.method);
        if (typeof parsed.percent === 'number') setPercent(parsed.percent);
      }
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify({ method, percent })); } catch {}
  }, [storageKey, method, percent]);

  const projections = useMemo(() => {
    if (!plan || !plan.current_age || !plan.retirement_age) return null;
    const at7 = projectToAge(plan, 7, LEGACY_AGE);
    const at8 = projectToAge(plan, 8, LEGACY_AGE);
    const goal = plan.target_amount || 0;
    return {
      at7,
      at8,
      surplus7: at7 - goal,
      surplus8: at8 - goal,
      goal,
    };
  }, [plan]);

  if (!plan || !projections) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Legacy Protection</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Complete the setup wizard to see legacy protection projections.
        </CardContent>
      </Card>
    );
  }

  const { at7, at8, surplus7, surplus8, goal } = projections;

  const effectivePct = customPct ? Math.max(0, Math.min(100, Number(customPct) || 0)) : percent;

  // Compute displayed legacy value(s) per method
  let legacyLabel = '';
  let legacy7 = 0;
  let legacy8 = 0;
  if (method === 'total') {
    legacyLabel = 'Total projected legacy assets';
    legacy7 = at7;
    legacy8 = at8;
  } else if (method === 'surplus') {
    legacyLabel = `Surplus above ${formatCurrencyFull(goal)} goal`;
    legacy7 = Math.max(0, surplus7);
    legacy8 = Math.max(0, surplus8);
  } else {
    legacyLabel = `${effectivePct}% of projected assets`;
    legacy7 = at7 * (effectivePct / 100);
    legacy8 = at8 * (effectivePct / 100);
  }

  const isZero = legacy7 <= 0 && legacy8 <= 0;
  const hasAssets = at7 > 0 || at8 > 0;
  const shortfall = method === 'surplus' && (surplus7 < 0 || surplus8 < 0);

  const chartData = [
    { name: '7% Total', value: Math.round(at7), fill: 'hsl(var(--primary))' },
    { name: '7% Surplus', value: Math.round(Math.max(0, surplus7)), fill: 'hsl(var(--chart-2, var(--primary)))' },
    { name: '8% Total', value: Math.round(at8), fill: 'hsl(var(--primary))' },
    { name: '8% Surplus', value: Math.round(Math.max(0, surplus8)), fill: 'hsl(var(--chart-2, var(--primary)))' },
  ];

  return (
    <Card className="bg-gradient-to-br from-card to-muted/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-500" />
            <CardTitle className="text-lg">Legacy Protection</CardTitle>
          </div>
          {isZero ? (
            <Badge variant="outline" className="bg-amber-500/15 text-amber-500 border-amber-500/30">
              Needs Attention
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
              <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Protected
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Plan summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="space-y-0.5">
            <p className="text-muted-foreground text-xs">Legacy goal</p>
            <p className="font-medium">Montgomery Legacy Trust</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-muted-foreground text-xs">Funding source</p>
            <p className="font-medium">Primary user's retirement assets</p>
          </div>
        </div>

        {/* Method toggle */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Calculation method</Label>
          <ToggleGroup
            type="single"
            value={method}
            onValueChange={(v) => v && setMethod(v as Method)}
            className="justify-start flex-wrap"
          >
            <ToggleGroupItem value="total" size="sm">Total projected</ToggleGroupItem>
            <ToggleGroupItem value="surplus" size="sm">Surplus above goal</ToggleGroupItem>
            <ToggleGroupItem value="percent" size="sm">% of assets</ToggleGroupItem>
          </ToggleGroup>

          {method === 'percent' && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {PCT_PRESETS.map((p) => (
                <Button
                  key={p}
                  type="button"
                  size="sm"
                  variant={!customPct && percent === p ? 'default' : 'outline'}
                  onClick={() => { setCustomPct(''); setPercent(p); }}
                >
                  {p}%
                </Button>
              ))}
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="Custom %"
                value={customPct}
                onChange={(e) => setCustomPct(e.target.value)}
                className="w-28 h-9"
              />
            </div>
          )}
        </div>

        {/* Result rows */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-border/50 p-3 bg-background/40">
            <p className="text-xs text-muted-foreground">{legacyLabel} @ 7%</p>
            <p className="text-2xl font-semibold tabular-nums mt-1">{formatCurrencyFull(legacy7)}</p>
          </div>
          <div className="rounded-lg border border-border/50 p-3 bg-background/40">
            <p className="text-xs text-muted-foreground">{legacyLabel} @ 8%</p>
            <p className="text-2xl font-semibold tabular-nums mt-1">{formatCurrencyFull(legacy8)}</p>
          </div>
        </div>

        {/* Always-on context: both totals + surplus */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="rounded-md bg-muted/40 p-2">
            <p className="text-muted-foreground">Total @ 7%</p>
            <p className="font-medium tabular-nums">{formatCurrencyFull(at7)}</p>
          </div>
          <div className="rounded-md bg-muted/40 p-2">
            <p className="text-muted-foreground">Total @ 8%</p>
            <p className="font-medium tabular-nums">{formatCurrencyFull(at8)}</p>
          </div>
          <div className="rounded-md bg-muted/40 p-2">
            <p className="text-muted-foreground">Surplus @ 7%</p>
            <p className="font-medium tabular-nums">{formatCurrencyFull(Math.max(0, surplus7))}</p>
          </div>
          <div className="rounded-md bg-muted/40 p-2">
            <p className="text-muted-foreground">Surplus @ 8%</p>
            <p className="font-medium tabular-nums">{formatCurrencyFull(Math.max(0, surplus8))}</p>
          </div>
        </div>

        {/* Warnings */}
        {isZero && hasAssets && (
          <div className="flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>
                You have projected retirement assets, but legacy protection is showing $0.
                Switch to <strong>Total projected</strong> or set a percentage to tag your
                primary retirement assets as Legacy Funding Assets.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => setMethod('total')}>
                  Use total projected
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setMethod('percent'); setPercent(25); setCustomPct(''); }}>
                  Use percentage
                </Button>
              </div>
            </div>
          </div>
        )}

        {shortfall && (
          <div className="flex gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
            <p>
              Projected assets fall short of the {formatCurrencyFull(goal)} goal in at least one scenario.
              Surplus shown as $0 where projection is below goal.
            </p>
          </div>
        )}

        {/* Chart */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Legacy Protection by Scenario</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number) => formatCurrencyFull(v)}
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Explanations */}
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>
            <strong className="text-foreground">What this means:</strong> Legacy Protection represents
            the projected assets designated to support your family legacy, trust funding, charitable
            giving, or estate transfer goals. For this plan, Legacy Protection is based on the primary
            user's projected retirement assets and invested Social Security. Spouse pension income is
            treated as household income protection and is not counted as a legacy asset.
          </p>
          <p>
            <strong className="text-foreground">Montgomery plan:</strong> Your wife's OPERS pension
            protects household income. Your retirement assets build the Montgomery Legacy Trust.
            Because your spouse's OPERS pension is income and not a liquid investment asset, it is
            excluded from Legacy Protection.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
