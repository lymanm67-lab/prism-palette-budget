import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Building2, AlertTriangle, Sparkles } from 'lucide-react';
import { MhStat } from './MhFields';
import { useMhRollup } from '@/hooks/use-mh-rollup';
import {
  PRIMARY_RECOMMENDATION, SECONDARY_RECOMMENDATION,
  AKRON_ADVANTAGES, CLEVELAND_ADVANTAGES, CLEVELAND_CAUTIONS,
  fmt, fmtPct,
} from '@/lib/legacy/medicalHousing';

export default function MarketDashboardTab() {
  const r = useMhRollup();
  const income = r.incomeTotals;
  const startup = r.startupTotals;
  const market = r.bestMarket;

  return (
    <div className="space-y-6">
      {/* Primary recommendation */}
      <Card className="border-prism-teal/40 bg-prism-teal/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-prism-teal" />
            Primary Recommendation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-relaxed">{PRIMARY_RECOMMENDATION}</p>
          <div className="rounded-lg border border-border/60 bg-background/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Secondary Recommendation
            </p>
            <p className="text-sm leading-relaxed">{SECONDARY_RECOMMENDATION}</p>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MhStat label="Best Current Market" value={market?.name ?? '—'} hint={market?.city ?? undefined} tone="good" />
        <MhStat
          label="Target Purchase Price"
          value={market ? `${fmt(market.price_low)} – ${fmt(market.price_high)}` : '—'}
          hint="From the selected market card"
        />
        <MhStat
          label="Startup Capital Needed"
          value={fmt(startup?.totalStartup)}
          hint={r.activeStartup?.name}
          tone={startup && startup.totalStartup > 80000 ? 'warn' : 'good'}
        />
        <MhStat
          label="Target Monthly Rent"
          value={fmt(income?.monthlyGross)}
          hint={r.activeIncome?.name}
        />
        <MhStat label="Est. Annual Gross Income" value={fmt(income?.annualGross)} />
        <MhStat
          label="Est. Annual Net Cash Flow"
          value={fmt(income?.netAnnualCashFlow)}
          tone={(income?.netAnnualCashFlow ?? 0) < 0 ? 'bad' : 'good'}
          hint={income?.cashOnCashPct !== null && income?.cashOnCashPct !== undefined ? `${fmtPct(income.cashOnCashPct)} cash-on-cash` : undefined}
        />
        <MhStat label="Available Reserves" value={fmt(r.reserves)} hint="Set on the Forecast tab" />
        <MhStat
          label="Funding Gap"
          value={fmt(r.fundingGap)}
          tone={r.fundingGap > 0 ? 'warn' : 'good'}
          hint="Startup capital minus reserves"
        />
        <MhStat label="Properties Under Review" value={String(r.propertiesUnderReview)} />
        <MhStat label="Referral Partners Contacted" value={String(r.referralPartnersContacted)} />
        <MhStat label="Hospital Systems Served" value={String(r.hospitalSystemsServed)} />
        <MhStat
          label="Allocated to Tiny Home Village"
          value={fmt(r.village?.annualAllocation)}
          hint="Per year at current allocation"
        />
      </div>

      {/* Market priority */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-prism-teal/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-prism-teal" />
                Primary Launch Market — Akron, Ohio
              </CardTitle>
              <Badge className="bg-prism-teal/15 text-prism-teal border-prism-teal/30">Pilot</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Akron is the preferred pilot market because it provides:
            </p>
            <ul className="space-y-1.5 text-sm">
              {AKRON_ADVANTAGES.map((a) => (
                <li key={a} className="flex gap-2">
                  <span className="text-prism-teal">•</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-prism-amber/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-prism-amber" />
                Secondary Expansion — Cleveland &amp; Cleveland Heights
              </CardTitle>
              <Badge className="bg-prism-amber/15 text-prism-amber border-prism-amber/30">Phase 2</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-1.5 text-sm">
              {CLEVELAND_ADVANTAGES.map((a) => (
                <li key={a} className="flex gap-2">
                  <span className="text-prism-amber">•</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-lg border border-prism-orange/30 bg-prism-orange/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-prism-orange mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Cleveland may involve
              </p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {CLEVELAND_CAUTIONS.map((c) => <li key={c}>• {c}</li>)}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
