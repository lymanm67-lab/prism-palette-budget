import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RotateCcw, CheckCircle2, XCircle, Info } from 'lucide-react';

export default function RecastCard() {
  return (
    <Card className="glass-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <RotateCcw className="h-5 w-5 text-primary" />
          Mortgage Recast — Your Safety Valve
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          After a large lump-sum principal payment, ask your servicer to <span className="font-semibold text-foreground">re-amortize</span> the loan. Same rate, same term — but your minimum payment drops.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-sm text-emerald-500">
              <CheckCircle2 className="h-4 w-4" /> When recasting shines
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>You just applied a $20k+ lump sum and want lower required payments</li>
              <li>Income drops mid-payoff plan — recast lowers the floor without refinancing</li>
              <li>You want to accelerate payoff but keep flexibility if life changes</li>
              <li>Rates today are higher than yours — recasting keeps your rate, refi would raise it</li>
            </ul>
          </div>

          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-sm text-rose-500">
              <XCircle className="h-4 w-4" /> When to skip
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>You're committed to paying off aggressively — recasting is neutral, not accelerating</li>
              <li>Your loan is FHA/VA — most don't allow recasts</li>
              <li>You're within 5 years of payoff — savings are minimal</li>
              <li>Current rates are meaningfully lower — refi wins instead</li>
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">How it works</div>
          <div className="grid md:grid-cols-4 gap-3 text-xs">
            <div>
              <div className="font-semibold text-foreground mb-0.5">1. Lump sum</div>
              <div className="text-muted-foreground">Pay $10k–$50k+ directly to principal.</div>
            </div>
            <div>
              <div className="font-semibold text-foreground mb-0.5">2. Call servicer</div>
              <div className="text-muted-foreground">Request recast. Fee: usually $150–$500.</div>
            </div>
            <div>
              <div className="font-semibold text-foreground mb-0.5">3. Re-amortize</div>
              <div className="text-muted-foreground">New minimum payment calculated on lower balance, same term & rate.</div>
            </div>
            <div>
              <div className="font-semibold text-foreground mb-0.5">4. Keep paying more</div>
              <div className="text-muted-foreground">You can still pay above the new minimum to accelerate.</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-[11px] text-muted-foreground flex gap-2">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
          <div>
            <span className="font-semibold text-foreground">Recast vs Refinance:</span> Recasting keeps your existing rate & term — good if rates rose. Refinancing gets you a new rate & term — good if rates dropped meaningfully. Recasting is far cheaper (few hundred vs several thousand) but doesn't reduce your rate.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
