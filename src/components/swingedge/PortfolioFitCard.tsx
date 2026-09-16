// Stock Analyzer — compact Portfolio Fit reading.
//
// The Analyzer answers "is this a good trade?". This card adds the second
// question — "is it a good trade to add to this portfolio right now?" — without
// restating trade quality.

import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FIT_TONE } from '@/components/swingedge/PortfolioImpactPanel';
import type { PortfolioFitResult } from '@/lib/swingedge/portfolioFit';
import { CORRELATION_BAND_LABEL } from '@/lib/swingedge/correlation';

export default function PortfolioFitCard({
  symbol,
  fit,
  individualLabel,
}: {
  symbol: string;
  fit: PortfolioFitResult;
  individualLabel: string;
}) {
  return (
    <Card
      className={cn(
        'border-border/60 bg-card/60 backdrop-blur',
        fit.blocksGo && 'border-destructive/60',
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Portfolio fit</CardTitle>
          <Badge variant="outline" className={cn('text-xs', FIT_TONE[fit.state])}>
            {fit.stateLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <p className="text-xs text-muted-foreground">
            This chart on its own: <span className="font-medium text-foreground">{individualLabel}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Against what you hold:{' '}
            <span className="font-medium text-foreground">{fit.stateLabel}</span>
          </p>
        </div>
        <p className={cn(fit.blocksGo && 'font-medium text-destructive')}>{fit.headline}</p>
        <p className="text-xs text-muted-foreground">
          {fit.familyLabel} risk after this trade{' '}
          {fit.familyHeat
            ? `${fit.familyHeat.afterPct.toFixed(2)}% of ${fit.familyHeat.limitPct}% allowed`
            : 'not known for this symbol'}
          {' · '}highest correlation{' '}
          {fit.correlationBand ? CORRELATION_BAND_LABEL[fit.correlationBand] : 'insufficient data'}
          {' · '}driver {fit.commonDriver}
        </p>
        <Button asChild size="sm" variant="outline">
          <Link to={`/swingedge/planner?symbol=${encodeURIComponent(symbol)}`}>
            View portfolio impact
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
