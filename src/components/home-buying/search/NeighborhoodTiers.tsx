import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Star, TrendingUp, ShieldCheck, DollarSign } from 'lucide-react';
import { rankedNeighborhoods } from '@/lib/home-buying/match-engine';
import { TIER_META } from '@/lib/home-buying/akron-neighborhoods';
import { fmt$ } from '@/lib/home-buying/mortgage-math';

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < count ? 'fill-prism-amber text-prism-amber' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  );
}

function MiniBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-[10px]">
      <div className="flex justify-between text-muted-foreground">
        <span>{label}</span><span className="font-mono">{value}</span>
      </div>
      <div className="h-1 rounded-full bg-border/40 overflow-hidden mt-0.5">
        <div className="h-full bg-gradient-to-r from-prism-teal to-prism-amber" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function NeighborhoodTiers() {
  const ranked = rankedNeighborhoods();
  const byTier: Record<1 | 2 | 3, typeof ranked> = { 1: [], 2: [], 3: [] };
  ranked.forEach((n) => byTier[n.tier].push(n));

  return (
    <Card className="prism-card-shine border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-display">
          <MapPin className="h-5 w-5 text-prism-teal" />
          Neighborhood Match Engine — Akron, OH
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Ranked using 11 factors weighted per your criteria (affordability 20%, appreciation 15%, resale 10%, stability 10%, owner-occupancy 10%, crime 10%, taxes 10%, insurance 5%, schools 5%, commute 5%, amenities 5%).
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {([1, 2, 3] as const).map((tier) => {
          if (byTier[tier].length === 0) return null;
          const meta = TIER_META[tier];
          return (
            <div key={tier} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={`px-2 py-0.5 rounded-full text-xs font-bold ${meta.bg} ${meta.color} border ${meta.border}`}>
                  Tier {tier} — {meta.label}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {byTier[tier].map((n) => (
                  <div key={n.id} className={`rounded-lg border ${meta.border} bg-card/40 p-3 space-y-2`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-display font-bold text-sm">{n.name}</div>
                        {n.zips && <div className="text-[10px] text-muted-foreground">ZIP {n.zips.join(', ')}</div>}
                      </div>
                      <div className="text-right">
                        <div className="font-display text-xl font-bold prism-gradient-text">{n.overall}</div>
                        <Stars count={n.stars} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{fmt$(n.medianPrice)}</span>
                      <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{n.avgPropertyTaxPct}% tax</span>
                      <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" />{n.scores.crime}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                      <MiniBar label="Afford." value={n.scores.affordability} />
                      <MiniBar label="Appreciation" value={n.scores.appreciation} />
                      <MiniBar label="Stability" value={n.scores.stability} />
                      <MiniBar label="Owner-occ." value={n.scores.ownerOccupancy} />
                      <MiniBar label="Schools" value={n.scores.schools} />
                      <MiniBar label="Resale" value={n.scores.resale} />
                    </div>
                    <ul className="text-[11px] text-muted-foreground list-disc list-inside space-y-0.5">
                      {n.strengths.slice(0, 3).map((s) => <li key={s} className="line-clamp-1">{s}</li>)}
                    </ul>
                    {n.cautions && (
                      <div className="text-[10px] text-prism-amber">⚠︎ {n.cautions[0]}</div>
                    )}
                    <div className="grid grid-cols-3 gap-1 pt-1 border-t border-border/30 text-[10px]">
                      <div><div className="text-muted-foreground">Walk</div><div className="font-mono">{n.walkability}</div></div>
                      <div><div className="text-muted-foreground">Parks</div><div className="font-mono">{n.parks}</div></div>
                      <div><div className="text-muted-foreground">Dining</div><div className="font-mono">{n.dining}</div></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
