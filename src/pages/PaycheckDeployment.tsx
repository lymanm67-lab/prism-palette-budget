import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO, lastDayOfMonth } from 'date-fns';

/** Next semi-monthly payday (15th or month-end) on or after today. */
function nextSemiMonthlyPayDate(from = new Date()): string {
  const d15 = new Date(from.getFullYear(), from.getMonth(), 15);
  const eom = lastDayOfMonth(from);
  if (from <= d15) return format(d15, 'yyyy-MM-dd');
  return format(eom, 'yyyy-MM-dd');
}
import { usePaycheckDeployments, useBuildPaycheckDeployment, useUpdatePaycheckDeployment } from '@/hooks/use-paycheck-deploy';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Sparkles, Loader2, CalendarClock, RotateCcw } from 'lucide-react';
import PaycheckSplitAnimation from '@/components/coach/PaycheckSplitAnimation';
import PaycheckDeploymentCard, { PastDeploymentList } from '@/components/coach/PaycheckDeploymentCard';
import PageOverview from '@/components/PageOverview';
import PaycheckScheduleCard from '@/components/coach/PaycheckScheduleCard';
import { usePaycheckSchedules, toDeployFrequency } from '@/hooks/use-paycheck-schedule';
import { useHouseholdProfile } from '@/hooks/use-household-profile';

export default function PaycheckDeployment() {
  const { data: deployments } = usePaycheckDeployments(6);
  const build = useBuildPaycheckDeployment();
  const update = useUpdatePaycheckDeployment();
  const { primary } = usePaycheckSchedules();
  const { data: profile } = useHouseholdProfile();
  const [freq, setFreq] = useState('biweekly');
  const [net, setNet] = useState<string>('');
  const [payDate, setPayDate] = useState<string>('');
  const [overridden, setOverridden] = useState(false);

  // Schedule-driven defaults: entered once, applied to every future payday.
  const schedFreq = primary ? toDeployFrequency(primary.frequency) : null;
  const effFreq = overridden ? freq : (schedFreq || freq);
  const effNet = overridden ? net : (net || (primary ? String(primary.net_amount) : ''));
  const effPayDate = overridden ? payDate : (payDate || primary?.next_due_date || '');

  const loadFromSchedule = (opts: { pay_date: string; net_amount: number; frequency: string }) => {
    setPayDate(opts.pay_date);
    setNet(String(opts.net_amount));
    setFreq(opts.frequency);
    setOverridden(false);
  };

  const resetToSchedule = () => {
    setOverridden(false);
    setPayDate(primary?.next_due_date || '');
    setNet(primary ? String(primary.net_amount) : '');
    setFreq(schedFreq || 'biweekly');
  };


  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link to="/coach"><ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Coach</Link>
          </Button>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">Paycheck Deployment</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Every dollar gets a job before it lands. Coach reserves bills, covers debt, funds goals, sets your buffer, and tells you the true Safe-to-Spend for this paycheck.
          </p>
        </div>
      </div>

      <PageOverview
        title="How Paycheck Deployment works"
        description="Coach assigns each paycheck across bills, debt, goals, buffer, and Safe-to-Spend before the money lands."
        icon={CalendarClock}
        iconColor="text-prism-amber"
        ttsScript="Paycheck Deployment turns every paycheck into a plan. Coach reserves the bills due before your next paycheck, covers debt minimums, sends extra to your debt attack, funds your goals on schedule, applies your Smart Buffer, and shows the remainder as true Safe-to-Spend."
        features={[
          'Reserves bills due before the next paycheck.',
          'Covers debt minimums + your extra attack from the active plan.',
          'Prorates active goals onto each paycheck.',
          'Applies your Smart Buffer (adaptive or manual).',
          'The remainder is your true Safe-to-Spend — guilt-free.',
        ]}
      />

      <PaycheckScheduleCard onUse={loadFromSchedule} />

      {profile && (Number(profile.lyman_net_monthly) > 0 || Number(profile.kateri_net_monthly) > 0) && (
        <Card className="bg-card/60 backdrop-blur-sm border-border/60">
          <CardContent className="pt-4 space-y-2">
            <p className="text-xs text-muted-foreground">
              From your Household Profile — combined take-home{' '}
              <span className="font-mono text-foreground">
                ${(Number(profile.lyman_net_monthly || 0) + Number(profile.kateri_net_monthly || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>/mo
            </p>
            <div className="flex flex-wrap gap-2">
              {Number(profile.lyman_net_monthly) > 0 && (
                <Button size="sm" variant="outline" onClick={() => { setNet(String(profile.lyman_net_monthly)); setFreq('monthly'); setOverridden(true); }}>
                  Lyman · monthly ${Number(profile.lyman_net_monthly).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Button>
              )}
              {Number(profile.kateri_net_monthly) > 0 && (
                <Button size="sm" variant="outline" onClick={() => { setNet(String(Math.round(Number(profile.kateri_net_monthly) * 50) / 100)); setFreq('semi_monthly'); setPayDate(nextSemiMonthlyPayDate()); setOverridden(true); }}>
                  Kateri · twice a month ${(Number(profile.kateri_net_monthly) / 2).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card/60 backdrop-blur-sm border-border/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-prism-amber" /> Build the next paycheck plan
            {primary && !overridden && (
              <Badge variant="outline" className="text-[10px] ml-1">From schedule</Badge>
            )}
            {overridden && (
              <Badge variant="outline" className="text-[10px] ml-1 bg-prism-amber/10 border-prism-amber/30 text-prism-amber">
                One-time override
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <Label className="text-xs">Pay date</Label>
              <Input type="date" value={effPayDate} onChange={e => { setPayDate(e.target.value); setOverridden(true); }} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Net per pay</Label>
              <Input type="number" placeholder="auto" value={effNet} onChange={e => { setNet(e.target.value); setOverridden(true); }} className="h-9 font-mono" />
            </div>
            <div>
              <Label className="text-xs">Frequency</Label>
              <Select value={effFreq} onValueChange={v => { setFreq(v); setOverridden(true); }}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Biweekly</SelectItem>
                  <SelectItem value="semi_monthly">Semi-monthly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="w-full h-9"
                onClick={() => build.mutate({
                  pay_date: effPayDate || undefined,
                  net_amount: effNet ? Number(effNet) : undefined,
                  frequency: effFreq,
                })}
                disabled={build.isPending}>
                {build.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <>Deploy paycheck <Sparkles className="h-3.5 w-3.5 ml-1.5" /></>}
              </Button>
            </div>
          </div>
          {overridden && primary && (
            <Button variant="ghost" size="sm" className="h-7 mt-2 text-[11px]" onClick={resetToSchedule}>
              <RotateCcw className="h-3 w-3 mr-1" /> Reset to schedule ({primary.merchant})
            </Button>
          )}
        </CardContent>

      </Card>

      {/* Timeline */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Upcoming deployments</h2>
        {(() => {
          const today = new Date().toISOString().slice(0, 10);
          const upcoming = (deployments || []).filter(d => d.pay_date >= today);
          if (upcoming.length === 0) {
            const last = (deployments || [])[0];
            return (
              <Card className="p-4 space-y-3 border-dashed">
                <p className="text-center text-sm text-muted-foreground">
                  No upcoming deployments. Tap "Deploy paycheck" above to plan the next one.
                </p>
                {last && (
                  <>
                    <p className="text-[11px] text-muted-foreground text-center">
                      Showing your most recent plan ({format(parseISO(last.pay_date), 'MMM d, yyyy')}) as a preview.
                    </p>
                    <PaycheckSplitAnimation deployment={last} />
                  </>
                )}
              </Card>
            );
          }
           return upcoming.map(d => (
             <PaycheckDeploymentCard
               key={d.id || d.pay_date}
               deployment={d}
               onUpdate={(id, status) => update.mutate({ id, status })}
             />
           ));
        })()}
      </div>

      <PastDeploymentList
        deployments={(deployments || []).filter(d => d.pay_date < new Date().toISOString().slice(0, 10))}
        onUpdate={(id, status) => update.mutate({ id, status })}
      />
    </div>
  );
}
