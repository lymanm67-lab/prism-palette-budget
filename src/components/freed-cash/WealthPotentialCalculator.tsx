import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as ReTooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { wealthProjection } from '@/lib/freed-cash/reality';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

interface Props {
  /** Freed cash currently being redirected, used as the starting monthly amount. */
  defaultMonthly: number;
}

/** Wealth Potential From Freed Cash — a projection, never a promise. */
export function WealthPotentialCalculator({ defaultMonthly }: Props) {
  const [monthly, setMonthly] = useState(Math.round(defaultMonthly || 0));
  const [years, setYears] = useState(25);
  const [annualReturn, setAnnualReturn] = useState(8);
  const [annualIncrease, setAnnualIncrease] = useState(2);
  const [includeDebtPayoffs, setIncludeDebtPayoffs] = useState(false);
  const [debtPayoffMonthly, setDebtPayoffMonthly] = useState(500);
  const [includeRaises, setIncludeRaises] = useState(false);
  const [raiseMonthly, setRaiseMonthly] = useState(150);
  const [includeTaxRefunds, setIncludeTaxRefunds] = useState(false);
  const [taxRefundAnnual, setTaxRefundAnnual] = useState(1500);

  const result = useMemo(
    () =>
      wealthProjection({
        monthly,
        years,
        annualReturn,
        annualIncrease,
        includeDebtPayoffs,
        debtPayoffMonthly,
        includeRaises,
        raiseMonthly,
        includeTaxRefunds,
        taxRefundAnnual,
      }),
    [
      monthly,
      years,
      annualReturn,
      annualIncrease,
      includeDebtPayoffs,
      debtPayoffMonthly,
      includeRaises,
      raiseMonthly,
      includeTaxRefunds,
      taxRefundAnnual,
    ],
  );

  const num = (v: string) => Math.max(0, Number(v) || 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Wealth potential from freed cash</CardTitle>
        <CardDescription>
          What the money you stopped spending could become if it is invested instead. A projection based on your
          assumptions — not a guaranteed outcome.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Monthly amount redirected</Label>
            <Input type="number" value={monthly} onChange={(e) => setMonthly(num(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Years</Label>
            <Input type="number" value={years} onChange={(e) => setYears(num(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Expected return (%)</Label>
            <Input type="number" value={annualReturn} onChange={(e) => setAnnualReturn(num(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Annual increase (%)</Label>
            <Input type="number" value={annualIncrease} onChange={(e) => setAnnualIncrease(num(e.target.value))} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <ToggleRow
            label="Include future debt payoffs"
            checked={includeDebtPayoffs}
            onChange={setIncludeDebtPayoffs}
            value={debtPayoffMonthly}
            onValue={setDebtPayoffMonthly}
            unit="/mo"
          />
          <ToggleRow
            label="Include future pay raises"
            checked={includeRaises}
            onChange={setIncludeRaises}
            value={raiseMonthly}
            onValue={setRaiseMonthly}
            unit="/mo"
          />
          <ToggleRow
            label="Include tax refund redirects"
            checked={includeTaxRefunds}
            onChange={setIncludeTaxRefunds}
            value={taxRefundAnnual}
            onValue={setTaxRefundAnnual}
            unit="/yr"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Total contributions</p>
            <p className="text-xl font-semibold">{money(result.contributions)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Investment growth</p>
            <p className="text-xl font-semibold text-emerald-600">{money(result.growth)}</p>
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/10 p-3">
            <p className="text-xs text-muted-foreground">Ending balance</p>
            <p className="text-xl font-bold">{money(result.ending)}</p>
            <p className="text-[11px] text-muted-foreground">
              From {money(result.monthlyStart)}/mo rising to {money(result.monthlyEnd)}/mo
            </p>
          </div>
        </div>

        {result.points.length > 1 && (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={result.points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} tickFormatter={(v) => `Yr ${v}`} />
                <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={(v) => money(Number(v))} />
                <ReTooltip formatter={(v: number) => money(Number(v))} labelFormatter={(l) => `Year ${l}`} />
                <Area
                  type="monotone"
                  dataKey="balance"
                  name="Balance"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary) / 0.2)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="contributions"
                  name="Contributions"
                  stroke="hsl(var(--muted-foreground))"
                  fill="hsl(var(--muted-foreground) / 0.12)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Wealth created from cost cutting: {money(result.growth)} of growth on {money(result.contributions)} of
          freed cash. Returns are assumed, not guaranteed, and taxes and fees are not modelled.
        </p>
      </CardContent>
    </Card>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  value,
  onValue,
  unit,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  value: number;
  onValue: (v: number) => void;
  unit: string;
}) {
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs leading-tight">{label}</Label>
        <Switch checked={checked} onCheckedChange={onChange} />
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          value={value}
          disabled={!checked}
          onChange={(e) => onValue(Math.max(0, Number(e.target.value) || 0))}
          className="h-8"
        />
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}
