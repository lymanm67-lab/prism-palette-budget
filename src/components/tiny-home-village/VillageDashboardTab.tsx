import { Heart, Quote } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { MhStat, MhNumberField, MhTextField } from '@/components/medical-housing/MhFields';
import { ThvFieldInput } from '@/components/tiny-home-village/ThvRecordManager';
import { useThvSettings, useUpdateThvSettings, useThvRollup } from '@/hooks/use-tiny-home-village';
import {
  PROGRESS_TRACKS,
  RISK_RATINGS,
  VILLAGE_LEGACY_STATEMENT,
  SHARED_FAMILY_LEGACY_STATEMENT,
  VILLAGE_MILESTONE,
  money,
  pct,
} from '@/lib/legacy/tinyHomeVillage';

export default function VillageDashboardTab() {
  const { data: s } = useThvSettings();
  const update = useUpdateThvSettings();
  const roll = useThvRollup();

  if (!s) return <p className="text-sm text-muted-foreground">Loading village plan…</p>;

  const progress: Record<string, number> = s.progress ?? {};
  const setProgress = (key: string, v: number) =>
    update.mutate({ progress: { ...progress, [key]: Math.max(0, Math.min(100, v)) } });

  const total = roll.projectGoal;
  const secured = Number(s.funding_secured) || 0;
  const pending = Number(s.funding_pending) || 0;
  const gap = Math.max(0, total - secured - pending);

  return (
    <div className="space-y-6">
      <Card className="border-prism-rose/30 bg-gradient-to-br from-prism-rose/10 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Heart className="h-5 w-5 text-prism-rose" />
            Tiny Home Village Legacy Goal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-relaxed">{s.mission}</p>
          <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/30 p-3">
            <Quote className="mt-0.5 h-4 w-4 shrink-0 text-prism-rose" />
            <p className="text-sm italic">{VILLAGE_LEGACY_STATEMENT}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MhStat label="Current development phase" value={s.current_phase} />
        <MhStat label="Target location" value={s.target_location} />
        <MhStat label="Target opening date" value={s.target_opening_date ?? 'Not set'} />
        <MhStat label="Planned homes" value={String(s.planned_homes)} />
        <MhStat label="Residents to be served" value={String(s.residents_served)} />
        <MhStat label="Estimated land cost" value={money(s.est_land_cost)} />
        <MhStat label="Estimated construction cost" value={money(s.est_construction_cost)} />
        <MhStat label="Estimated total project cost" value={money(total)} hint="From active development budget" />
        <MhStat label="Funding secured" value={money(secured)} tone="good" />
        <MhStat label="Funding pending" value={money(pending)} tone="warn" />
        <MhStat label="Remaining funding gap" value={money(gap)} tone={gap > 0 ? 'bad' : 'good'} />
        <MhStat
          label="Percentage funded"
          value={pct(total > 0 ? ((secured + pending) / total) * 100 : 0)}
        />
        <MhStat label="Community partners" value={String(roll.partnerCount || s.community_partners)} />
        <MhStat label="Major approvals completed" value={String(s.approvals_completed)} />
        <MhStat label="Next milestone" value={s.next_milestone} />
        <MhStat
          label="Overall risk rating"
          value={s.risk_rating}
          tone={s.risk_rating === 'Low' ? 'good' : s.risk_rating === 'Critical' ? 'bad' : 'warn'}
          hint={roll.highRisks ? `${roll.highRisks} high/critical open risks` : undefined}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Development progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {PROGRESS_TRACKS.map((t) => (
            <div key={t.key} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm">{t.label}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={progress[t.key] ?? 0}
                    key={String(progress[t.key] ?? 0)}
                    onBlur={(e) => {
                      const v = parseFloat(e.target.value);
                      if (Number.isFinite(v) && v !== (progress[t.key] ?? 0)) setProgress(t.key, v);
                    }}
                    className="h-7 w-16 rounded-md border border-border/60 bg-background px-2 text-right text-xs"
                  />
                  <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
                    {pct(progress[t.key] ?? 0)}
                  </span>
                </div>
              </div>
              <Progress value={progress[t.key] ?? 0} className="h-2" />
            </div>
          ))}
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground">
            Development task checklist: {roll.completedTasks} of {roll.totalTasks} complete (
            {pct(roll.taskCompletionPct)}).
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Village plan settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MhTextField label="Current development phase" value={s.current_phase} onCommit={(v) => update.mutate({ current_phase: v })} />
          <MhTextField label="Target location" value={s.target_location} onCommit={(v) => update.mutate({ target_location: v })} />
          <ThvFieldInput
            field={{ key: 'target_opening_date', label: 'Target opening date', type: 'date' }}
            value={s.target_opening_date}
            onCommit={(v) => update.mutate({ target_opening_date: v })}
          />
          <MhNumberField label="Planned homes" value={s.planned_homes} onCommit={(v) => update.mutate({ planned_homes: v })} />
          <MhNumberField label="Residents to be served" value={s.residents_served} onCommit={(v) => update.mutate({ residents_served: v })} />
          <MhNumberField label="Estimated land cost" value={s.est_land_cost} onCommit={(v) => update.mutate({ est_land_cost: v })} suffix="$" step={1000} />
          <MhNumberField label="Estimated construction cost" value={s.est_construction_cost} onCommit={(v) => update.mutate({ est_construction_cost: v })} suffix="$" step={1000} />
          <MhNumberField label="Funding secured" value={s.funding_secured} onCommit={(v) => update.mutate({ funding_secured: v })} suffix="$" step={1000} />
          <MhNumberField label="Funding pending" value={s.funding_pending} onCommit={(v) => update.mutate({ funding_pending: v })} suffix="$" step={1000} />
          <MhNumberField label="Major approvals completed" value={s.approvals_completed} onCommit={(v) => update.mutate({ approvals_completed: v })} />
          <MhTextField label="Next milestone" value={s.next_milestone} onCommit={(v) => update.mutate({ next_milestone: v })} />
          <MhTextField label="Responsible owner" value={s.responsible_owner} onCommit={(v) => update.mutate({ responsible_owner: v })} />
          <ThvFieldInput
            field={{ key: 'risk_rating', label: 'Overall risk rating', type: 'select', options: RISK_RATINGS }}
            value={s.risk_rating}
            onCommit={(v) => update.mutate({ risk_rating: v })}
          />
          <ThvFieldInput
            field={{ key: 'mission', label: 'Mission statement', type: 'textarea', span: 3 }}
            value={s.mission}
            onCommit={(v) => update.mutate({ mission: v })}
          />
        </CardContent>
      </Card>

      <Card className="border-prism-teal/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{VILLAGE_MILESTONE.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{VILLAGE_MILESTONE.description}</p>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Success measured by
            </p>
            <div className="flex flex-wrap gap-1.5">
              {VILLAGE_MILESTONE.successMeasures.map((m) => (
                <Badge key={m} variant="outline" className="text-[11px]">
                  {m}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-prism-amber/30 bg-prism-amber/5">
        <CardContent className="p-4">
          <p className="text-sm italic">{SHARED_FAMILY_LEGACY_STATEMENT}</p>
        </CardContent>
      </Card>
    </div>
  );
}
