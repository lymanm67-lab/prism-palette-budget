import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Plane, CalendarClock, PiggyBank, Route, CheckCircle2, Wallet, ShieldCheck,
} from 'lucide-react';
import {
  CASHFLOW_TIMELINE_2027, TRAVEL_FUND_RULES, TravelSettings, TravelTrip,
  money, monthName, savingsSchedule, tripFunding,
} from '@/lib/travel/travelFund';
import { TravelProgressBar } from './TravelProgressBar';
import { TravelGuardrailCard } from './TravelGuardrailCard';

const CYCLE_STEPS = [
  { step: 1, when: 'January', title: 'Take the trip', detail: 'Already paid before departure.' },
  { step: 2, when: 'February', title: 'Reset travel fund', detail: 'Record final costs and rollover balance.' },
  { step: 3, when: 'Feb → Jan', title: 'Save $500 monthly', detail: '12 months x $500 = $6,000.' },
  { step: 4, when: 'Ongoing', title: 'Build travel reserve', detail: 'Target range $5,000 – $7,000.' },
  { step: 5, when: 'Fall', title: 'Plan and book', detail: 'Airfare, cruise, hotel, excursions, transport.' },
  { step: 6, when: 'Pre-trip', title: 'Verify funding', detail: 'Vacation paid before departure.' },
  { step: 7, when: 'January', title: 'Travel', detail: 'Then return to the February reset.' },
];

interface Props {
  trips: TravelTrip[];
  settings: TravelSettings;
  upcoming: TravelTrip | null;
  nextSaving: TravelTrip | null;
}

export function TravelOverviewTab({ trips, settings, upcoming, nextSaving }: Props) {
  const focus = nextSaving ?? upcoming;
  const funding = focus ? tripFunding(focus, settings) : null;
  const prepaid = trips.find((t) => t.is_prepaid && t.status !== 'completed');

  const schedule = useMemo(() => {
    if (!focus) return [];
    const start = focus.savings_start_date ? new Date(focus.savings_start_date + 'T00:00:00') : null;
    const startMonth = start ? start.getMonth() + 1 : settings.cycle_start_month;
    const startYear = start ? start.getFullYear() : focus.travel_year - 1;
    return savingsSchedule(
      startMonth, startYear, focus.monthly_contribution || settings.monthly_target,
      focus.budget_target, focus.rollover_amount, 12,
    );
  }, [focus, settings]);

  const monthlyGoals = [
    { name: 'Retirement', target: 867 + 208, note: 'Base + First Million accelerator (Jan 2027)' },
    { name: 'Travel', target: settings.monthly_target, note: 'Annual Travel Fund (from Feb 2027)' },
    { name: 'Student Loan', target: 390, note: 'IDR payment, PSLF track (from Jan 2027)' },
    { name: 'Debt', target: 888, note: 'Ends Sep 2027 — $390 stays, $498 to retirement' },
    { name: 'Emergency Fund', target: 0, note: 'Separate from travel funds' },
    { name: 'Household Expenses', target: 0, note: 'Tracked in Cash Flow' },
    { name: 'Other Savings', target: 0, note: 'Tracked in Goals' },
  ];

  return (
    <div className="space-y-4">
      {/* Hero */}
      <Card className="prism-card-shine border-prism-teal/30 bg-gradient-to-br from-card to-muted/30">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-lg font-display">Montgomery Annual Travel Fund</CardTitle>
              <p className="text-xs text-muted-foreground">Travel well. Pay ahead. Protect the future.</p>
            </div>
            <Badge variant="outline" className="border-prism-teal/40 text-prism-teal bg-prism-teal/10">
              {money(settings.monthly_target)}/mo = {money(settings.target_budget)} per year
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {prepaid && (
            <div className="col-span-2 lg:col-span-1 rounded-lg border border-prism-lime/40 bg-prism-lime/5 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Current trip</p>
              <p className="font-display font-bold">{prepaid.destination}</p>
              <p className="text-xs text-muted-foreground">
                {monthName(prepaid.travel_month)} {prepaid.travel_year}
              </p>
              <Badge className="mt-1 bg-prism-lime/15 text-prism-lime border-prism-lime/30" variant="outline">
                PAID · FULLY FUNDED
              </Badge>
              <p className="text-[11px] text-muted-foreground mt-1">Additional savings required: $0</p>
            </div>
          )}
          {focus && funding && (
            <>
              <Stat icon={Plane} label="Next trip target" value={money(funding.target)}
                sub={`${focus.destination} · ${monthName(focus.travel_month)} ${focus.travel_year}`} />
              <Stat icon={PiggyBank} label="Saved" value={money(funding.saved)}
                sub={`${funding.pct.toFixed(0)}% funded`} />
              <Stat icon={CalendarClock} label="Months remaining" value={String(funding.monthsRemaining)}
                sub={`${money(funding.requiredMonthly)}/mo required`} />
              <Stat icon={Wallet} label="Current monthly savings" value={money(funding.currentMonthly)}
                sub={funding.onPace ? 'On pace' : 'Below required pace'} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Progress + tiers */}
      {focus && funding && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 prism-card-shine border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Funding progress — {focus.destination}, {monthName(focus.travel_month)} {focus.travel_year}
              </CardTitle>
              <Badge variant="outline" className="w-fit text-[11px]">{funding.status}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <TravelProgressBar saved={funding.saved} target={funding.target} />
              <Separator />
              <div className="space-y-2">
                {funding.tiers.map((t) => (
                  <div key={t.amount} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      {t.reached
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-prism-lime" />
                        : <span className="h-3.5 w-3.5 rounded-full border border-border inline-block" />}
                      {money(t.amount)} — {t.label}
                    </span>
                    <span className="tabular-nums text-muted-foreground">{t.pct.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="prism-card-shine border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-prism-teal" /> Travel reserve
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <TravelProgressBar
                saved={funding.saved}
                target={settings.reserve_target}
                ticks={[0, 1000, 2000, 3000, 4000, 5000, 6000, 7000]}
              />
              <p className="text-[11px] text-muted-foreground">
                Reserve target {money(settings.reserve_target)} covers higher airfare, a pricier cruise, extra
                excursions and travel price increases. This is not an emergency fund.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Savings schedule */}
      {schedule.length > 0 && (
        <Card className="prism-card-shine border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Savings schedule</CardTitle>
            <p className="text-xs text-muted-foreground">
              New cycle begins {monthName(settings.cycle_start_month)} — {money(focus!.monthly_contribution)}/month
              through the trip month.
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Month</TableHead>
                  <TableHead className="text-xs text-right">Contribution</TableHead>
                  <TableHead className="text-xs text-right">Cumulative</TableHead>
                  <TableHead className="text-xs text-right">% of target</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.map((r) => (
                  <TableRow key={r.label}>
                    <TableCell className="text-xs">{r.label}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{money(r.contribution)}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums font-medium">{money(r.cumulative)}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                      {r.pctOfTarget.toFixed(0)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recurring cycle */}
      <Card className="prism-card-shine border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Route className="h-4 w-4 text-prism-sky" /> Recurring annual cycle
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {CYCLE_STEPS.map((s) => (
            <div key={s.step} className="rounded-lg border border-border/50 p-3 space-y-0.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Step {s.step} · {s.when}
              </p>
              <p className="text-sm font-display font-bold">{s.title}</p>
              <p className="text-[11px] text-muted-foreground">{s.detail}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Cash flow integration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="prism-card-shine border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">2027 cash flow interaction</CardTitle>
            <p className="text-xs text-muted-foreground">
              Retirement and travel are separate planned goals. The $498 released in September 2027 goes to
              retirement — never to travel.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {CASHFLOW_TIMELINE_2027.map((c) => (
              <div key={c.when + c.change} className="flex items-start justify-between gap-3 text-xs border-b border-border/40 pb-2 last:border-0">
                <div>
                  <p className="font-medium">{c.when}</p>
                  <p className="text-muted-foreground">{c.change}</p>
                </div>
                <span className={`tabular-nums font-semibold shrink-0 ${c.amount < 0 ? 'text-prism-lime' : 'text-foreground'}`}>
                  {c.amount < 0 ? '' : '+'}{money(c.amount)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="prism-card-shine border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly goal dashboard</CardTitle>
            <p className="text-xs text-muted-foreground">Planned monthly allocation by goal.</p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Category</TableHead>
                  <TableHead className="text-xs text-right">Monthly target</TableHead>
                  <TableHead className="text-xs text-right">YTD target</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyGoals.map((g) => (
                  <TableRow key={g.name}>
                    <TableCell className="text-xs">
                      <p className="font-medium">{g.name}</p>
                      <p className="text-[10px] text-muted-foreground">{g.note}</p>
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{money(g.target)}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                      {money(g.target * 12)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-[10px] text-muted-foreground mt-2">
              Actuals and variance populate from logged transactions and travel contributions.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rules */}
      <Card className="prism-card-shine border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Travel funding rules</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TRAVEL_FUND_RULES.map((r, i) => (
            <p key={r} className="text-xs text-muted-foreground flex gap-2">
              <span className="font-display font-bold text-prism-teal shrink-0">{i + 1}.</span> {r}
            </p>
          ))}
        </CardContent>
      </Card>

      <TravelGuardrailCard />

      <p className="text-center text-xs font-display tracking-wide text-muted-foreground">
        BUILD WEALTH FOR TOMORROW. FUND EXPERIENCES TODAY.
      </p>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border/50 p-3 space-y-0.5">
      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
