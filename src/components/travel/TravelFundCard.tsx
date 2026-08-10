import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plane, ArrowRight } from 'lucide-react';
import { useTravelFund } from '@/hooks/use-travel-fund';
import { money, monthName, tripFunding } from '@/lib/travel/travelFund';
import { TravelProgressBar } from '@/components/travel/TravelProgressBar';

export function TravelFundCard() {
  const { settings, trips, nextSaving, isLoading } = useTravelFund();
  const prepaid = trips.find((t) => t.is_prepaid && t.status !== 'completed');
  const focus = nextSaving;
  const funding = focus ? tripFunding(focus, settings) : null;

  if (isLoading) return null;

  return (
    <Card className="prism-card-shine border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Plane className="h-4 w-4 text-prism-sky" /> Annual Travel Fund
          </CardTitle>
          <Button asChild size="sm" variant="ghost" className="h-7 text-[11px]">
            <Link to="/planning/travel-fund">Open <ArrowRight className="h-3 w-3 ml-1" /></Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {prepaid && (
          <div className="rounded-lg border border-prism-lime/40 bg-prism-lime/5 p-3 space-y-0.5">
            <p className="text-sm font-display font-bold">
              {prepaid.destination} · {monthName(prepaid.travel_month)} {prepaid.travel_year}
            </p>
            <Badge variant="outline" className="bg-prism-lime/15 text-prism-lime border-prism-lime/30 text-[10px]">
              STATUS: PAID
            </Badge>
            <p className="text-[11px] text-muted-foreground">
              Next savings cycle: {monthName(settings.cycle_start_month)} {prepaid.travel_year} ·
              {' '}{money(settings.monthly_target)}/mo · next target {money(settings.target_budget)}
            </p>
          </div>
        )}

        {focus && funding ? (
          <>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">
                Next trip: {focus.destination} — {monthName(focus.travel_month)} {focus.travel_year}
              </span>
              <Badge variant="outline" className="text-[10px]">{funding.status}</Badge>
            </div>
            <TravelProgressBar saved={funding.saved} target={funding.target} />
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div>
                <p className="text-muted-foreground">Monthly</p>
                <p className="font-semibold tabular-nums">{money(funding.currentMonthly)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Months left</p>
                <p className="font-semibold tabular-nums">{funding.monthsRemaining}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Required/mo</p>
                <p className="font-semibold tabular-nums">{money(funding.requiredMonthly)}</p>
              </div>
            </div>
          </>
        ) : (
          !prepaid && (
            <p className="text-xs text-muted-foreground">
              Set up the annual travel cycle — {money(settings.monthly_target)}/month for a{' '}
              {money(settings.target_budget)} trip fund.
            </p>
          )
        )}
      </CardContent>
    </Card>
  );
}
