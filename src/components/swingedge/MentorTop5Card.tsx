// Mentor Top 5 — the five diversified candidates worth studying today.
// Shown on the Market Scanner after a scan. The list is honest: when fewer
// than five names pass the quality bar, the card says so instead of padding.

import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EXPOSURE_FAMILY_LABEL } from '@/lib/swingedge/exposureFamily';
import { VERDICT_LABEL } from '@/lib/swingedge/types';
import type { MentorTop5Result } from '@/lib/swingedge/mentorTop5';

export default function MentorTop5Card({ result }: { result: MentorTop5Result }) {
  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Mentor's top {result.picks.length} to review today
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          The best-scoring names that pass your criteria — at least 2 : 1 reward to risk, a calm
          calendar, healthy trading volume — with no two picks from the same exposure family, and
          nothing that doubles up what you already hold.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {result.picks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing passed the bar in this scan. That is a valid answer — a good day to study rather
            than force a trade.
          </p>
        ) : (
          <ol className="space-y-2">
            {result.picks.map((p, i) => (
              <li
                key={p.symbol}
                className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 px-3 py-2"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <span className="font-medium">{p.symbol}</span>
                <Badge variant="outline" className="text-[10px]">
                  {VERDICT_LABEL[p.verdict]}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  Score {p.score}
                </Badge>
                {p.rewardRisk !== null && (
                  <Badge variant="outline" className="text-[10px]">
                    {p.rewardRisk.toFixed(1)} : 1
                  </Badge>
                )}
                {p.family && (
                  <Badge variant="secondary" className="text-[10px]">
                    {EXPOSURE_FAMILY_LABEL[p.family]}
                  </Badge>
                )}
                <span className="min-w-0 flex-1 text-xs text-muted-foreground">{p.why}</span>
                <Button asChild size="sm" variant="ghost">
                  <Link to={`/swingedge/analyzer?symbol=${p.symbol}`}>
                    Analyze <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </li>
            ))}
          </ol>
        )}
        {result.short && result.picks.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Only {result.picks.length} name{result.picks.length === 1 ? '' : 's'} cleared the bar —
            the list is kept short on purpose rather than filled with weaker setups.
          </p>
        )}
        {result.skippedForDiversity.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Skipped to keep you diversified:{' '}
            {result.skippedForDiversity.map((s) => s.symbol).join(', ')} — same exposure family as a
            pick or an open position.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
