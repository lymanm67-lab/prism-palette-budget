import { Card, CardContent } from '@/components/ui/card';
import { MhStat } from '@/components/medical-housing/MhFields';
import ThvRecordManager, { type ThvField } from '@/components/tiny-home-village/ThvRecordManager';
import { useThvPrograms } from '@/hooks/use-tiny-home-village';
import { PROGRAM_STATUSES, money, pct } from '@/lib/legacy/tinyHomeVillage';

const FIELDS: ThvField[] = [
  { key: 'name', label: 'Program name', type: 'text' },
  { key: 'description', label: 'Program description', type: 'textarea', span: 2 },
  { key: 'owner', label: 'Program owner', type: 'text' },
  { key: 'partner', label: 'Community partner', type: 'text' },
  { key: 'frequency', label: 'Frequency', type: 'text' },
  { key: 'capacity', label: 'Capacity', type: 'number' },
  { key: 'est_cost', label: 'Estimated annual cost', type: 'money' },
  { key: 'funding_source', label: 'Funding source', type: 'text' },
  { key: 'participation_rate', label: 'Participation rate', type: 'percent' },
  { key: 'completion_rate', label: 'Completion rate', type: 'percent' },
  { key: 'success_measure', label: 'Success measure', type: 'text', span: 2 },
  { key: 'status', label: 'Status', type: 'select', options: PROGRAM_STATUSES },
  { key: 'notes', label: 'Notes', type: 'textarea', span: 3 },
];

export default function VillageProgramsTab() {
  const { data: programs = [] } = useThvPrograms();

  const active = programs.filter((p) => p.status === 'Active').length;
  const needPartner = programs.filter((p) => p.status === 'Partner Needed').length;
  const cost = programs.reduce((s, p) => s + (Number(p.est_cost) || 0), 0);
  const avgCompletion = programs.length
    ? programs.reduce((s, p) => s + (Number(p.completion_rate) || 0), 0) / programs.length
    : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MhStat label="Programs tracked" value={String(programs.length)} />
        <MhStat label="Active programs" value={String(active)} tone="good" />
        <MhStat label="Awaiting a partner" value={String(needPartner)} tone={needPartner ? 'warn' : 'neutral'} />
        <MhStat label="Estimated annual program cost" value={money(cost)} hint={`Avg completion ${pct(avgCompletion)}`} />
      </div>

      <Card className="border-border/60 bg-muted/20">
        <CardContent className="p-4 text-xs text-muted-foreground">
          The village is a program, not just housing. Each card carries its own owner, partner, cost, funding source,
          and success measure so support services can be staffed and funded independently of construction.
        </CardContent>
      </Card>

      <ThvRecordManager
        table="thv_programs"
        rows={programs}
        fields={FIELDS}
        titleKey="name"
        addLabel="Add program"
        defaults={{ name: 'New program', status: 'Planned' }}
        badgeKey="status"
        subtitle={(r) => [r.owner, r.partner, r.frequency].filter(Boolean).join(' · ') || 'Owner not assigned'}
        emptyText="No resident support programs yet."
      />
    </div>
  );
}
