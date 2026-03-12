import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, PiggyBank, BarChart3, Grid3x3, X,
  Settings, Target, CreditCard, Wallet, TrendingUp, Receipt, Calculator, Home, Shield, Landmark, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useCallback } from 'react';
import { useSidebarBadges } from '@/hooks/use-sidebar-badges';
import { motion, AnimatePresence } from 'framer-motion';

const BOTTOM_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Txns' },
  { to: '/budgets', icon: PiggyBank, label: 'Budgets' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
];

const MORE_ITEMS = [
  { to: '/accounts', icon: Wallet, label: 'Accounts' },
  { to: '/recurring', icon: Receipt, label: 'Recurring' },
  { to: '/goals', icon: Target, label: 'Goals' },
  { to: '/net-worth', icon: TrendingUp, label: 'Net Worth' },
  { to: '/investments', icon: TrendingUp, label: 'Investments' },
  { to: '/cash-flow', icon: Wallet, label: 'Cash Flow' },
  { to: '/calculators', icon: Calculator, label: 'Calculators' },
  { to: '/capital', icon: Shield, label: 'Capital' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const MobileNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const badges = useSidebarBadges();
  const [pressedItem, setPressedItem] = useState<string | null>(null);

  const badgeMap: Record<string, number> = {
    '/transactions': badges.transactions,
    '/budgets': badges.budgets,
  };

  const handleNavTap = useCallback((to: string) => {
    setPressedItem(to);
    // Haptic-style visual feedback
    setTimeout(() => setPressedItem(null), 150);
  }, []);

  const handleMoreItemClick = (to: string) => {
    navigate(to);
    setSheetOpen(false);
  };

  return (
    <>
      {/* Top bar */}
      <header className="flex md:hidden items-center justify-between px-4 h-14 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <span className="font-display text-lg font-extrabold tracking-tight prism-gradient-text">PrismBudget</span>
        <div className="w-9" />
      </header>

      {/* Bottom sheet overlay */}
      <AnimatePresence>
        {sheetOpen && (
          <motion.div
            className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSheetOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Bottom sheet content */}
      <AnimatePresence>
        {sheetOpen && (
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card rounded-t-3xl shadow-2xl border-t border-border safe-area-bottom"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3">
              <h3 className="font-display font-bold text-base">More</h3>
              <button
                onClick={() => setSheetOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-full bg-muted active:animate-haptic-press"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Grid of items */}
            <div className="grid grid-cols-3 gap-1 px-4 pb-6 max-h-[50vh] overflow-y-auto">
              {MORE_ITEMS.map((item, i) => {
                const isActive = location.pathname.startsWith(item.to);
                return (
                  <motion.button
                    key={item.to}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                    onClick={() => handleMoreItemClick(item.to)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 py-4 px-2 rounded-2xl transition-colors active:animate-haptic-press',
                      isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-[11px] font-medium">{item.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom navigation bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-border bg-card/95 backdrop-blur-md safe-area-bottom"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-around h-16 px-2">
          {BOTTOM_NAV.map((item) => {
            const isActive = location.pathname === item.to;
            const badgeCount = badgeMap[item.to] ?? 0;
            const isPressed = pressedItem === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => handleNavTap(item.to)}
                className={cn(
                  'relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all min-w-[56px]',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                  isPressed && 'animate-haptic-press'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="relative">
                  <item.icon className={cn(
                    'h-5 w-5 transition-transform duration-150',
                    isActive && 'text-primary'
                  )} />
                  {badgeCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground animate-haptic-pop">
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px]">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="h-0.5 w-5 rounded-full bg-primary"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </NavLink>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setSheetOpen(prev => !prev)}
            className={cn(
              'relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all min-w-[56px] active:animate-haptic-press',
              sheetOpen ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Grid3x3 className="h-5 w-5" />
            <span className="text-[10px]">More</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default MobileNav;
