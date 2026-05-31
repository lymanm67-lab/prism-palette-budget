import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tag } from 'lucide-react';
import { InvestmentPlan } from '@/hooks/use-investment-plan';
import {
  useAssetTags, useUpsertAssetTag, useSeedAssetTagsIfEmpty,
  ASSET_KEY_LABELS, TAG_LABELS, AssetKey, AssetTag,
} from '@/hooks/use-asset-tags';

interface Props { plan: InvestmentPlan | null }

const TAG_OPTIONS: AssetTag[] = [
  'household_income', 'retirement_asset', 'legacy_funding_asset', 'medical_reserve',
  'excluded_from_legacy', 'spouse_asset', 'pension_income_only', 'trust_funding_asset',
];

function tagBadgeClass(tag: AssetTag): string {
  switch (tag) {
    case 'legacy_funding_asset':
    case 'trust_funding_asset':
      return 'bg-rose-500/15 text-rose-500 border-rose-500/30';
    case 'medical_reserve':
      return 'bg-sky-500/15 text-sky-500 border-sky-500/30';
    case 'household_income':
    case 'pension_income_only':
      return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
    case 'spouse_asset':
      return 'bg-violet-500/15 text-violet-500 border-violet-500/30';
    case 'excluded_from_legacy':
      return 'bg-muted text-muted-foreground border-border';
    default:
      return 'bg-amber-500/15 text-amber-500 border-amber-500/30';
  }
}

export function AssetTagManager({ plan }: Props) {
  useSeedAssetTagsIfEmpty(plan?.id, plan?.household_id);
  const { data: tags = [] } = useAssetTags(plan?.id);
  const upsert = useUpsertAssetTag();

  if (!plan) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Asset Tags</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Complete the setup wizard to tag assets.
        </CardContent>
      </Card>
    );
  }

  const byKey = new Map(tags.map((t) => [t.asset_key, t]));
  const allKeys: AssetKey[] = [
    'primary_balance', 'employee_contrib', 'employer_contrib', 'raise_redirect',
    'debt_redirect', 'additional_contrib', 'invested_ss', 'hsa',
    'spouse_pension', 'spouse_opers_value', 'spouse_deferred_comp',
  ];

  const updateRow = (asset_key: AssetKey, patch: Partial<{ tag: AssetTag; include_in_legacy: boolean }>) => {
    const existing = byKey.get(asset_key);
    upsert.mutate({
      plan_id: plan.id,
      household_id: plan.household_id,
      asset_key,
      tag: patch.tag ?? existing?.tag ?? 'retirement_asset',
      include_in_legacy: patch.include_in_legacy ?? existing?.include_in_legacy ?? false,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Asset Tags</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Tag each income source so Legacy Protection only counts assets you intend to leave behind.
          Toggle "In Legacy" to include or exclude an asset from the legacy total.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {allKeys.map((key) => {
          const row = byKey.get(key);
          const currentTag: AssetTag = row?.tag ?? 'retirement_asset';
          const inLegacy = row?.include_in_legacy ?? false;
          return (
            <div
              key={key}
              className="flex items-center gap-3 flex-wrap rounded-md border border-border/50 p-3 bg-background/40"
            >
              <div className="flex-1 min-w-[180px]">
                <p className="text-sm font-medium">{ASSET_KEY_LABELS[key]}</p>
                <Badge variant="outline" className={`mt-1 ${tagBadgeClass(currentTag)}`}>
                  {TAG_LABELS[currentTag]}
                </Badge>
              </div>

              <Select value={currentTag} onValueChange={(v) => updateRow(key, { tag: v as AssetTag })}>
                <SelectTrigger className="w-48 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAG_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">{TAG_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">In Legacy</span>
                <Switch
                  checked={inLegacy}
                  onCheckedChange={(v) => updateRow(key, { include_in_legacy: v })}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
