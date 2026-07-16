import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Zap, TrendingDown, Home as HomeIcon, AlertTriangle } from 'lucide-react';
import { fmt$ } from '@/lib/home-buying/mortgage-math';
import type { Listing, PropertyScore } from '@/lib/home-buying/match-engine';
import type { HomeSearchProfile } from '@/lib/home-buying/search-profile';

interface Alert {
  icon: typeof Bell;
  label: string;
  detail: string;
  tone: 'good' | 'warn' | 'info';
}

interface Props {
  listings: Array<{ listing: Listing; score: PropertyScore }>;
  profile: HomeSearchProfile;
}

export default function SmartAlerts({ listings, profile }: Props) {
  const alerts: Alert[] = [];

  listings.forEach(({ listing, score }) => {
    if (score.matchPct >= 90 && !score.hardFail) {
      alerts.push({
        icon: Zap,
        label: '90%+ criteria match',
        detail: `${listing.address} — ${score.matchPct}% match, score ${score.overall}`,
        tone: 'good',
      });
    }
    if (listing.price < profile.maxPrice * 0.85) {
      alerts.push({
        icon: TrendingDown,
        label: `Priced well below your $${profile.maxPrice.toLocaleString()} max`,
        detail: `${listing.address} — ${fmt$(listing.price)}`,
        tone: 'good',
      });
    }
    if (listing.style && /split|bi-level|raised ranch/i.test(listing.style)) {
      alerts.push({
        icon: HomeIcon,
        label: 'Split-level / bi-level match',
        detail: `${listing.address} — ${listing.style}`,
        tone: 'good',
      });
    }
    if (listing.taxPct != null && listing.taxPct < 1.4) {
      alerts.push({
        icon: TrendingDown,
        label: 'Unusually low property taxes',
        detail: `${listing.address} — ${listing.taxPct.toFixed(2)}%`,
        tone: 'good',
      });
    }
    if (score.hardFail) {
      alerts.push({
        icon: AlertTriangle,
        label: 'Violates a personal rule',
        detail: `${listing.address} — ${score.hardFailReasons[0]}`,
        tone: 'warn',
      });
    }
  });

  return (
    <Card className="prism-card-shine border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-display">
          <Bell className="h-5 w-5 text-prism-amber" />
          Smart Alerts
        </CardTitle>
        <p className="text-xs text-muted-foreground">Derived live from your current results. Alerts refresh with every search.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No alerts yet — run a search to generate matches.</p>
        ) : (
          alerts.slice(0, 12).map((a, i) => {
            const Icon = a.icon;
            const tone = a.tone === 'good'
              ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300'
              : a.tone === 'warn'
              ? 'border-red-500/30 bg-red-500/5 text-red-300'
              : 'border-prism-teal/30 bg-prism-teal/5 text-prism-teal';
            return (
              <div key={i} className={`flex items-start gap-2 p-2 rounded border ${tone}`}>
                <Icon className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-bold">{a.label}</div>
                  <div className="opacity-80">{a.detail}</div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
