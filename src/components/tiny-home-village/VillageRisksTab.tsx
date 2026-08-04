import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MhStat } from '@/components/medical-housing/MhFields';
import ThvRecordManager, { type ThvField } from '@/components/tiny-home-village/ThvRecordManager';
import { cn } from '@/lib/utils';
import { useThvRisks } from '@/hooks/use-tiny-home-village';
import { RISK_RATINGS, RISK_STATUSES, overallRiskRating } from '@/lib/legacy/tinyHomeVillage';

const FIELDS: ThvField[] = [
  { key: 'risk', label: 'Risk', type: 'text' },
  { key: 'description', label: 'Description', type: 'textarea', span: 2 },
  { key: 'probability', label: 'Probability', type: 'select', options: RISK_RATINGS },
  { key: 'financial_impact', label: 'Financial impact', type: 'select', options: RISK_RATINGS },
  { key: 'program_impact', label: 'Program impact', type: 'select', options: RISK_RATINGS },
  { key: 'overall_rating', label: 'Overall rating', type: 'select', options: RISK_RATINGS },
  { key: 'mitigation_plan', label: 'Mitigation plan', type: 'textarea', span: 3 },
  { key: 'owner', label: 'Responsible owner', type: 'text' },
  { key: 'review_date', label: 'Review date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: RISK_STATUSES },
];

const TONE: Record<string, string> = {
  Low: 'border-prism-teal/50 bg-prism-teal/10 text-prism-teal',
  Moderate: 'border-prism-amber/50 bg-prism-amber/10 text-prism-amber',
  High: 'border-prism-orange/50 bg-prism-orange/10 text-prism-orange',
  Critical: 'border-prism-rose/50 bg-prism-rose/10 text-prism-rose',
};

export default function VillageRisksTab() {
  const { data: risks = [] } = useThvRisks();

  const open = risks.filter((r) => r.status !== 'Closed');
  const count = (rating: string) => open.filter((r) => r.overall_rating === rating).length;
  const unmitigated = open.filter((r) => !r.mitigation_plan).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MhStat label="Open risks" value={String(open.length)} />
        <MhStat label="Critical" value={String(count('Critical'))} tone={count('Critical') ? 'bad' : 'good'} />
        <MhStat label="High" value={String(count('High'))} tone={count('High') ? 'warn' : 'good'} />
        <MhStat label="Missing a mitigation plan" value={String(unmitigated)} tone={unmitigated ? 'warn' : 'good'} />
      </div>

      <Card className="border-border/60 bg-muted/20">
        <CardContent className="p-4 text-xs text-muted-foreground">
          Set probability, financial impact, and program impact — the suggested overall rating appears next to each
          risk. Zoning denial, funding shortfall, operating deficit, and resident safety deserve written mitigation
          plans before construction begins.
        </CardContent>
      </Card>

      <ThvRecordManager
        table="thv_risks"
        rows={risks}
        fields={FIELDS}
        titleKey="risk"
        addLabel="Add risk"
        defaults={{ risk: 'New risk', probability: 'Moderate', overall_rating: 'Moderate', status: 'Open' }}
        badgeKey="overall_rating"
        subtitle={(r) => `${r.status} · owner ${r.owner || 'unassigned'}`}
        emptyText="No risks tracked yet."
        renderExtra={(row, save) => {
          const suggested = overallRiskRating(row.probability, row.financial_impact, row.program_impact);
          return (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/50 bg-muted/20 p-3">
              <span className="text-xs text-muted-foreground">Suggested overall rating:</span>
              <Badge variant="outline" className={cn('border text-[11px]', TONE[suggested])}>
                {suggested}
              </Badge>
              {suggested !== row.overall_rating && (
                <button
                  className="text-xs underline text-muted-foreground hover:text-foreground"
                  onClick={() => save({ overall_rating: suggested })}
                >
                  Apply
                </button>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}
