import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, FileSearch, FileText, TrendingUp, DollarSign, Clock,
  BarChart3, Activity, Building2, Lock, Bot, AlertTriangle,
  ChevronRight, ChevronDown, ArrowUpRight, CheckCircle2, Circle, Rocket,
  Radar, Calculator, Landmark, CreditCard,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import PageOverview from '@/components/PageOverview';
import { useCreditAccounts } from '@/hooks/use-credit-accounts';
import { useMetro2Findings } from '@/hooks/use-metro2-findings';
import { useDisputes } from '@/hooks/use-disputes';
import { useBusinessCreditSteps } from '@/hooks/use-business-credit-steps';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const CAPITAL_FEATURES = [
  'Credit report import & analysis',
  'Metro2 compliance scanning',
  'eOSCAR dispute preparation',
  'Agency financial command center',
  'Business credit building roadmap',
];

interface ModuleCard {
  title: string;
  description: string;
  icon: React.ElementType;
  route: string;
  status: 'active' | 'coming-soon';
  category: 'credit' | 'agency';
  color: string;
  stat?: string;
  statLabel?: string;
}

const MODULES: ModuleCard[] = [
  { title: 'Credit Overview', description: 'Import and analyze credit reports from all three bureaus', icon: Shield, route: '/capital/credit-overview', status: 'active', category: 'credit', color: 'text-prism-teal', stat: '—', statLabel: 'Credit Score' },
  { title: 'Metro2 Risk Scanner', description: 'AI-powered compliance analysis against Metro2 reporting standards', icon: FileSearch, route: '/capital/metro2-scanner', status: 'active', category: 'credit', color: 'text-prism-amber', stat: '0', statLabel: 'Issues Found' },
  { title: 'Dispute Manager', description: 'Prepare eOSCAR-compatible disputes with FCRA compliance', icon: FileText, route: '/capital/disputes', status: 'active', category: 'credit', color: 'text-prism-orange', stat: '0', statLabel: 'Active Disputes' },
  { title: 'Funding Readiness Score', description: 'Proprietary scoring model evaluating your readiness for capital', icon: TrendingUp, route: '/capital/funding-readiness', status: 'active', category: 'credit', color: 'text-prism-lime', stat: '—', statLabel: 'Score / 100' },
  { title: 'Business Credit Builder', description: 'Step-by-step roadmap to establish strong business credit', icon: Building2, route: '/capital/business-credit', status: 'active', category: 'credit', color: 'text-prism-indigo', stat: '0%', statLabel: 'Progress' },
  { title: 'Medicaid Receivable Pipeline', description: 'Track claims submitted, pending, approved, and denied', icon: DollarSign, route: '/capital/receivables', status: 'active', category: 'agency', color: 'text-prism-sky', stat: '$0', statLabel: 'Outstanding' },
  { title: 'Payroll Runway', description: 'Calculate days of payroll coverage and monitor cash reserves', icon: Clock, route: '/capital/payroll-runway', status: 'active', category: 'agency', color: 'text-prism-rose', stat: '— days', statLabel: 'Runway' },
  { title: 'Funding Simulator', description: 'Simulate receivable factoring, bridge loans, and working capital', icon: BarChart3, route: '/capital/funding-simulator', status: 'active', category: 'agency', color: 'text-prism-violet' },
  { title: 'Agency Survival Index', description: 'Predictive health score for DODD agency sustainability', icon: Activity, route: '/capital/survival-index', status: 'active', category: 'agency', color: 'text-prism-teal', stat: '—', statLabel: 'Score / 100' },
  { title: 'Document Vault', description: 'Encrypted storage for credit reports, disputes, and financials', icon: Lock, route: '/capital/vault', status: 'active', category: 'agency', color: 'text-muted-foreground' },
  { title: 'AI Financial Coach', description: 'AI assistant for credit education and capital planning guidance', icon: Bot, route: '/capital/ai-coach', status: 'active', category: 'agency', color: 'text-prism-amber' },
];

const GETTING_STARTED_STEPS = [
  { key: 'credit_accounts', label: 'Add credit accounts', route: '/capital/credit-overview', icon: Shield },
  { key: 'metro2_scan', label: 'Run Metro2 compliance scan', route: '/capital/metro2-scanner', icon: FileSearch },
  { key: 'dispute', label: 'Create your first dispute', route: '/capital/disputes', icon: FileText },
  { key: 'business_credit', label: 'Start business credit roadmap', route: '/capital/business-credit', icon: Building2 },
  { key: 'funding_score', label: 'Check funding readiness score', route: '/capital/funding-readiness', icon: TrendingUp },
];

// --- Bankability scoring logic (mirrors BankabilityScore page) ---
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

  const payrollDays = latest && Number(latest.biweekly_payroll) > 0
    ? (Number(latest.cash_reserves) / (Number(latest.biweekly_payroll) / 14)) : 0;
  const bankRelationship = Math.min(100, (payrollDays / 90) * 100);

  const approvedClaims = claims.filter(c => c.status === 'approved' || c.status === 'paid').length;
  const totalClaims = claims.length;
  const medicaidStability = totalClaims > 0 ? (approvedClaims / totalClaims) * 100 : 50;

  const uploadedDocs = loanItems.filter(i => i.is_uploaded).length;
  const loanReadinessPct = loanItems.length > 0 ? (uploadedDocs / 18) * 100 : 0;

  const factors = [
    { value: creditStrength, weight: 20 },
    { value: 50, weight: 10 }, // PAYDEX placeholder
    { value: 50, weight: 10 }, // Biz bureau placeholder
    { value: revenueStability, weight: 15 },
    { value: cashFlow, weight: 15 },
    { value: noi > 0 ? Math.min(100, (noi / 10000) * 100) : 0, weight: 10 }, // DSCR proxy
    { value: bankRelationship, weight: 10 },
    { value: medicaidStability, weight: 10 },
  ];
  return Math.round(factors.reduce((s, f) => s + (f.value * f.weight / 100), 0));
}

// --- Risk radar alert generation (mirrors FinancialRiskRadar page) ---
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

  const deniedClaims = claims.filter(c => c.status === 'denied').length;
  const totalClaims = claims.length;
  if (totalClaims > 0) {
    const denyRate = (deniedClaims / totalClaims) * 100;
    if (denyRate > 15) alerts.push({ severity: 'critical', title: `Claim denial rate ${Math.round(denyRate)}%` });
    else if (denyRate > 8) alerts.push({ severity: 'warning', title: `Claim denial rate ${Math.round(denyRate)}%` });
  }

  return alerts;
}

const CapitalDashboard = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'credit' | 'agency'>('all');
  const { accounts } = useCreditAccounts();
  const { findings } = useMetro2Findings();
  const { disputes } = useDisputes();
  const { steps: bizSteps } = useBusinessCreditSteps();
  const { household } = useHousehold();
  const householdId = household?.id;

  // Shared data for summary widgets
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

  // Compute summary values
  const bankabilityScore = computeBankabilityScore(accounts, snapshots, claims, loanItems);
  const riskAlerts = computeRiskAlerts(snapshots, claims);
  const criticalAlerts = riskAlerts.filter(a => a.severity === 'critical').length;
  const warningAlerts = riskAlerts.filter(a => a.severity === 'warning').length;

  const uploadedDocs = loanItems.filter(i => i.is_uploaded).length;
  const loanReadinessPct = loanItems.length > 0 ? Math.round((uploadedDocs / 18) * 100) : 0;

  const latest = snapshots[0];
  const noi = latest ? Number(latest.monthly_revenue) - Number(latest.monthly_operating_expenses) : 0;
  const dscrValue = latest && Number(latest.biweekly_payroll) > 0
    ? (noi / (Number(latest.biweekly_payroll) * 2)).toFixed(2)
    : '—';

  // Getting started
  const gsCompletion = {
    credit_accounts: accounts.length > 0,
    metro2_scan: findings.length > 0,
    dispute: disputes.length > 0,
    business_credit: bizSteps.some(s => s.is_completed),
    funding_score: accounts.length > 0,
  };
  const gsCompleted = Object.values(gsCompletion).filter(Boolean).length;
  const gsTotal = GETTING_STARTED_STEPS.length;
  const gsProgress = Math.round((gsCompleted / gsTotal) * 100);

  const filtered = filter === 'all' ? MODULES : MODULES.filter(m => m.category === filter);

  return (
    <div className="space-y-6 pb-8">
      <PageOverview
        title="FocusOS Capital"
        description="Credit Intelligence & Agency Financial Command Center"
        icon={Shield}
        ttsScript="Welcome to FocusOS Capital, your Credit Intelligence and Agency Financial Command Center."
        features={CAPITAL_FEATURES}
      />

      {/* Getting Started Card */}
      {gsCompleted < gsTotal && (
        <Collapsible defaultOpen className="overflow-hidden">
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent overflow-hidden">
            <CardHeader className="pb-3">
              <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
                <div className="flex items-center gap-2">
                  <Rocket className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Get Started with Capital</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{gsCompleted} / {gsTotal}</Badge>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=closed]_&]:rotate-[-90deg]" />
                </div>
              </CollapsibleTrigger>
              <Progress value={gsProgress} className="h-2 mt-2" />
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {GETTING_STARTED_STEPS.map(step => {
                    const done = gsCompletion[step.key as keyof typeof gsCompletion];
                    return (
                      <button
                        key={step.key}
                        onClick={() => navigate(step.route)}
                        className={cn(
                          'flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm transition-colors text-left',
                          done ? 'text-muted-foreground' : 'hover:bg-accent text-foreground'
                        )}
                      >
                        {done ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />}
                        <step.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className={done ? 'line-through' : ''}>{step.label}</span>
                        {!done && <ChevronRight className="h-3.5 w-3.5 ml-auto text-muted-foreground" />}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Compliance Notice */}
      <div className="flex items-start gap-3 rounded-lg border border-prism-amber/30 bg-prism-amber/5 p-4">
        <AlertTriangle className="h-5 w-5 text-prism-amber shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          This system provides financial education, credit analysis, and operational planning tools.
          It does not provide credit repair services or guarantee removal of credit report items.
        </p>
      </div>

      {/* Summary Widgets Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bankability Score */}
        <Card
          className="cursor-pointer hover:border-primary/30 transition-colors"
          onClick={() => navigate('/capital/bankability')}
        >
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Landmark className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium">Bankability</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={cn('text-3xl font-bold', bankabilityScore >= 75 ? 'text-emerald-500' : bankabilityScore >= 60 ? 'text-amber-500' : 'text-destructive')}>
                {accounts.length > 0 ? bankabilityScore : '—'}
              </span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
            <Progress value={accounts.length > 0 ? bankabilityScore : 0} className="h-1.5 mt-2" />
            <p className="text-[11px] text-muted-foreground mt-2">
              {bankabilityScore >= 90 ? 'Highly bankable' : bankabilityScore >= 75 ? 'Moderately bankable' : bankabilityScore >= 60 ? 'Needs improvement' : 'Add data to score'}
            </p>
          </CardContent>
        </Card>

        {/* Risk Radar Alerts */}
        <Card
          className="cursor-pointer hover:border-primary/30 transition-colors"
          onClick={() => navigate('/capital/risk-radar')}
        >
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', criticalAlerts > 0 ? 'bg-destructive/10' : warningAlerts > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10')}>
                  <Radar className={cn('h-4 w-4', criticalAlerts > 0 ? 'text-destructive' : warningAlerts > 0 ? 'text-amber-500' : 'text-emerald-500')} />
                </div>
                <span className="text-sm font-medium">Risk Radar</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            {riskAlerts.length === 0 ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span className="text-sm text-emerald-600 font-medium">All Clear</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {criticalAlerts > 0 && (
                  <Badge variant="destructive" className="text-[10px]">{criticalAlerts} Critical</Badge>
                )}
                {warningAlerts > 0 && (
                  <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ml-1">{warningAlerts} Warning</Badge>
                )}
              </div>
            )}
            <div className="mt-2 space-y-1">
              {riskAlerts.slice(0, 2).map((a, i) => (
                <p key={i} className="text-[11px] text-muted-foreground truncate">• {a.title}</p>
              ))}
              {riskAlerts.length === 0 && <p className="text-[11px] text-muted-foreground">No active financial risks detected</p>}
            </div>
          </CardContent>
        </Card>

        {/* Loan Readiness */}
        <Card
          className="cursor-pointer hover:border-primary/30 transition-colors"
          onClick={() => navigate('/capital/loan-readiness')}
        >
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-prism-indigo/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-prism-indigo" />
                </div>
                <span className="text-sm font-medium">Loan Readiness</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={cn('text-3xl font-bold', loanReadinessPct >= 80 ? 'text-emerald-500' : loanReadinessPct >= 50 ? 'text-amber-500' : 'text-muted-foreground')}>
                {loanReadinessPct}%
              </span>
              <span className="text-xs text-muted-foreground">complete</span>
            </div>
            <Progress value={loanReadinessPct} className="h-1.5 mt-2" />
            <p className="text-[11px] text-muted-foreground mt-2">{uploadedDocs} of 18 documents ready</p>
          </CardContent>
        </Card>

        {/* DSCR Indicator */}
        <Card
          className="cursor-pointer hover:border-primary/30 transition-colors"
          onClick={() => navigate('/capital/dscr')}
        >
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-prism-lime/10 flex items-center justify-center">
                  <Calculator className="h-4 w-4 text-prism-lime" />
                </div>
                <span className="text-sm font-medium">DSCR</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={cn('text-3xl font-bold',
                dscrValue === '—' ? 'text-muted-foreground' :
                Number(dscrValue) >= 1.5 ? 'text-emerald-500' :
                Number(dscrValue) >= 1.0 ? 'text-amber-500' : 'text-destructive'
              )}>
                {dscrValue}
              </span>
              <span className="text-xs text-muted-foreground">ratio</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              {dscrValue === '—' ? 'Add financial snapshots to calculate' :
                Number(dscrValue) >= 1.5 ? 'Strong debt coverage' :
                Number(dscrValue) >= 1.2 ? 'Healthy range' :
                Number(dscrValue) >= 1.0 ? 'Borderline — monitor closely' : 'High risk — below 1.0'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'credit', 'agency'] as const).map(f => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f === 'all' ? 'All Modules' : f === 'credit' ? 'Credit Intelligence' : 'Agency Finance'}
          </Button>
        ))}
      </div>

      {/* Module Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((mod) => (
          <Card
            key={mod.route}
            className="group cursor-pointer hover:border-primary/30"
            onClick={() => navigate(mod.route)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-muted', mod.color)}>
                  <mod.icon className="h-5 w-5" />
                </div>
                {mod.status === 'coming-soon' ? (
                  <Badge variant="secondary" className="text-[10px]">Coming Soon</Badge>
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
              <CardTitle className="text-base mt-2">{mod.title}</CardTitle>
              <CardDescription className="text-xs">{mod.description}</CardDescription>
            </CardHeader>
            {mod.stat && (
              <CardContent className="pt-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold">{mod.stat}</span>
                  {mod.statLabel && <span className="text-xs text-muted-foreground">{mod.statLabel}</span>}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CapitalDashboard;
