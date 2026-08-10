import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Gauge, Wallet, ClipboardCheck, Briefcase, LineChart, Plane } from 'lucide-react';
import { useTravelFund } from '@/hooks/use-travel-fund';
import { TravelOverviewTab } from '@/components/travel/TravelOverviewTab';
import { TripBudgetBuilder } from '@/components/travel/TripBudgetBuilder';
import { BookingTrackerTab } from '@/components/travel/BookingTrackerTab';
import { BusinessTravelTab } from '@/components/travel/BusinessTravelTab';
import { TrendPlannerTab } from '@/components/travel/TrendPlannerTab';

const VIEWS = [
  { key: 'overview', label: 'Overview & Cycle', icon: Gauge },
  { key: 'budget', label: 'Trip Budget', icon: Wallet },
  { key: 'booking', label: 'Booking & Funding', icon: ClipboardCheck },
  { key: 'business', label: 'Business & Tax', icon: Briefcase },
  { key: 'planner', label: 'Trends & Planner', icon: LineChart },
] as const;

type ViewKey = (typeof VIEWS)[number]['key'];

export default function TravelFund() {
  const { settings, trips, upcoming, nextSaving, isLoading, create } = useTravelFund();
  const [view, setView] = useState<ViewKey>('overview');
  const [seeded, setSeeded] = useState(false);

  // Seed the Montgomery baseline once: Jan 2027 Hawaii (paid) + Jan 2028 target.
  useEffect(() => {
    if (isLoading || seeded || trips.length > 0) return;
    setSeeded(true);
    create.mutate({
      destination: 'Hawaii',
      travel_month: 1, travel_year: 2027,
      trip_type: 'personal', status: 'booked',
      budget_target: settings.target_budget,
      saved_amount: settings.target_budget,
      monthly_contribution: 0,
      is_prepaid: true,
      notes: 'January 2027 Hawaii trip is fully funded and paid. No additional savings required.',
    });
    create.mutate({
      destination: 'January 2028 Annual Trip',
      travel_month: 1, travel_year: 2028,
      trip_type: 'personal', status: 'planning',
      budget_target: settings.target_budget,
      saved_amount: 0,
      monthly_contribution: settings.monthly_target,
      savings_start_date: '2027-02-01',
      notes: 'New savings cycle begins February 2027 at $500/month.',
    });
  }, [isLoading, seeded, trips.length, settings, create]);

  const body = useMemo(() => {
    switch (view) {
      case 'budget': return <TripBudgetBuilder trips={trips} />;
      case 'booking': return <BookingTrackerTab trips={trips} settings={settings} />;
      case 'business': return <BusinessTravelTab trips={trips} />;
      case 'planner': return <TrendPlannerTab trips={trips} settings={settings} />;
      default:
        return (
          <TravelOverviewTab trips={trips} settings={settings} upcoming={upcoming} nextSaving={nextSaving} />
        );
    }
  }, [view, trips, settings, upcoming, nextSaving]);

  return (
    <div className="space-y-4">



      <header className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-display font-bold flex items-center gap-2">
          <Plane className="h-5 w-5 text-prism-sky" /> Montgomery Annual Travel Fund
        </h1>
        <p className="text-xs text-muted-foreground">
          Travel well. Pay ahead. Protect the future. Enjoy the life you are building while continuing to build
          the life you want.
        </p>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {VIEWS.map(({ key, label, icon: Icon }) => (
          <Button
            key={key} size="sm" variant={view === key ? 'default' : 'outline'}
            className="h-8 text-[11px]" onClick={() => setView(key)}
          >
            <Icon className="h-3.5 w-3.5 mr-1" /> {label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <Card><CardContent className="p-6 space-y-3">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent></Card>
      ) : (
        body
      )}
    </div>
  );
}
