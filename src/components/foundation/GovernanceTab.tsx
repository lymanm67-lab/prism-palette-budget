import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import FdnCrudCard, { type FdnField } from './FdnCrudCard';
import { useFdnGovernance } from '@/hooks/use-foundation-ops';
import { GOVERNANCE_TYPES, rollupGovernance, pct } from '@/lib/legacy/foundationOps';

const empty = {
  id: '',
  record_type: 'board_member',
  name: '',
  role: '',
  committee: '',
  email: '',
  phone: '',
  term_start: '',
  term_end: '',
  meeting_date: '',
  attendees: '',
  decisions: '',
  status: 'active',
  is_independent: false,
  conflict_disclosed: false,
  notes: '',
  sort_order: 0,
};

const fields: FdnField[] = [
  { key: 'record_type', label: 'Record type', type: 'select', options: GOVERNANCE_TYPES.map((v) => ({ value: v, label: v.replace(/_/g, ' ') })) },
  { key: 'name', label: 'Name / title' },
  { key: 'role', label: 'Role or purpose' },
  { key: 'committee', label: 'Committee' },
  { key: 'status', label: 'Status', type: 'select', options: [
    { value: 'active', label: 'active' },
    { value: 'vacant', label: 'vacant' },
    { value: 'emeritus', label: 'emeritus' },
    { value: 'resigned', label: 'resigned' },
  ] },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'term_start', label: 'Term start', type: 'date' },
  { key: 'term_end', label: 'Term end', type: 'date' },
  { key: 'meeting_date', label: 'Meeting date (meetings only)', type: 'date' },
  { key: 'is_independent', label: 'Independent (non-family)', type: 'switch' },
  { key: 'conflict_disclosed', label: 'Conflict-of-interest form signed', type: 'switch' },
  { key: 'attendees', label: 'Attendees', type: 'textarea', full: true },
  { key: 'decisions', label: 'Decisions / minutes summary', type: 'textarea', full: true },
  { key: 'notes', label: 'Notes', type: 'textarea', full: true },
  { key: 'sort_order', label: 'Sort order', type: 'number' },
];

const SECTIONS = [
  { key: 'people', label: 'Board & officers', types: ['board_member', 'officer'] },
  { key: 'committees', label: 'Committees', types: ['committee'] },
  { key: 'meetings', label: 'Meetings & minutes', types: ['meeting'] },
  { key: 'policies', label: 'Policies', types: ['policy'] },
];

export default function GovernanceTab() {
  const { data: rows = [] } = useFdnGovernance();
  const r = rollupGovernance(rows as any[]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Seats filled</p>
            <p className="mt-1 text-2xl font-semibold text-prism-teal">{r.seated}</p>
            <p className="mt-1 text-xs text-muted-foreground">{r.vacancies} vacancies to recruit</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Independent directors</p>
            <p className="mt-1 text-2xl font-semibold">{r.independent}</p>
            <p className="mt-1 text-xs text-muted-foreground">Non-family voices reduce self-dealing risk</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Meetings this year</p>
            <p className="mt-1 text-2xl font-semibold text-prism-amber">{r.meetingsThisYear}</p>
            <p className="mt-1 text-xs text-muted-foreground">Target four documented meetings</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Governance score</p>
            <p className="mt-1 text-2xl font-semibold text-prism-lime">{pct(r.score)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {r.disclosures} of {r.seated} conflict forms signed
            </p>
          </CardContent>
        </Card>
      </div>

      {SECTIONS.map((s) => (
        <FdnCrudCard
          key={s.key}
          table="fdn_governance"
          title={s.label}
          addLabel="Add record"
          fields={fields}
          empty={{ ...empty, record_type: s.types[0] }}
          rows={(rows as any[]).filter((x) => s.types.includes(x.record_type))}
          requiredKey="name"
          numericKeys={['sort_order']}
          dateKeys={['term_start', 'term_end', 'meeting_date']}
          renderRow={(g) => (
            <div>
              <p className="text-sm font-medium">{g.name}</p>
              <p className="text-xs text-muted-foreground">
                {[g.role, g.committee, g.meeting_date].filter(Boolean).join(' · ') || '—'}
              </p>
              {g.decisions && <p className="mt-1 text-xs text-muted-foreground">{g.decisions}</p>}
              <div className="mt-1 flex flex-wrap gap-1">
                {g.status === 'vacant' && <Badge variant="destructive" className="text-xs">Vacant</Badge>}
                {g.is_independent && <Badge variant="secondary" className="text-xs">Independent</Badge>}
                {g.conflict_disclosed && <Badge variant="outline" className="text-xs">COI signed</Badge>}
                {g.term_end && <Badge variant="outline" className="text-xs">Term ends {g.term_end}</Badge>}
              </div>
            </div>
          )}
        />
      ))}

      <p className="text-xs text-muted-foreground">
        Educational planning only. Bylaws, board composition, and conflict policies must be reviewed by a licensed
        attorney.
      </p>
    </div>
  );
}
