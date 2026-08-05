import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle } from 'lucide-react';
import FdnCrudCard, { type FdnField } from './FdnCrudCard';
import { useFdnCompliance } from '@/hooks/use-foundation-ops';
import { COMPLIANCE_CATEGORIES, COMPLIANCE_STATUSES, rollupCompliance, pct } from '@/lib/legacy/foundationOps';

const empty = {
  id: '',
  item: '',
  category: 'filing',
  authority: '',
  frequency: 'annual',
  due_date: '',
  completed_at: '',
  status: 'not_started',
  owner: '',
  reference_url: '',
  notes: '',
  sort_order: 0,
};

const fields: FdnField[] = [
  { key: 'item', label: 'Requirement', full: true },
  { key: 'category', label: 'Category', type: 'select', options: COMPLIANCE_CATEGORIES.map((v) => ({ value: v, label: v.replace(/_/g, ' ') })) },
  { key: 'status', label: 'Status', type: 'select', options: COMPLIANCE_STATUSES.map((v) => ({ value: v, label: v.replace(/_/g, ' ') })) },
  { key: 'authority', label: 'Authority' },
  { key: 'frequency', label: 'Frequency', type: 'select', options: [
    { value: 'one_time', label: 'one time' },
    { value: 'annual', label: 'annual' },
    { value: 'quarterly', label: 'quarterly' },
    { value: 'as_needed', label: 'as needed' },
  ] },
  { key: 'due_date', label: 'Due date', type: 'date' },
  { key: 'completed_at', label: 'Completed on', type: 'date' },
  { key: 'owner', label: 'Owner' },
  { key: 'reference_url', label: 'Reference link' },
  { key: 'notes', label: 'Notes', type: 'textarea', full: true },
  { key: 'sort_order', label: 'Sort order', type: 'number' },
];

export default function ComplianceTab() {
  const { data: rows = [] } = useFdnCompliance();
  const r = rollupCompliance(rows as any[]);

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Compliance health</p>
              <p className="mt-1 text-4xl font-bold text-prism-teal">{pct(r.score)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {r.done} of {r.total} requirements satisfied
              </p>
            </div>
            <div className="w-full max-w-sm">
              <Progress value={r.score * 100} className="h-2" />
              {r.overdue.length > 0 && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {r.overdue.length} overdue item{r.overdue.length === 1 ? '' : 's'}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {r.upcoming.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Next deadlines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {r.upcoming.map((u: any) => (
              <div key={u.id} className="flex items-center justify-between rounded-md border border-border/50 p-3">
                <div>
                  <p className="text-sm font-medium">{u.item}</p>
                  <p className="text-xs text-muted-foreground">{[u.authority, u.frequency].filter(Boolean).join(' · ')}</p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Due {u.due_date}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <FdnCrudCard
        table="fdn_compliance"
        title="Compliance & filing tracker"
        description="Formation, IRS, state charitable registration, policies, insurance, and audit requirements."
        addLabel="Add requirement"
        fields={fields}
        empty={empty}
        rows={rows as any[]}
        requiredKey="item"
        numericKeys={['sort_order']}
        dateKeys={['due_date', 'completed_at']}
        renderRow={(c) => {
          const complete = c.completed_at || c.status === 'complete' || c.status === 'filed';
          const overdue = r.overdue.some((o: any) => o.id === c.id);
          return (
            <div>
              <p className={`text-sm font-medium ${complete ? 'text-muted-foreground line-through' : ''}`}>{c.item}</p>
              <p className="text-xs text-muted-foreground">
                {[c.authority, String(c.category).replace(/_/g, ' '), String(c.frequency).replace(/_/g, ' '), c.owner]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                <Badge variant={complete ? 'secondary' : overdue ? 'destructive' : 'outline'} className="text-xs">
                  {complete ? 'Complete' : overdue ? 'Overdue' : String(c.status).replace(/_/g, ' ')}
                </Badge>
                {c.due_date && !complete && (
                  <Badge variant="outline" className="text-xs">
                    Due {c.due_date}
                  </Badge>
                )}
              </div>
            </div>
          );
        }}
      />

      <p className="text-xs text-muted-foreground">
        Educational planning only. This tracker is not a substitute for counsel — confirm every filing, deadline, and
        registration with a licensed attorney and CPA.
      </p>
    </div>
  );
}
