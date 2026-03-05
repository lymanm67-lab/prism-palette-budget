import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, PiggyBank, BarChart3, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import AppSidebar from './AppSidebar';

const BOTTOM_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/budgets', icon: PiggyBank, label: 'Budgets' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
];

const MobileNav = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Top bar with hamburger */}
      <header className="flex md:hidden items-center justify-between px-4 h-14 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-muted" aria-label="Open navigation menu">
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[280px]">
            <div onClick={() => setOpen(false)}>
              <AppSidebar />
            </div>
          </SheetContent>
        </Sheet>
        <span className="font-display text-lg font-extrabold tracking-tight prism-gradient-text">PrismBudget</span>
        <div className="w-9" /> {/* spacer */}
      </header>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-border bg-card/95 backdrop-blur-md safe-area-bottom" role="navigation" aria-label="Main navigation">
        <div className="flex items-center justify-around h-16 px-2">
          {BOTTOM_NAV.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors min-w-[60px]',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                <span>{item.label}</span>
                {isActive && <div className="h-1 w-6 rounded-full bg-primary mt-0.5" />}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default MobileNav;
