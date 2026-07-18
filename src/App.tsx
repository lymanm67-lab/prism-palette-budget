import { useEffect, useRef, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { HouseholdProvider } from "@/contexts/HouseholdContext";
import AppLayout from "@/components/layout/AppLayout";
import Auth from "@/pages/Auth";
import LandingPage from "@/pages/LandingPage";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Onboarding from "@/pages/Onboarding";

// Lazy-loaded heavy pages for code-splitting
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Accounts = lazy(() => import("@/pages/Accounts"));
const Transactions = lazy(() => import("@/pages/Transactions"));
const Budgets = lazy(() => import("@/pages/Budgets"));
const Reports = lazy(() => import("@/pages/Reports"));
const MonthlyReport = lazy(() => import("@/pages/MonthlyReport"));
const Categories = lazy(() => import("@/pages/Categories"));
const Settings = lazy(() => import("@/pages/Settings"));
const AutoSplitRules = lazy(() => import("@/pages/AutoSplitRules"));
const TaxAssistant = lazy(() => import("@/pages/TaxAssistant"));
const Goals = lazy(() => import("@/pages/Goals"));
const DebtPayoff = lazy(() => import("@/pages/DebtPayoff"));
const Calculators = lazy(() => import("@/pages/Calculators"));
const PrismRoadmap = lazy(() => import("@/pages/PrismRoadmap"));
const About = lazy(() => import("@/pages/About"));
const HomeBuyingChecklist = lazy(() => import("@/pages/HomeBuyingChecklist"));
const CashFlow = lazy(() => import("@/pages/CashFlow"));
const Investments = lazy(() => import("@/pages/Investments"));
const SubscriptionsHub = lazy(() => import("@/pages/SubscriptionsHub"));
const GettingStarted = lazy(() => import("@/pages/GettingStarted"));
const SpendingTrends = lazy(() => import("@/pages/SpendingTrends"));
const NetWorth = lazy(() => import("@/pages/NetWorth"));

const Forecast = lazy(() => import("@/pages/Forecast"));
const YearInReview = lazy(() => import("@/pages/YearInReview"));
const BillNegotiation = lazy(() => import("@/pages/BillNegotiation"));
const ApiDocs = lazy(() => import("@/pages/ApiDocs"));
const Legal = lazy(() => import("@/pages/Legal"));
const Changelog = lazy(() => import("@/pages/Changelog"));
const Support = lazy(() => import("@/pages/Support"));
const CapitalDashboard = lazy(() => import("@/pages/CapitalDashboard"));
const CreditOverview = lazy(() => import("@/pages/capital/CreditOverview"));
const Metro2Scanner = lazy(() => import("@/pages/capital/Metro2Scanner"));
const DisputeManager = lazy(() => import("@/pages/capital/DisputeManager"));
const SecondaryBureauFreeze = lazy(() => import("@/pages/capital/SecondaryBureauFreeze"));
const PersonalInfoCorrection = lazy(() => import("@/pages/capital/PersonalInfoCorrection"));
const FundingReadiness = lazy(() => import("@/pages/capital/FundingReadiness"));
const BusinessCredit = lazy(() => import("@/pages/capital/BusinessCredit"));
const Receivables = lazy(() => import("@/pages/capital/Receivables"));
const PayrollRunway = lazy(() => import("@/pages/capital/PayrollRunway"));
const FundingSimulator = lazy(() => import("@/pages/capital/FundingSimulator"));
const SurvivalIndex = lazy(() => import("@/pages/capital/SurvivalIndex"));
const DocumentVault = lazy(() => import("@/pages/capital/DocumentVault"));
const AiCoach = lazy(() => import("@/pages/capital/AiCoach"));
const CapitalStackPlanner = lazy(() => import("@/pages/capital/CapitalStackPlanner"));
const BankingIntelligence = lazy(() => import("@/pages/capital/BankingIntelligence"));
const BankStatementAnalyzer = lazy(() => import("@/pages/capital/BankStatementAnalyzer"));
const FinancialRiskRadar = lazy(() => import("@/pages/capital/FinancialRiskRadar"));
const BankabilityScore = lazy(() => import("@/pages/capital/BankabilityScore"));
const LoanReadiness = lazy(() => import("@/pages/capital/LoanReadiness"));
const DSCRCalculator = lazy(() => import("@/pages/capital/DSCRCalculator"));
const MoneyMath = lazy(() => import("@/pages/capital/MoneyMath"));
const CreditHealthDashboard = lazy(() => import("@/pages/capital/CreditHealthDashboard"));
const CreditHealthBreakdown = lazy(() => import("@/pages/capital/CreditHealthBreakdown"));
const CreditHealthIssues = lazy(() => import("@/pages/capital/CreditHealthIssues"));
const CreditHealthTimeline = lazy(() => import("@/pages/capital/CreditHealthTimeline"));
const CreditHealthExplain = lazy(() => import("@/pages/capital/CreditHealthExplain"));
const CreditHealthReadiness = lazy(() => import("@/pages/capital/CreditHealthReadiness"));
const CreditHealthOnboarding = lazy(() => import("@/pages/capital/CreditHealthOnboarding"));
const ExperimentsDashboard = lazy(() => import("@/pages/ExperimentsDashboard"));
const ReconciliationAudit = lazy(() => import("@/pages/ReconciliationAudit"));
const Cleanup = lazy(() => import("@/pages/Cleanup"));
const AppStoreReadiness = lazy(() => import("@/pages/AppStoreReadiness"));
const CrossoverTracker = lazy(() => import("@/pages/CrossoverTracker"));
const InvestmentPlanning = lazy(() => import("@/pages/InvestmentPlanning"));
const MoneyCoach = lazy(() => import("@/pages/MoneyCoach"));
const PaycheckDeployment = lazy(() => import("@/pages/PaycheckDeployment"));
const PaycheckDeploymentRules = lazy(() => import("@/pages/PaycheckDeploymentRules"));

const CoachChat = lazy(() => import("@/pages/CoachChat"));
const CoachPlan = lazy(() => import("@/pages/CoachPlan"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex min-h-[50vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, user, loading } = useAuth();
  const navigate = useNavigate();
  const redirected = useRef(false);

  useEffect(() => {
    if (loading || !user || redirected.current) return;
    const createdAt = new Date(user.created_at).getTime();
    const isNew = Date.now() - createdAt < 60_000;
    const alreadySeen = localStorage.getItem(`prism_gs_seen_${user.id}`);
    if (isNew && !alreadySeen) {
      redirected.current = true;
      localStorage.setItem(`prism_gs_seen_${user.id}`, '1');
      navigate('/getting-started', { replace: true });
    }
  }, [loading, user, navigate]);

  if (loading) return <PageLoader />;
  if (!session) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (session) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<AuthRoute><LandingPage /></AuthRoute>} />
            <Route path="/onboarding" element={<AuthRoute><Onboarding /></AuthRoute>} />
            <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/changelog" element={<Suspense fallback={<PageLoader />}><Changelog /></Suspense>} />
            <Route path="/support" element={<Suspense fallback={<PageLoader />}><Support /></Suspense>} />
            <Route element={
              <ProtectedRoute>
                <HouseholdProvider>
                  <AppLayout />
                </HouseholdProvider>
              </ProtectedRoute>
            }>
              <Route index path="/dashboard" element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
              <Route path="/coach" element={<Suspense fallback={<PageLoader />}><MoneyCoach /></Suspense>} />
              <Route path="/coach/paycheck" element={<Suspense fallback={<PageLoader />}><PaycheckDeployment /></Suspense>} />
              <Route path="/coach/deployment-rules" element={<Suspense fallback={<PageLoader />}><PaycheckDeploymentRules /></Suspense>} />

              <Route path="/coach/chat" element={<Suspense fallback={<PageLoader />}><CoachChat /></Suspense>} />
              <Route path="/coach/plan" element={<Suspense fallback={<PageLoader />}><CoachPlan /></Suspense>} />
              <Route path="/accounts" element={<Suspense fallback={<PageLoader />}><Accounts /></Suspense>} />
              <Route path="/transactions" element={<Suspense fallback={<PageLoader />}><Transactions /></Suspense>} />
              <Route path="/cash-flow" element={<Suspense fallback={<PageLoader />}><CashFlow /></Suspense>} />
              <Route path="/budgets" element={<Suspense fallback={<PageLoader />}><Budgets /></Suspense>} />
              <Route path="/categories" element={<Suspense fallback={<PageLoader />}><Categories /></Suspense>} />
              <Route path="/reports" element={<Suspense fallback={<PageLoader />}><Reports /></Suspense>} />
              <Route path="/reports/monthly" element={<Suspense fallback={<PageLoader />}><MonthlyReport /></Suspense>} />
              <Route path="/spending-trends" element={<Suspense fallback={<PageLoader />}><SpendingTrends /></Suspense>} />
              <Route path="/goals" element={<Suspense fallback={<PageLoader />}><Goals /></Suspense>} />
              <Route path="/debt-payoff" element={<Suspense fallback={<PageLoader />}><DebtPayoff /></Suspense>} />
              <Route path="/investments" element={<Suspense fallback={<PageLoader />}><Investments /></Suspense>} />
              <Route path="/net-worth" element={<Suspense fallback={<PageLoader />}><NetWorth /></Suspense>} />
              <Route path="/recurring" element={<Navigate to="/subscriptions?tab=recurring" replace />} />
              <Route path="/subscriptions" element={<Suspense fallback={<PageLoader />}><SubscriptionsHub /></Suspense>} />
              <Route path="/forecast" element={<Suspense fallback={<PageLoader />}><Forecast /></Suspense>} />
              <Route path="/year-in-review" element={<Suspense fallback={<PageLoader />}><YearInReview /></Suspense>} />
              <Route path="/bill-negotiation" element={<Suspense fallback={<PageLoader />}><BillNegotiation /></Suspense>} />
              <Route path="/calculators" element={<Suspense fallback={<PageLoader />}><Calculators /></Suspense>} />
              <Route path="/roadmap" element={<Suspense fallback={<PageLoader />}><PrismRoadmap /></Suspense>} />
              <Route path="/about" element={<Suspense fallback={<PageLoader />}><About /></Suspense>} />
              <Route path="/home-buying" element={<Suspense fallback={<PageLoader />}><HomeBuyingChecklist /></Suspense>} />
              <Route path="/settings" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
              <Route path="/settings/auto-split-rules" element={<Suspense fallback={<PageLoader />}><AutoSplitRules /></Suspense>} />
              <Route path="/tax-assistant" element={<Suspense fallback={<PageLoader />}><TaxAssistant /></Suspense>} />
              <Route path="/legal" element={<Suspense fallback={<PageLoader />}><Legal /></Suspense>} />
              <Route path="/getting-started" element={<Suspense fallback={<PageLoader />}><GettingStarted /></Suspense>} />
              <Route path="/api-docs" element={<Suspense fallback={<PageLoader />}><ApiDocs /></Suspense>} />
              <Route path="/capital" element={<Suspense fallback={<PageLoader />}><CapitalDashboard /></Suspense>} />
              <Route path="/capital/credit-overview" element={<Suspense fallback={<PageLoader />}><CreditOverview /></Suspense>} />
              <Route path="/capital/metro2-scanner" element={<Suspense fallback={<PageLoader />}><Metro2Scanner /></Suspense>} />
              <Route path="/capital/disputes" element={<Suspense fallback={<PageLoader />}><DisputeManager /></Suspense>} />
              <Route path="/capital/secondary-freeze" element={<Suspense fallback={<PageLoader />}><SecondaryBureauFreeze /></Suspense>} />
              <Route path="/capital/personal-info-correction" element={<Suspense fallback={<PageLoader />}><PersonalInfoCorrection /></Suspense>} />
              <Route path="/capital/funding-readiness" element={<Suspense fallback={<PageLoader />}><FundingReadiness /></Suspense>} />
              <Route path="/capital/business-credit" element={<Suspense fallback={<PageLoader />}><BusinessCredit /></Suspense>} />
              <Route path="/capital/receivables" element={<Suspense fallback={<PageLoader />}><Receivables /></Suspense>} />
              <Route path="/capital/payroll-runway" element={<Suspense fallback={<PageLoader />}><PayrollRunway /></Suspense>} />
              <Route path="/capital/funding-simulator" element={<Suspense fallback={<PageLoader />}><FundingSimulator /></Suspense>} />
              <Route path="/capital/survival-index" element={<Suspense fallback={<PageLoader />}><SurvivalIndex /></Suspense>} />
              <Route path="/capital/vault" element={<Suspense fallback={<PageLoader />}><DocumentVault /></Suspense>} />
              <Route path="/capital/ai-coach" element={<Suspense fallback={<PageLoader />}><AiCoach /></Suspense>} />
              <Route path="/capital/capital-stack" element={<Suspense fallback={<PageLoader />}><CapitalStackPlanner /></Suspense>} />
              <Route path="/capital/banking-intelligence" element={<Suspense fallback={<PageLoader />}><BankingIntelligence /></Suspense>} />
              <Route path="/capital/bank-analyzer" element={<Suspense fallback={<PageLoader />}><BankStatementAnalyzer /></Suspense>} />
              <Route path="/capital/risk-radar" element={<Suspense fallback={<PageLoader />}><FinancialRiskRadar /></Suspense>} />
              <Route path="/capital/bankability" element={<Suspense fallback={<PageLoader />}><BankabilityScore /></Suspense>} />
              <Route path="/capital/loan-readiness" element={<Suspense fallback={<PageLoader />}><LoanReadiness /></Suspense>} />
              <Route path="/capital/dscr" element={<Suspense fallback={<PageLoader />}><DSCRCalculator /></Suspense>} />
              <Route path="/capital/money-math" element={<Suspense fallback={<PageLoader />}><MoneyMath /></Suspense>} />
              <Route path="/capital/credit-health" element={<Suspense fallback={<PageLoader />}><CreditHealthDashboard /></Suspense>} />
              <Route path="/capital/credit-health/breakdown" element={<Suspense fallback={<PageLoader />}><CreditHealthBreakdown /></Suspense>} />
              <Route path="/capital/credit-health/issues" element={<Suspense fallback={<PageLoader />}><CreditHealthIssues /></Suspense>} />
              <Route path="/capital/credit-health/timeline" element={<Suspense fallback={<PageLoader />}><CreditHealthTimeline /></Suspense>} />
              <Route path="/capital/credit-health/explain" element={<Suspense fallback={<PageLoader />}><CreditHealthExplain /></Suspense>} />
              <Route path="/capital/credit-health/readiness" element={<Suspense fallback={<PageLoader />}><CreditHealthReadiness /></Suspense>} />
              <Route path="/capital/credit-health/onboarding" element={<Suspense fallback={<PageLoader />}><CreditHealthOnboarding /></Suspense>} />
              <Route path="/reconciliation" element={<Suspense fallback={<PageLoader />}><ReconciliationAudit /></Suspense>} />
              <Route path="/cleanup" element={<Suspense fallback={<PageLoader />}><Cleanup /></Suspense>} />
              <Route path="/experiments" element={<Suspense fallback={<PageLoader />}><ExperimentsDashboard /></Suspense>} />
              <Route path="/app-store-readiness" element={<Suspense fallback={<PageLoader />}><AppStoreReadiness /></Suspense>} />
              <Route path="/crossover-tracker" element={<Suspense fallback={<PageLoader />}><CrossoverTracker /></Suspense>} />
              <Route path="/planning/investments" element={<Suspense fallback={<PageLoader />}><InvestmentPlanning /></Suspense>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
