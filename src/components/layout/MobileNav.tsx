import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, PiggyBank, BarChart3, Grid3x3, X,
  Menu, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useCallback } from 'react';
import { useSidebarBadges } from '@/hooks/use-sidebar-badges';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { NAV_SECTIONS } from './AppSidebar';

const BOTTOM_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Txns' },
  { to: '/budgets', icon: PiggyBank, label: 'Budgets' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
];

type MobileNavItem = { to: string; icon: any; label: string };

/** Every menu entry from the desktop sidebar, grouped by section, so nothing is hidden on mobile. */
const MENU_SECTIONS: { label: string; items: MobileNavItem[] }[] = NAV_SECTIONS.map((section) => {
  const items: MobileNavItem[] = [
    ...(section.topItems ?? []),
    ...(section.items ?? []),
    ...((section.subGroups ?? []).flatMap((sg) => sg.items ?? [])),
  ].map(({ to, icon, label }) => ({ to, icon, label }));
  return { label: section.label, items };
}).filter((s) => s.items.length > 0);


const MobileNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const badges = useSidebarBadges();
  const [pressedItem, setPressedItem] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();

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
      <header className="flex lg:hidden items-center justify-between px-4 h-14 box-content safe-area-top border-b border-border bg-card/80 backdrop-blur-md fixed top-0 left-0 right-0 z-[60]">
        <button
          onClick={() => setMenuOpen(prev => !prev)}
          className="h-11 w-11 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted active:animate-haptic-press"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <span className="font-display text-lg font-extrabold tracking-tight prism-gradient-text">PrismMoney</span>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="h-11 w-11 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted active:animate-haptic-press"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
        </button>
      </header>

      {/* Hamburger dropdown menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-[70] bg-foreground/30 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              className="fixed top-14 safe-area-top-offset bottom-16 left-0 right-0 z-[70] lg:hidden flex min-h-0 flex-col overflow-hidden bg-card border-b border-border shadow-xl safe-area-bottom"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-4 py-4 [-webkit-overflow-scrolling:touch]">
                {MENU_SECTIONS.map((section) => (
                  <div key={section.label} className="mb-4 last:mb-0">
                    <p className="px-1 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                      {section.label}
                    </p>
                    <div className="grid grid-cols-3 gap-1">
                      {section.items.map((item) => {
                        const isActive = location.pathname === item.to;
                        return (
                          <button
                            key={section.label + item.to}
                            onClick={() => { navigate(item.to); setMenuOpen(false); }}
                            className={cn(
                              'flex flex-col items-center gap-1.5 py-3 px-1.5 rounded-2xl transition-colors active:animate-haptic-press',
                              isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                            )}
                          >
                            <item.icon className="h-5 w-5 shrink-0" />
                            <span className="text-[10px] font-medium leading-tight text-center line-clamp-2">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom sheet overlay */}
      <AnimatePresence>
        {sheetOpen && (
          <motion.div
            className="fixed inset-0 z-[70] bg-foreground/30 backdrop-blur-sm lg:hidden"
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
            className="fixed bottom-0 left-0 right-0 z-[70] lg:hidden flex max-h-[calc(100dvh-3.5rem)] min-h-0 flex-col overflow-hidden bg-card rounded-t-3xl shadow-2xl border-t border-border safe-area-bottom"
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
            <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-4 pb-6 [-webkit-overflow-scrolling:touch]">
              {MENU_SECTIONS.map((section) => (
                <div key={section.label} className="mb-4 last:mb-0">
                  <p className="px-1 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                    {section.label}
                  </p>
                  <div className="grid grid-cols-3 gap-1">
                    {section.items.map((item) => {
                      const isActive = location.pathname === item.to;
                      return (
                        <button
                          key={section.label + item.to}
                          onClick={() => handleMoreItemClick(item.to)}
                          className={cn(
                            'flex flex-col items-center gap-1.5 py-3 px-1.5 rounded-2xl transition-colors active:animate-haptic-press',
                            isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                          )}
                        >
                          <item.icon className="h-5 w-5 shrink-0" />
                          <span className="text-[10px] font-medium leading-tight text-center line-clamp-2">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom navigation bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border bg-card/95 backdrop-blur-md safe-area-bottom"
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
