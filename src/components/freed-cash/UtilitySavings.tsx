import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Zap } from 'lucide-react';
import {
  CLEARVIEW,
  UTILITY_REDIRECT_DESTINATIONS,
  clearviewBenchmark,
  billSavings,
  monthsEarlier,
  rollupUtilitySavings,
  utilityDestinationLabel,
} from '@/lib/freed-cash/utility';
import {
  useUtilityBills,
  useSaveUtilityBill,
  useDeleteUtilityBill,
  useSaveRedirect,
  type FreedCashSource,
  type FreedCashRedirect,
} from '@/hooks/use-freed-cash';
import { useReserves } from '@/hooks/use-reserves';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

interface Props {
  sources: FreedCashSource[];
  redirects: FreedCashRedirect[];
}

const emptyBill = {
  billing_month: new Date().toISOString().slice(0, 7) + '-01',
  kwh_used: 0,
  supplier: CLEARVIEW.currentSupplier,
  rate_per_kwh: Number(CLEARVIEW.currentRatePerKwh.toFixed(5)),
  actual_cost: 0,
  benchmark_cost: 0,
  notes: '',
};

export function UtilitySavings({ sources, redirects }: Props) {
  const { data: bills } = useUtilityBills();
  const saveBill = useSaveUtilityBill();
  const deleteBill = useDeleteUtilityBill();
  const saveRedirect = useSaveRedirect();
  const { emergency } = useReserves();

  const [draft, setDraft] = useState({ ...emptyBill });
  const [pendingDestination, setPendingDestination] = useState<string | null>(null);

  const source = useMemo(
    () =>
      sources.find(
        (s) =>
          (s.vendor ?? '').toLowerCase().includes(CLEARVIEW.vendorMatch) ||
          s.name.toLowerCase().includes(CLEARVIEW.vendorMatch),
      ) ?? null,
    [sources],
  );

  const redirect = useMemo(
    () => redirects.find((r) => source && r.source_id === source.id) ?? null,
    [redirects, source],
  );

  const rollup = useMemo(() => rollupUtilitySavings(bills ?? []), [bills]);

  const emergencyBalance = emergency?.market_value ?? 0;
  const baseMonthly = emergency?.monthly_contribution ?? 0;
  const extra = rollup.planningMonthlySavings;

  const to2000 = monthsEarlier(2000, emergencyBalance, baseMonthly, extra);
  const to5000 = monthsEarlier(5000, emergencyBalance, baseMonthly, extra);

  function onKwhChange(kwh: number) {
    setDraft((d) => ({
      ...d,
      kwh_used: kwh,
      benchmark_cost: Number(clearviewBenchmark(kwh).toFixed(2)),
      actual_cost: d.rate_per_kwh ? Number((kwh * d.rate_per_kwh).toFixed(2)) : d.actual_cost,
    }));
  }

  function submitBill() {
    if (!draft.kwh_used || !draft.billing_month) return;
    saveBill.mutate(
      {
        ...draft,
        utility_type: 'electricity',
        source_id: source?.id ?? null,
        benchmark_cost: draft.benchmark_cost || Number(clearviewBenchmark(draft.kwh_used).toFixed(2)),
      },
      { onSuccess: () => setDraft({ ...emptyBill }) },
    );
  }

  function confirmDestination() {
    if (!pendingDestination || !redirect) return;
    const label = UTILITY_REDIRECT_DESTINATIONS.find((d) => d.value === pendingDestination)?.label ?? null;
    const type = pendingDestination.startsWith('goal:') ? 'goal' : pendingDestination;
    saveRedirect.mutate({
      id: redirect.id,
      destination_type: type,
      destination_label: label,
      monthly_amount: Number(extra.toFixed(2)),
    });
    setPendingDestination(null);
  }

  const verdictBadge =
    rollup.verdict === 'above'
      ? { text: 'Above projection', cls: 'bg-emerald-500/15 text-emerald-600' }
      : rollup.verdict === 'below'
        ? { text: 'Below projection', cls: 'bg-amber-500/15 text-amber-600' }
        : rollup.verdict === 'near'
          ? { text: 'Near projection', cls: 'bg-primary/15 text-primary' }
          : { text: 'Awaiting bills', cls: 'bg-muted text-muted-foreground' };

  const floorReached = emergencyBalance >= 2000;

  return (
    <div className="space-y-4">
      {/* Dashboard card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-primary" />
              Clearview Cancellation Savings
            </CardTitle>
            <Badge className="bg-emerald-500/15 text-emerald-600">Strong Recurring Savings</Badge>
          </div>
          <CardDescription>
            Utility reduction → freed cash. This is an expense reduction, not new income, salary or take-home pay.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Former supplier" value={CLEARVIEW.formerSupplier} />
          <Stat label="Current supplier" value={CLEARVIEW.currentSupplier} />
          <Stat label="Cancellation fee" value={money(CLEARVIEW.cancellationFee)} />
          <Stat label="Average usage" value={`${CLEARVIEW.avgKwh} kWh/mo`} />
          <Stat
            label="Estimated recurring monthly savings"
            value={money(CLEARVIEW.estimatedMonthlySavings)}
            hint={`${money(CLEARVIEW.formerMonthlyCost)} → ${money(CLEARVIEW.newMonthlyCost)}`}
          />
          <Stat label="Annualized estimated savings" value={money(CLEARVIEW.estimatedAnnualSavings)} />
          <Stat label="Actual YTD savings" value={money(rollup.ytdSavings)} />
          <Stat label="Lifetime savings since cancellation" value={money(rollup.lifetimeSavings)} />
          <Stat
            label="Current redirect destination"
            value={
              redirect
                ? utilityDestinationLabel(redirect.destination_type, redirect.destination_label)
                : 'Not set'
            }
            hint={redirect ? `${money(Number(redirect.monthly_amount))}/mo · ${redirect.status}` : undefined}
          />
          <Stat
            label="Planning amount in use"
            value={`${money(rollup.planningMonthlySavings)}/mo`}
            hint={rollup.planningBasis === 'verified' ? 'Verified rolling average' : 'Estimate (until 3 bills)'}
          />
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-4 text-sm font-medium">
          A lower bill only becomes financial progress when the savings are captured and redirected.
        </CardContent>
      </Card>

      {/* Recent bill example */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recent bill example</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-4">
          <Stat label="Recent usage" value={`${CLEARVIEW.recentBill.kwh} kWh`} />
          <Stat label="Clearview charge" value={money(CLEARVIEW.recentBill.clearviewCharge)} />
          <Stat label="Ohio Edison at comparison rate" value={money(CLEARVIEW.recentBill.ohioEdisonEstimate)} />
          <Stat label="Savings on that bill" value={money(CLEARVIEW.recentBill.savings)} />
        </CardContent>
      </Card>

      {/* Projected vs realized */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm">Projected vs realized savings</CardTitle>
            <Badge className={verdictBadge.cls}>{verdictBadge.text}</Badge>
          </div>
          <CardDescription>
            Electricity varies with usage and supply rates, so ${CLEARVIEW.estimatedMonthlySavings} is an estimate —
            never locked as realized.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <Stat label="Projected monthly savings" value={money(CLEARVIEW.estimatedMonthlySavings)} />
          <Stat
            label="Current month actual"
            value={rollup.currentMonthSavings === null ? '—' : money(rollup.currentMonthSavings)}
          />
          <Stat label="3-month average" value={rollup.avg3 === null ? '—' : money(rollup.avg3)} />
          <Stat label="6-month average" value={rollup.avg6 === null ? '—' : money(rollup.avg6)} />
          <Stat label="12-month average" value={rollup.avg12 === null ? '—' : money(rollup.avg12)} />
          <Stat
            label="Verified average monthly savings"
            value={rollup.verifiedMonthlyAverage === null ? 'Needs 3 bills' : money(rollup.verifiedMonthlyAverage)}
            hint={`${rollup.monthsTracked} bill(s) entered`}
          />
          <Stat
            label="Verified annual savings"
            value={rollup.verifiedAnnualSavings === null ? 'Needs 12 bills' : money(rollup.verifiedAnnualSavings)}
          />
          <Stat
            label="Variance vs projection"
            value={rollup.variance === null ? '—' : `${rollup.variance >= 0 ? '+' : ''}${money(rollup.variance)}`}
          />
        </CardContent>
      </Card>

      {/* Bill entry */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Enter an electric bill</CardTitle>
          <CardDescription>
            Actual monthly savings = estimated Clearview benchmark cost − actual current supplier cost.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Billing month">
              <Input
                type="month"
                value={draft.billing_month.slice(0, 7)}
                onChange={(e) => setDraft((d) => ({ ...d, billing_month: `${e.target.value}-01` }))}
              />
            </Field>
            <Field label="kWh used">
              <Input
                type="number"
                value={draft.kwh_used || ''}
                onChange={(e) => onKwhChange(Number(e.target.value))}
              />
            </Field>
            <Field label="Current utility supplier">
              <Input
                value={draft.supplier}
                onChange={(e) => setDraft((d) => ({ ...d, supplier: e.target.value }))}
              />
            </Field>
            <Field label="Current rate per kWh">
              <Input
                type="number"
                step="0.00001"
                value={draft.rate_per_kwh || ''}
                onChange={(e) => {
                  const rate = Number(e.target.value);
                  setDraft((d) => ({
                    ...d,
                    rate_per_kwh: rate,
                    actual_cost: d.kwh_used ? Number((d.kwh_used * rate).toFixed(2)) : d.actual_cost,
                  }));
                }}
              />
            </Field>
            <Field label="Actual electricity supply cost">
              <Input
                type="number"
                step="0.01"
                value={draft.actual_cost || ''}
                onChange={(e) => setDraft((d) => ({ ...d, actual_cost: Number(e.target.value) }))}
              />
            </Field>
            <Field label="Previous Clearview benchmark cost">
              <Input
                type="number"
                step="0.01"
                value={draft.benchmark_cost || ''}
                onChange={(e) => setDraft((d) => ({ ...d, benchmark_cost: Number(e.target.value) }))}
              />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea
              rows={2}
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            />
          </Field>
          <div className="flex items-center gap-3">
            <Button onClick={submitBill} disabled={saveBill.isPending || !draft.kwh_used}>
              Save bill
            </Button>
            <span className="text-sm text-muted-foreground">
              Actual monthly savings:{' '}
              <strong className="text-foreground">
                {money((draft.benchmark_cost || 0) - (draft.actual_cost || 0))}
              </strong>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Bill history */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Billing history</CardTitle>
        </CardHeader>
        <CardContent>
          {rollup.bills.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No bills entered yet. Until 3 bills exist, budgeting uses the {money(CLEARVIEW.estimatedMonthlySavings)}{' '}
              estimate.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">kWh</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Clearview benchmark</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Savings</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rollup.bills.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>{b.billing_month.slice(0, 7)}</TableCell>
                    <TableCell className="text-right">{Number(b.kwh_used).toLocaleString()}</TableCell>
                    <TableCell>{b.supplier ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      {b.rate_per_kwh ? Number(b.rate_per_kwh).toFixed(5) : '—'}
                    </TableCell>
                    <TableCell className="text-right">{money(Number(b.benchmark_cost))}</TableCell>
                    <TableCell className="text-right">{money(Number(b.actual_cost))}</TableCell>
                    <TableCell className="text-right font-medium">{money(billSavings(b))}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteBill.mutate(b.id)}
                        aria-label="Remove bill"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Redirect + goal acceleration */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Clearview Utility Savings Redirect</CardTitle>
          <CardDescription>
            Default destination is the SoFi Emergency Fund until the Stage 1 {money(2000)} target is reached.
            {floorReached ? ' Target reached — you may choose another destination.' : ' Changing it requires approval.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full max-w-sm space-y-1.5">
              <Label className="text-xs">Destination</Label>
              <Select
                value={
                  redirect
                    ? (UTILITY_REDIRECT_DESTINATIONS.find(
                        (d) =>
                          d.label === redirect.destination_label || d.value === redirect.destination_type,
                      )?.value ?? 'emergency_fund')
                    : 'emergency_fund'
                }
                onValueChange={setPendingDestination}
                disabled={!redirect}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UTILITY_REDIRECT_DESTINATIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              Redirecting {money(extra)}/mo ({money(extra * 12)}/yr)
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label={`Months earlier to ${money(2000)} emergency fund`}
              value={to2000 === null ? '—' : `${to2000.toFixed(1)} mo`}
            />
            <Stat
              label={`Months earlier to ${money(5000)} emergency fund`}
              value={to5000 === null ? '—' : `${to5000.toFixed(1)} mo`}
            />
            <Stat label="Extra annual debt principal if redirected to debt" value={money(extra * 12)} />
            <Stat label="Additional annual HSA / investment contribution" value={money(extra * 12)} />
          </div>

          <p className="text-xs text-muted-foreground">
            One stream of money being reassigned: Clearview expense reduction → {money(extra)} freed cash → redirected
            to a goal. It is never counted as new income, nor as both a saving and a separate contribution.
          </p>
        </CardContent>
      </Card>

      <AlertDialog open={!!pendingDestination} onOpenChange={(o) => !o && setPendingDestination(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change the redirect destination?</AlertDialogTitle>
            <AlertDialogDescription>
              {money(extra)}/month of Clearview savings will be redirected to{' '}
              {UTILITY_REDIRECT_DESTINATIONS.find((d) => d.value === pendingDestination)?.label}.
              {!floorReached &&
                ` Your emergency fund is still below the ${money(2000)} Stage 1 target — Prism recommends filling it first.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDestination}>Approve change</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
