import { Card, CardContent } from '@/components/ui/card';
import { MhStat } from '@/components/medical-housing/MhFields';
import ThvRecordManager, { type ThvField } from '@/components/tiny-home-village/ThvRecordManager';
import { useThvPartners } from '@/hooks/use-tiny-home-village';
import { PARTNER_CATEGORIES, PARTNER_STATUSES, money } from '@/lib/legacy/tinyHomeVillage';

const FIELDS: ThvField[] = [
  { key: 'organization', label: 'Organization', type: 'text' },
  { key: 'category', label: 'Partner category', type: 'select', options: PARTNER_CATEGORIES },
  { key: 'contact_person', label: 'Contact person', type: 'text' },
  { key: 'role', label: 'Role', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'proposed_contribution', label: 'Proposed contribution', type: 'text', span: 2 },
  { key: 'financial_commitment', label: 'Financial commitment', type: 'money' },
  { key: 'inkind_commitment', label: 'In-kind commitment', type: 'text' },
  { key: 'volunteer_commitment', label: 'Volunteer commitment', type: 'text' },
  { key: 'agreement_status', label: 'Agreement status', type: 'text' },
  { key: 'date_contacted', label: 'Date contacted', type: 'date' },
  { key: 'follow_up_date', label: 'Follow-up date', type: 'date' },
  { key: 'status', label: 'Partnership status', type: 'select', options: PARTNER_STATUSES },
  { key: 'notes', label: 'Notes', type: 'textarea', span: 3 },
];

export default function VillagePartnersTab() {
  const { data: partners = [] } = useThvPartners();

  const activeCount = partners.filter((p) => p.status === 'Active Partner').length;
  const supportLetters = partners.filter((p) => p.status === 'Letter of Support').length;
  const followUps = partners.filter((p) => p.status === 'Follow-Up Needed').length;
  const committed = partners.reduce((s, p) => s + (Number(p.financial_commitment) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MhStat label="Active partners" value={String(activeCount)} tone="good" />
        <MhStat label="Letters of support" value={String(supportLetters)} />
        <MhStat label="Follow-ups needed" value={String(followUps)} tone={followUps ? 'warn' : 'neutral'} />
        <MhStat label="Committed partner funding" value={money(committed)} />
      </div>

      <Card className="border-border/60 bg-muted/20">
        <CardContent className="p-4 text-xs text-muted-foreground">
          Community validation comes before land. County children services, foster care agencies, workforce
          development, employers, and mentoring organizations should confirm the need and commit support before the
          village breaks ground.
        </CardContent>
      </Card>

      <ThvRecordManager
        table="thv_partners"
        rows={partners}
        fields={FIELDS}
        titleKey="organization"
        addLabel="Add partner"
        defaults={{ organization: 'New organization', category: 'Foster care agencies', status: 'Researching' }}
        badgeKey="status"
        subtitle={(r) => [r.category, r.contact_person].filter(Boolean).join(' · ')}
        emptyText="No community partners tracked yet."
      />
    </div>
  );
}
