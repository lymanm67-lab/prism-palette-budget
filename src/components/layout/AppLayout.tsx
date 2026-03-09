import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import MobileNav from './MobileNav';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEffect, useState } from 'react';
import CommandPalette from '@/components/CommandPalette';

const AppLayout = () => {
  const isMobile = useIsMobile();
  const [cmdOpen, setCmdOpen] = useState(false);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      {!isMobile && <AppSidebar onOpenCommandPalette={() => setCmdOpen(true)} />}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        {isMobile && <MobileNav />}
        <main className="flex-1 overflow-y-auto bg-mesh pb-20 md:pb-0">
          <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground">
            Skip to main content
          </a>
          <div id="main-content" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
};

export default AppLayout;
