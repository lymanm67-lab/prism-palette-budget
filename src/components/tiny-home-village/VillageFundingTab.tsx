import { Link2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MhStat, MhNumberField } from '@/components/medical-housing/MhFields';
import ThvRecordManager, { ThvFieldInput, type ThvField } from '@/components/tiny-home-village/ThvRecordManager';
import {
  useThvFunding,
  useThvSettings,
  useUpdateThvSettings,
  useThvRollup,
} from '@/hooks/use-tiny-home-village';
import {
  FUNDING_CATEGORIES,
  FUNDING_STATUSES,
  ALLOCATION_MODES,
  SUGGESTED_ALLOCATION_PCTS,
  FUNDING_CONNECTION_STATEMENT,
  computeAllocation,
  money,
  pct,
} from '@/lib/legacy/tinyHomeVillage';

const FIELDS: ThvField[] = [
  { key: 'source', label: 'Funding source', type: 'text' },
  { key: 'category', label: 'Funding category', type: 'select', options: FUNDING_CATEGORIES },
  { key: 'target_amount', label: 'Target amount', type: 'money' },
  { key: 'requested_amount', label: 'Requested amount', type: 'money' },
  { key: 'committed_amount', label: 'Amount committed', type: 'money' },
  { key: 'received_amount', label: 'Amount received', type: 'money' },
  { key: 'is_inkind', label: 'In-kind contribution', type: 'bool' },
  { key: 'application_date', label: 'Application date', type: 'date' },
  { key: 'application_deadline', label: 'Application deadline', type: 'date' },
  { key: 'decision_date', label: 'Decision date', type: 'date' },
  { key: 'restrictions', label: 'Restrictions', type: 'text', span: 2 },
  { key: 'reporting_requirements', label: 'Reporting requirements', type: 'text', span: 2 },
  { key: 'contact_person', label: 'Contact person', type: 'text' },
  { key: 'follow_up_date', label: 'Follow-up date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: FUNDING_STATUSES },
  { key: 'notes', label: 'Notes', type: 'textarea', span: 3 },
];

export default function VillageFundingTab() {
  const { data: rows = [] } = useThvFunding();
  const { data: s } = useThvSettings();
  const update = useUpdateThvSettings();
  const roll = useThvRollup();

  const f = roll.fundingRollup;
  const designated = s ? computeAllocation(s) : 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MhStat label="Total project goal" value={money(roll.projectGoal)} />
        <MhStat label="Cash received" value={money(f.cashReceived)} tone="good" />
        <MhStat label="Pledges" value={money(f.pledges)} />
        <MhStat label="Pending requests" value={money(f.pendingRequests)} tone="warn" />
        <MhStat label="In-kind contributions" value={money(f.inKind)} />
        <MhStat label="Remaining cash gap" value={money(f.remainingCashGap)} tone={f.remainingCashGap ? 'bad' : 'good'} />
        <MhStat label="Remaining total gap" value={money(f.remainingTotalGap)} tone={f.remainingTotalGap ? 'bad' : 'good'} />
        <MhStat label="Percentage funded" value={pct(f.pctFunded)} />
        <MhStat
          label="Next funding deadline"
          value={f.nextDeadline ? f.nextDeadline.date : 'None scheduled'}
          hint={f.nextDeadline?.source}
        />
        <MhStat
          label="Largest unsecured category"
          value={f.largestUnsecuredCategory?.category ?? 'None'}
          hint={f.largestUnsecuredCategory ? money(f.largestUnsecuredCategory.amount) : undefined}
        />
        <MhStat label="Village fund balance" value={money(s?.village_fund_balance ?? 0)} />
        <MhStat label="Designated this year from Goal 1" value={money(designated)} />
      </div>

      {/* Wealth With Purpose funding connection */}
      <Card className="border-prism-amber/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4 text-prism-amber" />
            Wealth With Purpose Funding Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Goal 1 may help fund Goal 2, but Goal 2 is never dependent on it. Choose how (or whether) medical housing
            profit flows to the village fund.
          </p>

          {s && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <ThvFieldInput
                  field={{
                    key: 'allocation_mode',
                    label: 'Allocation method',
                    type: 'select',
                    options: ALLOCATION_MODES.map((m) => m.label),
                  }}
                  value={ALLOCATION_MODES.find((m) => m.value === s.allocation_mode)?.label ?? ''}
                  onCommit={(label) => {
                    const mode = ALLOCATION_MODES.find((m) => m.label === label);
                    if (mode) update.mutate({ allocation_mode: mode.value });
                  }}
                />
                <MhNumberField
                  label="Allocation percentage of net profit"
                  value={s.allocation_percent}
                  onCommit={(v) => update.mutate({ allocation_percent: v })}
                  suffix="%"
                />
                <MhNumberField
                  label="Fixed annual contribution"
                  value={s.allocation_fixed_annual}
                  onCommit={(v) => update.mutate({ allocation_fixed_annual: v })}
                  suffix="$"
                  step={500}
                />
                <MhNumberField
                  label="Percentage of property sale proceeds"
                  value={s.allocation_sale_percent}
                  onCommit={(v) => update.mutate({ allocation_sale_percent: v })}
                  suffix="%"
                />
                <MhNumberField
                  label="Percentage of refinancing proceeds"
                  value={s.allocation_refi_percent}
                  onCommit={(v) => update.mutate({ allocation_refi_percent: v })}
                  suffix="%"
                />
                <MhNumberField
                  label="Medical housing annual net profit"
                  value={s.mh_annual_net_profit}
                  onCommit={(v) => update.mutate({ mh_annual_net_profit: v })}
                  suffix="$"
                  step={500}
                />
                <MhNumberField
                  label="Total village fund balance"
                  value={s.village_fund_balance}
                  onCommit={(v) => update.mutate({ village_fund_balance: v })}
                  suffix="$"
                  step={500}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Suggested profit allocation:</span>
                {SUGGESTED_ALLOCATION_PCTS.map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={Number(s.allocation_percent) === p ? 'default' : 'outline'}
                    onClick={() => update.mutate({ allocation_percent: p })}
                  >
                    {p}%
                  </Button>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MhStat label="Medical housing annual net profit" value={money(s.mh_annual_net_profit)} />
                <MhStat label="Amount designated for Goal 2" value={money(designated)} tone="good" />
                <MhStat label="Total village fund balance" value={money(s.village_fund_balance)} />
                <MhStat
                  label="Outside funding secured"
                  value={money(Math.max(0, f.cashReceived + f.pledges - Number(s.village_fund_balance || 0)))}
                  hint="Cash and pledges beyond the village fund"
                />
              </div>
            </>
          )}

          <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
            <p className="text-xs italic">{FUNDING_CONNECTION_STATEMENT}</p>
          </div>
        </CardContent>
      </Card>

      <ThvRecordManager
        table="thv_funding"
        rows={rows}
        fields={FIELDS}
        titleKey="source"
        addLabel="Add funding source"
        defaults={{ source: 'New funding source', category: 'Private donations', status: 'Researching' }}
        badgeKey="status"
        subtitle={(r) => `${r.category} · target ${money(Number(r.target_amount) || 0)}`}
        emptyText="No funding sources tracked yet."
      />
    </div>
  );
}
