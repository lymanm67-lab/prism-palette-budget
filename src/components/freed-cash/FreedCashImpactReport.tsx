import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { beforeAfter, creepTrend, opportunityCost } from '@/lib/freed-cash/analytics';
import {
  FreedCashRedirect,
  FreedCashSource,
  destinationLabel,
  monthlySavings,
  redirectCapacity,
  toMonthly,
  useFreedCashReviews,
} from '@/hooks/use-freed-cash';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const money2 = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

interface Props {
  sources: FreedCashSource[];
  redirects: FreedCashRedirect[];
}

export function FreedCashImpactReport({ sources, redirects }: Props) {
  const { data: reviews } = useFreedCashReviews();
  const ba = useMemo(() => beforeAfter(sources), [sources]);
  const capacity = useMemo(() => redirectCapacity(sources, redirects), [sources, redirects]);
  const trend = useMemo(() => creepTrend(reviews ?? []), [reviews]);

  const [returnPct, setReturnPct] = useState(7);
  const projections = useMemo(
    () => opportunityCost(capacity.verifiedMonthly, returnPct),
    [capacity.verifiedMonthly, returnPct],
  );

  return (
    <div className="space-y-4 print:space-y-3">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
          <div>
            <CardTitle className="text-base">Before and after</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              What these recurring expenses used to cost versus what they cost now.
            </p>
          </div>
          <Button variant="outline" size="sm" className="print:hidden" onClick={() => window.print()}>
            Print report
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <Stat label="Before" value={`${money2(ba.beforeMonthly)}/mo`} />
          <Stat label="After (incl. fees)" value={`${money2(ba.afterMonthly)}/mo`} />
          <Stat label="Freed" value={`${money2(ba.savedMonthly)}/mo`} />
          <Stat label="Annual impact" value={money2(ba.savedAnnual)} />
          <Stat label="Cost reduction" value={`${ba.reductionPct.toFixed(1)}%`} />
          <Stat label="Verified share" value={`${ba.verifiedShare.toFixed(1)}%`} />
          <Stat label="Redirected" value={`${money2(capacity.assignedMonthly)}/mo`} />
          <Stat label="Still needs a job" value={`${money2(capacity.unassignedMonthly)}/mo`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Before and after by expense</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Every cancellation, reduction and negotiation, with what it cost before and now.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {perSource.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No savings recorded yet.</p>
          )}
          {perSource.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/40 p-3"
            >
              <div className="min-w-[10rem]">
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {s.vendor ? `${s.vendor} · ` : ''}
                  {s.source_type.replace(/_/g, ' ')} · {s.status}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Before {money2(s.before)}/mo → after {money2(s.after)}/mo
              </p>
              <p className="text-sm font-semibold">
                {money2(s.saved)}/mo · {money2(s.saved * 12)}/yr
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Where the freed money went</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Redirected {money2(capacity.assignedMonthly)}/mo of the verified {money2(capacity.verifiedMonthly)}/mo.
            Still needs a job: {money2(capacity.unassignedMonthly)}/mo.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {redirectRows.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No freed cash has been given a job yet.
            </p>
          )}
          {redirectRows.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/40 p-3"
            >
              <div className="min-w-[10rem]">
                <p className="text-sm font-medium">
                  {r.destination_label || destinationLabel(r.destination_type)}
                </p>
                <p className="text-xs text-muted-foreground">
                  From {r.sourceName} · since {r.start_date}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {r.status}
                {r.confirmed_moved ? ' · money confirmed moved' : ' · not confirmed yet'}
              </p>
              <p className="text-sm font-semibold">
                {money2(Number(r.monthly_amount))}/mo · {money2(Number(r.monthly_amount) * 12)}/yr
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Opportunity cost of not redirecting</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            If your verified {money2(capacity.verifiedMonthly)}/mo is invested instead of absorbed back
            into spending.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="w-40 print:hidden">
            <Label>Assumed annual return %</Label>
            <Input
              type="number"
              step="0.5"
              value={returnPct}
              onChange={(e) => setReturnPct(Number(e.target.value) || 0)}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-5">
            {projections.map((p) => (
              <div key={p.years} className="rounded-lg border border-border/60 bg-card/40 p-3">
                <p className="text-xs text-muted-foreground">{p.years} yr</p>
                <p className="text-lg font-semibold">{money(p.value)}</p>
                <p className="text-xs text-muted-foreground">
                  {money(p.contributed)} in · {money(p.growth)} growth
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Capture trend</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            From your saved monthly reviews — is freed cash getting a job, or drifting back into spending?
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {trend.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Log a monthly review to start the trend.
            </p>
          )}
          {trend.map((t) => (
            <div
              key={t.month}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/40 p-3"
            >
              <p className="text-sm font-medium">{t.month}</p>
              <p className="text-xs text-muted-foreground">
                Verified {money2(t.verifiedMonthly)} · redirected {money2(t.redirectedMonthly)} · capture{' '}
                {t.captureRate.toFixed(1)}%
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
