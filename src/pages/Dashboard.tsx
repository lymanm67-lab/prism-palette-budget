import { motion } from 'framer-motion';
import NewUserOnboardingOverlay from '@/components/NewUserOnboardingOverlay';
import AiSpendingInsights from '@/components/AiSpendingInsights';
import { Tooltip as ShadcnTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import PageOverview from '@/components/PageOverview';
import WeeklyRecap from '@/components/WeeklyRecap';
import GettingStartedWidget from '@/components/GettingStartedWidget';
import { EmptyStateChecklist } from '@/components/dashboard/EmptyStateChecklist';
import FinancialHealthScore from '@/components/FinancialHealthScore';
import GoalTrackerWidget from '@/components/GoalTrackerWidget';
import ConsistencyTrackerCard from '@/components/health/ConsistencyTrackerCard';
import MorningKickstartCard from '@/components/health/MorningKickstartCard';

import SpendingAnomalyAlert from '@/components/SpendingAnomalyAlert';
import { SafeToSpendHero } from '@/components/SafeToSpendHero';
import { StsEquationView } from '@/components/StsEquationView';
import { SavingsImpactCounter } from '@/components/SavingsImpactCounter';
import { CashFlowForecastChart } from '@/components/CashFlowForecastChart';
import { PendingPurchasesList } from '@/components/guardrails/PendingPurchasesList';
import AppDevCutoffCard from '@/components/dashboard/AppDevCutoffCard';
import { SmartAllocationCard } from '@/components/dashboard/SmartAllocationCard';

import AppDevPoolCard from '@/components/dashboard/AppDevPoolCard';
import { ProgressTracker } from '@/components/ProgressTracker';
import { ModeSettingsDialog } from '@/components/ModeSettingsDialog';
import MoMIndicator from '@/components/MoMIndicator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccounts, useTransactions, useSpendingByCategory, useCategoryGroups, useCategories } from '@/hooks/use-finance-data';
import { useBusinessProfiles } from '@/hooks/use-business-data';
import { useCurrency } from '@/hooks/use-currency';
import { useMoMIndicators } from '@/hooks/use-mom-indicators';
import { useSubscriptions } from '@/hooks/use-subscriptions';
import { useSafeToSpend } from '@/hooks/use-safe-to-spend';
import {
  TrendingUp, Wallet, CreditCard, ArrowUpRight, Loader2,
  Sparkles, ChevronRight, Building2, PiggyBank, User, LayoutGrid, Settings2, FileBarChart,
  Shield, Receipt, DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import BusinessProfileManager from '@/components/BusinessProfileManager';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.15)' };
const tooltipItemStyle = { color: 'hsl(var(--foreground))' };
const tooltipLabelStyle = { color: 'hsl(var(--foreground))' };

type DashboardMode = 'combined' | 'personal' | 'business';

const Dashboard = () => {
  const { formatCurrency, formatCompact } = useCurrency();
  const { data: accounts, isLoading: accLoading } = useAccounts();
  const { data: transactions } = useTransactions();
  const { data: categoryGroups } = useCategoryGroups();
  const { data: categories } = useCategories();
  const { data: businessProfiles } = useBusinessProfiles();
  const { data: subscriptions } = useSubscriptions();
  const momIndicators = useMoMIndicators();
  const safeToSpend = useSafeToSpend();
  const navigate = useNavigate();

  const [mode, setMode] = useState<DashboardMode>(() => {
    // Adaptive: seed from sidebar nav mode (prism_nav_mode). 'full' → 'combined'.
    try {
      const nav = localStorage.getItem('prism_nav_mode');
      if (nav === 'personal') return 'personal';
      if (nav === 'business') return 'business';
      if (nav === 'full') return 'combined';
    } catch { /* noop */ }
    return 'combined';
  });
  const [selectedBusiness, setSelectedBusiness] = useState<string>('all');
  const [manageOpen, setManageOpen] = useState(false);
  const [recapOpen, setRecapOpen] = useState(false);
  const [modeSettingsOpen, setModeSettingsOpen] = useState(false);

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
  const { data: spendingData } = useSpendingByCategory(monthStart, monthEnd);

  // Build category ID sets for personal vs business filtering
  const { personalCatIds, businessCatIds, filteredBusinessCatIds } = useMemo(() => {
    if (!categoryGroups || !categories) return { personalCatIds: new Set<string>(), businessCatIds: new Set<string>(), filteredBusinessCatIds: new Set<string>() };
    const personalGroupIds = new Set((categoryGroups as any[]).filter(g => (g.budget_type || 'personal') === 'personal').map(g => g.id));
    const businessGroups = (categoryGroups as any[]).filter(g => (g.budget_type || 'personal') === 'business');
    const businessGroupIds = new Set(businessGroups.map(g => g.id));
    const filteredBizGroupIds = new Set(
      selectedBusiness === 'all' ? businessGroups.map(g => g.id) : businessGroups.filter(g => g.business_profile_id === selectedBusiness).map(g => g.id)
    );
    const pIds = new Set(categories.filter(c => personalGroupIds.has(c.group_id)).map(c => c.id));
    const bIds = new Set(categories.filter(c => businessGroupIds.has(c.group_id)).map(c => c.id));
    const fbIds = new Set(categories.filter(c => filteredBizGroupIds.has(c.group_id)).map(c => c.id));
    return { personalCatIds: pIds, businessCatIds: bIds, filteredBusinessCatIds: fbIds };
  }, [categoryGroups, categories, selectedBusiness]);

  // Filter transactions by mode
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    if (mode === 'personal') return transactions.filter(t => !t.category_id || personalCatIds.has(t.category_id));
    if (mode === 'business') return transactions.filter(t => t.category_id && filteredBusinessCatIds.has(t.category_id));
    return transactions;
  }, [transactions, mode, personalCatIds, filteredBusinessCatIds]);

  // Filter spending data by mode
  const filteredSpending = useMemo(() => {
    if (!spendingData) return [];
    if (mode === 'combined') return spendingData;
    const prefix = monthStart.substring(0, 7);
    const relevantTxns = filteredTransactions.filter(t => t.date.startsWith(prefix) && t.amount < 0);
    const map = new Map<string, { name: string; color: string; value: number }>();
    for (const t of relevantTxns) {
      const catName = (t as any).categories?.name || 'Uncategorized';
      const catColor = (t as any).categories?.color || '#888';
      const existing = map.get(catName) || { name: catName, color: catColor, value: 0 };
      existing.value += Math.abs(t.amount);
      map.set(catName, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [spendingData, filteredTransactions, mode, monthStart]);

  const totalAssets = (accounts || []).filter(a => a.balance > 0).reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = Math.abs((accounts || []).filter(a => a.balance < 0).reduce((s, a) => s + a.balance, 0));
  const netWorth = totalAssets - totalLiabilities;

  const monthlyIncome = useMemo(() => {
    const prefix = monthStart.substring(0, 7);
    return filteredTransactions.filter(t => t.date.startsWith(prefix) && t.amount > 0).reduce((s, t) => s + t.amount, 0);
  }, [filteredTransactions, monthStart]);

  const monthlyExpenses = useMemo(() => {
    const prefix = monthStart.substring(0, 7);
    return filteredTransactions.filter(t => t.date.startsWith(prefix) && t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  }, [filteredTransactions, monthStart]);

  const totalSubscriptionCost = useMemo(() => {
    return (subscriptions || [])
      .filter((s: any) => s.is_active && !s.is_cancelled)
      .reduce((sum: number, s: any) => sum + Math.abs(s.average_amount || 0), 0);
  }, [subscriptions]);

  const monthlyCashflow = useMemo(() => {
    const map = new Map<string, { month: string; income: number; expenses: number }>();
    for (const t of filteredTransactions) {
      const m = t.date.substring(0, 7);
      const label = new Date(t.date).toLocaleDateString('en-US', { month: 'short' });
      const existing = map.get(m) || { month: label, income: 0, expenses: 0 };
      if (t.amount > 0) existing.income += t.amount;
      else existing.expenses += Math.abs(t.amount);
      map.set(m, existing);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [filteredTransactions]);

  if (accLoading) return (
    <div className="p-8">
      <div className="mb-8">
        <div className="h-8 w-64 bg-muted animate-pulse rounded-lg mb-2" />
        <div className="h-4 w-96 bg-muted/60 animate-pulse rounded" />
      </div>
      <div className="h-48 bg-muted animate-pulse rounded-xl mb-6" />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    </div>
  );

  return (
    <>
    <NewUserOnboardingOverlay />
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      {/* Header with mode toggle */}
      <motion.div variants={item} className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight">
              <span className="prism-gradient-text">Dashboard</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              <span className="text-xs uppercase tracking-wider text-primary/80 mr-2">Today &amp; this month</span>
              Your financial control center.
            </p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <TooltipProvider delayDuration={0}>
              <ShadcnTooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setModeSettingsOpen(true)}>
                    <Shield className="h-4 w-4 text-primary lg:h-3.5 lg:w-3.5" />
                    <span className="hidden lg:inline">Mode</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="lg:hidden"><p>Financial Mode</p></TooltipContent>
              </ShadcnTooltip>
              <ShadcnTooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/reports')}>
                    <FileBarChart className="h-4 w-4 text-emerald-500 lg:h-3.5 lg:w-3.5" />
                    <span className="hidden lg:inline">Reports</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="lg:hidden"><p>View Reports</p></TooltipContent>
              </ShadcnTooltip>
            </TooltipProvider>
            <PageOverview
              title="Safe-to-Spend Setup Guide"
              description="Your Safe-to-Spend updates automatically based on your accounts, income, bills, and subscriptions. Here's how to set it up and get an accurate number."
              icon={DollarSign}
              iconColor="text-prism-teal"
              ttsScript={`Welcome to your financial control center. Let me walk you through how Safe-to-Spend works and how to set it up.

Safe-to-Spend is the most important number in this app. It tells you exactly what you can spend today, this week, and this month without disrupting your financial stability.

Here's how it's calculated: Your monthly income, minus your recurring obligations like rent and utilities, minus your subscriptions, minus what you've already spent this month. Then a safety buffer is applied based on your current financial mode.

To get an accurate Safe-to-Spend number, follow these steps:

Step 1: Add your bank accounts. Go to Accounts in the sidebar and add your checking and savings accounts with their current balances. This gives Prism your available cash.

Step 2: Add your income. Go to Transactions and enter your income sources like salary, freelance payments, or business revenue. Use positive amounts for money coming in.

Step 3: Set up recurring bills. Go to Recurring in the sidebar and add your regular obligations like rent, mortgage, utilities, loan payments, and insurance. These are subtracted from your Safe-to-Spend automatically.

Step 4: Review your subscriptions. Go to Subscriptions in the sidebar. Prism auto-detects recurring charges from your transactions. Review them to make sure nothing is missed.

Step 5: Choose your financial mode. Click the Mode button at the top of this dashboard. Guardrail Mode applies a conservative safety buffer and is recommended for getting started. Balanced Mode gives moderate flexibility. Green Light Mode gives the most flexibility but requires consistent spending habits.

For business owners: Tag your business transactions and expenses separately. Switch between Combined, Personal, and Business views using the filter buttons to see your Safe-to-Spend for each context.

The income-based progress bar below your Safe-to-Spend number shows what percentage of your income is available to spend. Hover over the info icon for a detailed breakdown.

Your Safe-to-Spend updates in real time as you add transactions, pay bills, and receive income. The goal is simple: stay within your number each day, build consistency, and unlock more financial freedom over time.`}
              features={[
                'Add accounts to establish your available cash balance',
                'Record income (salary, freelance, business revenue)',
                'Set up recurring bills and obligations',
                'Review auto-detected subscriptions',
                'Choose your financial mode and safety buffer',
                'Use Combined, Personal, or Business views',
                'Track your 90-day consistency streak',
                'Income-based context shows % safe to spend',
              ]}
              demoData={[
                { label: 'Monthly Income', value: '$8,500', color: '#2eb88a' },
                { label: 'Recurring Bills', value: '-$3,200', color: '#e5547a' },
                { label: 'Subscriptions', value: '-$285', color: '#e5a525' },
                { label: 'Already Spent', value: '-$1,450', color: '#7c5cf5' },
                { label: 'Safety Buffer (15%)', value: '-$535', color: '#3b9fe5' },
                { label: 'Safe to Spend', value: '$3,030', badge: 'Monthly', color: '#2d9e6f' },
              ]}
              demoTableHeaders={['Step', 'Where', 'What to Add']}
              demoTableRows={[
                ['1', 'Accounts', 'Checking & savings balances'],
                ['2', 'Transactions', 'Income (positive amounts)'],
                ['3', 'Recurring', 'Rent, utilities, loan payments'],
                ['4', 'Subscriptions', 'Review auto-detected charges'],
                ['5', 'Dashboard → Mode', 'Choose Guardrail, Balanced, or Green Light'],
              ]}
            />
          </div>
        </div>

        {/* View filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border border-border p-0.5">
            <button onClick={() => setMode('combined')} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mode === 'combined' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <LayoutGrid className="h-3.5 w-3.5" /> Combined
            </button>
            <button onClick={() => setMode('personal')} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mode === 'personal' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <User className="h-3.5 w-3.5" /> Personal
            </button>
            <button onClick={() => setMode('business')} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mode === 'business' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <Building2 className="h-3.5 w-3.5" /> Business
            </button>
          </div>
          {mode === 'business' && (
            <div className="flex items-center gap-1.5">
              <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
                <SelectTrigger className="w-[180px] h-9 text-sm"><SelectValue placeholder="All Businesses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Businesses</SelectItem>
                  {businessProfiles && businessProfiles.map(bp => (
                    <SelectItem key={bp.id} value={bp.id}>{bp.business_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setManageOpen(true)} title="Manage businesses">
                <Settings2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </motion.div>

      {/* ========== Empty-state 3-step checklist (only when no accounts) ========== */}
      {(accounts?.length ?? 0) === 0 && (
        <motion.div variants={item}>
          <EmptyStateChecklist />
        </motion.div>
      )}

      {/* ========== SAFE-TO-SPEND HERO (Primary Focus) ========== */}
      <motion.div variants={item}>
        <SafeToSpendHero 
          viewMode={mode} 
        />
      </motion.div>

      {/* ========== Smart Allocation (new paycheck → bucket plan) ========== */}
      <motion.div variants={item}>
        <SmartAllocationCard />
      </motion.div>

      {/* ========== STS Equation View ========== */}
      <motion.div variants={item}>
        <StsEquationView scope={mode} />
      </motion.div>


      {/* ========== 90-Day Progress Tracker ========== */}
      <motion.div variants={item}>
        <ProgressTracker />
      </motion.div>

      {/* ========== Savings Impact Counter ========== */}
      <motion.div variants={item}>
        <SavingsImpactCounter />
      </motion.div>

      {/* Spending Anomaly Alert */}
      <motion.div variants={item}>
        <SpendingAnomalyAlert />
      </motion.div>

      {/* Pending Cooling-Off Purchases */}
      <motion.div variants={item}>
        <PendingPurchasesList />
      </motion.div>

      {/* App-Dev Cutoff */}
      <motion.div variants={item}>
        <AppDevCutoffCard />
      </motion.div>

      {/* Shared App-Dev Pool (across all founder apps) */}
      <motion.div variants={item}>
        <AppDevPoolCard />
      </motion.div>

      {/* Getting Started Widget */}
      <motion.div variants={item}>
        <GettingStartedWidget />
      </motion.div>

      {/* Quick Stats: Net Worth, Available Cash, Bills, Subscriptions */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Net Worth', value: netWorth, icon: TrendingUp, gradient: 'from-prism-navy to-prism-teal', mom: momIndicators?.income },
          { label: 'Available Cash', value: safeToSpend.totalAvailableCash, icon: Wallet, gradient: 'from-prism-teal to-prism-lime', mom: null },
          { label: 'Monthly Expenses', value: monthlyExpenses, icon: CreditCard, gradient: 'from-prism-orange to-prism-rose', mom: null },
          { label: 'Subscriptions', value: totalSubscriptionCost, icon: Receipt, gradient: 'from-prism-violet to-prism-sky', mom: null },
        ].map((stat, i) => (
          <motion.div key={stat.label} variants={item} whileHover={{ scale: 1.02, y: -2 }} transition={{ type: 'spring', stiffness: 400 }}>
            <Card className="prism-card-shine border-border/50 hover-lift cursor-pointer" onClick={() => navigate(stat.label === 'Net Worth' ? '/net-worth' : stat.label === 'Subscriptions' ? '/subscriptions' : stat.label === 'Monthly Expenses' ? '/spending-trends' : '/accounts')}>
              <CardContent className="flex items-center gap-3 p-4">
                <motion.div
                  className={`h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}
                  whileHover={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.4 }}
                >
                  <stat.icon className="h-5 w-5 text-white" />
                </motion.div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                  <div className="flex items-center gap-1.5">
                    <p className="font-display text-lg font-bold">{formatCurrency(stat.value)}</p>
                    {stat.mom && (
                      <MoMIndicator percentageChange={stat.mom.percentageChange} direction={stat.mom.direction} />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Weekly Recap */}
      <motion.div variants={item}>
        <Card className="prism-card-shine border-primary/20 cursor-pointer hover-lift" onClick={() => setRecapOpen(true)}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-base font-bold">Your Weekly Recap</h3>
              <p className="text-sm text-muted-foreground mt-0.5">See how your net worth and spending changed this week →</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
          </CardContent>
        </Card>
      </motion.div>

      {/* Split view for Combined mode */}
      {mode === 'combined' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <AllModePanel title="Personal" icon={<User className="h-3.5 w-3.5 text-white" />} gradient="from-prism-violet to-prism-sky"
            transactions={transactions?.filter(t => !t.category_id || personalCatIds.has(t.category_id)) || []}
            formatCurrency={formatCurrency} monthPrefix={monthStart.substring(0, 7)} navigate={navigate} />
          <AllModePanel title="Business" icon={<Building2 className="h-3.5 w-3.5 text-white" />} gradient="from-prism-teal to-prism-lime"
            transactions={transactions?.filter(t => t.category_id && businessCatIds.has(t.category_id)) || []}
            formatCurrency={formatCurrency} monthPrefix={monthStart.substring(0, 7)} navigate={navigate} />
        </div>
      )}

      {/* 30-Day Cash Forecast */}
      <motion.div variants={item}>
        <CashFlowForecastChart />
      </motion.div>

      {/* Financial Health Score */}
      <motion.div variants={item}>
        <FinancialHealthScore monthlyIncome={monthlyIncome} monthlyExpenses={monthlyExpenses} totalAssets={totalAssets} totalLiabilities={totalLiabilities} />
      </motion.div>

      {/* Health consistency + morning ritual */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div variants={item}><ConsistencyTrackerCard compact /></motion.div>
        <motion.div variants={item}><MorningKickstartCard compact /></motion.div>
      </div>



      {/* Charts */}
      <DashboardCharts monthlyCashflow={monthlyCashflow} spendingData={filteredSpending} formatCurrency={formatCurrency} formatCompact={formatCompact} />

      {/* Goals + AI Insights */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div variants={item}><GoalTrackerWidget /></motion.div>
        <motion.div variants={item}>
          <AiSpendingInsights transactions={filteredTransactions} accounts={accounts || []} monthlyIncome={monthlyIncome} monthlyExpenses={monthlyExpenses} />
        </motion.div>
      </div>

      {/* Recent Transactions */}
      {filteredTransactions.length > 0 && (
        <motion.div variants={item}>
          <Card className="prism-card-shine border-border/50">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-prism-orange to-prism-rose flex items-center justify-center">
                  <CreditCard className="h-3.5 w-3.5 text-white" />
                </div>
                Recent Transactions
              </CardTitle>
              <button onClick={() => navigate('/transactions')} className="flex items-center gap-1 text-sm text-primary hover:underline">
                View all <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {filteredTransactions.slice(0, 8).map(t => (
                  <div key={t.id} className="flex items-center justify-between rounded-xl border border-border/30 px-3.5 py-2.5 interactive-row hover-border-glow cursor-pointer" onClick={() => navigate('/transactions')}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: (t.categories as any)?.color || 'hsl(var(--muted-foreground))' }} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{t.merchant || 'Unknown Merchant'}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {(t.categories as any)?.name || 'Uncategorized'} · {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <span className={`font-display text-sm font-semibold shrink-0 ${t.amount >= 0 ? 'text-prism-teal' : 'text-prism-rose'}`}>
                      {formatCurrency(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Accounts */}
      {accounts && accounts.length > 0 && (
        <motion.div variants={item}>
          <Card className="prism-card-shine border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-prism-sky to-prism-indigo flex items-center justify-center">
                  <Building2 className="h-3.5 w-3.5 text-white" />
                </div>
                Accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {accounts.map((acc) => (
                  <div key={acc.id} className="flex items-center justify-between rounded-xl border border-border/30 p-3.5 interactive-row hover-border-glow cursor-pointer" onClick={() => navigate('/accounts')}>
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-xs font-bold ${acc.balance >= 0 ? 'bg-prism-teal/10 text-prism-teal' : 'bg-prism-rose/10 text-prism-rose'}`}>
                        {acc.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{acc.name}</p>
                        <p className="text-xs text-muted-foreground">{acc.institution || 'Manual'} · {acc.account_type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-display text-lg font-semibold ${acc.balance >= 0 ? 'text-prism-teal' : 'text-prism-rose'}`}>
                        {formatCurrency(acc.balance)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {(!accounts || accounts.length === 0) && (
        <motion.div variants={item}>
          <Card className="prism-card-shine border-border/50">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="h-16 w-16 rounded-2xl prism-gradient prism-glow flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-display text-lg font-bold mb-1">Welcome to PrismMoney!</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                Add accounts and transactions to see your Safe-to-Spend come alive.
              </p>
              <button onClick={() => navigate('/accounts')} className="mt-4 flex items-center gap-2 rounded-xl prism-gradient px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90">
                <Wallet className="h-4 w-4" /> Add Your First Account
              </button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <BusinessProfileManager open={manageOpen} onOpenChange={setManageOpen} />
      <WeeklyRecap open={recapOpen} onOpenChange={setRecapOpen} />
      <ModeSettingsDialog open={modeSettingsOpen} onClose={() => setModeSettingsOpen(false)} />
    </motion.div>
    </>
  );
};

// ==================== Sub-components ====================

function DashboardCharts({ monthlyCashflow, spendingData, formatCurrency, formatCompact }: {
  monthlyCashflow: { month: string; income: number; expenses: number }[];
  spendingData: { name: string; color: string; value: number }[];
  formatCurrency: (v: number) => string;
  formatCompact: (v: number) => string;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {monthlyCashflow.length > 0 && (
        <motion.div variants={item}>
          <Card className="prism-card-shine border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-prism-teal to-prism-sky flex items-center justify-center">
                  <TrendingUp className="h-3.5 w-3.5 text-white" />
                </div>
                Cash Flow
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyCashflow}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => formatCompact(v)} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
                  <Bar dataKey="income" fill="hsl(160, 84%, 39%)" radius={[6, 6, 0, 0]} name="Income" />
                  <Bar dataKey="expenses" fill="hsl(340, 82%, 52%)" radius={[6, 6, 0, 0]} name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {spendingData && spendingData.length > 0 && (
        <motion.div variants={item}>
          <Card className="prism-card-shine border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-prism-violet to-prism-rose flex items-center justify-center">
                  <PiggyBank className="h-3.5 w-3.5 text-white" />
                </div>
                Spending Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={spendingData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {spendingData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {spendingData.slice(0, 6).map(cat => (
                  <div key={cat.name} className="flex items-center justify-between text-sm group">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-block h-3 w-3 rounded-full ring-2 ring-background" style={{ backgroundColor: cat.color }} />
                      <span className="text-muted-foreground group-hover:text-foreground transition-colors">{cat.name}</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(cat.value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

function AllModePanel({ title, icon, gradient, transactions, formatCurrency, monthPrefix, navigate }: {
  title: string; icon: React.ReactNode; gradient: string; transactions: any[]; formatCurrency: (v: number) => string; monthPrefix: string; navigate: (path: string) => void;
}) {
  const monthTxns = transactions.filter(t => t.date.startsWith(monthPrefix));
  const income = monthTxns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = monthTxns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const net = income - expenses;

  return (
    <motion.div variants={item}>
      <Card className="prism-card-shine border-border/50 hover-lift">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <div className={`h-7 w-7 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center`}>{icon}</div>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Income</p>
              <p className="font-display text-lg font-bold text-prism-teal">{formatCurrency(income)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Expenses</p>
              <p className="font-display text-lg font-bold text-prism-rose">{formatCurrency(expenses)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Net</p>
              <p className={`font-display text-lg font-bold ${net >= 0 ? 'text-prism-teal' : 'text-prism-rose'}`}>{formatCurrency(net)}</p>
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            {transactions.slice(0, 5).map(t => (
              <div key={t.id} className="flex items-center justify-between text-sm interactive-row rounded-lg px-2 py-1.5 cursor-pointer" onClick={() => navigate('/transactions')}>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: (t.categories as any)?.color || 'hsl(var(--muted-foreground))' }} />
                  <span className="text-muted-foreground truncate max-w-[140px]">{t.merchant || (t.categories as any)?.name || 'Transaction'}</span>
                </div>
                <span className={`font-medium ${t.amount >= 0 ? 'text-prism-teal' : 'text-prism-rose'}`}>{formatCurrency(t.amount)}</span>
              </div>
            ))}
            {transactions.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No {title.toLowerCase()} transactions yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default Dashboard;
