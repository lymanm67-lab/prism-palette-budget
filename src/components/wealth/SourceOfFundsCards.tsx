import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  CONFIDENCE_LABELS,
  FlowResult,
  FundCategory,
  SourceTotalRow,
  money,
  monthLabel,
} from '@/lib/wealth/sourceOfFunds';

interface Props {
  result: FlowResult;
}

export function SourceOfFundsCards({ result }: Props) {
  const byCategory = CATEGORY_ORDER.filter(
    (c) => c !== 'starting_assets' && (result.byCategory[c] || 0) > 0.5,
  );
  const firstBy = new Map<FundCategory, SourceTotalRow>();
  for (const s of result.bySource) if (!firstBy.has(s.category)) firstBy.set(s.category, s);

  const cards: {
    key: string;
    label: string;
    total: number;
    effective: string;
    status: string;
    color: string;
    share: number;
  }[] = [
    {
      key: 'starting_assets',
      label: CATEGORY_LABELS.starting_assets,
      total: result.startingAssets,
      effective: monthLabel(result.months[0]?.month ?? ''),
      status: 'Confirmed',
      color: CATEGORY_COLORS.starting_assets,
      share: 0,
    },
    ...byCategory.map((c) => {
      const src = firstBy.get(c);
      return {
        key: c,
        label: CATEGORY_LABELS[c],
        total: result.byCategory[c] || 0,
        effective: src ? monthLabel(src.effectiveMonth) : '—',
        status: src ? CONFIDENCE_LABELS[src.status] : 'Planned',
        color: CATEGORY_COLORS[c],
        share: result.contributions > 0 ? ((result.byCategory[c] || 0) / result.contributions) * 100 : 0,
      };
    }),
    {
      key: 'growth',
      label: 'Investment growth',
      total: result.growth,
      effective: '—',
      status: 'Illustrative',
      color: 'hsl(160 60% 45%)',
      share: 0,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.key} style={{ borderLeft: `3px solid ${c.color}` }}>
          <CardContent className="space-y-1 p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <Badge variant="secondary" className="text-[10px]">
                {c.status}
              </Badge>
            </div>
            <p className="text-xl font-semibold">{money(c.total)}</p>
            <p className="text-[11px] text-muted-foreground">
              {c.key === 'growth'
                ? 'Never attributed to a funding source'
                : c.key === 'starting_assets'
                  ? `From ${c.effective}`
                  : `From ${c.effective} · ${c.share.toFixed(1)}% of contributions`}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ContributionVsGrowth({ result }: Props) {
  const rows = CATEGORY_ORDER.filter(
    (c) => c !== 'starting_assets' && (result.byCategory[c] || 0) > 0.5,
  );
  return (
    <Card>
      <CardContent className="space-y-1.5 p-4 text-sm">
        <Line label="Starting balance" value={money(result.startingAssets)} />
        {rows.map((c) => (
          <Line key={c} label={CATEGORY_LABELS[c]} value={money(result.byCategory[c] || 0)} />
        ))}
        <Line label="Total contributions" value={money(result.contributions)} bold />
        <Line label="Investment growth" value={money(result.growth)} />
        <Line label="Ending combined invested assets" value={money(result.ending)} bold />
        <div className="grid gap-2 pt-3 sm:grid-cols-3">
          <Bucket label="Retirement" value={money(result.endingByBucket.retirement)} />
          <Bucket label="HSA" value={money(result.endingByBucket.hsa)} />
          <Bucket label="Taxable" value={money(result.endingByBucket.taxable)} />
        </div>
      </CardContent>
    </Card>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between border-b border-border/40 pb-1 ${bold ? 'font-semibold' : ''}`}
    >
      <span className={bold ? '' : 'text-muted-foreground'}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function Bucket({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 p-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-base font-semibold">{value}</p>
    </div>
  );
}
