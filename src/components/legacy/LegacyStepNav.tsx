import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const LEGACY_STEPS = [
  { to: '/legacy/household', label: '1. Household Wealth', why: 'Map every asset and tag ownership.' },
  { to: '/legacy/crossover', label: '2. Compounding Crossover', why: 'See when growth outruns contributions.' },
  { to: '/retirement-optimizer', label: '3. Retirement Optimizer', why: 'Tune contributions, Roth mix, and returns.' },
  { to: '/legacy/preservation', label: '4. Retirement Preservation', why: 'Plan withdrawals and the Social Security bridge.' },
  { to: '/legacy/sequence-risk', label: '4b. Sequence Risk', why: 'Stress-test the first decade of withdrawals.' },
  { to: '/legacy/waterfall', label: '4c. Contribution Waterfall', why: 'Route every new dollar in tax-efficient order.' },
  { to: '/kungfoo', label: '5. KUNG FOO Plan', why: 'Lock the order of operations for every dollar.' },
  { to: '/legacy/family', label: '6. Family Legacy', why: 'Protect it with trusts, docs, and constitution.' },
  { to: '/legacy/wealth-os', label: '7. Wealth OS Binder', why: 'Package the whole plan into a report.' },
  { to: '/legacy', label: '8. Legacy Mode', why: 'Score readiness across 14 factors.' },
  { to: '/legacy/belts', label: '9. Belt Progress', why: 'Track mastery and keep momentum.' },
] as const;


export function LegacyStepNav() {
  const { pathname } = useLocation();
  const idx = LEGACY_STEPS.findIndex((s) => s.to === pathname);
  if (idx === -1) return null;

  const prev = idx > 0 ? LEGACY_STEPS[idx - 1] : null;
  const next = idx < LEGACY_STEPS.length - 1 ? LEGACY_STEPS[idx + 1] : null;

  return (
    <Card className="mt-6 print:hidden">
      <CardContent className="p-4 space-y-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Legacy flow — step {idx + 1} of {LEGACY_STEPS.length}: {LEGACY_STEPS[idx].label}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {prev ? (
            <Button asChild variant="ghost" size="sm">
              <Link to={prev.to} className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back: {prev.label}</span>
              </Link>
            </Button>
          ) : <span />}

          {next ? (
            <div className="flex items-center gap-3 sm:justify-end">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">Next step: {next.label}</p>
                <p className="text-xs text-muted-foreground">{next.why}</p>
              </div>
              <Button asChild size="sm">
                <Link to={next.to} className="flex items-center gap-2">
                  <span className="sm:hidden">Next: {next.label}</span>
                  <span className="hidden sm:inline">Continue</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-prism-lime" /> Final step — you've completed the Legacy flow.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
