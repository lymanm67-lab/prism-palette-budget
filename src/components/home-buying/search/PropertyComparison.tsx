import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GitCompare, X } from 'lucide-react';
import { fmt$ } from '@/lib/home-buying/mortgage-math';
import { scoreListing, projectEquity, type Listing } from '@/lib/home-buying/match-engine';
import type { HomeSearchProfile } from '@/lib/home-buying/search-profile';

interface Props {
  listings: Listing[];
  profile: HomeSearchProfile;
  onRemove: (url: string) => void;
  onClear: () => void;
}

export default function PropertyComparison({ listings, profile, onRemove, onClear }: Props) {
  if (listings.length === 0) return null;

  const rows: Array<{ label: string; get: (l: Listing) => string | number }> = [
    { label: 'Purchase Price', get: (l) => fmt$(l.price) },
    { label: 'Beds / Baths', get: (l) => `${l.beds} / ${l.baths}` },
    { label: 'Sqft', get: (l) => l.sqft?.toLocaleString() ?? '—' },
    { label: 'Lot (acres)', get: (l) => l.lotAcres ?? '—' },
    { label: 'Year Built', get: (l) => l.yearBuilt ?? '—' },
    { label: 'Style', get: (l) => l.style ?? '—' },
    { label: 'Roof Age', get: (l) => l.roofAge != null ? `${l.roofAge} yr` : '—' },
    { label: 'HVAC Age', get: (l) => l.hvacAge != null ? `${l.hvacAge} yr` : '—' },
    { label: 'HOA / mo', get: (l) => fmt$(l.hoaMonthly ?? 0) },
    { label: 'Property Tax %', get: (l) => `${(l.taxPct ?? 1.85).toFixed(2)}%` },
    { label: 'Insurance %', get: (l) => `${(l.insurancePct ?? 0.55).toFixed(2)}%` },
  ];

  return (
    <Card className="prism-card-shine border-border/50">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 font-display">
          <GitCompare className="h-5 w-5 text-prism-teal" />
          Property Comparison ({listings.length}/10)
        </CardTitle>
        <Button size="sm" variant="ghost" onClick={onClear}>Clear all</Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-xs border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-border/40">
              <th className="text-left p-2 font-normal text-muted-foreground w-40">Metric</th>
              {listings.map((l) => (
                <th key={l.url} className="text-left p-2 min-w-[160px]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="line-clamp-2 font-medium">{l.address}</div>
                    <button onClick={() => onRemove(l.url)} className="text-muted-foreground hover:text-red-400">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-border/20">
                <td className="p-2 text-muted-foreground">{r.label}</td>
                {listings.map((l) => (
                  <td key={l.url} className="p-2 font-mono">{r.get(l)}</td>
                ))}
              </tr>
            ))}
            <tr className="border-b border-border/20 bg-prism-teal/5">
              <td className="p-2 text-muted-foreground">Monthly PITI</td>
              {listings.map((l) => {
                const s = scoreListing(l, profile);
                return <td key={l.url} className={`p-2 font-mono font-bold ${s.payment.overBudget ? 'text-red-400' : 'text-emerald-400'}`}>{fmt$(s.payment.totalPITI)}</td>;
              })}
            </tr>
            <tr className="border-b border-border/20">
              <td className="p-2 text-muted-foreground">Neighborhood Score</td>
              {listings.map((l) => {
                const s = scoreListing(l, profile);
                return <td key={l.url} className="p-2 font-mono">{s.breakdown.neighborhood}</td>;
              })}
            </tr>
            <tr className="border-b border-border/20">
              <td className="p-2 text-muted-foreground">Resale Score</td>
              {listings.map((l) => {
                const s = scoreListing(l, profile);
                return <td key={l.url} className="p-2 font-mono">{s.neighborhood?.scores.resale ?? '—'}</td>;
              })}
            </tr>
            <tr className="border-b border-border/20">
              <td className="p-2 text-muted-foreground">Projected 5-yr Equity</td>
              {listings.map((l) => {
                const eq = projectEquity(l, profile, 5);
                return <td key={l.url} className="p-2 font-mono">{fmt$(eq.equity)}</td>;
              })}
            </tr>
            <tr className="border-b border-border/20">
              <td className="p-2 text-muted-foreground">Est. Maintenance / yr</td>
              {listings.map((l) => (
                <td key={l.url} className="p-2 font-mono">{fmt$(l.price * 0.01)}</td>
              ))}
            </tr>
            <tr className="bg-prism-amber/5">
              <td className="p-2 font-bold">Overall Property Score</td>
              {listings.map((l) => {
                const s = scoreListing(l, profile);
                return <td key={l.url} className="p-2 font-display font-bold prism-gradient-text">{s.overall}</td>;
              })}
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
