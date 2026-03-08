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
              <Route path="/calculators" element={<Calculators />} />
              <Route path="/roadmap" element={<PrismRoadmap />} />
              <Route path="/about" element={<About />} />
              <Route path="/home-buying" element={<HomeBuyingChecklist />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/tax-assistant" element={<TaxAssistant />} />
              <Route path="/legal" element={<Legal />} />
              <Route path="/getting-started" element={<GettingStarted />} />
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
