import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MhStat, MhNumberField } from '@/components/medical-housing/MhFields';
import { useThvOperating, useUpdateThvOperating } from '@/hooks/use-tiny-home-village';
import {
  OPERATING_EXPENSE_FIELDS,
  OPERATING_INCOME_FIELDS,
  computeOperating,
  money,
} from '@/lib/legacy/tinyHomeVillage';

export default function VillageOperatingTab() {
  const { data: op } = useThvOperating();
  const update = useUpdateThvOperating();

  if (!op) return <p className="text-sm text-muted-foreground">Loading operating budget…</p>;

  const expenses: Record<string, number> = op.expenses ?? {};
  const income: Record<string, number> = op.income ?? {};
  const t = computeOperating(expenses, income, op.homes_count, op.residents_count, op.reserve_months);

  const setExpense = (k: string, v: number) => update.mutate({ expenses: { ...expenses, [k]: v } });
  const setIncome = (k: string, v: number) => update.mutate({ income: { ...income, [k]: v } });

  return (
    <div className="space-y-5">
      <Card className="border-border/60 bg-muted/20">
        <CardContent className="p-4 text-xs text-muted-foreground">
          Enter all figures as <strong>monthly</strong> amounts. Annual totals, cost per home, cost per resident, the
          annual funding gap, and the required operating reserve are calculated automatically.
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MhStat label="Monthly operating cost" value={money(t.monthlyExpense)} />
        <MhStat label="Annual operating cost" value={money(t.annualExpense)} tone="warn" />
        <MhStat label="Cost per home (annual)" value={money(t.costPerHome)} />
        <MhStat label="Cost per resident (annual)" value={money(t.costPerResident)} />
        <MhStat label="Annual income" value={money(t.annualIncome)} tone="good" />
        <MhStat
          label="Annual funding gap"
          value={money(t.fundingGap)}
          tone={t.fundingGap > 0 ? 'bad' : 'good'}
        />
        <MhStat label="Required operating reserve" value={money(t.requiredReserve)} hint={`${op.reserve_months} months`} />
        <MhStat label="Homes / residents" value={`${op.homes_count} / ${op.residents_count}`} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Village scale and reserve policy</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <MhNumberField label="Number of homes" value={op.homes_count} onCommit={(v) => update.mutate({ homes_count: v })} />
          <MhNumberField label="Number of residents" value={op.residents_count} onCommit={(v) => update.mutate({ residents_count: v })} />
          <MhNumberField label="Reserve target (months)" value={op.reserve_months} onCommit={(v) => update.mutate({ reserve_months: v })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Monthly operating expenses</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {OPERATING_EXPENSE_FIELDS.map((f) => (
            <MhNumberField
              key={f.key}
              label={f.label}
              value={expenses[f.key] ?? 0}
              onCommit={(v) => setExpense(f.key, v)}
              suffix="$"
              step={25}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Monthly operating income</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {OPERATING_INCOME_FIELDS.map((f) => (
            <MhNumberField
              key={f.key}
              label={f.label}
              value={income[f.key] ?? 0}
              onCommit={(v) => setIncome(f.key, v)}
              suffix="$"
              step={25}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
