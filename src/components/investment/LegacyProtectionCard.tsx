import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Heart, AlertTriangle, ShieldCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { InvestmentPlan, useUpsertInvestmentPlan } from '@/hooks/use-investment-plan';
import { runProjection, formatCurrencyFull, ProjectionResult } from '@/lib/investment/projection';
import { useAssetTags, AssetKey } from '@/hooks/use-asset-tags';

type Method = 'total' | 'surplus' | 'percent';

interface Props { plan: InvestmentPlan | null }

const LEGACY_AGE = 85;
const PCT_PRESETS = [10, 25, 50, 75, 100];

function project(plan: InvestmentPlan, returnPct: number): ProjectionResult {
  return runProjection({
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
    useFutureDollars: true,
    inflationPct: plan.inflation_pct,
  });
}

/**
 * Break the final projected balance into a value per asset_key by distributing growth
 * proportional to contributions, then growing each bucket from retirement age to 85.
 */
function bucketValuesAt85(plan: InvestmentPlan, returnPct: number): Record<AssetKey, number> {
  const proj = project(plan, returnPct);
  const last = proj.yearly[proj.yearly.length - 1];
  const growYears = Math.max(0, LEGACY_AGE - (plan.retirement_age || 0));
  const growth = Math.pow(1 + returnPct / 100, growYears);

  const contribs = last.cumStarting + last.cumEmployee + last.cumEmployer
    + last.cumRaiseRedirect + last.cumDebtRedirect + last.cumAdditional + last.cumSocialSecurity;
  const cumGrowth = Math.max(0, last.balance - contribs);

  const allocate = (cum: number) =>
    (cum + (contribs > 0 ? cumGrowth * (cum / contribs) : 0)) * growth;

  return {
    primary_balance: allocate(last.cumStarting),
    employee_contrib: allocate(last.cumEmployee),
    employer_contrib: allocate(last.cumEmployer),
    raise_redirect: allocate(last.cumRaiseRedirect),
    debt_redirect: allocate(last.cumDebtRedirect),
    additional_contrib: allocate(last.cumAdditional),
    invested_ss: allocate(last.cumSocialSecurity),
    hsa: last.hsaBalance * growth,
    spouse_pension: 0, // income stream — not a liquid asset
    spouse_opers_value: plan.spouse_pension_account_value ?? 0,
    spouse_deferred_comp: plan.spouse_deferred_comp_value ?? 0,
  };
}

export function LegacyProtectionCard({ plan }: Props) {
  const upsert = useUpsertInvestmentPlan();
  const { data: tags = [] } = useAssetTags(plan?.id);

  const projections = useMemo(() => {
    if (!plan || !plan.current_age || !plan.retirement_age) return null;
    const buckets7 = bucketValuesAt85(plan, 7);
    const buckets8 = bucketValuesAt85(plan, 8);
    const total7 = Object.values(buckets7).reduce((s, v) => s + v, 0);
    const total8 = Object.values(buckets8).reduce((s, v) => s + v, 0);
    const goal = plan.target_amount || 0;
    return { buckets7, buckets8, total7, total8, surplus7: total7 - goal, surplus8: total8 - goal, goal };
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

  const method: Method = (plan.legacy_calculation_method as Method) || 'total';
  const percent = plan.legacy_percentage ?? 25;
  const goalName = plan.legacy_goal_name || 'Legacy Trust';

  const setMethod = (m: Method) => upsert.mutate({ id: plan.id, legacy_calculation_method: m } as any);
  const setPercent = (p: number) => upsert.mutate({ id: plan.id, legacy_percentage: p } as any);

  const { buckets7, buckets8, total7, total8, surplus7, surplus8, goal } = projections;

  // Sum included assets per tag toggle
  const includedKeys = new Set(tags.filter((t) => t.include_in_legacy).map((t) => t.asset_key));
  const sumIncluded = (b: Record<AssetKey, number>) =>
    Array.from(includedKeys).reduce((s, k) => s + (b[k as AssetKey] || 0), 0);
  const tagged7 = sumIncluded(buckets7);
  const tagged8 = sumIncluded(buckets8);

  let legacyLabel = '';
  let legacy7 = 0;
  let legacy8 = 0;
  if (method === 'total') {
    legacyLabel = 'Tagged legacy assets';
    legacy7 = tagged7;
    legacy8 = tagged8;
  } else if (method === 'surplus') {
    legacyLabel = `Surplus above ${formatCurrencyFull(goal)} goal`;
    legacy7 = Math.max(0, surplus7);
    legacy8 = Math.max(0, surplus8);
  } else {
    legacyLabel = `${percent}% of projected assets`;
    legacy7 = total7 * (percent / 100);
    legacy8 = total8 * (percent / 100);
  }

  const isZero = legacy7 <= 0 && legacy8 <= 0;
  const hasAssets = total7 > 0 || total8 > 0;
  const noTags = tags.length === 0 || includedKeys.size === 0;
  const shortfall = method === 'surplus' && (surplus7 < 0 || surplus8 < 0);

  const chartData = [
    { name: '7% Total', value: Math.round(total7), fill: 'hsl(var(--primary))' },
    { name: '7% Surplus', value: Math.round(Math.max(0, surplus7)), fill: 'hsl(var(--chart-2, var(--primary)))' },
    { name: '8% Total', value: Math.round(total8), fill: 'hsl(var(--primary))' },
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Legacy goal</p>
            <p className="font-medium">{goalName}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Funding source</p>
            <p className="font-medium">Primary user's retirement assets</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Method</p>
            <p className="font-medium capitalize">{method === 'total' ? 'Projected legacy assets' : method === 'surplus' ? 'Surplus above goal' : `${percent}% of assets`}</p>
          </div>
        </div>

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
                  size="sm"
                  variant={percent === p ? 'default' : 'outline'}
                  onClick={() => setPercent(p)}
                >
                  {p}%
                </Button>
              ))}
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="Custom"
                value={PCT_PRESETS.includes(percent) ? '' : String(percent)}
                onChange={(e) => {
                  const n = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                  setPercent(n);
                }}
                className="w-28 h-9"
              />
            </div>
          )}
        </div>

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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="rounded-md bg-muted/40 p-2">
            <p className="text-muted-foreground">Total @ 7%</p>
            <p className="font-medium tabular-nums">{formatCurrencyFull(total7)}</p>
          </div>
          <div className="rounded-md bg-muted/40 p-2">
            <p className="text-muted-foreground">Total @ 8%</p>
            <p className="font-medium tabular-nums">{formatCurrencyFull(total8)}</p>
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

        {isZero && hasAssets && (
          <div className="flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>
                {noTags
                  ? 'Legacy Protection is showing $0 because no assets have been tagged as legacy funding assets. Tag retirement assets, invested Social Security, or projected surplus as legacy funding assets to calculate legacy protection.'
                  : 'You have projected retirement assets, but no assets are tagged for legacy. Use the Asset Tags panel below to mark assets "In Legacy", or pick a different calculation method.'}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => setMethod('total')}>
                  Use tagged total
                </Button>
                <Button size="sm" variant="outline" onClick={() => setMethod('surplus')}>
                  Use surplus only
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setMethod('percent'); setPercent(25); }}>
                  Use 25%
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
