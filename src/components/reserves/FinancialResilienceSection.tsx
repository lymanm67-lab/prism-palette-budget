import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Droplets, LineChart, ShieldAlert } from 'lucide-react';
import { useReserves } from '@/hooks/use-reserves';
import { useBufferMonths, useBufferOneTime, useBufferSettings } from '@/hooks/use-zero-based';
import { useTravelTrips } from '@/hooks/use-travel-fund';
import { useWealthOSData } from '@/hooks/use-wealth-os';
import { useHouseholdDebts } from '@/hooks/use-household-debts';
import { rollBuffer } from '@/lib/budgeting/bufferLedger';
import { summarizeReserve } from '@/lib/reserves/emergencyFund';

const money2 = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/40 py-2 last:border-0">
      <div className="min-w-0">
        <p className="text-sm">{label}</p>
        {note && <p className="text-[11px] text-muted-foreground">{note}</p>}
      </div>
      <p className="shrink-0 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

/**
 * Financial Resilience — liquid protection on the left, long-term growth on the
 * right. The two sides are deliberately never summed into a single number.
 */
export function FinancialResilienceSection() {
  const { emergency, vehicle, funds, txns } = useReserves();
  const months = useBufferMonths();
  const oneTimes = useBufferOneTime();
  const { settings } = useBufferSettings();
  const { trips } = useTravelTrips();
  const { data: wealth } = useWealthOSData();
  const { data: debts } = useHouseholdDebts();

  const bufferBalance = useMemo(() => {
    const rolled = rollBuffer(
      (months.rows || []).map((m: any) => ({
        month: m.month,
        startingBalance: Number(m.starting_balance || 0),
        additions: Number(m.additions || 0),
        withdrawals: Number(m.withdrawals || 0),
        oneTimes: (oneTimes.rows || []).map((o: any) => ({
          id: o.id, label: o.label, amount: Number(o.amount || 0), dueDate: o.due_date,
        })),
      })),
      settings,
    );
    return rolled.length ? rolled[rolled.length - 1].endingBalance : 0;
  }, [months.rows, oneTimes.rows, settings]);

  const emSummary = useMemo(
    () => (emergency ? summarizeReserve(emergency, txns) : null),
    [emergency, txns],
  );
  const vehicleBalance = useMemo(
    () => (vehicle ? summarizeReserve(vehicle, txns).balance : 0),
    [vehicle, txns],
  );
  const investmentReserves = useMemo(
    () =>
      funds
        .filter((f) => f.liquidity_class === 'investment')
        .reduce((s, f) => s + (f.market_value > 0 ? f.market_value : summarizeReserve(f, txns).balance), 0),
    [funds, txns],
  );

  const vacationReserve = useMemo(
    () => (trips || []).reduce((s: number, t: any) => s + Number(t.saved_amount || 0), 0),
    [trips],
  );

  const emergencyCash = emSummary?.balance ?? 0;
  const totalLiquid = emergencyCash + bufferBalance + vehicleBalance + vacationReserve;

  const b = wealth?.buckets;
  const retirementAssets = (b?.retirement ?? 0) + (b?.hsa ?? 0);
  const investmentAssets = (b?.brokerage ?? 0) + investmentReserves;

  const debtObligations = useMemo(
    () => (debts || []).reduce((s: number, d: any) => s + Number(d.balance || 0), 0),
    [debts],
  );
  const monthlyDebtPayments = useMemo(
    () => (debts || []).reduce((s: number, d: any) => s + Number(d.minimum_payment || 0), 0),
    [debts],
  );

  const essentials = emergency?.essential_monthly_expenses ?? 0;
  const monthsCovered = essentials > 0 ? emergencyCash / essentials : null;
  const pctFunded = emSummary?.pctFunded ?? 0;

  return (
    <Card className="wos-page">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="h-4 w-4 text-prism-teal" /> Financial Resilience
        </CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          Money that protects the household today, kept visually separate from money invested for growth.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Emergency Fund percentage funded</p>
            <Badge variant="secondary">{Math.round(pctFunded * 100)}%</Badge>
          </div>
          <Progress value={pctFunded * 100} className="mt-2 h-2" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-prism-teal/40 bg-prism-teal/5 p-3">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Droplets className="h-4 w-4 text-prism-teal" /> Liquid reserves
            </p>
            <div className="mt-2">
              <Row label="SoFi Emergency Cash" value={money2(emergencyCash)} note="True unexpected events only" />
              <Row label="Monthly Buffer" value={money2(bufferBalance)} note="Current-month flexibility" />
              <Row label="Vehicle Maintenance Fund" value={money2(vehicleBalance)} note="Three paid-off vehicles" />
              <Row label="Vacation Fund" value={money2(vacationReserve)} note="Planned travel — never an emergency" />
              <Row label="Total liquid reserves" value={money2(totalLiquid)} />
              <Row
                label="Months of essential expenses covered"
                value={monthsCovered == null ? '—' : `${monthsCovered.toFixed(1)} mo`}
                note={essentials > 0 ? `Emergency cash only, at ${money2(essentials)}/mo` : 'Set essential expenses'}
              />
            </div>
          </div>

          <div className="rounded-lg border border-prism-amber/40 bg-prism-amber/5 p-3">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <LineChart className="h-4 w-4 text-prism-amber" /> Long-term growth &amp; obligations
            </p>
            <div className="mt-2">
              <Row label="Total investment assets" value={money2(investmentAssets)} note="Brokerage + SoFi Investments" />
              <Row label="Total retirement assets" value={money2(retirementAssets)} note="Retirement accounts + HSA" />
              <Row label="Current debt obligations" value={money2(debtObligations)} note="Total outstanding balances" />
              <Row label="Monthly debt payments" value={money2(monthlyDebtPayments)} note="Required minimums" />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Investments are never counted as liquid protection — market value can fall exactly when you
              need cash.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default FinancialResilienceSection;
