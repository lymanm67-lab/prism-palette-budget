import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Landmark, Users, Target, TrendingUp, HeartHandshake, CalendarCheck } from 'lucide-react';
import {
  useFdnPillars,
  useFdnInitiatives,
  useFdnRoadmap,
  useFdnSettings,
  useFdnRelationships,
} from '@/hooks/use-foundation';
import { rollupFoundation, readinessLabel, currency, relationshipPriority } from '@/lib/legacy/foundation';

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  color = 'text-prism-teal',
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className={`h-4 w-4 ${color}`} />
          {label}
        </div>
        <p className="mt-2 text-2xl font-semibold">{value}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function FoundationDashboardTab() {
  const { data: pillars = [] } = useFdnPillars();
  const { data: initiatives = [] } = useFdnInitiatives();
  const { data: roadmap = [] } = useFdnRoadmap();
  const { data: relationships = [] } = useFdnRelationships();
  const { data: settings } = useFdnSettings();

  const r = rollupFoundation(pillars as any, initiatives as any, roadmap as any, settings ?? null);

  const outreach = [...relationships]
    .sort((a: any, b: any) => relationshipPriority(b) - relationshipPriority(a))
    .slice(0, 5);

  const nextPhase = [...roadmap].find((x: any) => x.status !== 'complete') as any;

  return (
    <div className="space-y-6">
      <Card className="glass-card border-prism-amber/30">
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Legacy Readiness</p>
            <div className="mt-1 flex items-end gap-3">
              <span className="text-4xl font-bold text-prism-amber">{r.readiness}</span>
              <Badge variant="secondary">{readinessLabel(r.readiness)}</Badge>
            </div>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {settings?.tagline ?? 'Capital with character. Impact you can measure.'}
            </p>
          </div>
          <div className="w-full max-w-sm space-y-3">
            <div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Endowment</span>
                <span>
                  {currency(r.endowmentCurrent)} / {currency(r.endowmentTarget)}
                </span>
              </div>
              <Progress value={r.endowmentProgress * 100} className="mt-1 h-2" />
            </div>
            <div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>People served</span>
                <span>
                  {r.peopleServed} / {r.targetPeople}
                </span>
              </div>
              <Progress value={r.reachProgress * 100} className="mt-1 h-2" />
            </div>
            <div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Five-year roadmap</span>
                <span>
                  {r.roadmapComplete} / {r.roadmapTotal} phases
                </span>
              </div>
              <Progress value={r.roadmapProgress * 100} className="mt-1 h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat
          icon={Landmark}
          label="Planned annual giving"
          value={currency(r.annualBudget)}
          sub={`${r.activePillars} of ${pillars.length} pillars active`}
          color="text-prism-amber"
        />
        <Stat
          icon={Target}
          label="Committed to initiatives"
          value={currency(r.committed)}
          sub={`${r.activeInitiatives} initiatives running`}
        />
        <Stat
          icon={TrendingUp}
          label="Dollars deployed"
          value={currency(r.deployed)}
          sub={`${Math.round(r.deploymentRate * 100)}% of commitments`}
          color="text-prism-lime"
        />
        <Stat
          icon={Users}
          label="People served"
          value={String(r.peopleServed)}
          sub={r.costPerBeneficiary > 0 ? `${currency(r.costPerBeneficiary)} per person` : 'Log outcomes to see cost per person'}
          color="text-prism-rose"
        />
        <Stat
          icon={HeartHandshake}
          label="Relationship network"
          value={String(relationships.length)}
          sub="Funders, partners, advisors, community"
          color="text-prism-indigo"
        />
        <Stat
          icon={CalendarCheck}
          label="Current phase"
          value={nextPhase?.phase_label ?? 'Roadmap complete'}
          sub={nextPhase ? nextPhase.title : 'All phases marked complete'}
          color="text-prism-teal"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Pillar allocation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pillars.length === 0 && <p className="text-sm text-muted-foreground">Pillars are being set up…</p>}
            {(pillars as any[]).map((p) => {
              const share = r.annualBudget > 0 ? (Number(p.annual_budget) / r.annualBudget) * 100 : 0;
              return (
                <div key={p.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className={p.color}>{p.name}</span>
                    <span className="text-muted-foreground">
                      {currency(Number(p.annual_budget))} · {Math.round(share)}%
                    </span>
                  </div>
                  <Progress value={share} className="mt-1 h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Priority outreach</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {outreach.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Add funders, partners, and advisors in the Relationship Map to see who to contact next.
              </p>
            )}
            {outreach.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between rounded-md border border-border/50 p-3">
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[p.role, p.organization].filter(Boolean).join(' · ') || p.category}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>Influence {p.influence}/5</p>
                  <p>Strength {p.strength}/5</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Educational planning only. Not legal, tax, accounting, or investment advice. Confirm all charitable structures
        with a licensed attorney and CPA.
      </p>
    </div>
  );
}
