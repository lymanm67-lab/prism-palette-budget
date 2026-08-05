import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import FdnCrudCard, { type FdnField } from './FdnCrudCard';
import { useFdnImpactMetrics } from '@/hooks/use-foundation-ops';
import { useFdnPillars, useFdnInitiatives, useFdnRoadmap, useFdnSettings, useFdnRelationships } from '@/hooks/use-foundation';
import { useFdnGifts, useFdnInvestments, useFdnCompliance, useFdnGovernance, useFdnSuccession } from '@/hooks/use-foundation-ops';
import { rollupFoundation, currency } from '@/lib/legacy/foundation';
import {
  rollupImpact,
  rollupFunding,
  rollupInvestments,
  rollupCompliance,
  rollupGovernance,
  rollupSuccession,
  legacyScore,
  pct,
  currency0,
} from '@/lib/legacy/foundationOps';

const empty = {
  id: '',
  metric_name: '',
  unit: 'people',
  baseline: 0,
  target: 0,
  actual: 0,
  period: 'annual',
  notes: '',
  sort_order: 0,
};

const fields: FdnField[] = [
  { key: 'metric_name', label: 'Metric', full: true },
  { key: 'unit', label: 'Unit' },
  { key: 'period', label: 'Period', type: 'select', options: [
    { value: 'annual', label: 'annual' },
    { value: 'quarterly', label: 'quarterly' },
    { value: 'cumulative', label: 'cumulative' },
  ] },
  { key: 'baseline', label: 'Baseline', type: 'number' },
  { key: 'target', label: 'Target', type: 'number' },
  { key: 'actual', label: 'Actual to date', type: 'number' },
  { key: 'notes', label: 'Notes', type: 'textarea', full: true },
  { key: 'sort_order', label: 'Sort order', type: 'number' },
];

export default function ImpactTab() {
  const { data: metrics = [] } = useFdnImpactMetrics();
  const { data: pillars = [] } = useFdnPillars();
  const { data: initiatives = [] } = useFdnInitiatives();
  const { data: roadmap = [] } = useFdnRoadmap();
  const { data: relationships = [] } = useFdnRelationships();
  const { data: settings } = useFdnSettings();
  const { data: gifts = [] } = useFdnGifts();
  const { data: holdings = [] } = useFdnInvestments();
  const { data: compliance = [] } = useFdnCompliance();
  const { data: governance = [] } = useFdnGovernance();
  const { data: succession = [] } = useFdnSuccession();

  const base = rollupFoundation(pillars as any, initiatives as any, roadmap as any, settings ?? null);
  const impact = rollupImpact(metrics as any[]);
  const funding = rollupFunding(gifts as any[]);
  const investments = rollupInvestments(holdings as any[], settings ?? null);
  const comp = rollupCompliance(compliance as any[]);
  const gov = rollupGovernance(governance as any[]);
  const succ = rollupSuccession(succession as any[]);

  const score = legacyScore({
    readiness: base.readiness,
    funding,
    investments,
    compliance: comp,
    governance: gov,
    impact,
    succession: succ,
    endowmentTarget: base.endowmentTarget,
  });

  const costPerOutcome = impact.metrics.length && base.deployed > 0
    ? base.deployed / Math.max(1, impact.metrics.reduce((s, m) => s + Number(m.actual || 0), 0))
    : 0;

  return (
    <div className="space-y-6">
      <Card className="glass-card border-prism-amber/30">
        <CardContent className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Institutional Legacy Score</p>
            <div className="mt-1 flex items-end gap-3">
              <span className="text-5xl font-bold text-prism-amber">{score.total}</span>
              <Badge variant="secondary">{score.label}</Badge>
            </div>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              A blend of strategy, funding, endowment discipline, governance, compliance, measured impact, and
              succession — the seven things that separate a checkbook from an institution.
            </p>
            <div className="mt-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Weakest links to work next</p>
              {score.weakest.map((w) => (
                <p key={w.key} className="text-xs text-prism-rose">
                  {w.label} — {pct(w.value)}
                </p>
              ))}
            </div>
          </div>
          <div className="w-full max-w-md space-y-2">
            {score.dimensions.map((d) => (
              <div key={d.key}>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{d.label}</span>
                  <span>{pct(d.value)}</span>
                </div>
                <Progress value={d.value * 100} className="mt-1 h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Metrics on track</p>
            <p className="mt-1 text-2xl font-semibold text-prism-lime">
              {impact.onTrack} / {impact.total}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{pct(impact.average)} average progress</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Dollars deployed</p>
            <p className="mt-1 text-2xl font-semibold">{currency(base.deployed)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{currency(base.committed)} committed</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Cost per measured outcome</p>
            <p className="mt-1 text-2xl font-semibold text-prism-teal">
              {costPerOutcome > 0 ? currency0(costPerOutcome) : '—'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Across all logged metric units</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Network & endowment</p>
            <p className="mt-1 text-2xl font-semibold">{relationships.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              contacts · {currency0(investments.marketValue)} invested
            </p>
          </CardContent>
        </Card>
      </div>

      {impact.atRisk.length > 0 && (
        <Card className="glass-card border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base">At risk — under 35% of target</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {impact.atRisk.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between rounded-md border border-border/50 p-3">
                <p className="text-sm">{m.metric_name}</p>
                <span className="text-xs text-muted-foreground">
                  {Number(m.actual)} / {Number(m.target)} {m.unit}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <FdnCrudCard
        table="fdn_impact_metrics"
        title="Outcome metrics"
        description="What gets measured gets improved. Track baseline, target, and actual for every pillar outcome."
        addLabel="Add metric"
        fields={fields}
        empty={empty}
        rows={impact.metrics}
        requiredKey="metric_name"
        numericKeys={['baseline', 'target', 'actual', 'sort_order']}
        renderRow={(m) => (
          <div>
            <p className="text-sm font-medium">{m.metric_name}</p>
            <p className="text-xs text-muted-foreground">
              {Number(m.actual)} of {Number(m.target)} {m.unit} · {m.period} · baseline {Number(m.baseline)}
            </p>
            <Progress value={(m.progress ?? 0) * 100} className="mt-2 h-2" />
          </div>
        )}
      />

      <p className="text-xs text-muted-foreground">
        Educational planning only. Impact figures are self-reported and should be verified before publication in an
        annual report or grant application.
      </p>
    </div>
  );
}
