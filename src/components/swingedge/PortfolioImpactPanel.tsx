// Trade Planner — Portfolio Impact.
//
// Answers the second question: is this a good trade to ADD to this portfolio
// right now? Trade quality is reported elsewhere and is never restated here as a
// judgement of the setup.

import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  CONCENTRATION_WARNING_TITLE,
  EXISTING_POSITION_NOTE,
  type PortfolioFitResult,
  type PortfolioFitState,
} from '@/lib/swingedge/portfolioFit';
import { CORRELATION_BAND_LABEL } from '@/lib/swingedge/correlation';

const money = (n: number) => `$${n.toFixed(2)}`;

export const FIT_TONE: Record<PortfolioFitState, string> = {
  STRONG_FIT: 'bg-prism-lime/15 text-prism-lime border-prism-lime/40',
  ACCEPTABLE: 'bg-muted text-foreground border-border',
  CAUTION: 'bg-prism-amber/15 text-prism-amber border-prism-amber/40',
  POOR_FIT: 'bg-destructive/10 text-destructive border-destructive/40',
  BLOCKED: 'bg-destructive/15 text-destructive border-destructive/50',
  INSUFFICIENT_DATA: 'bg-muted text-muted-foreground border-border',
};

export function FitBadge({ fit }: { fit: PortfolioFitResult }) {
  return (
    <Badge variant="outline" className={cn('text-xs', FIT_TONE[fit.state])}>
      {fit.stateLabel}
    </Badge>
  );
}

function Row({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 py-1.5 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-medium tabular-nums', warn && 'text-destructive')}>
        {value}
      </span>
    </div>
  );
}

export default function PortfolioImpactPanel({
  fit,
  individualLabel,
  finalNote,
  showExistingNote,
}: {
  fit: PortfolioFitResult;
  /** How the trade reads on its own, e.g. "Qualified". */
  individualLabel: string;
  finalNote?: string;
  showExistingNote?: boolean;
}) {
  const blocked = fit.state === 'BLOCKED' || fit.state === 'POOR_FIT';

  return (
    <div className="space-y-4">
      {blocked ? (
        <Alert className="border-destructive/50 bg-destructive/5">
          <ShieldAlert className="h-4 w-4 text-destructive" />
          <AlertTitle>{CONCENTRATION_WARNING_TITLE}</AlertTitle>
          <AlertDescription>
            This trade qualifies individually, but adding it would increase correlated{' '}
            {fit.familyLabel.toLowerCase()} exposure beyond your current training threshold.
          </AlertDescription>
        </Alert>
      ) : fit.state === 'CAUTION' ? (
        <Alert className="border-prism-amber/50 bg-prism-amber/5">
          <AlertTriangle className="h-4 w-4 text-prism-amber" />
          <AlertTitle>Concentration worth noting</AlertTitle>
          <AlertDescription>{fit.headline}</AlertDescription>
        </Alert>
      ) : fit.state === 'INSUFFICIENT_DATA' ? (
        <Alert className="border-border bg-muted/30">
          <Info className="h-4 w-4 text-muted-foreground" />
          <AlertTitle>Portfolio fit not available yet</AlertTitle>
          <AlertDescription>{fit.reasons[0]}</AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-prism-lime/50 bg-prism-lime/5">
          <CheckCircle2 className="h-4 w-4 text-prism-lime" />
          <AlertTitle>This spreads your risk</AlertTitle>
          <AlertDescription>{fit.headline}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-md border p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Trade quality
          </p>
          <p className="text-sm font-medium">{individualLabel}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Judged on this chart alone: setup, stop, reward against risk.
          </p>
        </div>
        <div className="rounded-md border p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Portfolio fit
          </p>
          <FitBadge fit={fit} />
          <p className="mt-1 text-xs text-muted-foreground">
            Judged against what you already hold.
          </p>
        </div>
      </div>

      <div className="rounded-md border p-3">
        <Row
          label="Total risk now"
          value={`${money(fit.portfolio.before)} (${fit.portfolio.beforePct.toFixed(2)}%)`}
        />
        <Row
          label="Total risk after this trade"
          value={`${money(fit.portfolio.after)} (${fit.portfolio.afterPct.toFixed(2)}%)`}
          warn={fit.portfolio.exceeded}
        />
        <Row
          label="Your total risk ceiling"
          value={`${money(fit.portfolio.limitDollars)} (${fit.portfolio.limitPct}%)`}
        />
        {fit.familyHeat ? (
          <>
            <Row
              label={`${fit.familyLabel} risk now`}
              value={`${money(fit.familyHeat.before)} (${fit.familyHeat.beforePct.toFixed(2)}%)`}
            />
            <Row
              label={`${fit.familyLabel} risk after this trade`}
              value={`${money(fit.familyHeat.after)} (${fit.familyHeat.afterPct.toFixed(2)}%)`}
              warn={fit.familyHeat.exceeded}
            />
            <Row
              label={`${fit.familyLabel} limit`}
              value={`${money(fit.familyHeat.limitDollars)} (${fit.familyHeat.limitPct}%)`}
            />
          </>
        ) : (
          <Row label="Exposure family" value="Not known for this symbol" />
        )}
        <Row
          label="Highest correlation with your holdings"
          value={
            fit.correlationBand
              ? CORRELATION_BAND_LABEL[fit.correlationBand]
              : 'Insufficient data'
          }
        />
        <Row label="Common driver" value={fit.commonDriver} />
        <Row
          label="Positions you already hold in this family"
          value={fit.similarSymbols.length ? fit.similarSymbols.join(', ') : 'None'}
        />
      </div>

      <div className="space-y-1">
        {fit.reasons.map((r) => (
          <p key={r} className={cn('text-xs', blocked ? 'text-destructive' : 'text-muted-foreground')}>
            {r}
          </p>
        ))}
        {finalNote && <p className="text-xs font-medium text-foreground">{finalNote}</p>}
        {showExistingNote && (
          <p className="text-xs text-muted-foreground">{EXISTING_POSITION_NOTE}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Total risk, family risk, correlation and shared events each describe a different kind of
          concentration. The verdict takes the worst one — it does not add them together.
        </p>
      </div>
    </div>
  );
}
