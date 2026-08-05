import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldAlert } from 'lucide-react';
import FdnCrudCard, { type FdnField } from './FdnCrudCard';
import {
  useFdnInsurance,
  useFdnBenchmarks,
  useFdnGifts,
  useFdnGrants,
  useFdnInvestments,
} from '@/hooks/use-foundation-ops';
import { useFdnSettings, useUpdateFdnSettings } from '@/hooks/use-foundation';
import { currency0 } from '@/lib/legacy/foundationOps';
import {
  COVERAGE_TYPES,
  INSURANCE_STATUSES,
  PEER_TYPES,
  expenseAllocation,
  benchmarkCompare,
  rollupGrants,
} from '@/lib/legacy/foundationGrants';

const insuranceEmpty = {
  id: '',
  coverage_type: 'do',
  carrier: '',
  policy_number: '',
  coverage_limit: 0,
  deductible: 0,
  annual_premium: 0,
  effective_date: '',
  expires_at: '',
  status: 'planned',
  broker: '',
  notes: '',
};

const benchmarkEmpty = {
  id: '',
  peer_name: '',
  peer_type: 'family_foundation',
  location: '',
  fiscal_year: new Date().getFullYear() - 1,
  total_assets: 0,
  annual_giving: 0,
  operating_expenses: 0,
  staff_count: 0,
  grants_count: 0,
  payout_pct: 0,
  source: '',
  notes: '',
};

const label = (opts: readonly { value: string; label: string }[], v: string) =>
  opts.find((o) => o.value === v)?.label ?? v;

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export default function RiskBenchmarksTab() {
  const { data: insurance = [] } = useFdnInsurance();
  const { data: benchmarks = [] } = useFdnBenchmarks();
  const { data: gifts = [] } = useFdnGifts();
  const { data: grants = [] } = useFdnGrants();
  const { data: investments = [] } = useFdnInvestments();
  const { data: settings } = useFdnSettings();
  const updateSettings = useUpdateFdnSettings();

  const today = new Date().toISOString().slice(0, 10);
  const grantRoll = useMemo(() => rollupGrants(grants as any[]), [grants]);
  const giftsReceived = (gifts as any[]).reduce((s, g) => s + Number(g.amount || 0), 0);
  const assets = (investments as any[]).reduce((s, i) => s + Number(i.market_value || 0), 0);

  const alloc = useMemo(
    () =>
      expenseAllocation({
        grantsPaid: grantRoll.paid,
        programSpend: 0,
        adminExpense: Number(settings?.admin_expense_annual ?? 0),
        fundraisingExpense: Number(settings?.fundraising_expense_annual ?? 0),
        giftsReceived,
      }),
    [grantRoll.paid, settings, giftsReceived],
  );

  const bench = useMemo(
    () =>
      benchmarkCompare(benchmarks as any[], {
        assets,
        giving: grantRoll.paid,
        expenses: alloc.admin + alloc.fundraising,
        staff: Number(settings?.staff_count ?? 0),
        grants: grantRoll.total,
      }),
    [benchmarks, assets, grantRoll, alloc, settings],
  );

  const gaps = (insurance as any[]).filter((i) => ['planned', 'quoted', 'lapsed'].includes(i.status));
  const expiring = (insurance as any[]).filter(
    (i) => i.status === 'bound' && i.expires_at && i.expires_at <= new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10),
  );
  const premium = (insurance as any[])
    .filter((i) => i.status === 'bound')
    .reduce((s, i) => s + Number(i.annual_premium || 0), 0);

  const insuranceFields: FdnField[] = [
    { key: 'coverage_type', label: 'Coverage type', type: 'select', options: COVERAGE_TYPES },
    { key: 'status', label: 'Status', type: 'select', options: INSURANCE_STATUSES },
    { key: 'carrier', label: 'Carrier' },
    { key: 'broker', label: 'Broker / agent' },
    { key: 'policy_number', label: 'Policy number' },
    { key: 'coverage_limit', label: 'Coverage limit ($)', type: 'number' },
    { key: 'deductible', label: 'Deductible ($)', type: 'number' },
    { key: 'annual_premium', label: 'Annual premium ($)', type: 'number' },
    { key: 'effective_date', label: 'Effective date', type: 'date' },
    { key: 'expires_at', label: 'Renewal / expiry date', type: 'date' },
    { key: 'notes', label: 'Notes', type: 'textarea', full: true },
  ];

  const benchmarkFields: FdnField[] = [
    { key: 'peer_name', label: 'Peer foundation name' },
    { key: 'peer_type', label: 'Peer type', type: 'select', options: PEER_TYPES },
    { key: 'location', label: 'Location' },
    { key: 'fiscal_year', label: 'Fiscal year', type: 'number' },
    { key: 'total_assets', label: 'Total assets ($)', type: 'number' },
    { key: 'annual_giving', label: 'Annual giving ($)', type: 'number' },
    { key: 'operating_expenses', label: 'Operating expenses ($)', type: 'number' },
    { key: 'staff_count', label: 'Paid staff (FTE)', type: 'number' },
    { key: 'grants_count', label: 'Grants awarded (count)', type: 'number' },
    { key: 'payout_pct', label: 'Payout rate (%)', type: 'number' },
    { key: 'source', label: 'Source (990-PF, annual report)', full: true },
    { key: 'notes', label: 'Notes', type: 'textarea', full: true },
  ];

  const setNum = (key: string, value: string) => updateSettings.mutate({ [key]: Number(value) || 0 } as any);

  const fmt = (row: any, value: number) =>
    row.money ? currency0(value) : row.ratio ? value.toFixed(2) : `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}${row.suffix ?? ''}`;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Coverage in force</p>
            <p className="text-2xl font-semibold">{(insurance as any[]).filter((i) => i.status === 'bound').length}</p>
            <p className="mt-1 text-xs text-muted-foreground">{currency0(premium)} annual premium</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Open coverage gaps</p>
            <p className="text-2xl font-semibold">{gaps.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">{expiring.length} renewing within 60 days</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Program share of spending</p>
            <p className="text-2xl font-semibold">{pct(alloc.programPct)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {currency0(alloc.program)} of {currency0(alloc.total)}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Cost to raise a dollar</p>
            <p className="text-2xl font-semibold">
              {alloc.costToRaiseADollar > 0 ? `$${alloc.costToRaiseADollar.toFixed(2)}` : '—'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Under $0.20 is generally efficient</p>
          </CardContent>
        </Card>
      </div>

      {(gaps.length > 0 || expiring.length > 0) && (
        <Card className="glass-card border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4 text-destructive" /> Risk alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {gaps.map((i: any) => (
              <p key={`g-${i.id}`}>
                <strong>{label(COVERAGE_TYPES, i.coverage_type)}</strong> is {label(INSURANCE_STATUSES, i.status)} — not
                yet in force.
              </p>
            ))}
            {expiring.map((i: any) => (
              <p key={`e-${i.id}`}>
                <strong>{label(COVERAGE_TYPES, i.coverage_type)}</strong> renews {i.expires_at}
                {i.expires_at < today ? ' (already past due)' : ''}.
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Expense allocation</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Funders, banks, and Form 990-PF all separate program, administrative, and fundraising costs. Enter your
            annual figures; grants disbursed flow in automatically as program spending.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="admin-exp">Administrative expenses ($/yr)</Label>
              <Input
                id="admin-exp"
                type="number"
                defaultValue={Number(settings?.admin_expense_annual ?? 0)}
                onBlur={(e) => setNum('admin_expense_annual', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fund-exp">Fundraising expenses ($/yr)</Label>
              <Input
                id="fund-exp"
                type="number"
                defaultValue={Number(settings?.fundraising_expense_annual ?? 0)}
                onBlur={(e) => setNum('fundraising_expense_annual', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="staff-count">Paid staff (FTE)</Label>
              <Input
                id="staff-count"
                type="number"
                defaultValue={Number(settings?.staff_count ?? 0)}
                onBlur={(e) => setNum('staff_count', e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { label: 'Program', value: alloc.program, share: alloc.programPct },
              { label: 'Administrative', value: alloc.admin, share: alloc.adminPct },
              { label: 'Fundraising', value: alloc.fundraising, share: alloc.fundraisingPct },
            ].map((row) => (
              <div key={row.label} className="rounded-md border border-border/50 p-3">
                <p className="text-xs text-muted-foreground">{row.label}</p>
                <p className="text-lg font-semibold">{currency0(row.value)}</p>
                <p className="text-xs text-muted-foreground">{pct(row.share)} of total spending</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Every administrative dollar currently moves{' '}
            {alloc.dollarsGrantedPerAdminDollar > 0 ? currency0(alloc.dollarsGrantedPerAdminDollar) : '$0'} of grant
            funding.
          </p>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Peer comparison</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Your foundation against the median of {bench.peerCount} recorded peers. Seeded rows are illustrative —
            replace them with figures from real peer Form 990-PF filings, which are public.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {bench.rows.map((row: any) => {
            const ahead = row.ours >= row.peer;
            return (
              <div
                key={row.label}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/50 p-3"
              >
                <p className="text-sm">{row.label}</p>
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-medium">{fmt(row, Number(row.ours || 0))}</span>
                  <span className="text-xs text-muted-foreground">peer median {fmt(row, Number(row.peer || 0))}</span>
                  <Badge variant={ahead ? 'secondary' : 'outline'}>{ahead ? 'At or above' : 'Below'}</Badge>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <FdnCrudCard
        table="fdn_insurance"
        title="Insurance register"
        description="Directors & officers coverage protects the board personally; the rest scale with programs, staff, property, and data. Track carrier, limits, premiums, and renewal dates so nothing lapses."
        addLabel="Add policy"
        fields={insuranceFields}
        empty={insuranceEmpty}
        rows={insurance as any[]}
        requiredKey="coverage_type"
        numericKeys={['coverage_limit', 'deductible', 'annual_premium']}
        dateKeys={['effective_date', 'expires_at']}
        renderRow={(row: any) => (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{label(COVERAGE_TYPES, row.coverage_type)}</p>
              <Badge variant={row.status === 'bound' ? 'secondary' : 'outline'}>
                {label(INSURANCE_STATUSES, row.status)}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {row.carrier ? `${row.carrier} · ` : ''}limit {currency0(Number(row.coverage_limit || 0))} · premium{' '}
              {currency0(Number(row.annual_premium || 0))}
              {row.expires_at ? ` · renews ${row.expires_at}` : ''}
            </p>
            {row.notes && <p className="mt-1 text-xs text-muted-foreground">{row.notes}</p>}
          </div>
        )}
      />

      <FdnCrudCard
        table="fdn_benchmarks"
        title="Peer foundation benchmarks"
        description="Record comparable foundations so board decisions on payout, staffing, and overhead are anchored to real peers rather than instinct."
        addLabel="Add peer"
        fields={benchmarkFields}
        empty={benchmarkEmpty}
        rows={benchmarks as any[]}
        requiredKey="peer_name"
        numericKeys={[
          'fiscal_year',
          'total_assets',
          'annual_giving',
          'operating_expenses',
          'staff_count',
          'grants_count',
          'payout_pct',
        ]}
        renderRow={(row: any) => (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{row.peer_name}</p>
              <Badge variant="outline">{label(PEER_TYPES, row.peer_type)}</Badge>
              {row.fiscal_year ? <Badge variant="secondary">FY {row.fiscal_year}</Badge> : null}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Assets {currency0(Number(row.total_assets || 0))} · giving {currency0(Number(row.annual_giving || 0))} ·
              expenses {currency0(Number(row.operating_expenses || 0))} · {Number(row.grants_count || 0)} grants ·{' '}
              {Number(row.payout_pct || 0)}% payout
            </p>
            {row.source && <p className="mt-1 text-xs text-muted-foreground">Source: {row.source}</p>}
          </div>
        )}
      />

      <p className="text-xs text-muted-foreground">
        Educational planning only, not legal, tax, or insurance advice. Confirm coverage requirements with a licensed
        broker and compliance obligations with the foundation's attorney and CPA.
      </p>
    </div>
  );
}
