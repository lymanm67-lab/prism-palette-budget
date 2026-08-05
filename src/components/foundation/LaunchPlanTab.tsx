import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, CheckCircle2, Circle, CircleDot, Compass } from 'lucide-react';
import {
  useFdnSettings,
  useFdnPillars,
  useFdnInitiatives,
  useFdnRoadmap,
  useFdnRelationships,
  useFdnLegacyNodes,
} from '@/hooks/use-foundation';
import {
  useFdnGifts,
  useFdnInvestments,
  useFdnGovernance,
  useFdnCompliance,
  useFdnGrants,
  useFdnImpactMetrics,
  useFdnSuccession,
  useFdnDocuments,
  useFdnInsurance,
} from '@/hooks/use-foundation-ops';
import { buildFlow, summarizeFlow, type FlowStep } from '@/lib/legacy/foundationPhases';

interface Props {
  onNavigate: (tab: string) => void;
}

export default function LaunchPlanTab({ onNavigate }: Props) {
  const settings = useFdnSettings();
  const pillars = useFdnPillars();
  const initiatives = useFdnInitiatives();
  const roadmap = useFdnRoadmap();
  const relationships = useFdnRelationships();
  const legacyNodes = useFdnLegacyNodes();
  const gifts = useFdnGifts();
  const investments = useFdnInvestments();
  const governance = useFdnGovernance();
  const compliance = useFdnCompliance();
  const grants = useFdnGrants();
  const impact = useFdnImpactMetrics();
  const succession = useFdnSuccession();
  const documents = useFdnDocuments();
  const insurance = useFdnInsurance();

  const { phases, nextStep, overall } = useMemo(
    () =>
      summarizeFlow(
        buildFlow({
          settings: settings.data ?? null,
          pillars: pillars.data ?? [],
          initiatives: initiatives.data ?? [],
          roadmap: roadmap.data ?? [],
          relationships: relationships.data ?? [],
          legacyNodes: legacyNodes.data ?? [],
          gifts: gifts.data ?? [],
          investments: investments.data ?? [],
          governance: governance.data ?? [],
          compliance: compliance.data ?? [],
          grants: grants.data ?? [],
          impact: impact.data ?? [],
          succession: succession.data ?? [],
          documents: documents.data ?? [],
          insurance: insurance.data ?? [],
        }),
      ),
    [
      settings.data,
      pillars.data,
      initiatives.data,
      roadmap.data,
      relationships.data,
      legacyNodes.data,
      gifts.data,
      investments.data,
      governance.data,
      compliance.data,
      grants.data,
      impact.data,
      succession.data,
      documents.data,
      insurance.data,
    ],
  );

  const renderStep = (step: FlowStep, isNext: boolean, last: boolean) => (
    <div key={step.id} className="relative pl-8">
      {!last && <span className="absolute left-[11px] top-6 h-full w-px bg-border/60" aria-hidden />}
      <span className="absolute left-0 top-1">
        {step.done ? (
          <CheckCircle2 className="h-[22px] w-[22px] text-prism-teal" />
        ) : isNext ? (
          <CircleDot className="h-[22px] w-[22px] text-prism-amber" />
        ) : (
          <Circle className="h-[22px] w-[22px] text-muted-foreground/50" />
        )}
      </span>

      <div className={`rounded-lg border p-3 ${isNext ? 'border-prism-amber/60 bg-prism-amber/5' : 'border-border/50'}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium">{step.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{step.what}</p>
          </div>
          <div className="flex items-center gap-2">
            {isNext && <Badge className="bg-prism-amber text-xs text-background">Do next</Badge>}
            <Button size="sm" variant={isNext ? 'default' : 'outline'} className="h-7 gap-1 text-xs" onClick={() => onNavigate(step.tab)}>
              {step.tabLabel} <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <Progress value={Math.round(Math.max(0, Math.min(1, step.progress)) * 100)} className="h-1.5" />
          <span className="w-10 shrink-0 text-right text-xs text-muted-foreground">
            {Math.round(Math.max(0, Math.min(1, step.progress)) * 100)}%
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{step.status}</p>
        <p className="mt-1 text-xs">
          <span className="text-muted-foreground">Feeds forward: </span>
          {step.output}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Compass className="h-4 w-4 text-prism-amber" /> Foundation operating flow
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Every tab in this module is one step in a single sequence: Plan sets the targets, Set Up creates the legal and
            governance machinery, Operate runs the annual raise-invest-grant-measure-file cycle, and Legacy makes it
            outlast you. Each step shows what it hands to the next one, so nothing gets built out of order.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Progress value={Math.round(overall * 100)} className="h-2" />
            <span className="shrink-0 text-sm font-semibold">{Math.round(overall * 100)}% complete</span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {phases.map((p) => (
              <div
                key={p.key}
                className={`rounded-lg border p-3 ${
                  p.state === 'active'
                    ? 'border-prism-amber/60 bg-prism-amber/5'
                    : p.state === 'complete'
                      ? 'border-prism-teal/50 bg-prism-teal/5'
                      : 'border-border/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold">{p.label}</p>
                  <Badge variant={p.state === 'upcoming' ? 'outline' : 'secondary'} className="text-xs capitalize">
                    {p.state}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{p.purpose}</p>
                <p className="mt-2 text-xs font-medium">
                  {p.done}/{p.total} steps · {Math.round(p.progress * 100)}%
                </p>
              </div>
            ))}
          </div>

          {nextStep && (
            <div className="rounded-lg border border-prism-amber/60 bg-prism-amber/5 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Your next move</p>
              <p className="mt-1 text-sm font-medium">{nextStep.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{nextStep.what}</p>
              <Button size="sm" className="mt-2 gap-1" onClick={() => onNavigate(nextStep.tab)}>
                Open {nextStep.tabLabel} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {phases.map((p) => (
        <Card key={p.key} className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">{p.label}</CardTitle>
            <p className="text-xs text-muted-foreground">{p.purpose}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {p.steps.map((step, i) => renderStep(step, nextStep?.id === step.id, i === p.steps.length - 1))}
          </CardContent>
        </Card>
      ))}

      <p className="text-xs text-muted-foreground">
        Educational planning only. Formation, exemption, distribution, and self-dealing rules should be confirmed with your
        attorney and CPA before filing or granting.
      </p>
    </div>
  );
}
