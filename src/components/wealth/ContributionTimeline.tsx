import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CATEGORY_LABELS, FundCategory, MonthRow, money2, monthLabel } from '@/lib/wealth/sourceOfFunds';

interface Props {
  milestones: { month: string; label: string; row?: MonthRow }[];
  firstMonth?: MonthRow;
}

/** Projected Investable Contribution Rate — what actually enters invested accounts. */
export function ContributionTimeline({ milestones, firstMonth }: Props) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Projected investable contribution rate</CardTitle>
        <CardDescription>
          Future contribution events included — this plan is not a flat monthly amount for 25 or 30 years.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {firstMonth && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <p className="text-xs text-muted-foreground">Going in this month</p>
            <p className="text-xl font-bold">{money2(firstMonth.investedTotal)}</p>
            <p className="text-[11px] text-muted-foreground">
              Core {money2(firstMonth.coreTotal)} + net freed cash {money2(firstMonth.netInvestableFreedCash)}
            </p>
          </div>
        )}

        {milestones.map((m) => {
          const r = m.row!;
          const isOpen = open === m.month;
          return (
            <div key={m.month} className="rounded-lg border border-border/60 bg-card/40">
              <button
                className="flex w-full flex-wrap items-center justify-between gap-2 p-3 text-left"
                onClick={() => setOpen(isOpen ? null : m.month)}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{monthLabel(m.month)}</p>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{money2(r.investedTotal)}/mo invested</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>
              {isOpen && (
                <div className="space-y-1 border-t border-border/60 p-3 text-xs">
                  {Object.entries(r.core).map(([c, amt]) => (
                    <Row key={c} label={CATEGORY_LABELS[c as FundCategory]} value={money2(amt || 0)} />
                  ))}
                  <Row label="Freed cash available" value={money2(r.flexibleAvailable)} />
                  <Row label="Buffer allocation" value={`-${money2(r.bufferAllocation)}`} />
                  <Row label="Debt allocation" value={`-${money2(r.debtAllocation)}`} />
                  <Row label="Savings allocation" value={`-${money2(r.savingsAllocation + r.otherAllocation)}`} />
                  <Row label="Net investable freed cash" value={money2(r.netInvestableFreedCash)} />
                  <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2 font-semibold">
                    <span>Total invested</span>
                    <span>{money2(r.investedTotal)}</span>
                  </div>
                  {r.releases.length > 0 && (
                    <div className="pt-2">
                      {r.releases.map((rel, i) => (
                        <Badge key={i} variant="secondary" className="mr-1 text-[10px]">
                          {rel.label}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {milestones.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No future contribution events fall inside this horizon.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export function TodayComparison({
  today,
  planned,
  horizon,
}: {
  today: number;
  planned: number;
  horizon: number;
}) {
  const diff = planned - today;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Today&apos;s active contributions vs planned strategy</CardTitle>
        <CardDescription>Diagnostic only — it shows how much the future events matter.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        <Stat label={`Today's active contributions, ${horizon} yrs`} value={money2(today)} />
        <Stat label={`Planned strategy, ${horizon} yrs`} value={money2(planned)} />
        <Stat label="Difference from future events" value={money2(diff)} highlight />
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'border-primary/40 bg-primary/5' : 'border-border/60'}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
