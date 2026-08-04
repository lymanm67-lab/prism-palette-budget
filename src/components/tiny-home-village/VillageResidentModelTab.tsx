import { ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MhStat } from '@/components/medical-housing/MhFields';
import ThvRecordManager, { ThvFieldInput, type ThvField } from '@/components/tiny-home-village/ThvRecordManager';
import { cn } from '@/lib/utils';
import {
  useThvSettings,
  useUpdateThvSettings,
  useThvResidents,
} from '@/hooks/use-tiny-home-village';
import {
  HOUSING_MODELS,
  RESIDENCY_RULE_FIELDS,
  RESIDENT_READINESS_KEYS,
  residentReadiness,
  pct,
} from '@/lib/legacy/tinyHomeVillage';

const RESIDENT_FIELDS: ThvField[] = [
  { key: 'resident_code', label: 'Resident code (no names)', type: 'text' },
  { key: 'housing_model', label: 'Housing model', type: 'select', options: HOUSING_MODELS },
  { key: 'move_in_date', label: 'Move-in date', type: 'date' },
  { key: 'expected_exit_date', label: 'Expected transition date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Graduated', 'Transitioned', 'Exited Early'] },
  { key: 'employed', label: 'Employed', type: 'bool' },
  { key: 'enrolled_education', label: 'Enrolled in education', type: 'bool' },
  { key: 'finished_financial_ed', label: 'Completed financial education', type: 'bool' },
  { key: 'has_bank_account', label: 'Banking access established', type: 'bool' },
  { key: 'credit_improved', label: 'Credit improved', type: 'bool' },
  { key: 'reliable_transportation', label: 'Reliable transportation', type: 'bool' },
  { key: 'mentor_assigned', label: 'Mentor assigned', type: 'bool' },
  { key: 'emergency_savings', label: 'Emergency savings', type: 'money' },
  { key: 'notes', label: 'Progress notes (no sensitive details)', type: 'textarea', span: 3 },
];

export default function VillageResidentModelTab() {
  const { data: s } = useThvSettings();
  const update = useUpdateThvSettings();
  const { data: residents = [] } = useThvResidents();

  if (!s) return <p className="text-sm text-muted-foreground">Loading residency model…</p>;

  const selected: string[] = Array.isArray(s.housing_models) ? s.housing_models : [];
  const rules: Record<string, any> = s.residency_rules ?? {};

  const toggleModel = (m: string) =>
    update.mutate({
      housing_models: selected.includes(m) ? selected.filter((x) => x !== m) : [...selected, m],
    });

  const active = residents.filter((r) => r.status === 'Active');
  const avgReadiness = active.length
    ? active.reduce((a, r) => a + residentReadiness(r), 0) / active.length
    : 0;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Resident housing model</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Select one model or combine several. The combination drives rent, savings expectations, and graduation
            criteria.
          </p>
          <div className="flex flex-wrap gap-2">
            {HOUSING_MODELS.map((m) => (
              <button key={m} onClick={() => toggleModel(m)}>
                <Badge
                  variant={selected.includes(m) ? 'default' : 'outline'}
                  className={cn('cursor-pointer text-[11px]', selected.includes(m) && 'bg-prism-teal/80')}
                >
                  {m}
                </Badge>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Residency rules and expectations</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {RESIDENCY_RULE_FIELDS.map((f) => (
            <ThvFieldInput
              key={f.key}
              field={{ key: f.key, label: f.label, type: f.type }}
              value={rules[f.key]}
              onCommit={(v) => update.mutate({ residency_rules: { ...rules, [f.key]: v } })}
            />
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MhStat label="Active residents" value={String(active.length)} />
        <MhStat label="Average independence readiness" value={pct(avgReadiness)} tone="good" />
        <MhStat
          label="Transitioned to permanent housing"
          value={String(residents.filter((r) => r.status === 'Transitioned').length)}
        />
        <MhStat label="Graduated" value={String(residents.filter((r) => r.status === 'Graduated').length)} />
      </div>

      <Card className="border-prism-teal/30 bg-prism-teal/5">
        <CardContent className="flex items-start gap-2 p-4">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-prism-teal" />
          <p className="text-xs">
            Resident privacy is a village policy, not an afterthought. Track progress with anonymous resident codes
            only — no names, birthdates, case numbers, or clinical details. The public dashboards show aggregate
            outcomes only.
          </p>
        </CardContent>
      </Card>

      <ThvRecordManager
        table="thv_residents"
        rows={residents}
        fields={RESIDENT_FIELDS}
        titleKey="resident_code"
        addLabel="Add resident record"
        defaults={{ resident_code: `R-${String(residents.length + 1).padStart(3, '0')}`, status: 'Active' }}
        badgeKey="status"
        subtitle={(r) => `Independence readiness ${pct(residentReadiness(r))}`}
        emptyText="No resident progress records yet."
        renderExtra={(row) => {
          const score = residentReadiness(row);
          return (
            <div className="space-y-2 rounded-lg border border-border/50 bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Movement toward independent living
                </p>
                <span className="text-xs tabular-nums">{pct(score)}</span>
              </div>
              <Progress value={score} className="h-2" />
              <div className="flex flex-wrap gap-1.5">
                {RESIDENT_READINESS_KEYS.map((k) => (
                  <Badge
                    key={k.key}
                    variant={row[k.key] ? 'default' : 'outline'}
                    className={cn('text-[10px]', row[k.key] && 'bg-prism-teal/80')}
                  >
                    {k.label}
                  </Badge>
                ))}
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
