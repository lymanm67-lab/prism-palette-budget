// Combined Legacy Score™ — wealth + health in one number.
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Gem, HeartPulse, Wallet } from 'lucide-react';
import { useCombinedLegacyScore } from '@/hooks/use-longevity';

const TONE: Record<string, string> = {
  rose: 'text-prism-rose',
  amber: 'text-prism-amber',
  teal: 'text-prism-teal',
  emerald: 'text-prism-teal',
};

export default function CombinedLegacyScoreCard({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const { combined, horizon, isLoading } = useCombinedLegacyScore();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-40 animate-pulse rounded-lg bg-muted" />
        </CardContent>
      </Card>
    );
  }

  const pct = combined.score ?? 0;

  const ring = (
    <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
      <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
        <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={2 * Math.PI * 52}
          strokeDashoffset={2 * Math.PI * 52 * (1 - pct / 100)}
        />
      </svg>
      <div className="text-center">
        <p className="text-2xl font-bold tabular-nums">{combined.score ?? '—'}</p>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">/ 100</p>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Gem className="h-4 w-4 text-prism-teal" /> Combined Legacy Score
          </span>
          <Badge variant="secondary" className={TONE[combined.band.tone]}>
            {combined.band.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          {ring}
          <div className="min-w-0 space-y-2 text-sm">
            <p className="text-muted-foreground">{combined.headline}</p>
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="flex items-center gap-1">
                <Wallet className="h-3.5 w-3.5 text-prism-amber" /> Wealth{' '}
                <strong className="tabular-nums">
                  {combined.wealthScore != null ? Math.round(combined.wealthScore) : '—'}
                </strong>
              </span>
              <span className="flex items-center gap-1">
                <HeartPulse className="h-3.5 w-3.5 text-prism-rose" /> Health{' '}
                <strong className="tabular-nums">
                  {combined.healthScore != null ? Math.round(combined.healthScore) : '—'}
                </strong>
              </span>
              <span className="text-muted-foreground">
                Plan to age <strong className="tabular-nums">{Math.round(horizon.planningAge)}</strong>
              </span>
            </div>
          </div>
        </div>

        {!compact && (
          <div className="space-y-3">
            {combined.pillars.map((p) => (
              <div key={p.key}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium">
                    {p.label} <span className="text-muted-foreground">({p.weight}%)</span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {p.score != null ? Math.round(p.score) : 'No data'}
                  </span>
                </div>
                <Progress value={p.score ?? 0} />
                <p className="mt-1 text-[11px] text-muted-foreground">{p.note}</p>
              </div>
            ))}
          </div>
        )}

        {combined.weakest && (
          <p className="text-xs text-muted-foreground">
            Biggest lever right now: <strong>{combined.weakest.label}</strong>.
          </p>
        )}

        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => navigate('/health?tab=longevity')}
        >
          Open Longevity Dividend <ChevronRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
