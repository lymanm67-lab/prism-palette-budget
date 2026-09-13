// SwingEdge — names currently sitting inside their estimated buy zone.

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BellRing } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { BuyZoneHit } from '@/lib/swingedge/buyZoneAlerts';

interface Props {
  hits: BuyZoneHit[];
  /** False in practice mode, where nothing is sent to your alerts. */
  notifying: boolean;
  className?: string;
}

export default function BuyZoneAlertsCard({ hits, notifying, className }: Props) {
  return (
    <Card className={className ?? 'border-border/60 bg-card/60 backdrop-blur'}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BellRing className="h-4 w-4 text-prism-lime" />
          In the buy zone now
          <Badge variant="outline" className="ml-1 text-[10px]">
            {hits.length}
          </Badge>
        </CardTitle>
        <CardDescription>
          {notifying
            ? 'Names trading inside their estimated entry zone. Each one is also sent to your alerts once a day.'
            : 'Names trading inside their estimated entry zone. Practice data never sends alerts.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {hits.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nothing on this list is in its buy zone right now. Refresh after the next close.
          </p>
        )}
        {hits.map((h) => (
          <div
            key={h.symbol}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/20 p-3"
          >
            <div>
              <p className="text-sm font-medium">
                {h.symbol}{' '}
                <span className="text-xs text-muted-foreground">
                  at {h.price} · zone {h.low}–{h.high}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {h.verdict.replace(/_/g, ' ').toLowerCase()} · trend {h.trend.toLowerCase()}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to={`/swingedge/analyzer?symbol=${h.symbol}`}>Open the full read</Link>
            </Button>
          </div>
        ))}
        <p className="pt-1 text-xs text-muted-foreground">
          A buy zone hit is a reason to look, not a reason to buy. Your real entry, stop and size
          still come from the Trade Planner.
        </p>
      </CardContent>
    </Card>
  );
}
