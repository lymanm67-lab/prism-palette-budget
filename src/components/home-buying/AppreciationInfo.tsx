import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

// Sources: Zillow Home Value Index & FHFA HPI for Akron, OH metro (as of 2025).
// 1-yr figure reflects recent softening; 5-yr and 10-yr are annualized (CAGR).
const RATES = [
  { label: '1-year', value: '2.5%', note: 'Recent 12 months' },
  { label: '5-year (avg/yr)', value: '6.8%', note: 'Post-2020 surge included' },
  { label: '10-year (avg/yr)', value: '5.1%', note: 'Long-run CAGR' },
  { label: 'Long-term (30-yr)', value: '3.0–3.5%', note: 'Typical Midwest baseline' },
];

export default function AppreciationInfo() {
  return (
    <Card className="prism-card-shine border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-display text-base">
          <TrendingUp className="h-5 w-5 text-prism-teal" />
          Home Appreciation — Akron, OH
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {RATES.map((r) => (
            <div key={r.label} className="rounded-lg border border-border/40 bg-card/40 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{r.label}</div>
              <div className="font-display text-xl font-bold prism-gradient-text">{r.value}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{r.note}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Akron's market cooled from its 2021–2022 double-digit run but remains one of the more affordable Ohio metros.
          Neighborhood-level appreciation varies widely — West Akron, Highland Square, and Merriman Valley have historically
          outpaced the metro average, while some east-side ZIPs lag. Sources: Zillow Home Value Index, FHFA House Price Index.
        </p>
      </CardContent>
    </Card>
  );
}
