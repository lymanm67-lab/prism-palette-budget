import { Home, ExternalLink, CheckCircle2, AlertTriangle, XCircle, Eye, Heart, GitCompare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fmt$ } from '@/lib/home-buying/mortgage-math';
import type { Listing, PropertyScore } from '@/lib/home-buying/match-engine';
import { coachExplanation } from '@/lib/home-buying/match-engine';
import type { HomeSearchProfile } from '@/lib/home-buying/search-profile';

const VERDICT = {
  excellent: { label: 'Excellent Buy', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/40' },
  good:      { label: 'Good Buy',      icon: CheckCircle2, color: 'text-prism-teal', bg: 'bg-prism-teal/10', border: 'border-prism-teal/40' },
  watch:     { label: 'Watch',         icon: Eye,          color: 'text-prism-amber', bg: 'bg-prism-amber/10', border: 'border-prism-amber/40' },
  high_risk: { label: 'High Risk',     icon: XCircle,      color: 'text-red-400',    bg: 'bg-red-500/10', border: 'border-red-500/40' },
} as const;

interface Props {
  listing: Listing;
  score: PropertyScore;
  profile: HomeSearchProfile;
  isFavorite: boolean;
  inCompare: boolean;
  onFavorite: () => void;
  onCompare: () => void;
}

export default function PropertyScorecard({ listing, score, profile, isFavorite, inCompare, onFavorite, onCompare }: Props) {
  const v = VERDICT[score.verdict];
  const VIcon = v.icon;
  const coach = coachExplanation(listing, score, profile);

  return (
    <div className={`rounded-lg border-2 ${v.border} bg-card/40 p-3 space-y-2 hover:shadow-lg transition-shadow`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-1.5">
          <Home className="h-4 w-4 text-prism-teal" />
          <div className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${v.bg} ${v.color} flex items-center gap-1`}>
            <VIcon className="h-3 w-3" /> {v.label}
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl font-bold prism-gradient-text leading-none">{score.overall}</div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Score</div>
        </div>
      </div>

      <div>
        <p className="font-display text-lg font-bold">{fmt$(listing.price)}</p>
        <p className="text-sm font-medium line-clamp-1">{listing.address}</p>
        <p className="text-xs text-muted-foreground">
          {listing.beds} bd · {listing.baths} ba · {listing.sqft?.toLocaleString()} sqft
          {listing.style && ` · ${listing.style}`}
          {listing.yearBuilt && ` · built ${listing.yearBuilt}`}
        </p>
      </div>

      {/* Monthly payment strip */}
      <div className={`rounded border p-2 text-xs ${score.payment.overBudget ? 'border-red-500/40 bg-red-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
        <div className="flex justify-between">
          <span className="text-muted-foreground">P&I</span><span className="font-mono">{fmt$(score.payment.principalInterest)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax + Ins + PMI + HOA{score.payment.floodInsurance ? ' + Flood' : ''}</span>
          <span className="font-mono">{fmt$(score.payment.tax + score.payment.insurance + score.payment.pmi + score.payment.hoa + score.payment.floodInsurance)}</span>
        </div>
        <div className="flex justify-between pt-1 mt-1 border-t border-border/40">
          <span className="font-bold">Total / mo</span>
          <span className={`font-display font-bold ${score.payment.overBudget ? 'text-red-400' : 'text-emerald-400'}`}>{fmt$(score.payment.totalPITI)}</span>
        </div>
        <div className="text-[10px] mt-0.5">
          {score.payment.overBudget ? (
            <span className="text-red-400">Over budget by {fmt$(-score.payment.cushion)}/mo</span>
          ) : (
            <span className="text-muted-foreground">Cushion: {fmt$(score.payment.cushion)}/mo below your ${profile.maxMonthlyPayment} max</span>
          )}
        </div>
      </div>

      {/* Breakdown mini-grid */}
      <div className="grid grid-cols-5 gap-1 text-[9px]">
        {(['financialFit','appreciation','neighborhood','maintenance','inspectionRisk'] as const).map((k) => (
          <div key={k} className="text-center">
            <div className="text-muted-foreground line-clamp-1">{k === 'financialFit' ? 'Fit' : k === 'appreciation' ? 'Appr.' : k === 'neighborhood' ? 'Nbhd' : k === 'maintenance' ? 'Maint.' : 'Insp.'}</div>
            <div className="font-mono font-bold">{score.breakdown[k]}</div>
          </div>
        ))}
      </div>

      {/* AI Coach */}
      <div className="rounded border border-prism-indigo/30 bg-prism-indigo/5 p-2">
        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-prism-indigo mb-1">
          <Sparkles className="h-3 w-3" /> AI Home Buyer Coach
        </div>
        <ul className="text-[11px] space-y-0.5">
          {coach.map((line, i) => <li key={i} className="text-muted-foreground">{line}</li>)}
        </ul>
      </div>

      {score.hardFail && (
        <div className="rounded border border-red-500/40 bg-red-500/5 p-2 flex items-start gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
          <div className="text-[10px] text-red-300">
            <div className="font-bold mb-0.5">Rule violations:</div>
            <ul className="list-disc list-inside space-y-0.5">
              {score.hardFailReasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1.5 pt-1">
        <Button size="sm" variant={isFavorite ? 'default' : 'outline'} onClick={onFavorite} className="h-7 text-xs gap-1 flex-1">
          <Heart className={`h-3 w-3 ${isFavorite ? 'fill-current' : ''}`} /> {isFavorite ? 'Saved' : 'Save'}
        </Button>
        <Button size="sm" variant={inCompare ? 'default' : 'outline'} onClick={onCompare} className="h-7 text-xs gap-1 flex-1">
          <GitCompare className="h-3 w-3" /> {inCompare ? 'In compare' : 'Compare'}
        </Button>
        <a href={listing.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground hover:text-prism-teal flex items-center gap-0.5 px-1">
          View <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
