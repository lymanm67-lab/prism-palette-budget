import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import FdnCrudCard, { type FdnField } from './FdnCrudCard';
import { useFdnSuccession } from '@/hooks/use-foundation-ops';
import { SUCCESSION_STATUSES, rollupSuccession, pct } from '@/lib/legacy/foundationOps';
import { GENERATIONS } from '@/lib/legacy/foundation';

const empty = {
  id: '',
  role_title: '',
  current_holder: '',
  successor_name: '',
  generation: 'g2',
  readiness: 1,
  training_plan: '',
  target_transition_date: '',
  status: 'identified',
  notes: '',
  sort_order: 0,
};

const fields: FdnField[] = [
  { key: 'role_title', label: 'Role' },
  { key: 'status', label: 'Status', type: 'select', options: SUCCESSION_STATUSES.map((v) => ({ value: v, label: v })) },
  { key: 'current_holder', label: 'Current holder' },
  { key: 'successor_name', label: 'Named successor' },
  { key: 'generation', label: 'Generation', type: 'select', options: GENERATIONS.map((g) => ({ value: g.value, label: g.label })) },
  { key: 'readiness', label: 'Readiness (1-5)', type: 'number' },
  { key: 'target_transition_date', label: 'Target transition date', type: 'date' },
  { key: 'training_plan', label: 'Training plan', type: 'textarea', full: true },
  { key: 'notes', label: 'Notes', type: 'textarea', full: true },
  { key: 'sort_order', label: 'Sort order', type: 'number' },
];

export default function SuccessionTab() {
  const { data: rows = [] } = useFdnSuccession();
  const r = rollupSuccession(rows as any[]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Successor coverage</p>
            <p className="mt-1 text-2xl font-semibold text-prism-teal">{pct(r.coverage)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {r.filled} of {r.total} roles named
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Ready to step in</p>
            <p className="mt-1 text-2xl font-semibold text-prism-lime">{r.ready}</p>
            <p className="mt-1 text-xs text-muted-foreground">Marked ready or transitioned</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Average readiness</p>
            <p className="mt-1 text-2xl font-semibold">{r.avgReadiness.toFixed(1)} / 5</p>
            <Progress value={(r.avgReadiness / 5) * 100} className="mt-2 h-2" />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Succession score</p>
            <p className="mt-1 text-2xl font-semibold text-prism-amber">{pct(r.score)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Coverage and readiness blended</p>
          </CardContent>
        </Card>
      </div>

      <FdnCrudCard
        table="fdn_succession"
        title="Succession bench"
        description="Every role that must survive the founder, who is next, and how they get trained."
        addLabel="Add role"
        fields={fields}
        empty={empty}
        rows={rows as any[]}
        requiredKey="role_title"
        numericKeys={['readiness', 'sort_order']}
        dateKeys={['target_transition_date']}
        renderRow={(s) => (
          <div>
            <p className="text-sm font-medium">{s.role_title}</p>
            <p className="text-xs text-muted-foreground">
              {s.current_holder ? `Now: ${s.current_holder}` : 'Currently unfilled'}
              {s.successor_name ? ` → Next: ${s.successor_name}` : ' → no successor named'}
            </p>
            {s.training_plan && <p className="mt-1 text-xs text-muted-foreground">{s.training_plan}</p>}
            <div className="mt-1 flex flex-wrap gap-1">
              <Badge variant={s.status === 'ready' || s.status === 'transitioned' ? 'secondary' : 'outline'} className="text-xs">
                {s.status}
              </Badge>
              <Badge variant="outline" className="text-xs">Readiness {Number(s.readiness)}/5</Badge>
              <Badge variant="outline" className="text-xs">
                {GENERATIONS.find((g) => g.value === s.generation)?.label ?? s.generation}
              </Badge>
              {s.target_transition_date && (
                <Badge variant="outline" className="text-xs">Target {s.target_transition_date}</Badge>
              )}
            </div>
          </div>
        )}
      />

      <p className="text-xs text-muted-foreground">
        Educational planning only. Trustee succession language must be drafted into the bylaws or trust by a licensed
        attorney.
      </p>
    </div>
  );
}
