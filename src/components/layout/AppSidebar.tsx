import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Landmark, ArrowLeftRight, PiggyBank, BarChart3, Tags, Target,
  Settings, Bot, LogOut, ChevronLeft, ChevronRight, Sun, Moon, TrendingDown,
  TrendingUp, Calculator, Scale, Map, Heart, Home, Wallet, RepeatIcon, GraduationCap,
  CreditCard, LineChart, Sparkles, Shield, FileSearch, FileText, Building2,
  DollarSign, Clock, Activity, Lock, Scissors, Layers, Landmark, BarChart3 as ChartBar,
  Radar, ClipboardCheck,
} from 'lucide-react';
import prismLogo from '@/assets/prism-budget-logo.png';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { useSidebarBadges } from '@/hooks/use-sidebar-badges';

const NAV_SECTIONS = [
  {
    label: 'Home',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: 'text-prism-teal' },
      { to: '/getting-started', icon: GraduationCap, label: 'Getting Started', color: 'text-prism-amber' },
    ],
  },
  {
    label: 'Track',
    items: [
      { to: '/accounts', icon: Landmark, label: 'Accounts', color: 'text-prism-sky' },
      { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions', color: 'text-prism-orange' },
      { to: '/recurring', icon: RepeatIcon, label: 'Recurring', color: 'text-prism-teal' },
      { to: '/subscriptions', icon: CreditCard, label: 'Subscriptions', color: 'text-prism-violet' },
    ],
  },
  {
    label: 'Budget & Plan',
    items: [
      { to: '/budgets', icon: PiggyBank, label: 'Budgets', color: 'text-prism-amber' },
      { to: '/cash-flow', icon: Wallet, label: 'Cash Flow', color: 'text-prism-teal' },
      { to: '/categories', icon: Tags, label: 'Categories', color: 'text-prism-lime' },
      { to: '/forecast', icon: LineChart, label: 'Forecast', color: 'text-prism-sky' },
    ],
  },
  {
    label: 'Goals & Wealth',
    items: [
      { to: '/goals', icon: Target, label: 'Goals', color: 'text-prism-lime' },
      { to: '/debt-payoff', icon: TrendingDown, label: 'Debt Payoff', color: 'text-prism-rose' },
      { to: '/net-worth', icon: Scale, label: 'Net Worth', color: 'text-prism-teal' },
      { to: '/investments', icon: TrendingUp, label: 'Investments', color: 'text-prism-indigo' },
      { to: '/home-buying', icon: Home, label: 'Home Buying', color: 'text-prism-amber' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/reports', icon: BarChart3, label: 'Reports', color: 'text-prism-orange' },
      { to: '/spending-trends', icon: TrendingUp, label: 'Spending Trends', color: 'text-prism-lime' },
      { to: '/bill-negotiation', icon: Scissors, label: 'Bill Negotiation', color: 'text-prism-teal' },
      { to: '/year-in-review', icon: Sparkles, label: 'Year in Review', color: 'text-prism-amber' },
      { to: '/tax-assistant', icon: Bot, label: 'Tax Assistant', color: 'text-prism-indigo' },
      { to: '/calculators', icon: Calculator, label: 'Calculators', color: 'text-prism-sky' },
    ],
  },
  {
    label: 'Capital — Credit',
    items: [
      { to: '/capital', icon: Shield, label: 'Capital Dashboard', color: 'text-prism-teal' },
      { to: '/capital/credit-overview', icon: FileSearch, label: 'Credit Overview', color: 'text-prism-sky' },
      { to: '/capital/metro2-scanner', icon: FileSearch, label: 'Metro2 Scanner', color: 'text-prism-amber' },
      { to: '/capital/disputes', icon: FileText, label: 'Dispute Manager', color: 'text-prism-orange' },
      { to: '/capital/funding-readiness', icon: TrendingUp, label: 'Funding Score', color: 'text-prism-lime' },
      { to: '/capital/business-credit', icon: Building2, label: 'Business Credit', color: 'text-prism-indigo' },
    ],
  },
  {
    label: 'Capital — Operations',
    items: [
      { to: '/capital/receivables', icon: DollarSign, label: 'Receivables', color: 'text-prism-sky' },
      { to: '/capital/payroll-runway', icon: Clock, label: 'Payroll Runway', color: 'text-prism-rose' },
      { to: '/capital/funding-simulator', icon: BarChart3, label: 'Funding Simulator', color: 'text-prism-violet' },
      { to: '/capital/survival-index', icon: Activity, label: 'Survival Index', color: 'text-prism-teal' },
      { to: '/capital/vault', icon: Lock, label: 'Document Vault', color: 'text-muted-foreground' },
      { to: '/capital/ai-coach', icon: Bot, label: 'AI Coach', color: 'text-prism-amber' },
    ],
  },
  {
    label: 'More',
    items: [
      { to: '/roadmap', icon: Map, label: 'Prism Roadmap', color: 'text-prism-teal' },
      { to: '/about', icon: Heart, label: 'About', color: 'text-prism-rose' },
      { to: '/legal', icon: Scale, label: 'Legal', color: 'text-muted-foreground' },
      { to: '/settings', icon: Settings, label: 'Settings', color: 'text-muted-foreground' },
    ],
  },
];

const AppSidebar = () => {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  const badges = useSidebarBadges();

  // Map routes to badge counts
  const badgeMap: Record<string, number> = {
    '/recurring': badges.recurring,
    '/transactions': badges.transactions,
    '/budgets': badges.budgets,
  };

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 relative',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Bold gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-prism-teal/5 via-transparent to-prism-orange/5 pointer-events-none" />

      <div className="relative flex h-16 items-center justify-between px-4">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <img src={prismLogo} alt="PrismBudget" className="h-16 w-16 rounded-xl object-contain" />
            <span className="font-display text-lg font-extrabold tracking-tight prism-gradient-text">
              PrismBudget
            </span>
          </div>
        )}
        {collapsed && (
          <img src={prismLogo} alt="PrismBudget" className="mx-auto h-16 w-16 rounded-xl object-contain" />
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="relative flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {NAV_SECTIONS.map((section, sIdx) => (
          <div key={section.label}>
            {/* Section label */}
            {!collapsed && (
              <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/30">
                {section.label}
              </p>
            )}
            {collapsed && sIdx > 0 && (
              <div className="mx-3 mb-2 h-px bg-sidebar-border" />
            )}

            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 relative group',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-primary sidebar-accent-line'
                        : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <span className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200',
                      isActive
                        ? 'bg-sidebar-accent/80'
                        : 'bg-sidebar-accent/0 group-hover:bg-sidebar-accent/40'
                    )}>
                      <item.icon className={cn(
                        'h-[18px] w-[18px] shrink-0 transition-colors duration-200',
                        item.color
                      )} />
                    </span>
                    {!collapsed && <span className="flex-1">{item.label}</span>}
                    {!collapsed && badgeMap[item.to] > 0 && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-prism-rose/15 px-1.5 text-[10px] font-bold text-prism-rose">
                        {badgeMap[item.to]}
                      </span>
                    )}
                    {collapsed && badgeMap[item.to] > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-prism-rose">
                        <span className="sr-only">{badgeMap[item.to]}</span>
                      </span>
                    )}
                    {isActive && !collapsed && !badgeMap[item.to] && (
                      <div className="ml-auto h-2 w-2 rounded-full bg-prism-teal animate-pulse" />
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="relative border-t border-sidebar-border p-3 space-y-1">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {isDark ? <Sun className="h-4 w-4 shrink-0 text-prism-orange" /> : <Moon className="h-4 w-4 shrink-0 text-prism-indigo" />}
          {!collapsed && <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {!collapsed && user && (
          <p className="truncate text-xs text-sidebar-foreground/40 px-3">{user.email}</p>
        )}
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/50 transition-colors hover:bg-destructive/10 hover:text-prism-rose"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;