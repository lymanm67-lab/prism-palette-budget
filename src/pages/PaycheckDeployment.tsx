import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { usePaycheckDeployments, useBuildPaycheckDeployment, useUpdatePaycheckDeployment } from '@/hooks/use-paycheck-deploy';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Sparkles, Loader2, Wallet, Receipt, Flame, PiggyBank, TrendingUp, Shield, CheckCircle2, Info, CalendarClock } from 'lucide-react';
import PageOverview from '@/components/PageOverview';

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const BUCKET_META = [
  { key: 'bills_amount', label: 'Bills reserved', icon: Receipt, color: 'text-prism-sky' },
  { key: 'min_debt_amount', label: 'Debt minimums', icon: Flame, color: 'text-prism-rose' },
  { key: 'extra_debt_amount', label: 'Debt attack', icon: Flame, color: 'text-prism-orange' },
  { key: 'savings_amount', label: 'Savings goals', icon: PiggyBank, color: 'text-prism-teal' },
  { key: 'investment_amount', label: 'Investing', icon: TrendingUp, color: 'text-prism-lime' },
  { key: 'buffer_amount', label: 'Smart Buffer', icon: Shield, color: 'text-prism-sky' },
  { key: 'safe_to_spend_amount', label: 'Safe-to-Spend', icon: Wallet, color: 'text-prism-amber' },
] as const;

export default function PaycheckDeployment() {
  const { data: deployments } = usePaycheckDeployments(6);
  const build = useBuildPaycheckDeployment();
  const update = useUpdatePaycheckDeployment();
  const [freq, setFreq] = useState('biweekly');
  const [net, setNet] = useState<string>('');
  const [payDate, setPayDate] = useState<string>('');

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

      <Card className="bg-card/60 backdrop-blur-sm border-border/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-prism-amber" /> Build the next paycheck plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <Label className="text-xs">Pay date</Label>
              <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Net per pay</Label>
              <Input type="number" placeholder="auto" value={net} onChange={e => setNet(e.target.value)} className="h-9 font-mono" />
            </div>
            <div>
              <Label className="text-xs">Frequency</Label>
              <Select value={freq} onValueChange={setFreq}>
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
                  pay_date: payDate || undefined,
                  net_amount: net ? Number(net) : undefined,
                  frequency: freq,
                })}
                disabled={build.isPending}>
                {build.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <>Deploy paycheck <Sparkles className="h-3.5 w-3.5 ml-1.5" /></>}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Upcoming deployments</h2>
        {(!deployments || deployments.length === 0) && (
          <Card className="p-6 text-center text-sm text-muted-foreground border-dashed">
            No deployments yet. Build your first plan above.
          </Card>
        )}
        {(deployments || []).map(d => (
          <Card key={d.id} className="bg-card/60 backdrop-blur-sm border-border/60 overflow-hidden">
            <div className="border-b border-border/40 bg-gradient-to-r from-prism-navy/40 to-transparent p-3 sm:p-4 flex flex-wrap items-center gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Pay date</div>
                <div className="font-display text-lg font-bold">{format(parseISO(d.pay_date), 'EEE, MMM d')}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Net amount</div>
                <div className="font-mono text-lg font-bold text-prism-teal">{fmt(Number(d.net_amount))}</div>
              </div>
              <Badge variant="outline" className="ml-auto text-[10px]">
                {d.confidence} confidence
              </Badge>
              {d.status === 'applied' ? (
                <Badge variant="outline" className="text-[10px] bg-prism-teal/10 border-prism-teal/30 text-prism-teal">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Applied
                </Badge>
              ) : d.id && (
                <div className="flex gap-1.5">
                  <Button size="sm" className="h-7 text-[11px]"
                    onClick={() => update.mutate({ id: d.id!, status: 'applied' })}>
                    Mark applied
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-[11px]"
                    onClick={() => update.mutate({ id: d.id!, status: 'skipped' })}>
                    Skip
                  </Button>
                </div>
              )}
            </div>

            <CardContent className="p-3 sm:p-4 space-y-3">
              {/* Allocation grid */}
              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {BUCKET_META.map(b => {
                  const val = Number((d as any)[b.key] || 0);
                  if (val <= 0) return null;
                  const pct = Number(d.net_amount) > 0 ? Math.round((val / Number(d.net_amount)) * 100) : 0;
                  const Icon = b.icon;
                  return (
                    <div key={b.key} className="rounded-md border border-border/40 bg-background/40 p-2.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon className={`h-3 w-3 ${b.color}`} />
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{b.label}</span>
                      </div>
                      <div className="font-mono text-sm font-bold">{fmt(val)}</div>
                      <div className="text-[10px] text-muted-foreground">{pct}%</div>
                    </div>
                  );
                })}
              </div>

              {/* Bills breakdown */}
              {Array.isArray(d.bills_breakdown) && d.bills_breakdown.length > 0 && (
                <div className="rounded-md border border-border/40 bg-background/40 p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">
                    Bills covered ({d.bills_breakdown.length})
                  </div>
                  <ul className="space-y-1">
                    {d.bills_breakdown.map((b: any) => (
                      <li key={b.id} className="flex items-center justify-between text-[11px]">
                        <span className="truncate">
                          <span className="text-muted-foreground mr-1.5">{format(parseISO(b.due_date), 'MMM d')}</span>
                          {b.merchant}
                        </span>
                        <span className="font-mono font-semibold">{fmt(Number(b.amount))}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {d.rationale && (
                <p className="text-[11px] text-muted-foreground italic flex gap-1.5">
                  <Info className="h-3 w-3 shrink-0 mt-0.5" />
                  <span>{d.rationale}</span>
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
