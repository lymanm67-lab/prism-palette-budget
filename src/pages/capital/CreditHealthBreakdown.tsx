import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, AlertTriangle, Info, Lightbulb, BarChart3, HelpCircle } from 'lucide-react';
import PageOverview from '@/components/PageOverview';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import InsightCard from '@/components/credit-health/InsightCard';
import { useCreditAccounts } from '@/hooks/use-credit-accounts';
import { cn } from '@/lib/utils';

const FACTORS = [
  { key: 'payment', label: 'Payment History', weight: 35, description: 'Your record of on-time payments across all accounts.', helps: ['On-time payments every month', 'Autopay enrollment', 'Bringing past-due accounts current'], hurts: ['Late payments (30, 60, 90+ days)', 'Collections and charge-offs', 'Bankruptcies and foreclosures'] },
  { key: 'utilization', label: 'Credit Utilization', weight: 30, description: 'The percentage of your available credit that you\'re using.', helps: ['Keeping balances below 30% of limits', 'Paying balances in full each month', 'Requesting credit limit increases'], hurts: ['Maxed-out credit cards', 'High revolving balances', 'Only making minimum payments'] },
  { key: 'age', label: 'Length of Credit History', weight: 15, description: 'How long your credit accounts have been open.', helps: ['Keeping oldest accounts open', 'Avoiding unnecessary new accounts', 'Time — this factor improves naturally'], hurts: ['Closing old accounts', 'Opening many new accounts at once', 'Short overall credit history'] },
  { key: 'new', label: 'New Credit', weight: 10, description: 'Recent credit applications and newly opened accounts.', helps: ['Spacing out credit applications', 'Rate shopping within a 14-day window', 'Only applying when necessary'], hurts: ['Multiple applications in a short period', 'Too many new accounts', 'Frequent hard inquiries'] },
  { key: 'mix', label: 'Credit Mix', weight: 10, description: 'The variety of credit accounts you have.', helps: ['Having both revolving and installment accounts', 'Mortgage, auto, credit cards, etc.', 'Responsible management of different types'], hurts: ['Only one type of credit', 'Too many of the same account type', 'Opening accounts just for mix (not recommended)'] },
];

const ScoreBreakdown = () => {
  const navigate = useNavigate();
  const { accounts } = useCreditAccounts();
  const { inquiries } = useCreditInquiries();

  const scores = useMemo(() => {
    const revolving = accounts.filter(a => a.account_type === 'Revolving');
    const totalBalance = revolving.reduce((s, a) => s + Number(a.balance), 0);
    const totalLimit = revolving.reduce((s, a) => s + Number(a.credit_limit || 0), 0);
    const utilization = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;
    const negativeCount = accounts.filter(a => ['Collection', 'Charge-Off', 'Foreclosure', 'Repossession'].includes(a.account_status)).length;
    const withDates = accounts.filter(a => a.date_opened);
    const avgAge = withDates.length ? withDates.reduce((sum, a) => sum + ((Date.now() - new Date(a.date_opened!).getTime()) / (1000 * 60 * 60 * 24 * 30)), 0) / withDates.length : 0;
    const types = new Set(accounts.map(a => a.account_type));

    // Payment history requires either reported payment strings or known derogatory statuses.
    const hasPaymentData = accounts.some(a => !!a.payment_history) || negativeCount > 0;

    // New credit requires inquiry records or account open dates within the last 12 months.
    const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;
    const hardRecent = (inquiries || []).filter(i => i.inquiry_type === 'hard' && new Date(i.inquiry_date).getTime() >= cutoff).length;
    const newAccountsRecent = withDates.filter(a => new Date(a.date_opened!).getTime() >= cutoff).length;
    const hasNewCreditData = (inquiries || []).length > 0 || withDates.length > 0;
    const recentEvents = hardRecent + newAccountsRecent;

    return {
      payment: !hasPaymentData ? null : negativeCount === 0 ? 90 : negativeCount <= 2 ? 45 : 15,
      utilization: revolving.length === 0 || totalLimit === 0
        ? null
        : utilization <= 10 ? 95 : utilization <= 30 ? 75 : utilization <= 50 ? 45 : 15,
      age: withDates.length === 0
        ? null
        : avgAge >= 84 ? 90 : avgAge >= 48 ? 70 : avgAge >= 24 ? 45 : 20,
      new: !hasNewCreditData
        ? null
        : recentEvents === 0 ? 95 : recentEvents <= 2 ? 75 : recentEvents <= 4 ? 45 : 20,
      mix: accounts.length === 0
        ? null
        : types.size >= 4 ? 90 : types.size >= 3 ? 70 : types.size >= 2 ? 45 : 25,
    } as Record<string, number | null>;
  }, [accounts, inquiries]);

  const getStatus = (s: number) => s >= 70 ? 'good' : s >= 40 ? 'fair' : 'poor';

  const statusStyles = {
    good: { color: 'text-emerald-600', bg: '[&>div]:bg-emerald-500', Icon: TrendingUp },
    fair: { color: 'text-amber-600', bg: '[&>div]:bg-amber-500', Icon: Minus },
    poor: { color: 'text-destructive', bg: '[&>div]:bg-destructive', Icon: TrendingDown },
    unknown: { color: 'text-muted-foreground', bg: '[&>div]:bg-muted', Icon: HelpCircle },
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/capital/credit-health')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Score Breakdown</h1>
            <p className="text-sm text-muted-foreground">Understand what makes up your credit score</p>
          </div>
        </div>
        <PageOverview
          title="Score Breakdown"
          description="See how each of the five FICO scoring factors — payment history, utilization, credit age, new credit, and credit mix — contributes to your overall credit score."
          icon={BarChart3}
          iconColor="text-prism-sky"
          features={[
            'Visual breakdown of all five FICO scoring factors',
            'Per-factor health status with color-coded indicators',
            'Actionable tips on what helps and hurts each factor',
            'Weight percentages showing each factor\'s impact',
          ]}
          ttsScript="Welcome to the Score Breakdown page. Here you can see how each of the five major credit scoring factors affects your overall score. Payment History, worth 35 percent, tracks your record of on-time payments. Credit Utilization, at 30 percent, measures how much of your available credit you're using. Length of Credit History accounts for 15 percent. New Credit and Credit Mix each make up 10 percent. Each factor shows a health indicator — green means you're in good shape, yellow means there's room to improve, and red flags areas that need attention. Expand any factor to see specific tips on what helps and what hurts your score in that category."
        />
      </div>

      <div className="space-y-4">
        {FACTORS.map(f => {
          const score = scores[f.key as keyof typeof scores];
          const status = getStatus(score);
          const st = statusStyles[status];
          const StatusIcon = st.Icon;

          return (
            <Card key={f.key}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <StatusIcon className={cn('h-4 w-4', st.color)} />
                    {f.label}
                  </CardTitle>
                  <span className="text-sm font-bold text-muted-foreground">{f.weight}%</span>
                </div>
                <CardDescription>{f.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className={cn('font-medium', st.color)}>
                      {status === 'good' ? 'Strong' : status === 'fair' ? 'Needs attention' : 'Critical'}
                    </span>
                    <span className="text-muted-foreground">{score}/100</span>
                  </div>
                  <Progress value={score} className={cn('h-2', st.bg)} />
                </div>

                <Accordion type="single" collapsible>
                  <AccordionItem value="details" className="border-0">
                    <AccordionTrigger className="py-2 text-xs text-primary hover:no-underline">
                      What helps & what hurts
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-emerald-600">✓ What helps</p>
                          {f.helps.map(h => (
                            <p key={h} className="text-xs text-muted-foreground">• {h}</p>
                          ))}
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-destructive">✗ What hurts</p>
                          {f.hurts.map(h => (
                            <p key={h} className="text-xs text-muted-foreground">• {h}</p>
                          ))}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Why score may still be lower */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Why your score may still be lower than expected
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InsightCard type="warning" title="Reporting lag" description="Updated accounts may not have fully cycled through to all bureaus yet. Changes can take 30-60 days to reflect." />
          <InsightCard type="warning" title="Utilization suppression" description="Even after payments, high utilization from the previous statement may still be reported." />
          <InsightCard type="info" title="Accurate negative history" description="Legitimate negative marks (late payments, collections) remain for 7 years even if the account is now current." />
          <InsightCard type="info" title="Thin file" description="Fewer accounts and shorter history naturally cap your score. Time and consistency are the best remedies." />
          <InsightCard type="info" title="Model variation" description="Different scoring models (FICO, VantageScore) weigh factors differently. Your score may vary across platforms." />
        </CardContent>
      </Card>
    </div>
  );
};

export default ScoreBreakdown;
