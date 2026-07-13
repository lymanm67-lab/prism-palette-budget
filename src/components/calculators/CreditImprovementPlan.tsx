import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Target, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

// Which FICO version each product actually pulls
const SCORE_MODELS = [
  {
    product: 'Traditional Mortgage',
    color: 'text-prism-teal',
    models: [
      'Equifax: FICO Score 5 (Beacon 5.0)',
      'Experian: FICO Score 2 (Score 2/v2)',
      'TransUnion: FICO Score 4 (Classic 04)',
    ],
    rule: 'Lenders use the MIDDLE of the three; on joint apps, the lower of the two middle scores.',
    minimum: 620,
  },
  {
    product: '1st Lien HELOC',
    color: 'text-prism-amber',
    models: [
      'Most banks: FICO 8 or 9 (Equifax / Experian / TransUnion)',
      'Some credit unions: VantageScore 3.0 or 4.0',
      'A few portfolio lenders: FICO 2/4/5 mortgage tri-merge',
    ],
    rule: 'Typically the middle score, but banks may use only one bureau.',
    minimum: 680,
  },
];

// Build a step plan based on current score gap
function buildPlan(score: number, targetProduct: 'mortgage' | 'heloc') {
  const target = targetProduct === 'heloc' ? 680 : 620;
  const stretchTarget = targetProduct === 'heloc' ? 740 : 700;
  const gap = target - score;

  const steps: { title: string; detail: string; impact: string; timeline: string }[] = [];

  if (score < 580) {
    steps.push({
      title: 'Bring all accounts current',
      detail: 'Pay every past-due amount to bring accounts out of 30/60/90+ status. Set autopay for the minimum on everything.',
      impact: '+40 to +100 pts',
      timeline: '1–3 months',
    });
  }

  steps.push({
    title: 'Drop revolving utilization below 30% (ideally 10%)',
    detail: 'Pay balances down BEFORE the statement cuts, not the due date. Utilization is ~30% of your FICO score and moves fastest.',
    impact: '+20 to +60 pts',
    timeline: '30–60 days',
  });

  if (gap > 20) {
    steps.push({
      title: 'Dispute inaccurate items',
      detail: 'Pull all 3 bureau reports (annualcreditreport.com). Dispute duplicates, wrong balances, accounts you don\'t recognize, and any late payment older than 24 months that\'s misreported.',
      impact: '+10 to +80 pts',
      timeline: '30–45 days per dispute cycle',
    });
  }

  steps.push({
    title: 'Stop applying for new credit',
    detail: 'Each hard inquiry drops your score 3–5 pts and stays 24 months. No new cards, no store financing, no auto loans until you close.',
    impact: 'Prevents -15 to -30 pts',
    timeline: 'Immediately',
  });

  if (score < 700) {
    steps.push({
      title: 'Ask for a credit-limit increase (no hard pull)',
      detail: 'Higher limits lower utilization overnight. Request via issuer app — if they require a hard pull, decline.',
      impact: '+5 to +25 pts',
      timeline: 'Same day',
    });
  }

  if (score < 660) {
    steps.push({
      title: 'Become an authorized user on a seasoned card',
      detail: 'A family member\'s low-utilization, on-time card (2+ years old) can graft its history onto your file. Confirm the issuer reports AU accounts.',
      impact: '+10 to +40 pts',
      timeline: '1 statement cycle',
    });
  }

  steps.push({
    title: `Hold everything for 3–6 months to reach ${target}+ (stretch: ${stretchTarget}+ for best rate)`,
    detail: 'Lenders re-pull at underwriting. Scores need time to stabilize after balance changes. Best rates hit around 740+.',
    impact: 'Compounds prior steps',
    timeline: '3–6 months',
  });

  return { target, stretchTarget, steps, gap: Math.max(0, gap) };
}

export default function CreditImprovementPlan({
  currentScore,
  targetProduct = 'heloc',
}: {
  currentScore: number;
  targetProduct?: 'mortgage' | 'heloc';
}) {
  const plan = buildPlan(currentScore, targetProduct);
  const productMin = targetProduct === 'heloc' ? 680 : 620;
  const qualifies = currentScore >= productMin;

  return (
    <Card className="glass-card border-prism-amber/30">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-prism-amber" />
          {qualifies ? 'Credit Optimization Plan' : 'Credit Improvement Plan'}
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {qualifies
            ? `Your ${currentScore} clears the ${productMin} minimum. Reach ${plan.stretchTarget}+ for the best rate tier.`
            : `You're ${plan.gap} points below the ${productMin} minimum for a ${targetProduct === 'heloc' ? '1st-lien HELOC' : 'mortgage'}. Here's the fastest path up.`}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Which scores are used */}
        <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Info className="w-4 h-4 text-prism-sky" />
            Which credit scores lenders actually pull
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {SCORE_MODELS.map((m) => (
              <div key={m.product} className="rounded-lg border border-border/30 bg-muted/30 p-3 space-y-1">
                <div className={cn('text-sm font-semibold', m.color)}>{m.product}</div>
                <ul className="text-[12px] text-muted-foreground space-y-0.5">
                  {m.models.map((line) => <li key={line}>• {line}</li>)}
                </ul>
                <div className="text-[11px] text-foreground/80 mt-1">{m.rule}</div>
                <div className="text-[11px] text-muted-foreground">Minimum typically: <span className="text-foreground font-medium">{m.minimum}+</span></div>
              </div>
            ))}
          </div>
        </div>

        {/* Score ladder visual */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Your score</span>
            <span className="font-semibold">{currentScore || '—'}</span>
          </div>
          <div className="relative h-3 rounded-full bg-muted overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-prism-rose via-prism-amber to-prism-lime" style={{ width: '100%' }} />
            {currentScore > 0 && (
              <div
                className="absolute inset-y-0 w-1 bg-foreground shadow-lg"
                style={{ left: `${Math.min(100, Math.max(0, ((currentScore - 300) / 550) * 100))}%` }}
              />
            )}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>300</span><span>580</span><span>{productMin} min</span><span>{plan.stretchTarget} best rate</span><span>850</span>
          </div>
        </div>

        {/* Action plan */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Target className="w-4 h-4 text-prism-teal" /> Your action plan
          </div>
          <ol className="space-y-2">
            {plan.steps.map((s, i) => (
              <li key={s.title} className="rounded-lg border border-border/40 bg-muted/20 p-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-prism-amber/20 text-prism-amber text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground">{s.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.detail}</div>
                    <div className="flex flex-wrap gap-3 mt-2 text-[11px]">
                      <span className="text-prism-lime">Impact: {s.impact}</span>
                      <span className="text-muted-foreground">Timeline: {s.timeline}</span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <p className="text-[11px] text-muted-foreground/60 italic">
          Educational estimates only. Actual FICO changes depend on your full credit profile and how each bureau reports your accounts.
        </p>
      </CardContent>
    </Card>
  );
}
