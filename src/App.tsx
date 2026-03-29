import { useEffect, useRef } from "react";
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
import Dashboard from "@/pages/Dashboard";
import Accounts from "@/pages/Accounts";
import Transactions from "@/pages/Transactions";
import Budgets from "@/pages/Budgets";
import Reports from "@/pages/Reports";
import Categories from "@/pages/Categories";
import ResetPassword from "@/pages/ResetPassword";
import Settings from "@/pages/Settings";
import TaxAssistant from "@/pages/TaxAssistant";
import Goals from "@/pages/Goals";
import DebtPayoff from "@/pages/DebtPayoff";
import Calculators from "@/pages/Calculators";
import PrismRoadmap from "@/pages/PrismRoadmap";
import About from "@/pages/About";
import HomeBuyingChecklist from "@/pages/HomeBuyingChecklist";
import NotFound from "./pages/NotFound";
import Onboarding from "@/pages/Onboarding";
import LandingPage from "@/pages/LandingPage";
import Legal from "@/pages/Legal";
import CashFlow from "@/pages/CashFlow";
import Investments from "@/pages/Investments";
import Recurring from "@/pages/Recurring";
import GettingStarted from "@/pages/GettingStarted";
import SpendingTrends from "@/pages/SpendingTrends";
import NetWorth from "@/pages/NetWorth";
import Subscriptions from "@/pages/Subscriptions";
import Forecast from "@/pages/Forecast";
import YearInReview from "@/pages/YearInReview";
import BillNegotiation from "@/pages/BillNegotiation";
import ApiDocs from "@/pages/ApiDocs";
import CapitalDashboard from "@/pages/CapitalDashboard";
import CreditOverview from "@/pages/capital/CreditOverview";
import Metro2Scanner from "@/pages/capital/Metro2Scanner";
import DisputeManager from "@/pages/capital/DisputeManager";
import FundingReadiness from "@/pages/capital/FundingReadiness";
import BusinessCredit from "@/pages/capital/BusinessCredit";
import Receivables from "@/pages/capital/Receivables";
import PayrollRunway from "@/pages/capital/PayrollRunway";
import FundingSimulator from "@/pages/capital/FundingSimulator";
import SurvivalIndex from "@/pages/capital/SurvivalIndex";
import DocumentVault from "@/pages/capital/DocumentVault";
import AiCoach from "@/pages/capital/AiCoach";
import CapitalStackPlanner from "@/pages/capital/CapitalStackPlanner";
import BankingIntelligence from "@/pages/capital/BankingIntelligence";
import BankStatementAnalyzer from "@/pages/capital/BankStatementAnalyzer";
import FinancialRiskRadar from "@/pages/capital/FinancialRiskRadar";
import BankabilityScore from "@/pages/capital/BankabilityScore";
import LoanReadiness from "@/pages/capital/LoanReadiness";
import DSCRCalculator from "@/pages/capital/DSCRCalculator";
import MoneyMath from "@/pages/capital/MoneyMath";
import CreditHealthDashboard from "@/pages/capital/CreditHealthDashboard";
import CreditHealthBreakdown from "@/pages/capital/CreditHealthBreakdown";
import CreditHealthIssues from "@/pages/capital/CreditHealthIssues";
import CreditHealthTimeline from "@/pages/capital/CreditHealthTimeline";
import CreditHealthExplain from "@/pages/capital/CreditHealthExplain";
import CreditHealthReadiness from "@/pages/capital/CreditHealthReadiness";
import CreditHealthOnboarding from "@/pages/capital/CreditHealthOnboarding";
import ExperimentsDashboard from "@/pages/ExperimentsDashboard";
import ReconciliationAudit from "@/pages/ReconciliationAudit";
import Changelog from "@/pages/Changelog";
import AppStoreReadiness from "@/pages/AppStoreReadiness";
import CrossoverTracker from "@/pages/CrossoverTracker";
const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, user, loading } = useAuth();
  const navigate = useNavigate();
  const redirected = useRef(false);

  useEffect(() => {
    if (loading || !user || redirected.current) return;
    // Redirect brand-new users (account created within the last 60 seconds) to Getting Started
    const createdAt = new Date(user.created_at).getTime();
    const isNew = Date.now() - createdAt < 60_000;
    const alreadySeen = localStorage.getItem(`prism_gs_seen_${user.id}`);
    if (isNew && !alreadySeen) {
      redirected.current = true;
      localStorage.setItem(`prism_gs_seen_${user.id}`, '1');
      navigate('/getting-started', { replace: true });
    }
  }, [loading, user, navigate]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (!session) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) return null;
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
            <Route path="/changelog" element={<Changelog />} />
            <Route element={
              <ProtectedRoute>
                <HouseholdProvider>
                  <AppLayout />
                </HouseholdProvider>
              </ProtectedRoute>
            }>
              <Route index path="/dashboard" element={<Dashboard />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/cash-flow" element={<CashFlow />} />
              <Route path="/budgets" element={<Budgets />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/spending-trends" element={<SpendingTrends />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/debt-payoff" element={<DebtPayoff />} />
              <Route path="/investments" element={<Investments />} />
              <Route path="/net-worth" element={<NetWorth />} />
              <Route path="/recurring" element={<Recurring />} />
              <Route path="/subscriptions" element={<Subscriptions />} />
              <Route path="/forecast" element={<Forecast />} />
              <Route path="/year-in-review" element={<YearInReview />} />
              <Route path="/bill-negotiation" element={<BillNegotiation />} />
              <Route path="/calculators" element={<Calculators />} />
              <Route path="/roadmap" element={<PrismRoadmap />} />
              <Route path="/about" element={<About />} />
              <Route path="/home-buying" element={<HomeBuyingChecklist />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/tax-assistant" element={<TaxAssistant />} />
              <Route path="/legal" element={<Legal />} />
              <Route path="/getting-started" element={<GettingStarted />} />
              <Route path="/api-docs" element={<ApiDocs />} />
              <Route path="/capital" element={<CapitalDashboard />} />
              <Route path="/capital/credit-overview" element={<CreditOverview />} />
              <Route path="/capital/metro2-scanner" element={<Metro2Scanner />} />
              <Route path="/capital/disputes" element={<DisputeManager />} />
              <Route path="/capital/funding-readiness" element={<FundingReadiness />} />
              <Route path="/capital/business-credit" element={<BusinessCredit />} />
              <Route path="/capital/receivables" element={<Receivables />} />
              <Route path="/capital/payroll-runway" element={<PayrollRunway />} />
              <Route path="/capital/funding-simulator" element={<FundingSimulator />} />
              <Route path="/capital/survival-index" element={<SurvivalIndex />} />
              <Route path="/capital/vault" element={<DocumentVault />} />
              <Route path="/capital/ai-coach" element={<AiCoach />} />
              <Route path="/capital/capital-stack" element={<CapitalStackPlanner />} />
              <Route path="/capital/banking-intelligence" element={<BankingIntelligence />} />
              <Route path="/capital/bank-analyzer" element={<BankStatementAnalyzer />} />
              <Route path="/capital/risk-radar" element={<FinancialRiskRadar />} />
              <Route path="/capital/bankability" element={<BankabilityScore />} />
              <Route path="/capital/loan-readiness" element={<LoanReadiness />} />
              <Route path="/capital/dscr" element={<DSCRCalculator />} />
              <Route path="/capital/money-math" element={<MoneyMath />} />
              <Route path="/capital/credit-health" element={<CreditHealthDashboard />} />
              <Route path="/capital/credit-health/breakdown" element={<CreditHealthBreakdown />} />
              <Route path="/capital/credit-health/issues" element={<CreditHealthIssues />} />
              <Route path="/capital/credit-health/timeline" element={<CreditHealthTimeline />} />
              <Route path="/capital/credit-health/explain" element={<CreditHealthExplain />} />
              <Route path="/capital/credit-health/readiness" element={<CreditHealthReadiness />} />
              <Route path="/capital/credit-health/onboarding" element={<CreditHealthOnboarding />} />
              <Route path="/reconciliation" element={<ReconciliationAudit />} />
              <Route path="/experiments" element={<ExperimentsDashboard />} />
              <Route path="/app-store-readiness" element={<AppStoreReadiness />} />
              <Route path="/crossover-tracker" element={<CrossoverTracker />} />
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
