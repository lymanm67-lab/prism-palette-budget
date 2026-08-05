import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, FileText, Printer } from 'lucide-react';
import FdnCrudCard, { type FdnField } from './FdnCrudCard';
import { useFdnGrants, useFdnInvestments } from '@/hooks/use-foundation-ops';
import { useFdnSettings, useUpdateFdnSettings, useFdnPillars } from '@/hooks/use-foundation';
import { currency0 } from '@/lib/legacy/foundationOps';
import {
  GRANT_TYPES,
  GRANT_STAGES,
  rollupGrants,
  computeMinimumDistribution,
  printAwardLetter,
} from '@/lib/legacy/foundationGrants';
import { toast } from 'sonner';

const empty = {
  id: '',
  grantee_name: '',
  grant_type: 'grant',
  stage: 'application',
  contact_name: '',
  contact_email: '',
  ein: '',
  project_title: '',
  purpose: '',
  charitable_purpose: '',
  selection_criteria: '',
  amount_requested: 0,
  amount_awarded: 0,
  amount_paid: 0,
  application_date: new Date().toISOString().slice(0, 10),
  decision_date: '',
  board_approved_at: '',
  agreement_signed_at: '',
  payment_schedule: '',
  report_due_date: '',
  report_received_at: '',
  irs_status_verified: false,
  conflict_screened: false,
  expenditure_responsibility: false,
  due_diligence_notes: '',
  outcome_summary: '',
  people_served: 0,
  notes: '',
};

const stageLabel = (v: string) => GRANT_STAGES.find((s) => s.value === v)?.label ?? v;
const typeLabel = (v: string) => GRANT_TYPES.find((t) => t.value === v)?.label ?? v;

export default function GrantsTab() {
  const { data: grants = [] } = useFdnGrants();
  const { data: investments = [] } = useFdnInvestments();
  const { data: settings } = useFdnSettings();
  const { data: pillars = [] } = useFdnPillars();
  const updateSettings = useUpdateFdnSettings();

  const r = useMemo(() => rollupGrants(grants as any[]), [grants]);
  const marketValue = (investments as any[]).reduce((s, i) => s + Number(i.market_value || 0), 0);

  const mrd = useMemo(
    () =>
      computeMinimumDistribution({
        avgAssets: Number(settings?.mrd_avg_assets ?? 0),
        marketValue,
        carryover: Number(settings?.mrd_carryover ?? 0),
        qualifyingAdmin: Number(settings?.mrd_qualifying_admin ?? 0),
        grantsPaid: r.paid,
        policyPct: Number(settings?.spending_policy_pct ?? 5),
      }),
    [settings, marketValue, r.paid],
  );

  const fields: FdnField[] = [
    { key: 'grantee_name', label: 'Grantee / applicant name' },
    { key: 'grant_type', label: 'Award type', type: 'select', options: GRANT_TYPES },
    { key: 'stage', label: 'Lifecycle stage', type: 'select', options: GRANT_STAGES },
    { key: 'ein', label: 'EIN (organizations)' },
    { key: 'contact_name', label: 'Primary contact' },
    { key: 'contact_email', label: 'Contact email' },
    { key: 'project_title', label: 'Project title', full: true },
    { key: 'charitable_purpose', label: 'Charitable purpose served', type: 'textarea', full: true },
    { key: 'purpose', label: 'Approved use of funds', type: 'textarea', full: true },
    { key: 'selection_criteria', label: 'Selection criteria applied', type: 'textarea', full: true },
    { key: 'amount_requested', label: 'Amount requested ($)', type: 'number' },
    { key: 'amount_awarded', label: 'Amount awarded ($)', type: 'number' },
    { key: 'amount_paid', label: 'Amount disbursed ($)', type: 'number' },
    { key: 'people_served', label: 'People served', type: 'number' },
    { key: 'application_date', label: 'Application received', type: 'date' },
    { key: 'decision_date', label: 'Decision date', type: 'date' },
    { key: 'board_approved_at', label: 'Board approved on', type: 'date' },
    { key: 'agreement_signed_at', label: 'Agreement signed on', type: 'date' },
    { key: 'report_due_date', label: 'Report due', type: 'date' },
    { key: 'report_received_at', label: 'Report received', type: 'date' },
    { key: 'payment_schedule', label: 'Payment schedule', full: true },
    { key: 'irs_status_verified', label: 'IRS 501(c)(3) status verified', type: 'switch' },
    { key: 'conflict_screened', label: 'Conflict of interest screened', type: 'switch' },
    { key: 'expenditure_responsibility', label: 'Expenditure responsibility required', type: 'switch' },
    { key: 'due_diligence_notes', label: 'Due diligence notes', type: 'textarea', full: true },
    { key: 'outcome_summary', label: 'Outcome summary', type: 'textarea', full: true },
    { key: 'notes', label: 'Internal notes', type: 'textarea', full: true },
  ];

  const setNum = (key: string, value: string) =>
    updateSettings.mutate({ [key]: Number(value) || 0 } as any);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Awarded to date</p>
            <p className="text-2xl font-semibold">{currency0(r.awarded)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{currency0(r.unpaid)} approved but not yet disbursed</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Disbursed</p>
            <p className="text-2xl font-semibold">{currency0(r.paid)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{r.total} applications tracked</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Open pipeline</p>
            <p className="text-2xl font-semibold">{r.open.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">{currency0(r.requested)} requested overall</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">People served</p>
            <p className="text-2xl font-semibold">{r.peopleServed.toLocaleString()}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {r.peopleServed > 0 ? `${currency0(r.costPerPerson)} per person` : 'Add outcomes to compute cost per person'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Minimum distribution requirement (Section 4942 estimate)</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            A private foundation must generally pay out about 5% of the average fair market value of its
            non-charitable-use assets each year, or face an excise tax on the shortfall. Undistributed amounts must be
            paid by the end of the following tax year. Final figures come from Form 990-PF Part XI — confirm with your CPA.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="mrd-assets">Average investment assets ($)</Label>
              <Input
                id="mrd-assets"
                type="number"
                defaultValue={Number(settings?.mrd_avg_assets ?? 0)}
                onBlur={(e) => setNum('mrd_avg_assets', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Blank uses the endowment market value of {currency0(marketValue)}.
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="mrd-carry">Carryover from prior year ($)</Label>
              <Input
                id="mrd-carry"
                type="number"
                defaultValue={Number(settings?.mrd_carryover ?? 0)}
                onBlur={(e) => setNum('mrd_carryover', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mrd-admin">Qualifying admin expenses ($)</Label>
              <Input
                id="mrd-admin"
                type="number"
                defaultValue={Number(settings?.mrd_qualifying_admin ?? 0)}
                onBlur={(e) => setNum('mrd_qualifying_admin', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Direct charitable administration only.</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="mrd-policy">Board spending policy (%)</Label>
              <Input
                id="mrd-policy"
                type="number"
                defaultValue={Number(settings?.spending_policy_pct ?? 5)}
                onBlur={(e) => setNum('spending_policy_pct', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Policy spend: {currency0(mrd.policySpend)}</p>
            </div>
          </div>

          <div className="rounded-md border border-border/50 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium">
                Required distribution {currency0(mrd.required)} &middot; qualifying {currency0(mrd.qualifying)}
              </p>
              <Badge variant={mrd.remaining > 0 ? 'destructive' : 'secondary'}>
                {mrd.remaining > 0 ? `${currency0(mrd.remaining)} short` : `Met (+${currency0(mrd.surplus)})`}
              </Badge>
            </div>
            <Progress value={Math.round(mrd.coverage * 100)} className="mt-3 h-2" />
            <p className="mt-2 text-xs text-muted-foreground">
              Base of {currency0(mrd.base)} at 5%. Grants disbursed {currency0(mrd.grantsPaid)} plus qualifying admin{' '}
              {currency0(mrd.qualifyingAdmin)}. Any shortfall should be paid out by {mrd.dueDate}.
            </p>
          </div>
        </CardContent>
      </Card>

      {(r.blockers.length > 0 || r.reportsOverdue.length > 0 || r.unsignedAgreements.length > 0) && (
        <Card className="glass-card border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Grant file exceptions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {r.blockers.map((g: any) => (
              <p key={`b-${g.id}`}>
                <strong>{g.grantee_name}</strong> — advanced to {stageLabel(g.stage)} without{' '}
                {[
                  !g.irs_status_verified && 'verified charitable status',
                  !g.conflict_screened && 'conflict screening',
                  !g.board_approved_at && 'a recorded board approval',
                ]
                  .filter(Boolean)
                  .join(', ')}
                .
              </p>
            ))}
            {r.unsignedAgreements.map((g: any) => (
              <p key={`u-${g.id}`}>
                <strong>{g.grantee_name}</strong> — no signed grant agreement on file.
              </p>
            ))}
            {r.reportsOverdue.map((g: any) => (
              <p key={`r-${g.id}`}>
                <strong>{g.grantee_name}</strong> — report was due {g.report_due_date} and has not been received.
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Pipeline by stage</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {r.byStage.map((s) => (
            <div key={s.value} className="rounded-md border border-border/50 p-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-xl font-semibold">{s.rows.length}</p>
              <p className="text-xs text-muted-foreground">
                {currency0(s.rows.reduce((sum: number, g: any) => sum + Number(g.amount_awarded || g.amount_requested || 0), 0))}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <FdnCrudCard
        table="fdn_grants"
        title="Grant & scholarship files"
        description="One record per applicant, from inquiry through final report. Individual scholarship awards require documented objective selection criteria and non-discriminatory procedures; grants to organizations require charitable-status verification and a signed agreement."
        addLabel="Add application"
        fields={fields}
        empty={empty}
        rows={grants as any[]}
        requiredKey="grantee_name"
        numericKeys={['amount_requested', 'amount_awarded', 'amount_paid', 'people_served']}
        dateKeys={[
          'application_date',
          'decision_date',
          'board_approved_at',
          'agreement_signed_at',
          'report_due_date',
          'report_received_at',
        ]}
        renderRow={(row: any) => (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{row.grantee_name}</p>
              <Badge variant="outline">{stageLabel(row.stage)}</Badge>
              <Badge variant="secondary">{typeLabel(row.grant_type)}</Badge>
              {row.irs_status_verified && <Badge variant="outline">Status verified</Badge>}
              {row.conflict_screened && <Badge variant="outline">COI screened</Badge>}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Requested {currency0(Number(row.amount_requested || 0))} &middot; awarded{' '}
              {currency0(Number(row.amount_awarded || 0))} &middot; disbursed {currency0(Number(row.amount_paid || 0))}
              {row.report_due_date ? ` · report due ${row.report_due_date}` : ''}
              {Number(row.people_served || 0) > 0 ? ` · ${row.people_served} served` : ''}
            </p>
            {row.project_title && <p className="mt-1 text-xs text-muted-foreground">{row.project_title}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-xs"
                onClick={() => {
                  const ok = printAwardLetter(row, settings?.foundation_name ?? 'Family Foundation');
                  if (!ok) toast.error('Allow pop-ups to print the award letter.');
                }}
              >
                <Printer className="h-3.5 w-3.5" /> Award letter
              </Button>
              {pillars.length > 0 && row.pillar_id && (
                <Badge variant="outline" className="gap-1">
                  <FileText className="h-3 w-3" />
                  {(pillars as any[]).find((p) => p.id === row.pillar_id)?.name ?? 'Pillar'}
                </Badge>
              )}
            </div>
          </div>
        )}
      />

      <p className="text-xs text-muted-foreground">
        Educational planning only. Grants to individuals from a private foundation generally require advance IRS
        approval of the selection procedures, and grants to non-public charities may require expenditure
        responsibility. Review every award with your attorney and CPA.
      </p>
    </div>
  );
}
