import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, AlertTriangle, Check, CreditCard, Clock, FileText, TrendingUp, CheckCircle2 } from 'lucide-react';
import PageOverview from '@/components/PageOverview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ReadinessMeter from '@/components/credit-health/ReadinessMeter';
import InsightCard from '@/components/credit-health/InsightCard';
import { useCreditAccounts } from '@/hooks/use-credit-accounts';
import { useDisputes } from '@/hooks/use-disputes';
import { cn } from '@/lib/utils';

type ReadinessLevel = 'not_ready' | 'improving' | 'nearly_ready' | 'ready';

interface ChecklistItem {
  label: string;
  status: 'pass' | 'warning' | 'fail';
  detail: string;
}

const ApprovalReadiness = () => {
  const navigate = useNavigate();
  const { accounts } = useCreditAccounts();
  const { disputes } = useDisputes();

  const assessment = useMemo(() => {
    const revolving = accounts.filter(a => a.account_type === 'Revolving');
    const totalBalance = revolving.reduce((s, a) => s + Number(a.balance), 0);
    const totalLimit = revolving.reduce((s, a) => s + Number(a.credit_limit || 0), 0);
    const hasRevolvingLimits = totalLimit > 0;
    const utilization = hasRevolvingLimits ? (totalBalance / totalLimit) * 100 : null;
    const negativeCount = accounts.filter(a => ['Collection', 'Charge-Off', 'Foreclosure', 'Repossession'].includes(a.account_status)).length;
    const openDisputes = disputes.filter(d => ['submitted', 'in_progress'].includes(d.status)).length;
    const withDates = accounts.filter(a => a.date_opened);
    const hasPaymentData = accounts.some(a => !!a.payment_history) || negativeCount > 0;

    // Factor scores — null when the underlying data was never imported.
    // No assumed/placeholder factor values are substituted.
    const utilizationScore = utilization === null ? null : utilization <= 10 ? 100 : utilization <= 30 ? 80 : utilization <= 50 ? 55 : 15;
    const negativeScore = !hasPaymentData ? null : negativeCount === 0 ? 100 : negativeCount <= 2 ? 40 : 15;
    const avgAgeMonths = withDates.length > 0
      ? withDates.reduce((sum, a) => sum + ((Date.now() - new Date(a.date_opened!).getTime()) / (1000 * 60 * 60 * 24 * 30)), 0) / withDates.length
      : null;
    const ageScore = avgAgeMonths === null ? null : avgAgeMonths >= 84 ? 100 : avgAgeMonths >= 48 ? 75 : avgAgeMonths >= 24 ? 55 : avgAgeMonths >= 12 ? 35 : 20;
    const types = new Set(accounts.map(a => a.account_type));
    const mixScore = accounts.length === 0 ? null : types.size >= 4 ? 100 : types.size >= 3 ? 75 : types.size >= 2 ? 50 : 30;

    // Only estimate when payment history, utilization and credit age are all present.
    const canEstimate = utilizationScore !== null && negativeScore !== null && ageScore !== null && mixScore !== null;
    const score: number | null = canEstimate
      ? Math.min(850, Math.max(300, Math.round(
          300 + (550 * (
            negativeScore! * 0.34 + utilizationScore! * 0.24 + ageScore! * 0.16 + mixScore! * 0.26
          ) / 100)
        )))
      : null;

    const checklist: ChecklistItem[] = [
      {
        label: 'Credit Score',
        status: score === null ? 'warning' : score >= 670 ? 'pass' : score >= 580 ? 'warning' : 'fail',
        detail: score === null
          ? 'Score unavailable — import reports with payment history, limits and open dates'
          : `Estimated score: ${score}`,
      },
      {
        label: 'Credit Utilization',
        status: utilization === null ? 'warning' : utilization <= 30 ? 'pass' : utilization <= 50 ? 'warning' : 'fail',
        detail: utilization === null ? 'No revolving limits reported' : `Currently at ${utilization.toFixed(0)}%`,
      },
      {
        label: 'Negative Items',
        status: !hasPaymentData ? 'warning' : negativeCount === 0 ? 'pass' : negativeCount <= 2 ? 'warning' : 'fail',
        detail: !hasPaymentData ? 'No payment data imported' : `${negativeCount} negative item${negativeCount !== 1 ? 's' : ''} found`,
      },
      {
        label: 'Open Disputes',
        status: openDisputes === 0 ? 'pass' : 'warning',
        detail: openDisputes > 0 ? `${openDisputes} disputes pending — wait for resolution` : 'No open disputes',
      },
      {
        label: 'Recent Inquiries',
        status: inquiries.length === 0 ? 'warning' : inquiries.filter(i => {
          const d = i.inquiry_date ? new Date(i.inquiry_date) : null;
          return d ? (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24) <= 365 : false;
        }).length <= 2 ? 'pass' : 'warning',
        detail: inquiries.length === 0
          ? 'No inquiries logged — import reports to assess'
          : `${inquiries.filter(i => {
              const d = i.inquiry_date ? new Date(i.inquiry_date) : null;
              return d ? (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24) <= 365 : false;
            }).length} hard pull(s) in the last 12 months`,
      },
      {
        label: 'Payment History',
        status: !hasPaymentData ? 'warning' : negativeCount === 0 ? 'pass' : 'warning',
        detail: !hasPaymentData
          ? 'No payment history imported'
          : negativeCount === 0 ? 'No late payments detected' : 'Address any past-due accounts',
      },
    ];

    const passes = checklist.filter(c => c.status === 'pass').length;
    const level: ReadinessLevel = passes >= 5 ? 'ready' : passes >= 4 ? 'nearly_ready' : passes >= 2 ? 'improving' : 'not_ready';

    const improvements: string[] = [];
    if (utilization !== null && utilization > 30) improvements.push(`Reduce utilization from ${utilization.toFixed(0)}% to below 30%`);
    if (negativeCount > 0) improvements.push('Dispute inaccurate negative items');
    if (openDisputes > 0) improvements.push('Wait for dispute resolutions before applying');
    if (score !== null && score < 670) improvements.push('Continue building positive credit history');
    if (score === null) improvements.push('Import full credit reports so the readiness estimate can be calculated');

    return { score, level, checklist, improvements, utilization };
  }, [accounts, disputes, inquiries]);


  const statusIcon = (s: string) => {
    if (s === 'pass') return <Check className="h-4 w-4 text-emerald-500" />;
    if (s === 'warning') return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    return <AlertTriangle className="h-4 w-4 text-destructive" />;
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/capital/credit-health')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Approval Readiness</h1>
            <p className="text-sm text-muted-foreground">Are you ready to apply for credit?</p>
          </div>
        </div>
        <PageOverview
          title="Approval Readiness"
          description="Evaluate whether your credit profile is strong enough to apply for new credit, with a checklist of key approval factors and personalized next steps."
          icon={CheckCircle2}
          iconColor="text-prism-lime"
          features={[
            'Visual readiness meter showing your approval likelihood',
            'Six-point checklist covering all key approval criteria',
            'Estimated credit score based on your current data',
            'Personalized improvement steps to reach approval readiness',
          ]}
          ttsScript="Welcome to Approval Readiness. This tool evaluates whether you're ready to apply for new credit — like a loan, credit card, or mortgage. At the top, the readiness meter shows your overall status: not ready, improving, nearly ready, or ready. Below that, a six-point checklist evaluates your credit score, utilization, negative items, open disputes, recent inquiries, and payment history. Each item shows a green check for pass, yellow for warning, or red for fail. At the bottom, you'll find specific next steps tailored to your situation to help you reach approval readiness before applying."
        />
      </div>

      {/* Readiness Meter */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
        <CardContent className="relative p-6">
          <ReadinessMeter level={assessment.level} />
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Readiness Checklist
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {assessment.checklist.map(item => (
            <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/20 transition-colors">
              {statusIcon(item.status)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
              <Badge variant="outline" className={cn(
                'text-[10px]',
                item.status === 'pass' ? 'border-emerald-500/30 text-emerald-600' :
                item.status === 'warning' ? 'border-amber-500/30 text-amber-600' :
                'border-destructive/30 text-destructive'
              )}>
                {item.status === 'pass' ? 'Good' : item.status === 'warning' ? 'Caution' : 'Fix'}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Improvements */}
      {assessment.improvements.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              What to improve before applying
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {assessment.improvements.map((imp, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <div className="h-6 w-6 rounded-full bg-amber-500/10 flex items-center justify-center text-xs font-bold text-amber-600 shrink-0">
                  {i + 1}
                </div>
                <p className="text-sm">{imp}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Watch Out */}
      <InsightCard
        type="warning"
        icon={AlertTriangle}
        title="Watch out"
        description="Avoid closing old credit cards, applying for multiple accounts at once, or making large purchases on credit before an important application. These can temporarily hurt your score."
      />
    </div>
  );
};

export default ApprovalReadiness;
