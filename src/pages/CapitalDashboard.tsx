import { useNavigate } from 'react-router-dom';
import {
  Shield, FileSearch, FileText, TrendingUp, DollarSign, Clock,
  BarChart3, Activity, Building2, Lock, Bot, AlertTriangle,
  ChevronRight, CheckCircle2, Radar, Calculator, Landmark,
  Rocket, ArrowRight, CreditCard, Users, Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import PageOverview from '@/components/PageOverview';
import RelatedToolsBar from '@/components/RelatedToolsBar';
import { Heart as HeartIcon, Building2 as Building2Icon, Lock as LockIcon, Bot as BotIcon } from 'lucide-react';
import { useCreditAccounts } from '@/hooks/use-credit-accounts';
import { useMetro2Findings } from '@/hooks/use-metro2-findings';
import { useDisputes } from '@/hooks/use-disputes';
import { useBusinessCreditSteps } from '@/hooks/use-business-credit-steps';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ── Scoring helpers ──

function computeBankabilityScore(creditAccounts: any[], snapshots: any[], claims: any[], loanItems: any[]) {
  const openAccounts = creditAccounts.filter(a => a.account_status === 'Open');
  const totalBalance = openAccounts.reduce((s, a) => s + Number(a.balance || 0), 0);
  const totalLimit = openAccounts.reduce((s, a) => s + Number(a.credit_limit || 0), 0);
  const utilization = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 100;
  const creditStrength = Math.max(0, 100 - utilization);
  const latest = snapshots[0];
  const revenueStability = latest ? Math.min(100, (Number(latest.monthly_revenue) / 50000) * 100) : 0;
  const noi = latest ? Number(latest.monthly_revenue) - Number(latest.monthly_operating_expenses) : 0;
  const cashFlow = noi > 0 ? Math.min(100, (noi / 20000) * 100) : 0;
  const payrollDays = latest && Number(latest.biweekly_payroll) > 0 ? (Number(latest.cash_reserves) / (Number(latest.biweekly_payroll) / 14)) : 0;
  const bankRelationship = Math.min(100, (payrollDays / 90) * 100);
  const approvedClaims = claims.filter((c: any) => c.status === 'approved' || c.status === 'paid').length;
  const totalClaims = claims.length;
  const medicaidStability = totalClaims > 0 ? (approvedClaims / totalClaims) * 100 : 50;
  const factors = [
    { value: creditStrength, weight: 20 }, { value: 50, weight: 10 }, { value: 50, weight: 10 },
    { value: revenueStability, weight: 15 }, { value: cashFlow, weight: 15 },
    { value: noi > 0 ? Math.min(100, (noi / 10000) * 100) : 0, weight: 10 },
    { value: bankRelationship, weight: 10 }, { value: medicaidStability, weight: 10 },
  ];
  return Math.round(factors.reduce((s, f) => s + (f.value * f.weight / 100), 0));
}

function computeRiskAlerts(snapshots: any[], claims: any[]) {
  const alerts: { severity: 'critical' | 'warning' | 'info'; title: string }[] = [];
  const latest = snapshots[0];
  if (latest) {
    const dailyPayroll = Number(latest.biweekly_payroll) / 14;
    const runwayDays = dailyPayroll > 0 ? Math.floor(Number(latest.cash_reserves) / dailyPayroll) : 999;
    if (runwayDays < 30) alerts.push({ severity: 'critical', title: 'Payroll runway < 30 days' });
    else if (runwayDays < 60) alerts.push({ severity: 'warning', title: 'Payroll runway < 60 days' });
    if (snapshots.length >= 2) {
      const prev = snapshots[1];
      const drop = ((Number(prev.monthly_revenue) - Number(latest.monthly_revenue)) / Number(prev.monthly_revenue)) * 100;
      if (drop > 20) alerts.push({ severity: 'critical', title: `Revenue dropped ${Math.round(drop)}%` });
      else if (drop > 10) alerts.push({ severity: 'warning', title: `Revenue dropped ${Math.round(drop)}%` });
    }
  }
  const deniedClaims = claims.filter((c: any) => c.status === 'denied').length;
  const totalClaims = claims.length;
  if (totalClaims > 0) {
    const denyRate = (deniedClaims / totalClaims) * 100;
    if (denyRate > 15) alerts.push({ severity: 'critical', title: `Claim denial rate ${Math.round(denyRate)}%` });
    else if (denyRate > 8) alerts.push({ severity: 'warning', title: `Claim denial rate ${Math.round(denyRate)}%` });
  }
  return alerts;
}

// ── Step definitions ──

interface StepModule {
  title: string;
  description: string;
  icon: React.ElementType;
  route: string;
}

const STEP_1_MODULES: StepModule[] = [
  { title: 'Credit Overview', description: 'Import & analyze credit reports from all 3 bureaus', icon: Shield, route: '/capital/credit-overview' },
  { title: 'Metro2 Scanner', description: 'Detect reporting violations against Metro2 standards', icon: FileSearch, route: '/capital/metro2-scanner' },
  { title: 'Dispute Manager', description: 'Prepare eOSCAR-compatible dispute packages', icon: FileText, route: '/capital/disputes' },
  { title: 'Funding Readiness', description: 'Score your readiness for capital access', icon: TrendingUp, route: '/capital/funding-readiness' },
];

const STEP_2_MODULES: StepModule[] = [
  { title: 'Business Credit Builder', description: '6-step roadmap to establish strong business credit', icon: Building2, route: '/capital/business-credit' },
  { title: 'Banking Intelligence', description: 'Find commercial lenders & SBA-active banks', icon: Landmark, route: '/capital/banking-intel' },
  { title: 'Vendor Tradelines', description: 'Discover vendors that report to business bureaus', icon: CreditCard, route: '/capital/business-credit' },
  { title: 'Capital Stack Planner', description: 'Visual funding roadmap from vendor credit to SBA loans', icon: BarChart3, route: '/capital/capital-stack' },
];

const STEP_3_MODULES: StepModule[] = [
  { title: 'Receivable Pipeline', description: 'Track Medicaid claims & reimbursements', icon: DollarSign, route: '/capital/receivables' },
  { title: 'Payroll Runway', description: 'Days of payroll coverage remaining', icon: Clock, route: '/capital/payroll-runway' },
  { title: 'DSCR Calculator', description: 'Debt Service Coverage Ratio analysis', icon: Calculator, route: '/capital/dscr' },
  { title: 'Bank Statement Analyzer', description: 'Upload statements for health scoring', icon: Activity, route: '/capital/bank-analyzer' },
  { title: 'Risk Radar', description: 'Real-time alerts for emerging financial risks', icon: Radar, route: '/capital/risk-radar' },
];

const STEP_4_MODULES: StepModule[] = [
  { title: 'Bankability Score', description: '8-factor lender attractiveness score', icon: Landmark, route: '/capital/bankability' },
  { title: 'Loan Readiness', description: '18-document checklist for lender applications', icon: FileText, route: '/capital/loan-readiness' },
  { title: 'Funding Simulator', description: 'Simulate factoring, bridge loans & working capital', icon: BarChart3, route: '/capital/funding-simulator' },
  { title: 'Survival Index', description: 'Predictive agency health & sustainability score', icon: Activity, route: '/capital/survival-index' },
  { title: 'Document Vault', description: 'Encrypted storage for financial documents', icon: Lock, route: '/capital/vault' },
  { title: 'AI Coach', description: 'AI assistant for credit & capital guidance', icon: Bot, route: '/capital/ai-coach' },
];

// ── Step number badge ──

const StepNumber = ({ num, color }: { num: number; color: string }) => (
  <div className={cn('h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold border-2 shrink-0', color)}>
    {num}
  </div>
);

// ── Connecting line ──

const ConnectingLine = () => (
  <div className="hidden lg:flex justify-center py-1">
    <div className="w-0.5 h-8 bg-gradient-to-b from-border to-border/40 rounded-full" />
  </div>
);

// ── Full module card (for Steps 1-2) ──

const FullModuleCard = ({ mod }: { mod: StepModule }) => {
  const navigate = useNavigate();
  return (
    <Card
      className="group cursor-pointer hover:border-primary/40 hover:shadow-md transition-all duration-200"
      onClick={() => navigate(mod.route)}
    >
      <CardContent className="flex items-center gap-4 py-4 px-5">
        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
          <mod.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{mod.title}</p>
          <p className="text-xs text-muted-foreground truncate">{mod.description}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </CardContent>
    </Card>
  );
};

// ── Compact module row (for Steps 3-4) ──

const CompactModuleRow = ({ mod }: { mod: StepModule }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(mod.route)}
      className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left hover:bg-accent/50 transition-colors group"
    >
      <mod.icon className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium">{mod.title}</span>
        <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">— {mod.description}</span>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  );
};

// ── Main Dashboard ──

const CapitalDashboard = () => {
  const navigate = useNavigate();
  const { accounts } = useCreditAccounts();
  const { findings } = useMetro2Findings();
  const { disputes } = useDisputes();
  const { steps: bizSteps } = useBusinessCreditSteps();
  const { household } = useHousehold();
  const householdId = household?.id;

  const { data: snapshots = [] } = useQuery({
    queryKey: ['dash-snapshots', householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data } = await supabase.from('agency_financial_snapshots').select('*').eq('household_id', householdId).order('snapshot_month', { ascending: false }).limit(6);
      return data || [];
    },
    enabled: !!householdId,
  });

  const { data: claims = [] } = useQuery({
    queryKey: ['dash-claims', householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data } = await supabase.from('medicaid_claims').select('*').eq('household_id', householdId).order('service_date', { ascending: false }).limit(100);
      return data || [];
    },
    enabled: !!householdId,
  });

  const { data: loanItems = [] } = useQuery({
    queryKey: ['dash-loan-readiness', householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data } = await supabase.from('loan_readiness_items').select('*').eq('household_id', householdId);
      return data || [];
    },
    enabled: !!householdId,
  });

  // Summary computations
  const bankabilityScore = computeBankabilityScore(accounts, snapshots, claims, loanItems);
  const riskAlerts = computeRiskAlerts(snapshots, claims);
  const criticalAlerts = riskAlerts.filter(a => a.severity === 'critical').length;
  const warningAlerts = riskAlerts.filter(a => a.severity === 'warning').length;
  const uploadedDocs = loanItems.filter((i: any) => i.is_uploaded).length;
  const loanReadinessPct = loanItems.length > 0 ? Math.round((uploadedDocs / 18) * 100) : 0;
  const latest = snapshots[0];
  const noi = latest ? Number(latest.monthly_revenue) - Number(latest.monthly_operating_expenses) : 0;
  const dscrValue = latest && Number(latest.biweekly_payroll) > 0
    ? (noi / (Number(latest.biweekly_payroll) * 2)).toFixed(2) : '—';

  const bizProgress = bizSteps.length > 0 ? Math.round((bizSteps.filter(s => s.is_completed).length / bizSteps.length) * 100) : 0;

  return (
    <div className="space-y-6 pb-8">
      <RelatedToolsBar
        tools={[
          { to: '/capital/credit-health', icon: HeartIcon, label: 'Credit Health' },
          { to: '/capital/business-credit', icon: Building2Icon, label: 'Business Credit' },
          { to: '/capital/vault', icon: LockIcon, label: 'Document Vault' },
          { to: '/capital/ai-coach', icon: BotIcon, label: 'AI Coach' },
        ]}
      />
      <PageOverview
        title="FocusOS Capital"
        description="Credit Intelligence & Agency Financial Command Center"
        icon={Shield}
        ttsScript="Welcome to FocusOS Capital. Follow the 4-step journey from credit intelligence to growth funding."
        features={[
          'Step 1: Know Your Credit — analyze, scan, dispute',
          'Step 2: Build Business Credit — PAYDEX, tradelines, capital stack',
          'Step 3: Master Cash Flow — receivables, payroll, DSCR',
          'Step 4: Grow & Get Funded — bankability, readiness, simulation',
        ]}
      />

      {/* ─── START HERE Hero ─── */}
      <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/8 via-accent/5 to-transparent">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.08),transparent_60%)]" />
        <CardContent className="relative py-8 px-6 sm:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Rocket className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Start Here</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                Build your financial foundation in 4 steps — from understanding your credit to securing growth capital for your agency.
              </p>
            </div>
            <Button onClick={() => navigate('/capital/credit-overview')} size="lg" className="gap-2 shrink-0">
              Begin Step 1 <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Quick Score Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-border/50">
            <MiniStat label="Bankability" value={accounts.length > 0 ? String(bankabilityScore) : '—'} suffix="/100" positive={bankabilityScore >= 75} />
            <MiniStat label="Risk Alerts" value={String(criticalAlerts + warningAlerts)} suffix={criticalAlerts > 0 ? 'critical' : 'active'} positive={criticalAlerts + warningAlerts === 0} />
            <MiniStat label="Loan Ready" value={`${loanReadinessPct}%`} suffix={`${uploadedDocs}/18`} positive={loanReadinessPct >= 80} />
            <MiniStat label="DSCR" value={dscrValue} suffix="ratio" positive={dscrValue !== '—' && Number(dscrValue) >= 1.2} />
          </div>
        </CardContent>
      </Card>

      {/* ─── STEP 1: Know Your Credit ─── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <StepNumber num={1} color="border-prism-teal text-prism-teal" />
          <div>
            <h3 className="text-lg font-bold">Know Your Credit</h3>
            <p className="text-xs text-muted-foreground">Analyze personal credit, detect Metro2 violations, prepare disputes</p>
          </div>
          {accounts.length > 0 && <Badge variant="outline" className="ml-auto text-emerald-600 border-emerald-300 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" />Started</Badge>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {STEP_1_MODULES.map(m => <FullModuleCard key={m.route} mod={m} />)}
        </div>
      </section>

      <ConnectingLine />

      {/* ─── STEP 2: Build Business Credit ─── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <StepNumber num={2} color="border-prism-indigo text-prism-indigo" />
          <div>
            <h3 className="text-lg font-bold">Build Business Credit</h3>
            <p className="text-xs text-muted-foreground">Establish PAYDEX, add vendor tradelines, plan your capital stack</p>
          </div>
          {bizProgress > 0 && (
            <Badge variant="outline" className="ml-auto text-prism-indigo border-prism-indigo/30 text-[10px]">{bizProgress}% complete</Badge>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {STEP_2_MODULES.map(m => <FullModuleCard key={m.route + m.title} mod={m} />)}
        </div>
      </section>

      <ConnectingLine />

      {/* ─── STEP 3: Master Cash Flow ─── */}
      <section>
        <div className="flex items-center gap-3 mb-3">
          <StepNumber num={3} color="border-prism-sky text-prism-sky" />
          <div>
            <h3 className="text-lg font-bold">Master Cash Flow</h3>
            <p className="text-xs text-muted-foreground">Medicaid receivables, payroll coverage, debt service & risk monitoring</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-2 px-1 divide-y divide-border/50">
            {STEP_3_MODULES.map(m => <CompactModuleRow key={m.route} mod={m} />)}
          </CardContent>
        </Card>
      </section>

      <ConnectingLine />

      {/* ─── STEP 4: Grow & Get Funded ─── */}
      <section>
        <div className="flex items-center gap-3 mb-3">
          <StepNumber num={4} color="border-prism-lime text-prism-lime" />
          <div>
            <h3 className="text-lg font-bold">Grow & Get Funded</h3>
            <p className="text-xs text-muted-foreground">Bankability scoring, loan readiness, funding simulation & AI guidance</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-2 px-1 divide-y divide-border/50">
            {STEP_4_MODULES.map(m => <CompactModuleRow key={m.route + m.title} mod={m} />)}
          </CardContent>
        </Card>
      </section>

      {/* ─── Compliance Notice ─── */}
      <div className="flex items-start gap-3 rounded-lg border border-prism-amber/30 bg-prism-amber/5 p-4 mt-4">
        <AlertTriangle className="h-5 w-5 text-prism-amber shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          This platform provides financial education and operational intelligence tools.
          It does not provide lending services, credit repair, or guarantee credit approvals.
        </p>
      </div>
    </div>
  );
};

// ── Mini stat for hero strip ──

const MiniStat = ({ label, value, suffix, positive }: { label: string; value: string; suffix: string; positive: boolean }) => (
  <div className="text-center">
    <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
    <p className={cn('text-lg font-bold', positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>{value}</p>
    <p className="text-[10px] text-muted-foreground">{suffix}</p>
  </div>
);

export default CapitalDashboard;
