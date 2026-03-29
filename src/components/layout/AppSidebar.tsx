import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, Landmark, ArrowLeftRight, PiggyBank, BarChart3, Tags, Target,
  Settings, Bot, LogOut, ChevronLeft, ChevronRight, Sun, Moon, TrendingDown,
  TrendingUp, Calculator, Scale, Heart, Home, Wallet, RepeatIcon,
  CreditCard, LineChart, Sparkles, Shield, FileSearch, FileText, Building2,
  DollarSign, Clock, Lock, Scissors, ClipboardCheck, Gauge, ChevronDown,
  Layers, Search, AlertTriangle, Activity, Banknote, Smartphone,
} from 'lucide-react';
import prismLogo from '@/assets/prism-money-logo.png';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { useSidebarBadges } from '@/hooks/use-sidebar-badges';
import type { LucideIcon } from 'lucide-react';

type NavItem = { to: string; icon: LucideIcon; label: string; color: string };
type NavSubGroup = { subLabel: string; items: NavItem[] };
type NavSection = {
  label: string;
  items?: NavItem[];
  subGroups?: NavSubGroup[];
  topItems?: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { to: '/getting-started', icon: ClipboardCheck, label: 'Get Started', color: 'text-prism-lime' },
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: 'text-prism-teal' },
      { to: '/reports', icon: BarChart3, label: 'Reports', color: 'text-prism-orange' },
      { to: '/year-in-review', icon: Sparkles, label: 'Year in Review', color: 'text-prism-amber' },
    ],
  },
  {
    label: 'Track & Organize',
    items: [
      { to: '/accounts', icon: Landmark, label: 'Accounts', color: 'text-prism-sky' },
      { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions', color: 'text-prism-orange' },
      { to: '/categories', icon: Tags, label: 'Categories', color: 'text-prism-lime' },
      { to: '/recurring', icon: RepeatIcon, label: 'Recurring', color: 'text-prism-teal' },
    ],
  },
  {
    label: 'Budget & Plan',
    items: [
      { to: '/budgets', icon: PiggyBank, label: 'Budgets', color: 'text-prism-amber' },
      { to: '/cash-flow', icon: Wallet, label: 'Cash Flow', color: 'text-prism-teal' },
      { to: '/forecast', icon: LineChart, label: 'Forecast', color: 'text-prism-sky' },
      { to: '/spending-trends', icon: TrendingUp, label: 'Spending Trends', color: 'text-prism-lime' },
      { to: '/tax-assistant', icon: Bot, label: 'Tax Assistant', color: 'text-prism-indigo' },
      { to: '/reconciliation', icon: FileSearch, label: 'Reconciliation', color: 'text-prism-teal' },
    ],
  },
  {
    label: 'Save & Reduce',
    items: [
      { to: '/subscriptions', icon: CreditCard, label: 'Subscriptions', color: 'text-prism-violet' },
      { to: '/bill-negotiation', icon: Scissors, label: 'Bill Negotiation', color: 'text-prism-rose' },
      { to: '/debt-payoff', icon: TrendingDown, label: 'Debt Payoff', color: 'text-prism-rose' },
      { to: '/calculators', icon: Calculator, label: 'Calculators', color: 'text-prism-indigo' },
    ],
  },
  {
    label: 'Build Wealth',
    items: [
      { to: '/goals', icon: Target, label: 'Goals', color: 'text-prism-lime' },
      { to: '/net-worth', icon: Scale, label: 'Net Worth', color: 'text-prism-teal' },
      { to: '/investments', icon: TrendingUp, label: 'Investments', color: 'text-prism-indigo' },
      { to: '/home-buying', icon: Home, label: 'Home Buying', color: 'text-prism-amber' },
    ],
  },
  {
    label: 'Capital',
    topItems: [
      { to: '/capital', icon: Shield, label: 'Dashboard', color: 'text-prism-teal' },
      { to: '/capital/ai-coach', icon: Bot, label: 'AI Coach', color: 'text-prism-amber' },
    ],
    subGroups: [
      {
        subLabel: 'Credit Health',
        items: [
          { to: '/capital/credit-health', icon: Heart, label: 'Credit Health', color: 'text-prism-rose' },
          { to: '/capital/credit-overview', icon: FileSearch, label: 'Credit Overview', color: 'text-prism-sky' },
          { to: '/capital/metro2-scanner', icon: Gauge, label: 'Metro2 Scanner', color: 'text-prism-amber' },
          { to: '/capital/disputes', icon: FileText, label: 'Disputes', color: 'text-prism-orange' },
          { to: '/capital/money-math', icon: Calculator, label: 'Money Math', color: 'text-prism-indigo' },
        ],
      },
      {
        subLabel: 'Business & Funding',
        items: [
          { to: '/capital/business-credit', icon: Building2, label: 'Business Credit', color: 'text-prism-indigo' },
          { to: '/capital/bankability', icon: BarChart3, label: 'Bankability', color: 'text-prism-violet' },
          { to: '/capital/loan-readiness', icon: ClipboardCheck, label: 'Loan Readiness', color: 'text-prism-lime' },
          { to: '/capital/capital-stack', icon: Layers, label: 'Capital Stack', color: 'text-prism-teal' },
          { to: '/capital/banking-intelligence', icon: Search, label: 'Banking Intel', color: 'text-prism-sky' },
          { to: '/capital/funding-simulator', icon: Banknote, label: 'Funding Sim', color: 'text-prism-orange' },
        ],
      },
      {
        subLabel: 'Cash Flow & Risk',
        items: [
          { to: '/capital/receivables', icon: DollarSign, label: 'Receivables', color: 'text-prism-sky' },
          { to: '/capital/payroll-runway', icon: Clock, label: 'Payroll Runway', color: 'text-prism-rose' },
          { to: '/capital/risk-radar', icon: AlertTriangle, label: 'Risk Radar', color: 'text-prism-orange' },
          { to: '/capital/dscr', icon: Activity, label: 'DSCR Calculator', color: 'text-prism-teal' },
          { to: '/capital/bank-analyzer', icon: LineChart, label: 'Bank Analyzer', color: 'text-prism-violet' },
          { to: '/capital/survival-index', icon: Shield, label: 'Survival Index', color: 'text-prism-rose' },
          { to: '/capital/vault', icon: Lock, label: 'Document Vault', color: 'text-muted-foreground' },
        ],
      },
    ],
  },
  {
    label: 'More',
    items: [
      { to: '/app-store-readiness', icon: Smartphone, label: 'App Store', color: 'text-prism-indigo' },
      { to: '/settings', icon: Settings, label: 'Settings', color: 'text-muted-foreground' },
      { to: '/about', icon: Heart, label: 'About', color: 'text-prism-rose' },
      { to: '/legal', icon: Scale, label: 'Legal', color: 'text-muted-foreground' },
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

  // Track which capital sub-groups are open — auto-open the one with the active route
  const [openSubGroups, setOpenSubGroups] = useState<Record<string, boolean>>(() => {
    const capitalSection = NAV_SECTIONS.find(s => s.label === 'Capital');
    const initial: Record<string, boolean> = {};
    capitalSection?.subGroups?.forEach(sg => {
      initial[sg.subLabel] = sg.items.some(i => location.pathname === i.to);
    });
    return initial;
  });

  const toggleSubGroup = (label: string) => {
    setOpenSubGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const badgeMap: Record<string, number> = {
    '/recurring': badges.recurring,
    '/transactions': badges.transactions,
    '/budgets': badges.budgets,
  };

  const renderNavItem = (item: NavItem) => {
    const isActive = location.pathname === item.to;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        className={cn(
          'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-all duration-200 relative group',
          isActive
            ? 'bg-sidebar-accent text-sidebar-primary sidebar-accent-line'
            : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
        )}
      >
        <span className={cn(
          'flex h-6 w-6 items-center justify-center rounded-md transition-all duration-200',
          isActive ? 'bg-sidebar-accent/80' : 'bg-sidebar-accent/0 group-hover:bg-sidebar-accent/40'
        )}>
          <item.icon className={cn('h-4 w-4 shrink-0 transition-colors duration-200', item.color)} />
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
  };

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 relative',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-prism-teal/5 via-transparent to-prism-orange/5 pointer-events-none" />

      <div className="relative flex h-16 items-center justify-between px-4">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <img src={prismLogo} alt="PrismMoney" className="h-16 w-16 rounded-xl object-contain" />
            <span className="font-display text-lg font-extrabold tracking-tight prism-gradient-text">
              PrismMoney
            </span>
          </div>
        )}
        {collapsed && (
          <img src={prismLogo} alt="PrismMoney" className="mx-auto h-16 w-16 rounded-xl object-contain" />
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

      <nav className="relative flex-1 overflow-y-auto px-2 py-2 space-y-2">
        {NAV_SECTIONS.map((section, sIdx) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/30">
                {section.label}
              </p>
            )}
            {collapsed && sIdx > 0 && (
              <div className="mx-3 mb-1 h-px bg-sidebar-border" />
            )}

            <div className="space-y-px">
              {/* Top-level items (e.g. Capital Dashboard, AI Coach) */}
              {section.topItems?.map(renderNavItem)}

              {/* Standard flat items */}
              {section.items?.map(renderNavItem)}

              {/* Collapsible sub-groups (expanded mode) */}
              {!collapsed && section.subGroups?.map((sg) => {
                const isOpen = openSubGroups[sg.subLabel] ?? false;
                const hasActive = sg.items.some(i => location.pathname === i.to);
                return (
                  <div key={sg.subLabel} className="mt-1">
                    <button
                      onClick={() => toggleSubGroup(sg.subLabel)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                        hasActive
                          ? 'text-sidebar-foreground/70'
                          : 'text-sidebar-foreground/30 hover:text-sidebar-foreground/50'
                      )}
                    >
                      <ChevronDown className={cn(
                        'h-3 w-3 shrink-0 transition-transform duration-200',
                        !isOpen && '-rotate-90'
                      )} />
                      <span>{sg.subLabel}</span>
                      {hasActive && !isOpen && (
                        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-prism-teal" />
                      )}
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          key={sg.subLabel}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="ml-2 space-y-px border-l border-sidebar-border/50 pl-1 mt-0.5">
                            {sg.items.map(renderNavItem)}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              {/* In collapsed mode, show sub-group items as flat icons */}
              {collapsed && section.subGroups?.map((sg) =>
                sg.items.map(renderNavItem)
              )}
            </div>
          </div>
        ))}
      </nav>

      <div className="relative border-t border-sidebar-border p-3 space-y-1">
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
