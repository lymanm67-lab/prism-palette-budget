import { TrendingUp, ArrowUpRight, AlertTriangle, CheckCircle2, Info, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import PageOverview from '@/components/PageOverview';
import { useCreditAccounts } from '@/hooks/use-credit-accounts';
import { useBusinessCreditSteps } from '@/hooks/use-business-credit-steps';
import { useMemo } from 'react';

/* ── scoring engine ─────────────────────────────────── */

function computeScores(accounts: ReturnType<typeof useCreditAccounts>['accounts'], businessStepsCompleted: number, totalBusinessSteps: number) {
  if (!accounts.length) return null;

  // 1. Payment History (25%) — parse payment_history string for on-time ratio
  let totalPayments = 0;
  let onTimePayments = 0;
  accounts.forEach(a => {
    if (a.payment_history) {
      const chars = a.payment_history.replace(/[^A-Z0-9]/gi, '');
      chars.split('').forEach(c => {
        totalPayments++;
        if (c === 'C' || c === '0' || c === 'O') onTimePayments++; // C=current, 0=on-time
      });
    }
  });
  const paymentScore = totalPayments > 0 ? Math.round((onTimePayments / totalPayments) * 100) : 50;

  // 2. Credit Utilization (20%) — aggregate balance / credit_limit
  const revolvingAccounts = accounts.filter(a => a.account_type === 'Revolving' && a.account_status === 'Open');
  const totalBalance = revolvingAccounts.reduce((s, a) => s + a.balance, 0);
  const totalLimit = revolvingAccounts.reduce((s, a) => s + (a.credit_limit || 0), 0);
  const utilization = totalLimit > 0 ? totalBalance / totalLimit : 0;
  // Score: 0% util = 100, 30% = 70, 50% = 50, 100% = 0
  const utilizationScore = Math.max(0, Math.min(100, Math.round(100 - (utilization * 100 * 1.2))));

  // 3. Negative Items (15%) — closed with delinquency, collections, charge-offs
  const negativeStatuses = ['Charge-off', 'Collection', 'Closed', 'Derogatory'];
  const negativeAccounts = accounts.filter(a =>
    negativeStatuses.some(s => a.account_status.toLowerCase().includes(s.toLowerCase())) ||
    a.date_of_first_delinquency
  );
  const negativeRatio = accounts.length > 0 ? negativeAccounts.length / accounts.length : 0;
  const negativeScore = Math.max(0, Math.round(100 - (negativeRatio * 250)));

  // 4. Credit Age (10%) — average age of accounts in months
  const now = new Date();
  const ages = accounts
    .filter(a => a.date_opened)
    .map(a => {
      const opened = new Date(a.date_opened!);
      return (now.getTime() - opened.getTime()) / (1000 * 60 * 60 * 24 * 30);
    });
  const avgAge = ages.length > 0 ? ages.reduce((s, a) => s + a, 0) / ages.length : 0;
  // 84+ months (7yr) = 100, 0 months = 0
  const ageScore = Math.min(100, Math.round((avgAge / 84) * 100));

  // 5. Business Credit Readiness (15%) — from business_credit_steps
  const businessScore = totalBusinessSteps > 0 ? Math.round((businessStepsCompleted / totalBusinessSteps) * 100) : 0;

  // 6. Debt-to-Income proxy (15%) — total debt payments vs total limits as proxy
  const totalMonthlyPayments = accounts.reduce((s, a) => s + (a.monthly_payment || 0), 0);
  const totalHighBalance = accounts.reduce((s, a) => s + (a.high_balance || a.credit_limit || 0), 0);
  const dtiProxy = totalHighBalance > 0 ? totalMonthlyPayments / (totalHighBalance * 0.05) : 0; // rough proxy
  const dtiScore = Math.max(0, Math.min(100, Math.round(100 - (Math.min(dtiProxy, 1) * 80))));

  const factors = [
    { label: 'Payment History', weight: 25, score: paymentScore, tip: paymentScore >= 80 ? 'Strong payment history detected' : 'Focus on making all payments on time' },
    { label: 'Credit Utilization', weight: 20, score: utilizationScore, tip: utilization <= 0.3 ? `Utilization at ${Math.round(utilization * 100)}% — good` : `Utilization at ${Math.round(utilization * 100)}% — aim for under 30%` },
    { label: 'Negative Items', weight: 15, score: negativeScore, tip: negativeAccounts.length === 0 ? 'No negative items found' : `${negativeAccounts.length} negative item(s) — consider disputing inaccuracies` },
    { label: 'Credit Age', weight: 10, score: ageScore, tip: avgAge >= 36 ? `Average age ${Math.round(avgAge)} months — solid` : `Average age ${Math.round(avgAge)} months — keep older accounts open` },
    { label: 'Business Credit Readiness', weight: 15, score: businessScore, tip: businessScore >= 80 ? 'Business credit profile nearly complete' : 'Complete more steps in Business Credit Builder' },
    { label: 'Debt-to-Income Ratio', weight: 15, score: dtiScore, tip: dtiScore >= 70 ? 'Debt load appears manageable' : 'Reduce total debt obligations' },
  ];

  const overall = Math.round(factors.reduce((s, f) => s + (f.score * f.weight) / 100, 0));

  return { factors, overall, accountCount: accounts.length };
}

function getGrade(score: number) {
  if (score >= 85) return { grade: 'A', color: 'text-emerald-600', bg: 'border-emerald-500', label: 'Excellent — Ready for Capital' };
  if (score >= 70) return { grade: 'B', color: 'text-primary', bg: 'border-primary', label: 'Good — Minor Improvements Needed' };
  if (score >= 50) return { grade: 'C', color: 'text-amber-600', bg: 'border-amber-500', label: 'Fair — Address Key Issues' };
  return { grade: 'D', color: 'text-destructive', bg: 'border-destructive', label: 'Needs Work — Build Foundation First' };
}

/* ── component ─────────────────────────────────────── */

const FundingReadiness = () => {
  const { accounts } = useCreditAccounts();
  const { steps } = useBusinessCreditSteps();

  const totalBusinessSteps = 6;
  const businessStepsCompleted = steps.filter(s => s.is_completed).length;

  const result = useMemo(() => computeScores(accounts, businessStepsCompleted, totalBusinessSteps), [accounts, businessStepsCompleted]);

  if (!result) {
    return (
      <div className="space-y-6 pb-8">
        <PageOverview title="Agency Funding Readiness Score" description="Proprietary scoring model evaluating your readiness for capital acquisition" icon={TrendingUp} ttsScript="Welcome to the Agency Funding Readiness Score. This proprietary scoring model evaluates six weighted factors to determine how ready your business is for capital acquisition. Payment History accounts for 25 percent, Credit Utilization 20 percent, Negative Items 15 percent, Credit Age 10 percent, Business Readiness 15 percent, and Debt-to-Income 15 percent. Your overall score maps to a letter grade from A-plus to D. Scenario: Your score shows a B-minus with utilization dragging you down at 55 percent. The recommendations suggest paying revolving balances below 30 percent, which could move you to an A-minus — significantly improving your odds of approval for an SBA loan or business line of credit." features={['Six-factor weighted scoring model', 'Letter grade with actionable recommendations', 'Tracks payment history, utilization, and credit age', 'Business readiness and debt-to-income analysis']} />
        <Card className="text-center p-8">
          <Info className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="font-semibold text-lg mb-2">No Credit Data Yet</p>
          <p className="text-sm text-muted-foreground">Add credit accounts in Credit Overview to calculate your Funding Readiness Score</p>
        </Card>
      </div>
    );
  }

  const grade = getGrade(result.overall);

  return (
    <div className="space-y-6 pb-8">
      <PageOverview title="Agency Funding Readiness Score" description="Proprietary scoring model evaluating your readiness for capital acquisition" icon={TrendingUp} ttsScript="Welcome to the Agency Funding Readiness Score. This proprietary scoring model evaluates six weighted factors to determine how ready your business is for capital acquisition. Payment History accounts for 25 percent, Credit Utilization 20 percent, Negative Items 15 percent, Credit Age 10 percent, Business Readiness 15 percent, and Debt-to-Income 15 percent. Your overall score maps to a letter grade from A-plus to D. Scenario: Your score shows a B-minus with utilization dragging you down at 55 percent. The recommendations suggest paying revolving balances below 30 percent, which could move you to an A-minus — significantly improving your odds of approval for an SBA loan or business line of credit." features={['Six-factor weighted scoring model', 'Letter grade with actionable recommendations', 'Tracks payment history, utilization, and credit age', 'Business readiness and debt-to-income analysis']} />

      {/* Main Score */}
      <Card className="text-center p-8">
        <div className={`inline-flex h-32 w-32 items-center justify-center rounded-full border-4 ${grade.bg} bg-muted/30 mx-auto`}>
          <div>
            <p className={`text-4xl font-bold ${grade.color}`}>{result.overall}</p>
            <p className="text-xs text-muted-foreground">/100</p>
          </div>
        </div>
        <p className={`text-sm font-medium mt-4 ${grade.color}`}>{grade.label}</p>
        <p className="text-xs text-muted-foreground mt-1">Based on {result.accountCount} credit account(s)</p>
      </Card>

      {/* Score Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        {result.factors.map(factor => (
          <Card key={factor.label} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{factor.label}</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{factor.weight}%</Badge>
                <span className={`text-sm font-bold ${factor.score >= 70 ? 'text-emerald-600' : factor.score >= 50 ? 'text-amber-600' : 'text-destructive'}`}>{factor.score}</span>
              </div>
            </div>
            <Progress value={factor.score} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {factor.score >= 70 ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : factor.score >= 50 ? <ArrowUpRight className="h-3 w-3 text-amber-500" /> : <AlertTriangle className="h-3 w-3 text-destructive" />}
              {factor.tip}
            </p>
          </Card>
        ))}
      </div>

      {/* Funding & Capital Resources */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-primary" />
            Funding & Capital Resources
          </CardTitle>
          <p className="text-xs text-muted-foreground">Explore funding programs, grants, and lending options for your business</p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[
            { name: 'SBA Loan Programs', url: 'https://www.sba.gov/funding-programs/loans', desc: 'sba.gov' },
            { name: 'SBA Grants', url: 'https://www.sba.gov/funding-programs/grants', desc: 'sba.gov/grants' },
            { name: 'Grants.gov', url: 'https://www.grants.gov/', desc: 'Federal grant opportunities' },
            { name: 'CDFI Fund', url: 'https://www.cdfifund.gov/', desc: 'Community development financing' },
            { name: 'Fundera by NerdWallet', url: 'https://www.fundera.com/', desc: 'Compare business loans' },
            { name: 'SCORE Mentorship', url: 'https://www.score.org/', desc: 'Free business mentoring' },
          ].map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-lg border bg-background hover:bg-accent transition-colors group">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20">
                <ExternalLink className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm">{link.name}</p>
                <p className="text-xs text-muted-foreground truncate">{link.desc}</p>
              </div>
            </a>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default FundingReadiness;
