import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, Landmark, ArrowLeftRight, PiggyBank, BarChart3, Tags, Target,
  Settings, Bot, LogOut, ChevronLeft, ChevronRight, Sun, Moon, TrendingDown,
  TrendingUp, Calculator, Scale, Heart, Home, Wallet, RepeatIcon,
  CreditCard, LineChart, Sparkles, Shield, FileSearch, FileText, Building2,
  DollarSign, Clock, Lock, Scissors, ClipboardCheck, Gauge, ChevronDown,
  Layers, Search, AlertTriangle, Activity, Banknote, Smartphone, User, Briefcase, Globe, BookOpen, Users,
} from 'lucide-react';
import prismLogo from '@/assets/prism-money-logo.png';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { useSidebarBadges } from '@/hooks/use-sidebar-badges';
import type { LucideIcon } from 'lucide-react';
import ToolsDrawer from '@/components/layout/ToolsDrawer';

type NavMode = 'personal' | 'business' | 'full';
type SidebarDepth = 'essentials' | 'all';

type NavItem = { to: string; icon: LucideIcon; label: string; color: string; mode?: 'personal' | 'business'; essential?: boolean };
type NavSubGroup = { subLabel: string; items: NavItem[]; mode?: 'business' };
type NavSection = {
  label: string;
  items?: NavItem[];
  subGroups?: NavSubGroup[];
  topItems?: NavItem[];
  mode?: 'personal' | 'business';
};

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Home',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: 'text-prism-teal', essential: true },
      { to: '/coach', icon: Sparkles, label: 'Money Coach', color: 'text-prism-amber', essential: true },
      { to: '/getting-started', icon: ClipboardCheck, label: 'Get Started', color: 'text-prism-lime', essential: true },
    ],
  },
  {
    label: 'Track Money',
    items: [
      { to: '/accounts', icon: Landmark, label: 'Accounts', color: 'text-prism-sky', essential: true },
      { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions', color: 'text-prism-orange', essential: true },
      { to: '/categories', icon: Tags, label: 'Categories', color: 'text-prism-lime' },
      { to: '/reconciliation', icon: FileSearch, label: 'Reconciliation', color: 'text-prism-violet' },
      { to: '/cleanup', icon: Sparkles, label: 'Data Cleanup', color: 'text-prism-amber' },
    ],
  },
  {
    label: 'Plan & Budget',
    items: [
      { to: '/budgets', icon: PiggyBank, label: 'Budgets', color: 'text-prism-amber', essential: true },
      { to: '/money-blueprint', icon: PiggyBank, label: 'Money Blueprint', color: 'text-prism-lime' },

      { to: '/cash-flow', icon: Wallet, label: 'Cash Flow', color: 'text-prism-teal' },
      { to: '/forecast', icon: LineChart, label: 'Forecast', color: 'text-prism-sky' },
      { to: '/calculators', icon: Calculator, label: 'Calculators', color: 'text-prism-indigo' },
    ],
  },
  {
    label: 'Save & Optimize',
    items: [
      { to: '/subscriptions', icon: CreditCard, label: 'Subscriptions & Recurring', color: 'text-prism-violet', essential: true },
      { to: '/bill-negotiation', icon: Scissors, label: 'Bill Negotiation', color: 'text-prism-rose' },
      { to: '/debt-payoff', icon: TrendingDown, label: 'Debt Payoff', color: 'text-prism-rose' },
    ],
  },
  {
    label: 'Grow Wealth',
    items: [
      { to: '/net-worth', icon: Scale, label: 'Net Worth', color: 'text-prism-teal' },
      { to: '/goals', icon: Target, label: 'Goals', color: 'text-prism-lime', essential: true },
      { to: '/investments', icon: TrendingUp, label: 'Investment Holdings', color: 'text-prism-indigo' },
      { to: '/planning/investments', icon: Sparkles, label: 'Investment Planning', color: 'text-prism-amber' },
      { to: '/home-buying', icon: Home, label: 'Home Buying', color: 'text-prism-amber' },
    ],
  },
  {
    label: 'Legacy',
    items: [
      { to: '/legacy/household', icon: Users, label: '1. Household Wealth', color: 'text-prism-teal' },
      { to: '/legacy/crossover', icon: TrendingUp, label: '2. Compounding Crossover', color: 'text-prism-teal' },
      { to: '/retirement-optimizer', icon: Layers, label: '3. Retirement Optimizer', color: 'text-prism-amber' },
      { to: '/legacy/preservation', icon: TrendingUp, label: '4. Retirement Preservation', color: 'text-prism-amber' },
      { to: '/kungfoo', icon: Layers, label: '5. KUNG FOO Plan', color: 'text-prism-teal' },
      { to: '/legacy/family', icon: Heart, label: '6. Family Legacy', color: 'text-prism-rose' },
      { to: '/legacy/wealth-os', icon: BookOpen, label: '7. Wealth OS Binder', color: 'text-prism-amber' },
      { to: '/legacy', icon: Sparkles, label: '8. Legacy Mode', color: 'text-prism-amber', essential: true },
      { to: '/legacy/belts', icon: Target, label: '9. Belt Progress', color: 'text-prism-lime' },

    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/reports', icon: BarChart3, label: 'Reports', color: 'text-prism-orange', essential: true },
      { to: '/reports/monthly', icon: FileText, label: 'Monthly Spending Report', color: 'text-prism-orange' },
      { to: '/spending-trends', icon: TrendingUp, label: 'Spending Trends', color: 'text-prism-lime' },
      { to: '/tax-assistant', icon: Bot, label: 'Tax Assistant', color: 'text-prism-indigo' },
      { to: '/year-in-review', icon: Sparkles, label: 'Year in Review', color: 'text-prism-amber' },
    ],
  },
  {
    label: 'Capital',
    mode: 'business',
    topItems: [
      { to: '/capital', icon: Shield, label: 'Dashboard', color: 'text-prism-teal' },
      { to: '/capital/ai-coach', icon: Bot, label: 'AI Coach', color: 'text-prism-amber' },
      { to: '/capital/vault', icon: Lock, label: 'Document Vault', color: 'text-muted-foreground' },
    ],
    subGroups: [
      {
        subLabel: 'Credit Health',
        items: [
          { to: '/capital/credit-overview', icon: FileSearch, label: 'Credit Reports', color: 'text-prism-sky' },
          { to: '/capital/credit-health', icon: Heart, label: 'Score & Factors', color: 'text-prism-rose' },
          { to: '/capital/metro2-scanner', icon: Gauge, label: 'Metro2 Scanner', color: 'text-prism-amber' },
          { to: '/capital/disputes', icon: FileText, label: 'Disputes', color: 'text-prism-orange' },
          { to: '/capital/secondary-freeze', icon: Shield, label: 'Bureau Freeze Hub', color: 'text-prism-sky' },
          { to: '/capital/personal-info-correction', icon: FileText, label: 'Personal Info Fix', color: 'text-prism-teal' },
        ],
      },
      {
        subLabel: 'Business & Funding',
        mode: 'business',
        items: [
          { to: '/capital/business-credit', icon: Building2, label: 'Business Credit', color: 'text-prism-indigo' },
          { to: '/capital/loan-readiness', icon: ClipboardCheck, label: 'Loan Readiness', color: 'text-prism-lime' },
          { to: '/capital/dscr', icon: Activity, label: 'DSCR Calculator', color: 'text-prism-teal' },
          { to: '/capital/capital-stack', icon: Layers, label: 'Capital Stack', color: 'text-prism-teal' },
          { to: '/capital/funding-simulator', icon: Banknote, label: 'Funding Sim', color: 'text-prism-orange' },
          { to: '/capital/money-math', icon: Calculator, label: 'Money Math', color: 'text-prism-indigo' },
        ],
      },
      {
        subLabel: 'Cash Flow & Risk',
        mode: 'business',
        items: [
          { to: '/capital/receivables', icon: DollarSign, label: 'Receivables', color: 'text-prism-sky' },
          { to: '/capital/bank-analyzer', icon: LineChart, label: 'Bank Analyzer', color: 'text-prism-violet' },
          { to: '/capital/bankability', icon: BarChart3, label: 'Bankability', color: 'text-prism-violet' },
          { to: '/capital/banking-intelligence', icon: Search, label: 'Banking Intel', color: 'text-prism-sky' },
          { to: '/capital/payroll-runway', icon: Clock, label: 'Payroll Runway', color: 'text-prism-rose' },
          { to: '/capital/risk-radar', icon: AlertTriangle, label: 'Risk Radar', color: 'text-prism-orange' },
          { to: '/capital/survival-index', icon: Shield, label: 'Survival Index', color: 'text-prism-rose' },
        ],
      },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/settings', icon: Settings, label: 'Settings', color: 'text-muted-foreground', essential: true },
      { to: '/about', icon: Heart, label: 'About', color: 'text-prism-rose' },
      { to: '/legal', icon: Scale, label: 'Legal', color: 'text-muted-foreground' },
    ],
  },
];

const NAV_MODE_CONFIG: Record<NavMode, { icon: LucideIcon; label: string; shortLabel: string; color: string }> = {
  personal: { icon: User, label: 'Personal', shortLabel: 'P', color: 'text-prism-teal' },
  business: { icon: Briefcase, label: 'Business', shortLabel: 'B', color: 'text-prism-indigo' },
  full: { icon: Globe, label: 'Full View', shortLabel: 'F', color: 'text-prism-orange' },
};

const AppSidebar = () => {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  const badges = useSidebarBadges();

  // Nav mode — persisted in localStorage
  const [navMode, setNavMode] = useState<NavMode>(() => {
    return (localStorage.getItem('prism_nav_mode') as NavMode) || 'full';
  });
  useEffect(() => { localStorage.setItem('prism_nav_mode', navMode); }, [navMode]);

  // Sidebar depth — essentials vs all
  const [sidebarDepth, setSidebarDepth] = useState<SidebarDepth>(() => {
    return (localStorage.getItem('prism_sidebar_depth') as SidebarDepth) || 'essentials';
  });
  useEffect(() => { localStorage.setItem('prism_sidebar_depth', sidebarDepth); }, [sidebarDepth]);

  const cycleNavMode = () => {
    const order: NavMode[] = ['personal', 'business', 'full'];
    setNavMode(order[(order.indexOf(navMode) + 1) % 3]);
  };

  // Filter sections/items based on navMode
  const filteredSections = NAV_SECTIONS.filter(section => {
    if (navMode === 'full') return true;
    if (section.mode && section.mode !== navMode) return false;
    return true;
  }).map(section => {
    const filterItems = (items: NavItem[] | undefined) => {
      if (!items) return items;
      if (sidebarDepth === 'all') return items;
      // In essentials mode, show essential items + any item on the current path
      return items.filter(i => i.essential || location.pathname === i.to);
    };

    const filtered = {
      ...section,
      items: filterItems(section.items),
      topItems: filterItems(section.topItems),
      subGroups: navMode !== 'full'
        ? section.subGroups?.filter(sg => {
            if (sg.mode && sg.mode !== navMode) return false;
            return true;
          })
        : section.subGroups,
    };

    // In essentials mode, hide Capital section entirely (it's advanced)
    if (sidebarDepth === 'essentials' && section.label === 'Capital') return null;

    // Hide sections with no visible items
    const totalItems = [
      ...(filtered.items ?? []),
      ...(filtered.topItems ?? []),
      ...(filtered.subGroups?.flatMap(sg => sg.items) ?? []),
    ];
    if (totalItems.length === 0) return null;

    return filtered;
  }).filter(Boolean) as NavSection[];

  // Track which top-level sections are open — auto-open sections with active route
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    NAV_SECTIONS.forEach(section => {
      const allItems = [
        ...(section.items ?? []),
        ...(section.topItems ?? []),
        ...(section.subGroups?.flatMap(sg => sg.items) ?? []),
      ];
      initial[section.label] = allItems.some(i => location.pathname === i.to) || section.label === 'Home';
    });
    return initial;
  });

  const toggleSection = (label: string) => {
    setOpenSections(prev => ({ ...prev, [label]: !prev[label] }));
  };

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
    '/subscriptions': badges.recurring,
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

      {/* Nav Mode Toggle */}
      <div className="relative px-2 py-1.5">
        {!collapsed ? (
          <div className="flex items-center gap-0.5 rounded-lg bg-sidebar-accent/50 p-0.5">
            {(['personal', 'business', 'full'] as NavMode[]).map(mode => {
              const cfg = NAV_MODE_CONFIG[mode];
              const active = navMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setNavMode(mode)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-all duration-200',
                    active
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-sidebar-foreground/40 hover:text-sidebar-foreground/70'
                  )}
                >
                  <cfg.icon className={cn('h-3.5 w-3.5', active ? cfg.color : '')} />
                  <span>{cfg.label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <button
            onClick={cycleNavMode}
            className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-accent/50 transition-colors hover:bg-sidebar-accent"
            title={`View: ${NAV_MODE_CONFIG[navMode].label}`}
          >
            {(() => { const Ic = NAV_MODE_CONFIG[navMode].icon; return <Ic className={cn('h-4 w-4', NAV_MODE_CONFIG[navMode].color)} />; })()}
          </button>
        )}
      </div>

      <nav className="relative flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {filteredSections.map((section, sIdx) => {
          const sectionOpen = openSections[section.label] ?? true;
          const allSectionItems = [
            ...(section.items ?? []),
            ...(section.topItems ?? []),
            ...(section.subGroups?.flatMap(sg => sg.items) ?? []),
          ];
          const hasActiveInSection = allSectionItems.some(i => location.pathname === i.to);

          return (
            <div key={section.label}>
              {!collapsed && (
                <button
                  onClick={() => toggleSection(section.label)}
                  className={cn(
                    'flex w-full items-center gap-1.5 px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-widest transition-colors rounded-md',
                    hasActiveInSection
                      ? 'text-sidebar-foreground/50'
                      : 'text-sidebar-foreground/30 hover:text-sidebar-foreground/50'
                  )}
                >
                  <ChevronDown className={cn(
                    'h-3 w-3 shrink-0 transition-transform duration-200',
                    !sectionOpen && '-rotate-90'
                  )} />
                  <span className="flex-1 text-left">{section.label}</span>
                  {hasActiveInSection && !sectionOpen && (
                    <div className="h-1.5 w-1.5 rounded-full bg-prism-teal" />
                  )}
                </button>
              )}
              {collapsed && sIdx > 0 && (
                <div className="mx-3 mb-1 h-px bg-sidebar-border" />
              )}

              <AnimatePresence initial={false}>
                {(sectionOpen || collapsed) && (
                  <motion.div
                    key={section.label + '-content'}
                    initial={collapsed ? false : { height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-px">
                      {section.topItems?.map(renderNavItem)}
                      {section.items?.map(renderNavItem)}

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

                      {collapsed && section.subGroups?.map((sg) =>
                        sg.items.map(renderNavItem)
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      <div className="relative border-t border-sidebar-border p-3 space-y-1">
        <ToolsDrawer collapsed={collapsed} />
        {/* Sidebar depth toggle */}
        {!collapsed ? (
          <button
            onClick={() => setSidebarDepth(sidebarDepth === 'essentials' ? 'all' : 'essentials')}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <Layers className="h-4 w-4 shrink-0 text-prism-violet" />
            <span className="flex-1 text-left">
              {sidebarDepth === 'essentials' ? 'Show All Tools' : 'Essentials Only'}
            </span>
            <span className="text-[10px] font-medium rounded-full bg-prism-violet/15 text-prism-violet px-2 py-0.5">
              {sidebarDepth === 'essentials' ? 'Simple' : 'Full'}
            </span>
          </button>
        ) : (
          <button
            onClick={() => setSidebarDepth(sidebarDepth === 'essentials' ? 'all' : 'essentials')}
            className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            title={sidebarDepth === 'essentials' ? 'Show All Tools' : 'Essentials Only'}
          >
            <Layers className="h-4 w-4 text-prism-violet" />
          </button>
        )}

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
