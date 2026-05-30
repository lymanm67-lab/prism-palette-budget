import { Info } from 'lucide-react';

export function DisclaimerBlock({ variant = 'full' }: { variant?: 'full' | 'short' }) {
  if (variant === 'short') {
    return (
      <p className="text-xs text-muted-foreground italic flex items-start gap-1.5">
        <Info className="h-3 w-3 mt-0.5 shrink-0" />
        Estimates only. Verify with a qualified financial, tax, or pension professional.
      </p>
    );
  }
  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 p-4 text-xs text-muted-foreground space-y-2">
      <p>
        <strong className="text-foreground">Disclaimer.</strong> Prism Money™ provides educational
        projections and planning tools only. It does not provide financial, tax, legal, investment,
        Social Security, pension, or estate-planning advice. Users should consult a qualified
        financial advisor, tax professional, Social Security representative, pension provider, or
        estate-planning attorney before making financial decisions.
      </p>
      <p>
        All projections are estimates based on user-entered assumptions. Actual results may vary
        due to market performance, taxes, inflation, fees, contribution limits, plan rules,
        Social Security law changes, pension rules, healthcare costs, and personal circumstances.
      </p>
    </div>
  );
}
