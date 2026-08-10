import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, PlaneTakeoff } from 'lucide-react';
import { useTravelTrips } from '@/hooks/use-travel-fund';
import {
  BOOKING_CHECKLIST_ITEMS, FUNDING_CHECKLIST_ITEMS, TravelSettings, TravelTrip,
  monthName, tripFunding,
} from '@/lib/travel/travelFund';

interface Props { trips: TravelTrip[]; settings: TravelSettings }

export function BookingTrackerTab({ trips, settings }: Props) {
  const { update } = useTravelTrips();
  const [tripId, setTripId] = useState<string>(trips[0]?.id ?? '');
  const active = trips.find((t) => t.id === tripId) ?? trips[0];

  if (!active) {
    return (
      <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
        Add a trip first to track bookings.
      </CardContent></Card>
    );
  }

  const funding = tripFunding(active, settings);
  const checklist = active.funding_checklist || {};
  const booking = active.booking || {};
  const fundedCount = FUNDING_CHECKLIST_ITEMS.filter((i) => checklist[i.key]).length;
  const readyToTravel = funding.remaining <= 0 && fundedCount > 0;

  const toggleFunding = (key: string, val: boolean) =>
    update.mutate({ id: active.id, funding_checklist: { ...checklist, [key]: val } });
  const toggleBooking = (key: string, val: boolean | string) =>
    update.mutate({ id: active.id, booking: { ...booking, [key]: val } });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm font-display font-bold">Booking & pre-departure funding</p>
        <Select value={active.id} onValueChange={setTripId}>
          <SelectTrigger className="w-[260px] h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {trips.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.destination} — {monthName(t.travel_month)} {t.travel_year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className={`prism-card-shine ${readyToTravel ? 'border-prism-lime/40' : 'border-prism-orange/40'}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <PlaneTakeoff className="h-4 w-4" /> Vacation paid before departure
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Badge
            variant="outline"
            className={readyToTravel
              ? 'bg-prism-lime/15 text-prism-lime border-prism-lime/30'
              : 'bg-prism-orange/15 text-prism-orange border-prism-orange/30'}
          >
            {readyToTravel ? 'READY TO TRAVEL' : 'FUNDING IN PROGRESS'}
          </Badge>
          <p className="text-xs text-muted-foreground">
            Confirm each item that applies to this trip. Categories that do not apply can be left unchecked.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FUNDING_CHECKLIST_ITEMS.map((i) => (
              <label key={i.key} className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox
                  checked={!!checklist[i.key]}
                  onCheckedChange={(v) => toggleFunding(i.key, !!v)}
                />
                {i.label}
                {checklist[i.key] && <CheckCircle2 className="h-3 w-3 text-prism-lime" />}
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="prism-card-shine border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Trip booking tracker</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Destination">
              <Input
                className="h-9" defaultValue={active.destination}
                onBlur={(e) => update.mutate({ id: active.id, destination: e.target.value })}
              />
            </Field>
            <Field label="Departure date">
              <Input
                className="h-9" type="date" defaultValue={active.depart_date ?? ''}
                onBlur={(e) => update.mutate({ id: active.id, depart_date: e.target.value || null })}
              />
            </Field>
            <Field label="Final payment due">
              <Input
                className="h-9" type="date" defaultValue={active.final_payment_due ?? ''}
                onBlur={(e) => update.mutate({ id: active.id, final_payment_due: e.target.value || null })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {BOOKING_CHECKLIST_ITEMS.map((i) => (
              <label key={i.key} className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox checked={!!booking[i.key]} onCheckedChange={(v) => toggleBooking(i.key, !!v)} />
                {i.label}
              </label>
            ))}
          </div>

          <Field label="Confirmation numbers">
            <Textarea
              rows={3} placeholder="Airline PNR, cruise booking #, hotel confirmation…"
              defaultValue={booking.confirmations ?? ''}
              onBlur={(e) => toggleBooking('confirmations', e.target.value)}
            />
          </Field>
          <Field label="Document storage location">
            <Input
              className="h-9" placeholder="e.g. Travel folder in Document Vault"
              defaultValue={booking.document_location ?? ''}
              onBlur={(e) => toggleBooking('document_location', e.target.value)}
            />
          </Field>
        </CardContent>
      </Card>

      <Card className="prism-card-shine border-border/50">
        <CardHeader className="pb-2"><CardTitle className="text-base">Trip funding settings</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Trip budget">
            <Input
              className="h-9" type="number" defaultValue={active.budget_target}
              onBlur={(e) => update.mutate({ id: active.id, budget_target: Number(e.target.value) || 0 })}
            />
          </Field>
          <Field label="Saved amount">
            <Input
              className="h-9" type="number" defaultValue={active.saved_amount}
              onBlur={(e) => update.mutate({ id: active.id, saved_amount: Number(e.target.value) || 0 })}
            />
          </Field>
          <Field label="Rollover in">
            <Input
              className="h-9" type="number" defaultValue={active.rollover_amount}
              onBlur={(e) => update.mutate({ id: active.id, rollover_amount: Number(e.target.value) || 0 })}
            />
          </Field>
          <Field label="Monthly savings">
            <Input
              className="h-9" type="number" defaultValue={active.monthly_contribution}
              onBlur={(e) => update.mutate({ id: active.id, monthly_contribution: Number(e.target.value) || 0 })}
            />
          </Field>
          <Field label="Trip type">
            <Select value={active.trip_type} onValueChange={(v) => update.mutate({ id: active.id, trip_type: v })}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal travel</SelectItem>
                <SelectItem value="business">Business travel</SelectItem>
                <SelectItem value="mixed">Mixed purpose</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={active.status} onValueChange={(v) => update.mutate({ id: active.id, status: v })}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="booked">Booked</SelectItem>
                <SelectItem value="ready">Ready to travel</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Paid in full">
            <div className="h-9 flex items-center">
              <Checkbox
                checked={active.is_prepaid}
                onCheckedChange={(v) => update.mutate({ id: active.id, is_prepaid: !!v })}
              />
              <span className="text-xs ml-2 text-muted-foreground">No further savings needed</span>
            </div>
          </Field>
          <Field label="Savings start">
            <Input
              className="h-9" type="date" defaultValue={active.savings_start_date ?? ''}
              onBlur={(e) => update.mutate({ id: active.id, savings_start_date: e.target.value || null })}
            />
          </Field>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
