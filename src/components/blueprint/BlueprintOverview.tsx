import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Compass } from 'lucide-react';
import { money, StatCard, SectionNote, AsOfStamp } from './shared';
import { useWealthOSData } from '@/hooks/use-wealth-os';
import { useSafeToSpend } from '@/hooks/use-safe-to-spend';
import {
  buildTimeline, milestoneHits, releasedCash, healthcareReserve,
  type AssumptionState,
} from '@/lib/blueprint/model';

/** Top-level snapshot. Every figure is derived — nothing is hard-coded here. */
export function BlueprintOverview({
  state, netMonthly, onDrill,
}: {
  state: AssumptionState;
  netMonthly: number;
  onDrill: (tab: string) => void;
}) {
  const { data: wealth } = useWealthOSData();
  let sts = 0;
  try {
    // Safe-to-spend is optional context; never let it break the overview.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const s = useSafeToSpend() as any;
    sts = Number(s?.data?.safeToSpend ?? s?.safeToSpend ?? 0) || 0;
  } catch { sts = 0; }

  const rows = useMemo(() => buildTimeline(state), [state]);
  const year1 = rows[0];
  const hits = useMemo(() => milestoneHits(state, state.primaryReturnPct), [state]);
  const nextMilestone = hits.find((h) => h.amount > state.portfolioBalance && h.year);
  const reserve = useMemo(() => healthcareReserve(state.healthcare), [state.healthcare]);

  const b = wealth?.buckets;
  const contributionRate = year1 && state.salaryAnnual > 0
    ? (year1.totalAnnual / state.salaryAnnual) * 100 : 0;

  const nextEvents = useMemo(() => {
    const evts: { when: string; what: string }[] = [];
    state.debts.forEach((d) => {
      const when = d.forgiveness?.forgivenessDate ?? d.payoffDate;
      if (when) evts.push({ when, what: `${d.label} ends → ${money(releasedCash(d))}/mo redirects to investing` });
    });
    if (state.scheduledIncreaseStartYear) {
      evts.push({ when: `${state.scheduledIncreaseStartYear}-01`, what: `Scheduled contribution increase ${money(state.scheduledIncreaseMonthly)}/mo begins` });
    }
    if (nextMilestone?.year) {
      evts.push({ when: `${nextMilestone.year}-01`, what: `${money(nextMilestone.amount)} portfolio milestone (age ${nextMilestone.age})` });
    }
    const decisionYear = new Date().getFullYear() + (state.retirementAge - state.currentAge);
    evts.push({ when: `${decisionYear}-01`, what: `Medicare decision window opens (age ${state.retirementAge})` });
    evts.push({ when: `${new Date().getFullYear() + (state.rmdAge - state.currentAge)}-01`, what: `RMDs begin at age ${state.rmdAge}` });
    return evts.sort((a, z) => a.when.localeCompare(z.when)).slice(0, 6);
  }, [state, nextMilestone]);

  return (
    <div className="space-y-4">
      <Card className="wos-page">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Compass className="h-4 w-4 text-prism-teal" /> Where are we today?
              </CardTitle>
              <SectionNote>Tap any card to drill into the detail behind it.</SectionNote>
            </div>
            <AsOfStamp date={state.asOf} />
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Net worth" value={money(wealth?.netWorth ?? 0)} sub="Assets − liabilities" level="current" onClick={() => onDrill('networth')} />
          <StatCard label="Household take-home / mo" value={money(netMonthly)} level="current" />
          <StatCard label="Safe to spend" value={money(sts)} sub="After bills & buffer" />
          <StatCard label="Total debt" value={money(wealth?.totalLiabilities ?? 0)} onClick={() => onDrill('debt')} level="current" />
          <StatCard label="Retirement accounts" value={money(b?.retirement ?? 0)} onClick={() => onDrill('contributions')} level="current" />
          <StatCard label="HSA" value={money(b?.hsa ?? 0)} onClick={() => onDrill('healthcare')} level="current" />
          <StatCard label="Taxable investments" value={money(b?.brokerage ?? 0)} onClick={() => onDrill('portfolio')} level="current" />
          <StatCard label="Cash & savings" value={money((b?.cash ?? 0) + (b?.emergency ?? 0))} level="current" />
          <StatCard label="Emergency fund" value={money(b?.emergency ?? 0)} level="current" />
          <StatCard label="Real estate" value={money(b?.realEstate ?? 0)} level="current" />
          <StatCard label="Business assets" value={money(b?.business ?? 0)} level="current" />
          <StatCard label="Intellectual property" value={money(b?.intellectualProperty ?? 0)} level="current" />
          <StatCard label="Other assets" value={money((b?.personalProperty ?? 0) + (b?.vehicles ?? 0))} level="current" />
          <StatCard label="Insurance protection" value={`${state.ltcQuotes.length} LTC option${state.ltcQuotes.length === 1 ? '' : 's'}`} sub={`Healthcare reserve target ${money(reserve.target)}`} onClick={() => onDrill('protection')} />
          <StatCard label="Investment contribution rate" value={`${contributionRate.toFixed(1)}%`} sub={`${money(year1?.totalMonthly ?? 0)}/mo of pay`} onClick={() => onDrill('contributions')} level="projected" />
          <StatCard
            label="Next milestone"
            value={nextMilestone ? money(nextMilestone.amount) : '—'}
            sub={nextMilestone?.year ? `${nextMilestone.year} · age ${nextMilestone.age}` : 'Set assumptions to project'}
            level="projected"
            onClick={() => onDrill('portfolio')}
          />
        </CardContent>
      </Card>

      <Card className="wos-page">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">What happens next?</CardTitle>
          <SectionNote>Derived from your debt plan, contribution schedule, milestones and healthcare timeline.</SectionNote>
        </CardHeader>
        <CardContent className="space-y-2">
          {nextEvents.map((e) => (
            <div key={`${e.when}-${e.what}`} className="flex items-start justify-between gap-3 rounded-lg border border-border/60 p-3 text-sm">
              <span>{e.what}</span>
              <Badge variant="outline" className="text-[10px] shrink-0">{e.when}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
