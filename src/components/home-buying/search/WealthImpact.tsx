import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Wallet } from 'lucide-react';
import { fmt$ } from '@/lib/home-buying/mortgage-math';
import { projectEquity, scoreListing, type Listing } from '@/lib/home-buying/match-engine';
import type { HomeSearchProfile } from '@/lib/home-buying/search-profile';

interface Props {
  listings: Listing[];
  profile: HomeSearchProfile;
}

export default function WealthImpact({ listings, profile }: Props) {
  if (listings.length === 0) return null;
  const top = listings.slice(0, 6);

  return (
    <Card className="prism-card-shine border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-display">
          <TrendingUp className="h-5 w-5 text-prism-teal" />
          Wealth Impact Analyzer
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Projected equity and total housing cost over 5 and 10 years, using {profile.downPct}% down at {profile.ratePct}% ({profile.termYears}-yr fixed) and 4%/yr appreciation.
        </p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {top.map((l) => {
          const eq5 = projectEquity(l, profile, 5);
          const eq10 = projectEquity(l, profile, 10);
          const score = scoreListing(l, profile);
          const monthlyMaint = l.price * 0.01 / 12;
          const totalHousingCost5 = (score.payment.totalPITI + monthlyMaint) * 60;
          const netWorthImpact = eq5.equity - totalHousingCost5;
          const cashFlowImpact = score.payment.totalPITI - (profile.maxMonthlyPayment - 300);
          const wealthScore = Math.max(0, Math.min(100, Math.round(
            (eq5.equity / totalHousingCost5) * 60 + (score.payment.cushion / profile.maxMonthlyPayment) * 40 + 30
          )));

          return (
            <div key={l.url} className="rounded-lg border border-border/40 bg-card/40 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-medium line-clamp-1">{l.address}</div>
                <div className="text-right">
                  <div className="font-display text-xl font-bold prism-gradient-text">{wealthScore}</div>
                  <div className="text-[9px] text-muted-foreground uppercase">Wealth Score</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Row label="Purchase Price" value={fmt$(l.price)} />
                <Row label="Down Payment" value={fmt$(eq5.down)} />
                <Row label="5-yr Equity" value={fmt$(eq5.equity)} accent />
                <Row label="10-yr Equity" value={fmt$(eq10.equity)} accent />
                <Row label="5-yr Appreciation" value={fmt$(eq5.appreciation)} />
                <Row label="Est. Maint / yr" value={fmt$(l.price * 0.01)} />
                <Row label="Total Housing Cost (5 yr)" value={fmt$(totalHousingCost5)} />
                <Row label="Net Worth Δ (5 yr)" value={fmt$(netWorthImpact)} accent={netWorthImpact > 0} negative={netWorthImpact < 0} />
                <Row label="Cash Flow Impact" value={cashFlowImpact > 0 ? `-${fmt$(cashFlowImpact)}/mo tight` : `+${fmt$(-cashFlowImpact)}/mo slack`} negative={cashFlowImpact > 0} accent={cashFlowImpact <= 0} />
                <Row label="Emergency Fund" value={eq5.down > 20000 ? 'Preserved' : 'Draws reserve'} negative={eq5.down <= 20000} />
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                <Wallet className="h-3 w-3" />
                <span>Retirement impact: {cashFlowImpact > 200 ? 'may slow contributions' : 'no material change'}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function Row({ label, value, accent, negative }: { label: string; value: string; accent?: boolean; negative?: boolean }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`font-mono text-sm ${accent ? 'text-emerald-400 font-bold' : negative ? 'text-red-400 font-bold' : ''}`}>{value}</div>
    </div>
  );
}
