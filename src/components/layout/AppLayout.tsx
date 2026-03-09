import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import AppSidebar from './AppSidebar';
import MobileNav from './MobileNav';
import { useIsMobile } from '@/hooks/use-mobile';
import CommandPalette from '@/components/CommandPalette';
import NotificationsPanel from '@/components/NotificationsPanel';
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal';

const AppLayout = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [lastKey, setLastKey] = useState<string | null>(null);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      // ? to open shortcuts
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShortcutsOpen(true);
        return;
      }

      // G + key navigation
      if (e.key.toLowerCase() === 'g') {
        setLastKey('g');
        setTimeout(() => setLastKey(null), 1000);
        return;
      }

      if (lastKey === 'g') {
        const routes: Record<string, string> = {
          d: '/dashboard',
          t: '/transactions',
          b: '/budgets',
          a: '/accounts',
          r: '/reports',
          s: '/settings',
          y: '/year-in-review',
        };
        const route = routes[e.key.toLowerCase()];
        if (route) {
          e.preventDefault();
          navigate(route);
        }
        setLastKey(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lastKey, navigate]);

  return (
    <>
      <CommandPalette />
      <div className="flex h-screen overflow-hidden">
        {/* Desktop sidebar */}
        {!isMobile && <AppSidebar />}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile top bar */}
          {isMobile && <MobileNav />}
          {/* Desktop top bar with notifications */}
          {!isMobile && (
            <div className="flex items-center justify-end gap-2 px-4 py-2 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border border-border bg-muted px-2 text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
              <NotificationsPanel />
            </div>
          )}
          <main className="flex-1 overflow-y-auto bg-mesh pb-20 md:pb-0">
            <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground">
              Skip to main content
            </a>
            <div id="main-content" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default AppLayout;
