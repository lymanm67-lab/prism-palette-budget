import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Landmark,
  ArrowLeftRight,
  PiggyBank,
  BarChart3,
  Tags,
  Target,
  Settings,
  Bot,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Zap,
  Sun,
  Moon,
  TrendingDown,
  TrendingUp,
  Calculator,
  Scale,
  Map,
  Heart,
  Home,
  Wallet,
  RepeatIcon,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: 'text-prism-teal' },
      { to: '/getting-started', icon: GraduationCap, label: 'Getting Started', color: 'text-prism-amber' },
    ],
  },
  {
    label: 'Money',
    items: [
      { to: '/accounts', icon: Landmark, label: 'Accounts', color: 'text-prism-sky' },
      { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions', color: 'text-prism-orange' },
      { to: '/cash-flow', icon: Wallet, label: 'Cash Flow', color: 'text-prism-teal' },
      { to: '/budgets', icon: PiggyBank, label: 'Budgets', color: 'text-prism-amber' },
      { to: '/recurring', icon: RepeatIcon, label: 'Recurring', color: 'text-prism-sky' },
      { to: '/categories', icon: Tags, label: 'Categories', color: 'text-prism-lime' },
    ],
  },
  {
    label: 'Goals & Debt',
    items: [
      { to: '/goals', icon: Target, label: 'Goals', color: 'text-prism-lime' },
      { to: '/debt-payoff', icon: TrendingDown, label: 'Debt Payoff', color: 'text-prism-rose' },
      { to: '/investments', icon: TrendingUp, label: 'Investments', color: 'text-prism-indigo' },
    ],
  },
  {
    label: 'Plan & Analyze',
    items: [
      { to: '/roadmap', icon: Map, label: 'Prism Roadmap', color: 'text-prism-teal' },
      { to: '/home-buying', icon: Home, label: 'Home Buying', color: 'text-prism-amber' },
      { to: '/calculators', icon: Calculator, label: 'Calculators', color: 'text-prism-indigo' },
      { to: '/reports', icon: BarChart3, label: 'Reports', color: 'text-prism-orange' },
      { to: '/tax-assistant', icon: Bot, label: 'Tax Assistant', color: 'text-prism-indigo' },
    ],
  },
  {
    label: 'More',
    items: [
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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl prism-gradient prism-glow">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="font-display text-lg font-extrabold tracking-tight prism-gradient-text">
              PrismBudget
            </span>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl prism-gradient prism-glow">
            <Zap className="h-5 w-5 text-white" />
          </div>
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
                    {!collapsed && <span>{item.label}</span>}
                    {isActive && !collapsed && (
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