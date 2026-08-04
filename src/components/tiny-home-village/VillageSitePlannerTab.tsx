import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { MhStat } from '@/components/medical-housing/MhFields';
import ThvRecordManager, { type ThvField } from '@/components/tiny-home-village/ThvRecordManager';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useThvSites } from '@/hooks/use-tiny-home-village';
import {
  SITE_SCORE_CRITERIA,
  SITE_APPROVAL_STATUSES,
  SUPPORT_LEVELS,
  scoreSite,
  money,
} from '@/lib/legacy/tinyHomeVillage';

const FIELDS: ThvField[] = [
  { key: 'name', label: 'Property name', type: 'text' },
  { key: 'street_address', label: 'Street address', type: 'text' },
  { key: 'city', label: 'City', type: 'text' },
  { key: 'county', label: 'County', type: 'text' },
  { key: 'parcel_number', label: 'Parcel number', type: 'text' },
  { key: 'asking_price', label: 'Asking price', type: 'money' },
  { key: 'acreage', label: 'Acreage', type: 'number' },
  { key: 'zoning_classification', label: 'Zoning classification', type: 'text' },
  { key: 'current_use', label: 'Current property use', type: 'text' },
  { key: 'homes_allowed', label: 'Homes potentially allowed', type: 'number' },
  { key: 'water_access', label: 'Water access', type: 'bool' },
  { key: 'sewer_access', label: 'Sewer access', type: 'bool' },
  { key: 'electric_access', label: 'Electric access', type: 'bool' },
  { key: 'gas_access', label: 'Gas access', type: 'bool' },
  { key: 'internet_access', label: 'Internet access', type: 'bool' },
  { key: 'road_access', label: 'Road access', type: 'text' },
  { key: 'transit_access', label: 'Public transportation access', type: 'text' },
  { key: 'dist_employers', label: 'Distance to employers (mi)', type: 'number' },
  { key: 'dist_education', label: 'Distance to colleges / trade schools (mi)', type: 'number' },
  { key: 'dist_grocery', label: 'Distance to grocery stores (mi)', type: 'number' },
  { key: 'dist_healthcare', label: 'Distance to healthcare (mi)', type: 'number' },
  { key: 'dist_social_services', label: 'Distance to social services (mi)', type: 'number' },
  { key: 'environmental_concerns', label: 'Environmental concerns', type: 'text', span: 2 },
  { key: 'demolition_required', label: 'Demolition requirements', type: 'text' },
  { key: 'site_prep_required', label: 'Site preparation requirements', type: 'text', span: 2 },
  { key: 'est_infrastructure_cost', label: 'Estimated infrastructure costs', type: 'money' },
  { key: 'neighborhood_support', label: 'Neighborhood support level', type: 'select', options: SUPPORT_LEVELS },
  { key: 'government_support', label: 'Government support level', type: 'select', options: SUPPORT_LEVELS },
  { key: 'approval_status', label: 'Approval status', type: 'select', options: SITE_APPROVAL_STATUSES },
  { key: 'notes', label: 'Notes', type: 'textarea', span: 3 },
];

const RECO_TONE: Record<string, string> = {
  'Strong Village Site': 'border-prism-teal/50 bg-prism-teal/10 text-prism-teal',
  'Promising, Additional Review Needed': 'border-prism-amber/50 bg-prism-amber/10 text-prism-amber',
  'Approval Risk': 'border-prism-orange/50 bg-prism-orange/10 text-prism-orange',
  'Financial Risk': 'border-prism-orange/50 bg-prism-orange/10 text-prism-orange',
  'Do Not Pursue': 'border-prism-rose/50 bg-prism-rose/10 text-prism-rose',
};

export default function VillageSitePlannerTab() {
  const { data: sites = [] } = useThvSites();

  const strong = sites.filter((s) => scoreSite(s.scores ?? {}).recommendation === 'Strong Village Site').length;
  const avgPrice = sites.length
    ? sites.reduce((a, s) => a + (Number(s.asking_price) || 0), 0) / sites.length
    : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MhStat label="Candidate sites" value={String(sites.length)} />
        <MhStat label="Strong village sites" value={String(strong)} tone={strong ? 'good' : 'neutral'} />
        <MhStat label="Average asking price" value={money(avgPrice)} />
        <MhStat
          label="Approved sites"
          value={String(sites.filter((s) => s.approval_status === 'Approved').length)}
        />
      </div>

      <Card className="border-border/60 bg-muted/20">
        <CardContent className="p-4 text-xs text-muted-foreground">
          Score each site 1 (poor) to 5 (excellent). The recommendation is generated automatically and flags whether
          the limiting factor is approval risk or financial risk. Verify tiny home regulations and minimum dwelling
          size rules with local planning officials before purchase.
        </CardContent>
      </Card>

      <ThvRecordManager
        table="thv_sites"
        rows={sites}
        fields={FIELDS}
        titleKey="name"
        addLabel="Add candidate site"
        defaults={{ name: 'New candidate site', approval_status: 'Not Started', scores: {} }}
        badgeKey="approval_status"
        subtitle={(r) => {
          const res = scoreSite(r.scores ?? {});
          return `${[r.city, r.county].filter(Boolean).join(', ') || 'Location TBD'} · ${res.recommendation}`;
        }}
        emptyText="No candidate land tracked yet."
        renderExtra={(row, save) => {
          const scores: Record<string, number> = row.scores ?? {};
          const res = scoreSite(scores);
          const setScore = (key: string, v: number) => save({ scores: { ...scores, [key]: v } });

          return (
            <div className="space-y-3 rounded-lg border border-border/50 bg-muted/20 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Site scorecard
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[11px]">
                    Avg {res.average.toFixed(1)} / 5
                  </Badge>
                  <Badge className={cn('border text-[11px]', RECO_TONE[res.recommendation])} variant="outline">
                    {res.recommendation}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {SITE_SCORE_CRITERIA.map((c) => (
                  <div key={c.key} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{c.label}</Label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Button
                          key={n}
                          size="icon"
                          variant={scores[c.key] === n ? 'default' : 'outline'}
                          className="h-7 w-7 text-xs"
                          onClick={() => setScore(c.key, n)}
                        >
                          {n}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">{res.reason}</p>
            </div>
          );
        }}
      />
    </div>
  );
}
